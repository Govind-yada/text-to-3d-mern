import React from 'react';
import { Box, Sparkles, Server, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Navbar({ health, onOpenInfo }) {
  const isHealthy = health?.status === 'ok';

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="logo-icon">
            <Box size={22} className="cube-spin" />
          </div>
          <div>
            <h1 className="logo-title">
              Prompt<span className="accent">2</span>Model
            </h1>
            <span className="logo-subtitle">AI Text to 3D GLB Generator</span>
          </div>
        </div>

        <div className="navbar-actions">
          <div
            className={`status-badge ${isHealthy ? 'status-online' : 'status-warning'}`}
            title={
              isHealthy
                ? `Backend: Online (${health.database}) | AI: ${health.model || health.provider}`
                : 'Backend unreachable or starting up'
            }
          >
            {isHealthy ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{isHealthy ? (health.model ? 'Hunyuan3D-2.0' : 'API Ready') : 'Connecting API...'}</span>
          </div>

          <button
            className="info-button"
            onClick={onOpenInfo}
            title="Setup & API Key Configuration"
          >
            <Sparkles size={16} />
            <span>Setup & Docs</span>
          </button>
        </div>
      </div>
    </header>
  );
}
