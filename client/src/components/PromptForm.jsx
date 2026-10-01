import React, { useState, useEffect } from 'react';
import { Sparkles, Wand2, ChevronDown, ChevronUp, Loader2, AlertTriangle, Key } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../services/api';

const SUGGESTIONS = [
  'a low-poly wooden chair',
  'a cute cartoon robot with glowing eyes',
  'a vintage brown leather armchair',
  'a fantasy treasure chest with gold trim',
  'a sleek futuristic drone',
  'a delicious glazed chocolate donut',
];

const STYLES = [
  { id: 'realistic', label: 'Realistic' },
  { id: 'low-poly', label: 'Low Poly' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'sculpture', label: 'Sculpture' },
  { id: 'pbr', label: 'PBR Material' },
];

export default function PromptForm({
  onGenerate,
  isGenerating,
  progress,
  statusText,
  error,
  currentPrompt,
  setCurrentPrompt,
}) {
  const [artStyle, setArtStyle] = useState('realistic');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, extra parts');
  const [apiKey, setApiKey] = useState(getStoredApiKey());

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    setStoredApiKey(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentPrompt.trim() || isGenerating) return;
    onGenerate({
      prompt: currentPrompt.trim(),
      artStyle,
      negativePrompt: showAdvanced ? negativePrompt.trim() : '',
      apiKey: apiKey.trim(),
    });
  };

  const handleChipClick = (suggestion) => {
    setCurrentPrompt(suggestion);
  };

  return (
    <div className="prompt-panel">
      <div className="panel-header">
        <h2>
          <Wand2 size={20} className="icon-accent" />
          Text to 3D Prompt
        </h2>
        <p className="panel-desc">
          Describe the 3D object you want to generate. Be specific with shapes, materials, and colors.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="prompt-form">
        <div className="form-group">
          <label htmlFor="prompt-input" className="form-label">
            Prompt
          </label>
          <textarea
            id="prompt-input"
            rows={3}
            className="prompt-textarea"
            placeholder="e.g. a low-poly wooden chair with carved legs"
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            disabled={isGenerating}
            required
          />
        </div>

        {/* Suggestion Chips */}
        <div className="suggestions-container">
          <span className="suggestions-label">Try an example:</span>
          <div className="chips-wrapper">
            {SUGGESTIONS.map((item, idx) => (
              <button
                type="button"
                key={idx}
                className="chip-button"
                onClick={() => handleChipClick(item)}
                disabled={isGenerating}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Art Style Selector */}
        <div className="form-group">
          <label className="form-label">Art Style</label>
          <div className="style-grid">
            {STYLES.map((style) => (
              <button
                type="button"
                key={style.id}
                className={`style-card ${artStyle === style.id ? 'active' : ''}`}
                onClick={() => setArtStyle(style.id)}
                disabled={isGenerating}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="advanced-section">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>Advanced & API Key Settings</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="advanced-content">
              <div className="form-group">
                <label htmlFor="api-key-input" className="form-label">
                  Hugging Face Token (Optional)
                </label>
                <input
                  id="api-key-input"
                  type="password"
                  className="text-input"
                  placeholder="hf_... (Optional, leave empty for free public queue)"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  disabled={isGenerating}
                />
                <span className="suggestions-label">
                  Hunyuan3D-2.0 runs 100% free on Hugging Face Spaces. Adding a personal token reduces queue wait.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="neg-prompt" className="form-label">
                  Negative Prompt (features to avoid)
                </label>
                <input
                  id="neg-prompt"
                  type="text"
                  className="text-input"
                  placeholder="ugly, low quality, artifacts"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="generate-button"
          disabled={isGenerating || !currentPrompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="spinner" />
              <span>Generating 3D Model...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Generate 3D Model</span>
            </>
          )}
        </button>
      </form>

      {/* Progress & Generation State */}
      {isGenerating && (
        <div className="generation-progress-box">
          <div className="progress-header">
            <div className="progress-info">
              <Loader2 size={16} className="spinner" />
              <span>{statusText || 'AI Processing...'}</span>
            </div>
            <span className="progress-percent">{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
            />
          </div>
          <p className="progress-note">
            AI 3D generation synthesizes geometry, UV mapping, and PBR textures. This typically takes 30-90 seconds.
          </p>
        </div>
      )}

      {/* Error Callout */}
      {error && (
        <div className="error-callout">
          <div className="error-header">
            <AlertTriangle size={18} />
            <strong>Generation Notice</strong>
          </div>
          <p className="error-message">{error}</p>
        </div>
      )}
    </div>
  );
}
