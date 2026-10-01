import React, { useState } from 'react';
import { X, ExternalLink, Key, Database, Globe, Check, Server, Save, RotateCcw } from 'lucide-react';
import { getApiBaseUrl, setCustomApiBaseUrl } from '../services/api';

export default function InfoModal({ isOpen, onClose, health }) {
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveApiUrl = (e) => {
    e.preventDefault();
    setCustomApiBaseUrl(apiUrl);
    setIsSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  const handleResetApiUrl = () => {
    setCustomApiBaseUrl('');
    setIsSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h3>Text-to-3D MERN Architecture & Setup Guide</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h4>
              <Key size={16} className="icon-accent" />
              1. AI Model: Tencent Hunyuan3D-2.0 (Hugging Face)
            </h4>
            <p>
              This application connects to <strong>Tencent Hunyuan3D-2.0</strong> hosted on <strong>Hugging Face Spaces</strong> (<code>tencent/Hunyuan3D-2</code>) via <code>@gradio/client</code>.
              It is <strong>100% free</strong> and requires <strong>no credit card</strong>.
            </p>
            <ol className="step-list">
              <li>
                <strong>Zero Setup Mode</strong>: Works out-of-the-box using the public Hugging Face queue without any API key!
              </li>
              <li>
                <strong>Optional Priority Token</strong>: Create a free Hugging Face account at{' '}
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="link-highlight"
                >
                  huggingface.co/settings/tokens <ExternalLink size={12} />
                </a>{' '}
                and generate a free User Access Token.
              </li>
              <li>
                Add it to <code>server/.env</code>:
                <pre className="code-block">AI_PROVIDER=hunyuan3d
HF_TOKEN=hf_your_free_token_here</pre>
              </li>
            </ol>
          </section>

          <section className="modal-section">
            <h4>
              <Database size={16} className="icon-accent" />
              2. MongoDB Generation History
            </h4>
            <p>
              Current status:{' '}
              <span className="badge-highlight">
                {health?.database === 'connected' ? 'Connected to MongoDB' : 'In-Memory Fallback'}
              </span>
            </p>
            <p>
              For persistence, configure <code>MONGODB_URI</code> in <code>server/.env</code> pointing to either a local MongoDB instance (<code>mongodb://127.0.0.1:27017/text-to-3d</code>) or a free cloud cluster from{' '}
              <a
                href="https://www.mongodb.com/atlas"
                target="_blank"
                rel="noreferrer"
                className="link-highlight"
              >
                MongoDB Atlas <ExternalLink size={12} />
              </a>.
            </p>
          </section>

          <section className="modal-section">
            <h4>
              <Globe size={16} className="icon-accent" />
              3. Deployment (Vercel + Render)
            </h4>
            <p>
              <strong>Backend (Render / Railway):</strong>
              <br />
              Deploy the <code>server/</code> folder as a Web Service. Set environment variables:
              <code>PORT=5000</code>, <code>AI_PROVIDER=hunyuan3d</code>, and <code>CLIENT_ORIGIN=https://govind-yada.github.io</code>.
            </p>
            <p>
              <strong>Frontend (GitHub Pages / Vercel):</strong>
              <br />
              Frontend is live on GitHub Pages: <code>https://govind-yada.github.io/text-to-3d-mern/</code>.
            </p>
          </section>

          <section className="modal-section">
            <h4>
              <Server size={16} className="icon-accent" />
              4. Backend API Endpoint
            </h4>
            <p>
              Current API Endpoint for requests and model streaming:
            </p>
            <form onSubmit={handleSaveApiUrl} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://your-backend.onrender.com/api"
                style={{
                  flex: 1,
                  background: '#1a2234',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '0.45rem 0.75rem',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Save size={14} />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={handleResetApiUrl}
                title="Reset to default"
                style={{
                  background: '#27272a',
                  color: '#94a3b8',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  padding: '0.45rem 0.65rem',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} />
              </button>
            </form>
            {isSaved && (
              <p style={{ color: '#34d399', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                ✓ API endpoint updated! Reloading...
              </p>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Got it, Let's Build
          </button>
        </div>
      </div>
    </div>
  );
}
