import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDBStatus } from './config/db.js';
import modelRoutes from './routes/modelRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS configuration for local development and production deployments (e.g. Vercel)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive default
    },
    credentials: true,
  })
);

// Serve local 3D models directory with explicit cross-origin headers
app.use(
  '/models',
  express.static(path.resolve(__dirname, '../public/models'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route providing API overview & frontend location
app.get('/', (req, res) => {
  res.json({
    name: 'Prompt to 3D Model API',
    status: 'online',
    frontend: 'http://localhost:5173',
    health: '/api/health',
    endpoints: {
      generate: 'POST /api/models/generate',
      status: 'GET /api/models/status/:taskId',
      history: 'GET /api/models/history',
      download: 'GET /api/models/download/:taskId',
    },
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  const provider = process.env.AI_PROVIDER || 'hunyuan3d';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: getDBStatus() ? 'connected' : 'in-memory-fallback',
    provider,
    model: provider === 'hunyuan3d' ? 'Tencent Hunyuan3D-2.0 (Hugging Face)' : 'Meshy AI',
    hasApiKey: provider === 'hunyuan3d' ? true : Boolean(process.env.MESHY_API_KEY),
  });
});

// Model routes
app.use('/api/models', modelRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`[Text-to-3D Server] Running on http://localhost:${PORT}`);
  console.log(`[Text-to-3D Server] Health check: http://localhost:${PORT}/api/health`);
});
