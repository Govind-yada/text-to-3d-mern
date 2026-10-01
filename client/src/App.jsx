import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PromptForm from './components/PromptForm';
import ModelViewer from './components/ModelViewer';
import HistoryList from './components/HistoryList';
import InfoModal from './components/InfoModal';
import {
  checkHealth,
  create3DTask,
  pollGenerationStatus,
  getHistory,
} from './services/api';
import './App.css';

export default function App() {
  const [currentPrompt, setCurrentPrompt] = useState('a low-poly wooden chair');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const [currentModel, setCurrentModel] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Initial load: check backend health and load generation history
  useEffect(() => {
    loadHealth();
    loadHistory();
  }, []);

  const loadHealth = async () => {
    const data = await checkHealth();
    setHealth(data);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const items = await getHistory();
      setHistory(items);
      // If there is an existing finished model and none is active, show the latest one
      if (items.length > 0 && !currentModel) {
        const latestSuccess = items.find(
          (m) => m.status === 'SUCCEEDED' && m.modelUrls?.glb
        );
        if (latestSuccess) {
          setCurrentModel(latestSuccess);
        }
      }
    } catch (err) {
      console.warn('History load error:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerate = async ({ prompt, artStyle, negativePrompt, apiKey }) => {
    setError(null);
    setIsGenerating(true);
    setProgress(5);
    setStatusText('Submitting prompt to text-to-3D AI...');

    try {
      // 1. Submit prompt to backend
      const result = await create3DTask(prompt, artStyle, negativePrompt, apiKey);
      const taskId = result.taskId;

      setCurrentModel({
        taskId,
        prompt,
        artStyle,
        status: 'PENDING',
        modelUrls: {},
      });

      setStatusText('Prompt queued. Initializing 3D neural generation...');

      // 2. Poll until complete
      const finalResult = await pollGenerationStatus(
        taskId,
        (statusUpdate) => {
          const currentProgress = statusUpdate.progress || 10;
          setProgress(currentProgress);

          if (currentProgress < 25) {
            setStatusText(`Synthesizing 3D latent geometry (${currentProgress}%)...`);
          } else if (currentProgress < 60) {
            setStatusText(`Meshing 3D voxels and surfaces (${currentProgress}%)...`);
          } else if (currentProgress < 90) {
            setStatusText(`Generating PBR textures & UV unwrapping (${currentProgress}%)...`);
          } else {
            setStatusText(`Finalizing GLB container (${currentProgress}%)...`);
          }
        }
      );

      // 3. Generation succeeded!
      setProgress(100);
      setStatusText('Model ready! Loading in 3D viewport...');
      setCurrentModel({
        taskId,
        prompt,
        artStyle,
        status: finalResult.status,
        modelUrls: finalResult.modelUrls,
        thumbnailUrl: finalResult.thumbnailUrl,
      });

      // Refresh MongoDB history
      loadHistory();
    } catch (err) {
      console.error('[Generation Error]', err);
      setError(
        err.message ||
          'Failed to generate 3D model. Please verify your MESHY_API_KEY in server/.env.'
      );
      // Reload history to capture failed state
      loadHistory();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectModel = (model) => {
    setCurrentModel(model);
    if (model.prompt) {
      setCurrentPrompt(model.prompt);
    }
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        health={health}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      {/* Main Workspace: Left Controls, Center Viewport */}
      <main className="main-content">
        <aside className="sidebar-container">
          <PromptForm
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            progress={progress}
            statusText={statusText}
            error={error}
            currentPrompt={currentPrompt}
            setCurrentPrompt={setCurrentPrompt}
          />

          <HistoryList
            history={history}
            onSelectModel={handleSelectModel}
            activeTaskId={currentModel?.taskId}
            onRefresh={loadHistory}
            isLoading={historyLoading}
          />
        </aside>

        <section className="viewport-container">
          <ModelViewer
            currentModel={currentModel}
            isGenerating={isGenerating}
            promptText={currentPrompt}
          />
        </section>
      </main>

      {/* Setup / Docs Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        health={health}
      />
    </div>
  );
}
