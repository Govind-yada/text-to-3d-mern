import { Client } from '@gradio/client';

/**
 * API Service for communicating with Node.js/Express backend
 * with seamless Cloud AI fallback (Tencent Hunyuan3D-2.0)
 */

// Determine API base URL dynamically
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_api_base_url');
    if (custom) return custom.trim();
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://285b39eb0144c2.lhr.life/api';
  }
  return 'http://localhost:5000/api';
};

export function setCustomApiBaseUrl(url) {
  if (url) {
    localStorage.setItem('custom_api_base_url', url.trim());
  } else {
    localStorage.removeItem('custom_api_base_url');
  }
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Check backend health & config
 */
export async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    // Cloud AI fallback info
    return {
      status: 'ok',
      mode: 'cloud-ai',
      provider: 'hunyuan3d',
      model: 'Tencent Hunyuan3D-2.0',
      database: 'Cloud Storage & Browser Cache',
      hasApiKey: true,
    };
  }
}

export function getStoredApiKey() {
  return localStorage.getItem('meshy_api_key') || '';
}

export function setStoredApiKey(key) {
  if (key) {
    localStorage.setItem('meshy_api_key', key.trim());
  } else {
    localStorage.removeItem('meshy_api_key');
  }
}

/**
 * Save item to local browser history
 */
export function saveLocalHistory(item) {
  try {
    const history = JSON.parse(localStorage.getItem('text_to_3d_history') || '[]');
    const existingIndex = history.findIndex((h) => h.taskId === item.taskId);
    if (existingIndex >= 0) {
      history[existingIndex] = { ...history[existingIndex], ...item };
    } else {
      history.unshift(item);
    }
    localStorage.setItem('text_to_3d_history', JSON.stringify(history.slice(0, 30)));
  } catch (e) {
    console.warn('LocalStorage save failed:', e.message);
  }
}

export function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem('text_to_3d_history') || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Direct client-side generation using Tencent Hunyuan3D-2.0 via Hugging Face Spaces
 */
export async function generateDirectHunyuan(prompt, artStyle = 'realistic', onProgress) {
  onProgress?.({ progress: 15, message: 'Synthesizing 2D reference projection...' });

  const enhancedPrompt = `${prompt}, ${artStyle} style, 3d asset, single centered subject, white clean background`;
  const seed = Math.floor(Math.random() * 100000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=512&height=512&nologo=true&seed=${seed}`;

  let imgBlob;
  try {
    const imgRes = await fetch(imageUrl);
    imgBlob = await imgRes.blob();
  } catch (e) {
    console.warn('[Hunyuan3D] Image fetch warning:', e.message);
    imgBlob = new Blob([''], { type: 'image/png' });
  }

  onProgress?.({ progress: 35, message: 'Connecting to Tencent Hunyuan3D-2 space...' });
  const app = await Client.connect('tencent/Hunyuan3D-2');

  onProgress?.({ progress: 65, message: 'Synthesizing 3D voxels & surface mesh...' });
  const result = await app.predict('/shape_generation', [
    imgBlob,
    256,
    false,
    true,
    0.85,
  ]);

  onProgress?.({ progress: 95, message: 'Finalizing GLB container...' });
  let glbUrl = null;
  if (Array.isArray(result?.data)) {
    for (const item of result.data) {
      const target = item?.value && typeof item.value === 'object' ? item.value : item;
      const url = target?.url || item?.url;
      if (url && (url.includes('.glb') || url.includes('/file='))) {
        glbUrl = url;
        break;
      }
    }
  }

  if (!glbUrl && result?.data?.[0]?.value?.url) {
    glbUrl = result.data[0].value.url;
  }
  if (!glbUrl && result?.data?.[0]?.url) {
    glbUrl = result.data[0].url;
  }

  if (!glbUrl) {
    throw new Error('Hugging Face model generation completed without producing a valid GLB container.');
  }

  const taskId = 'hy_' + Date.now();
  const modelData = {
    taskId,
    prompt,
    artStyle,
    status: 'SUCCEEDED',
    progress: 100,
    modelUrls: { glb: glbUrl, remote: glbUrl },
    createdAt: new Date().toISOString(),
  };

  saveLocalHistory(modelData);
  onProgress?.({ progress: 100, message: 'Model ready!' });
  return modelData;
}

/**
 * Submit text prompt for 3D model generation
 */
export async function create3DTask(prompt, artStyle = 'realistic', negativePrompt = '', customApiKey = '') {
  // Try Node/Express backend first
  try {
    const apiKey = customApiKey || getStoredApiKey();
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_BASE_URL}/models/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        artStyle,
        negativePrompt,
        apiKey,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    if (response.ok && data.success) {
      return { type: 'backend', ...data };
    }
  } catch (err) {
    console.info('[API] Routing through Cloud AI (Hunyuan3D-2.0):', err.message);
  }

  // Fallback to direct cloud AI
  return { type: 'direct', taskId: 'direct_' + Date.now() };
}

/**
 * Get current task status & model URLs
 */
export async function getTaskStatus(taskId, customApiKey = '') {
  const apiKey = customApiKey || getStoredApiKey();
  const headers = {};
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(`${API_BASE_URL}/models/status/${taskId}`, {
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch task status.');
  }
  return data;
}

/**
 * Poll task until SUCCEEDED or FAILED
 */
export async function pollGenerationStatus(taskId, onProgress, intervalMs = 2500, timeoutMs = 300000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Generation timed out after 5 minutes. The task may still be processing in the background.'));
          return;
        }

        const data = await getTaskStatus(taskId);
        if (onProgress) {
          onProgress(data);
        }

        if (data.status === 'SUCCEEDED') {
          saveLocalHistory(data);
          resolve(data);
          return;
        } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
          reject(new Error(data.errorMessage || 'AI generation failed. Please try a different prompt.'));
          return;
        }

        setTimeout(check, intervalMs);
      } catch (err) {
        setTimeout(check, intervalMs * 1.5);
      }
    };

    check();
  });
}

/**
 * Fetch generation history (combines MongoDB + Browser Storage)
 */
export async function getHistory() {
  let backendHistory = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${API_BASE_URL}/models/history`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();
    if (response.ok && data.success) {
      backendHistory = data.history || [];
    }
  } catch (err) {
    // backend offline, ignore
  }

  const localItems = getLocalHistory();
  const combinedMap = new Map();

  backendHistory.forEach((item) => {
    if (item.taskId) combinedMap.set(item.taskId, item);
  });
  localItems.forEach((item) => {
    if (item.taskId && !combinedMap.has(item.taskId)) {
      combinedMap.set(item.taskId, item);
    }
  });

  return Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
}

/**
 * Resolve model GLB URL to full absolute URL
 */
export function resolveModelUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const backendHost = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Get download URL for model
 */
export function getModelDownloadUrl(taskId, glbUrl) {
  if (glbUrl && (glbUrl.startsWith('http://') || glbUrl.startsWith('https://') || glbUrl.startsWith('blob:'))) {
    return glbUrl;
  }
  if (taskId && !taskId.startsWith('direct_') && !taskId.startsWith('hy_')) {
    return `${API_BASE_URL}/models/download/${taskId}`;
  }
  return resolveModelUrl(glbUrl);
}
