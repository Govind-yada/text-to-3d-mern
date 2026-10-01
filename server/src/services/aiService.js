import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, handle_file } from '@gradio/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.resolve(__dirname, '../../public/models');

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const HUNYUAN_SPACES = ['tencent/Hunyuan3D-2', 'tencent/Hunyuan3D-2.1', 'prithivMLmods/TRELLIS.2-Text-to-3D'];

// In-memory task tracker for background jobs
const taskTracker = new Map();

/**
 * Text-to-3D AI Service
 * Supports Hunyuan3D-2.0 / 2.1 (Hugging Face Spaces) & Meshy AI
 */
class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'hunyuan3d';
    this.meshyApiKey = process.env.MESHY_API_KEY || '';
    this.hfToken = process.env.HF_TOKEN || '';
  }

  getProvider(overrideProvider) {
    return overrideProvider || process.env.AI_PROVIDER || this.provider || 'hunyuan3d';
  }

  getMeshyHeaders(customApiKey) {
    const key = (customApiKey && customApiKey.trim()) || process.env.MESHY_API_KEY || this.meshyApiKey;
    if (!key) {
      throw new Error(
        'MESHY_API_KEY is not configured. Hunyuan3D-2.0 is the default free option.'
      );
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    };
  }

  /**
   * Submit text-to-3D generation task
   */
  async createGenerationTask({
    prompt,
    artStyle = 'realistic',
    negativePrompt = '',
    apiKey = '',
    provider = '',
  }) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('A valid prompt string is required.');
    }

    const selectedProvider = this.getProvider(provider);

    if (selectedProvider === 'hunyuan3d') {
      return this.createHunyuanTask({ prompt, artStyle, apiKey });
    } else {
      return this.createMeshyTask({ prompt, artStyle, negativePrompt, apiKey });
    }
  }

  /**
   * Tencent Hunyuan3D-2.0 via Hugging Face Spaces
   */
  async createHunyuanTask({ prompt, artStyle = 'realistic', apiKey = '' }) {
    const taskId = `hy_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    taskTracker.set(taskId, {
      taskId,
      provider: 'hunyuan3d',
      prompt: prompt.trim(),
      artStyle,
      status: 'IN_PROGRESS',
      progress: 10,
      startTime: Date.now(),
      modelUrls: {},
      errorMessage: null,
    });

    console.log(`[Hunyuan3D-2.0] Queued task ${taskId} for prompt: "${prompt}"`);

    // Run background generation
    this.runHunyuanPipeline(taskId, prompt.trim(), artStyle, apiKey);

    return {
      taskId,
      provider: 'hunyuan3d',
    };
  }

  /**
   * Complete Hunyuan3D Generation Pipeline
   */
  async runHunyuanPipeline(taskId, prompt, artStyle, tokenOverride) {
    const task = taskTracker.get(taskId);
    if (!task) return;

    const token = tokenOverride || process.env.HF_TOKEN || this.hfToken;
    const clientOptions = token ? { hf_token: token.trim() } : {};

    try {
      task.progress = 20;

      // 1. Generate reference image from prompt for Hunyuan3D conditioning
      const refImagePath = path.join(MODELS_DIR, `ref_${taskId}.png`);
      console.log(`[Hunyuan3D-2.0] Synthesizing reference image for prompt: "${prompt}"...`);

      const imgPrompt = `${prompt}, 3D model, isometric view, white background, single object, high quality`;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=512&height=512&nologo=true`;

      try {
        const imgRes = await axios({ url: imageUrl, responseType: 'arraybuffer', timeout: 15000 });
        fs.writeFileSync(refImagePath, Buffer.from(imgRes.data));
        task.thumbnailUrl = `/models/ref_${taskId}.png`;
        task.progress = 35;
      } catch (imgErr) {
        console.warn('[Hunyuan3D-2.0] Reference image generation warning:', imgErr.message);
        const defaultRef = path.resolve(__dirname, '../../temp_prompt.png');
        if (fs.existsSync(defaultRef) && !fs.existsSync(refImagePath)) {
          fs.copyFileSync(defaultRef, refImagePath);
        }
      }

      // 2. Connect to Hugging Face Spaces for Hunyuan3D
      let client = null;
      let connectedSpace = null;

      for (const space of HUNYUAN_SPACES) {
        try {
          console.log(`[Hunyuan3D-2.0] Connecting to ${space}...`);
          client = await Client.connect(space, clientOptions);
          connectedSpace = space;
          console.log(`[Hunyuan3D-2.0] Successfully connected to ${space}!`);
          break;
        } catch (spaceErr) {
          console.warn(`[Hunyuan3D-2.0] ${space} unavailable (${spaceErr.message}), trying next...`);
        }
      }

      if (!client) {
        throw new Error('Hugging Face Hunyuan3D Space is currently sleeping or experiencing high load. Please try again in a few moments or add a free HF_TOKEN in server/.env.');
      }

      task.progress = 55;

      // 3. Call generation on connected Space
      let result = null;
      const fileData = fs.existsSync(refImagePath) ? handle_file(refImagePath) : null;

      if (connectedSpace.includes('Hunyuan3D-2.1')) {
        result = await client.predict('/shape_generation', [
          null,
          fileData,
          null,
          null,
          null,
          null,
          15,
          5,
          1234,
          128,
          true,
          4000,
          true,
        ]);
      } else if (connectedSpace.includes('TRELLIS')) {
        result = await client.predict('/generate_3d', {
          image: fileData,
          seed: 1234,
          randomize_seed: true,
        });
      } else {
        result = await client.predict('/shape_generation', {
          caption: prompt,
          image: fileData,
          mv_image_front: null,
          mv_image_back: null,
          mv_image_left: null,
          mv_image_right: null,
          steps: 20,
          guidance_scale: 5,
          seed: 1234,
          octree_resolution: 128,
          check_box_rembg: true,
          num_chunks: 4000,
          randomize_seed: true,
        });
      }

      task.progress = 85;

      // 4. Extract generated GLB output
      let sourceUrl = null;
      if (Array.isArray(result?.data)) {
        for (const item of result.data) {
          if (!item) continue;
          // Support Gradio update object format: { value: { url, path, orig_name }, __type__: 'update' }
          const target = item.value && typeof item.value === 'object' ? item.value : item;
          const url = target.url || item.url;
          const filePath = target.path || item.path;
          const origName = target.orig_name || item.orig_name;

          if (url && (url.includes('.glb') || origName?.endsWith('.glb') || url.includes('/file='))) {
            sourceUrl = url;
            break;
          }
          if (filePath && filePath.endsWith('.glb')) {
            sourceUrl = url || filePath;
            break;
          }
          if (url && typeof url === 'string' && url.startsWith('http')) {
            sourceUrl = url;
          }
        }
      }

      if (!sourceUrl && result?.data?.[0]?.value?.url) {
        sourceUrl = result.data[0].value.url;
      } else if (!sourceUrl && result?.data?.[0]?.url) {
        sourceUrl = result.data[0].url;
      }

      if (!sourceUrl) {
        throw new Error('Hugging Face model generation completed without producing a valid GLB container.');
      }

      // 5. Cache GLB locally on server with graceful remote URL fallback
      const localFilename = `${taskId}.glb`;
      const localFilePath = path.join(MODELS_DIR, localFilename);
      let publicUrl = `/models/${localFilename}`;

      try {
        console.log(`[Hunyuan3D-2.0] Caching model to ${localFilePath}...`);
        await this.downloadFile(sourceUrl, localFilePath);
      } catch (cacheErr) {
        console.warn(`[Hunyuan3D-2.0] Local caching failed (${cacheErr.message}), falling back to direct remote URL.`);
        publicUrl = sourceUrl;
      }

      task.status = 'SUCCEEDED';
      task.progress = 100;
      task.modelUrls = { glb: publicUrl, remote: sourceUrl };
      task.completedAt = new Date();

      console.log(`[Hunyuan3D-2.0] Task ${taskId} SUCCEEDED! Available at ${publicUrl}`);
    } catch (err) {
      console.error(`[Hunyuan3D-2.0] Task ${taskId} error:`, err.message);
      task.status = 'FAILED';
      task.errorMessage = err.message || 'Generation failed on Hugging Face 3D space.';
    }
  }

  async downloadFile(url, destPath) {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    fs.writeFileSync(destPath, Buffer.from(response.data));
  }

  /**
   * Meshy API Provider
   */
  async createMeshyTask({ prompt, artStyle = 'realistic', negativePrompt = '', apiKey = '' }) {
    const payload = {
      mode: 'preview',
      prompt: prompt.trim(),
      art_style: artStyle || 'realistic',
      should_remesh: true,
    };

    if (negativePrompt && negativePrompt.trim()) {
      payload.negative_prompt = negativePrompt.trim();
    }

    const response = await axios.post(MESHY_BASE_URL, payload, {
      headers: this.getMeshyHeaders(apiKey),
      timeout: 30000,
    });

    const taskId = response.data?.result;
    if (!taskId) {
      throw new Error('Failed to retrieve task ID from Meshy API response.');
    }

    return {
      taskId,
      provider: 'meshy',
    };
  }

  /**
   * Status checker
   */
  async getTaskStatus(taskId, apiKey = '') {
    if (!taskId) {
      throw new Error('Task ID is required.');
    }

    // Check in-memory task tracker first
    if (taskTracker.has(taskId)) {
      const task = taskTracker.get(taskId);
      return {
        status: task.status,
        progress: task.progress,
        modelUrls: task.modelUrls,
        thumbnailUrl: task.thumbnailUrl,
        errorMessage: task.errorMessage,
        provider: 'hunyuan3d',
      };
    }

    // Fall back to Meshy API if taskId belongs to Meshy
    try {
      const response = await axios.get(`${MESHY_BASE_URL}/${taskId}`, {
        headers: this.getMeshyHeaders(apiKey),
        timeout: 20000,
      });

      const data = response.data;
      return {
        status: data.status || 'PENDING',
        progress: typeof data.progress === 'number' ? data.progress : 0,
        modelUrls: data.model_urls || {},
        thumbnailUrl: data.thumbnail_url || null,
        errorMessage: data.task_error?.message || null,
        provider: 'meshy',
      };
    } catch (error) {
      console.error(`[AIService] getTaskStatus error for ${taskId}:`, error.message);
      throw new Error(error.response?.data?.message || error.message || 'Failed to query generation status');
    }
  }
}

export const aiService = new AIService();
