import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Model3D, memoryStore } from '../models/Model3D.js';
import { aiService } from '../services/aiService.js';
import { getDBStatus } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.resolve(__dirname, '../../public/models');

export const generateModel = async (req, res) => {
  try {
    const { prompt, artStyle = 'realistic', negativePrompt = '' } = req.body;
    const apiKey = req.headers['x-api-key'] || req.body.apiKey || '';

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid prompt for 3D generation.',
      });
    }

    // Call AI provider to create task
    const { taskId, provider } = await aiService.createGenerationTask({
      prompt: prompt.trim(),
      artStyle,
      negativePrompt,
      apiKey,
    });

    const modelData = {
      prompt: prompt.trim(),
      artStyle,
      taskId,
      provider,
      status: 'PENDING',
      progress: 0,
      modelUrls: { glb: null },
      thumbnailUrl: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let savedId = taskId;

    // Save to MongoDB if connected, otherwise save to in-memory fallback
    if (getDBStatus()) {
      try {
        const doc = await Model3D.create(modelData);
        savedId = doc._id.toString();
      } catch (dbErr) {
        console.warn('[DB Error while saving model doc]:', dbErr.message);
        memoryStore.set(taskId, { ...modelData, _id: taskId });
      }
    } else {
      memoryStore.set(taskId, { ...modelData, _id: taskId });
    }

    return res.status(201).json({
      success: true,
      message: '3D model generation initiated.',
      taskId,
      modelId: savedId,
      status: 'PENDING',
      progress: 0,
    });
  } catch (error) {
    console.error('[modelController:generateModel] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start 3D generation.',
    });
  }
};

export const getTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || '';

    if (!taskId) {
      return res.status(400).json({ success: false, error: 'Task ID is required' });
    }

    // Poll AI Service
    const aiResult = await aiService.getTaskStatus(taskId, apiKey);

    // Update in DB or memoryStore
    if (getDBStatus()) {
      try {
        await Model3D.findOneAndUpdate(
          { taskId },
          {
            status: aiResult.status,
            progress: aiResult.progress,
            modelUrls: aiResult.modelUrls,
            thumbnailUrl: aiResult.thumbnailUrl,
            errorMessage: aiResult.errorMessage,
            updatedAt: new Date(),
          },
          { new: true }
        );
      } catch (dbErr) {
        console.warn('[DB update error]:', dbErr.message);
      }
    } else {
      const existing = memoryStore.get(taskId) || {};
      memoryStore.set(taskId, {
        ...existing,
        status: aiResult.status,
        progress: aiResult.progress,
        modelUrls: aiResult.modelUrls,
        thumbnailUrl: aiResult.thumbnailUrl,
        errorMessage: aiResult.errorMessage,
        updatedAt: new Date(),
      });
    }

    return res.json({
      success: true,
      taskId,
      status: aiResult.status,
      progress: aiResult.progress,
      modelUrls: aiResult.modelUrls,
      thumbnailUrl: aiResult.thumbnailUrl,
      errorMessage: aiResult.errorMessage,
    });
  } catch (error) {
    console.error(`[modelController:getTaskStatus] Error for ${req.params.taskId}:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve task status.',
    });
  }
};

export const getHistory = async (req, res) => {
  try {
    if (getDBStatus()) {
      const history = await Model3D.find()
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
      return res.json({ success: true, history });
    } else {
      const list = Array.from(memoryStore.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      return res.json({ success: true, history: list });
    }
  } catch (error) {
    console.error('[modelController:getHistory] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch generation history.',
    });
  }
};

export const getModelById = async (req, res) => {
  try {
    const { id } = req.params;

    if (getDBStatus()) {
      const doc = await Model3D.findOne({
        $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { taskId: id }],
      });
      if (doc) return res.json({ success: true, model: doc });
    }

    const inMemory = memoryStore.get(id);
    if (inMemory) {
      return res.json({ success: true, model: inMemory });
    }

    return res.status(404).json({ success: false, error: 'Model record not found.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const downloadModel = async (req, res) => {
  try {
    const { taskId } = req.params;
    let glbUrl = null;
    let promptSlug = 'model';

    if (getDBStatus()) {
      const doc = await Model3D.findOne({ taskId });
      if (doc?.modelUrls?.glb) {
        glbUrl = doc.modelUrls.glb;
        if (doc.prompt) {
          promptSlug = doc.prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
        }
      }
    }

    if (!glbUrl && memoryStore.has(taskId)) {
      const item = memoryStore.get(taskId);
      glbUrl = item?.modelUrls?.glb;
      if (item?.prompt) {
        promptSlug = item.prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      }
    }

    // If not found in DB yet, query AI service
    if (!glbUrl) {
      const statusRes = await aiService.getTaskStatus(taskId);
      glbUrl = statusRes.modelUrls?.glb;
    }

    if (!glbUrl) {
      return res.status(404).json({
        success: false,
        error: 'GLB model file URL is not available yet for this task.',
      });
    }

    const downloadFileName = `${promptSlug || 'generated-3d-model'}.glb`;

    // Handle local models (e.g. /models/:taskId.glb)
    if (glbUrl.startsWith('/models/')) {
      const fileName = path.basename(glbUrl);
      const localFilePath = path.join(MODELS_DIR, fileName);
      if (fs.existsSync(localFilePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
        res.setHeader('Content-Type', 'model/gltf-binary');
        return fs.createReadStream(localFilePath).pipe(res);
      }
    }

    // Stream remote GLB directly with attachment header
    const response = await axios({
      method: 'GET',
      url: glbUrl,
      responseType: 'stream',
      timeout: 30000,
    });

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    res.setHeader('Content-Type', 'model/gltf-binary');
    response.data.pipe(res);
  } catch (error) {
    console.error('[modelController:downloadModel] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to stream 3D model for download.',
    });
  }
};
