import express from 'express';
import {
  generateModel,
  getTaskStatus,
  getHistory,
  getModelById,
  downloadModel,
} from '../controllers/modelController.js';

const router = express.Router();

// Generate new 3D model
router.post('/generate', generateModel);

// Check generation status / progress by taskId
router.get('/status/:taskId', getTaskStatus);

// Generation history
router.get('/history', getHistory);

// Single model details
router.get('/detail/:id', getModelById);

// Direct download proxy (streams GLB with attachment headers)
router.get('/download/:taskId', downloadModel);

export default router;
