import React from 'react';
import { X, ExternalLink, Key, Database, Globe, Check } from 'lucide-react';

export default function InfoModal({ isOpen, onClose, health }) {
  if (!isOpen) return null;

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
              <code>PORT=5000</code>, <code>MONGODB_URI</code>, <code>MESHY_API_KEY</code>, and <code>CLIENT_ORIGIN=https://your-frontend.vercel.app</code>.
            </p>
            <p>
              <strong>Frontend (Vercel):</strong>
              <br />
              Deploy the <code>client/</code> folder on Vercel. Set environment variable:
              <code>VITE_API_BASE_URL=https://your-backend.onrender.com/api</code>.
            </p>
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
