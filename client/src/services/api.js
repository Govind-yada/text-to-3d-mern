/**
 * API Service for communicating with the Node.js/Express backend
 */

// Determine API base URL dynamically
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://285b39eb0144c2.lhr.life/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Check backend health & config
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'error', error: err.message };
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
 * Submit text prompt for 3D model generation
 */
export async function create3DTask(prompt, artStyle = 'realistic', negativePrompt = '', customApiKey = '') {
  const apiKey = customApiKey || getStoredApiKey();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(`${API_BASE_URL}/models/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      artStyle,
      negativePrompt,
      apiKey,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit 3D generation request.');
  }

  return data; // { success: true, taskId, status, ... }
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
 * @param {string} taskId
 * @param {function} onProgress - Callback receiving status data
 * @param {number} [intervalMs=3000]
 * @param {number} [timeoutMs=300000] // 5 minutes timeout
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
          resolve(data);
          return;
        } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
          reject(new Error(data.errorMessage || 'AI generation failed. Please try a different prompt.'));
          return;
        }

        // Continue polling
        setTimeout(check, intervalMs);
      } catch (err) {
        // If it's a network glitch, retry a few times before giving up
        setTimeout(check, intervalMs * 1.5);
      }
    };

    check();
  });
}

/**
 * Fetch generation history
 */
export async function getHistory() {
  try {
    const response = await fetch(`${API_BASE_URL}/models/history`);
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch history');
    }
    return data.history || [];
  } catch (err) {
    console.warn('[API] Could not fetch history:', err.message);
    return [];
  }
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
  // Use server proxy for reliable Content-Disposition download
  if (taskId) {
    return `${API_BASE_URL}/models/download/${taskId}`;
  }
  return resolveModelUrl(glbUrl);
}
