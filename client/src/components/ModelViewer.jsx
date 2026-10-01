import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import {
  Download,
  RotateCcw,
  Eye,
  Grid,
  Maximize2,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getModelDownloadUrl, resolveModelUrl } from '../services/api';

/**
 * Error boundary to gracefully catch GLTF loading/rendering failures inside Canvas
 */
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[ModelViewer 3D Error]', error?.message || error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey) {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="canvas-error-overlay">
            <p className="error-title">Could not load 3D model</p>
            <p className="error-sub">
              {this.state.error?.message || 'Unable to fetch or parse GLB file.'}
            </p>
            <button
              className="error-retry-btn"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

/**
 * 3D Model Mesh Renderer
 */
function ModelMesh({ url, wireframe }) {
  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.wireframe = wireframe;
            mat.needsUpdate = true;
          });
        } else {
          child.material.wireframe = wireframe;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [clonedScene, wireframe]);

  return (
    <Center top>
      <primitive object={clonedScene} />
    </Center>
  );
}

/**
 * Interactive spinning 3D placeholder when no model is active
 */
function PlaceholderScene() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.25;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color="#6366f1"
          wireframe
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

/**
 * Loading indicator inside Canvas
 */
function CanvasLoader() {
  return (
    <Html center>
      <div className="canvas-loader-overlay">
        <div className="canvas-spinner" />
        <p>Loading 3D mesh...</p>
      </div>
    </Html>
  );
}

export default function ModelViewer({ currentModel, isGenerating, promptText }) {
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const controlsRef = useRef();
  const containerRef = useRef();

  const rawGlbUrl = currentModel?.modelUrls?.glb;
  const glbUrl = resolveModelUrl(rawGlbUrl);
  const taskId = currentModel?.taskId;

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleDownload = () => {
    if (!glbUrl) return;
    const downloadUrl = getModelDownloadUrl(taskId, glbUrl);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${(currentModel?.prompt || 'generated-model')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30)}.glb`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err.message);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="viewer-panel" ref={containerRef}>
      {/* Viewer Header / Toolbar */}
      <div className="viewer-toolbar">
        <div className="viewer-title">
          <Box size={18} className="icon-accent" />
          <span>
            {currentModel?.prompt
              ? `"${currentModel.prompt}"`
              : 'Interactive 3D Viewport'}
          </span>
          {currentModel?.artStyle && (
            <span className="badge-style">{currentModel.artStyle}</span>
          )}
        </div>

        <div className="toolbar-actions">
          {/* Wireframe toggle */}
          <button
            className={`toolbar-btn ${wireframe ? 'active' : ''}`}
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe"
            disabled={!glbUrl}
          >
            <Layers size={16} />
            <span>Wireframe</span>
          </button>

          {/* Auto Rotate toggle */}
          <button
            className={`toolbar-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Auto Rotate"
          >
            <Eye size={16} />
            <span>Auto Rotate</span>
          </button>

          {/* Grid Floor toggle */}
          <button
            className={`toolbar-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Floor Grid"
          >
            <Grid size={16} />
            <span>Grid</span>
          </button>

          {/* Reset Camera */}
          <button
            className="toolbar-btn"
            onClick={handleResetCamera}
            title="Reset Camera Position"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          {/* Fullscreen */}
          <button
            className="toolbar-btn icon-only"
            onClick={handleFullscreen}
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>

          {/* Download Model Button */}
          {glbUrl && (
            <button
              className="download-btn"
              onClick={handleDownload}
              title="Download 3D Model in GLB format"
            >
              <Download size={16} />
              <span>Download GLB</span>
            </button>
          )}
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="canvas-wrapper">
        <Canvas
          shadows
          camera={{ position: [3, 2.5, 3.5], fov: 45 }}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color('#0d1117'));
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-10, -5, -5]} intensity={0.4} />
          <pointLight position={[0, 5, 0]} intensity={0.5} />

          {/* Grid Floor */}
          {showGrid && (
            <gridHelper
              args={[12, 24, '#384358', '#1e293b']}
              position={[0, -0.01, 0]}
            />
          )}

          {/* Controls */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            autoRotate={autoRotate}
            autoRotateSpeed={1.5}
            enableDamping
            dampingFactor={0.08}
            minDistance={1}
            maxDistance={20}
          />

          {/* Scene Content */}
          <ModelErrorBoundary resetKey={glbUrl}>
            <Suspense fallback={<CanvasLoader />}>
              {glbUrl ? (
                <ModelMesh url={glbUrl} wireframe={wireframe} />
              ) : (
                <PlaceholderScene />
              )}
            </Suspense>
          </ModelErrorBoundary>
        </Canvas>

        {/* Overlay prompt when no model is active */}
        {!glbUrl && !isGenerating && (
          <div className="empty-viewport-hint">
            <Sparkles size={24} className="accent-pulse" />
            <p className="empty-title">Ready to Generate 3D Assets</p>
            <p className="empty-sub">
              Enter a prompt on the left and click <strong>Generate</strong> to inspect your model here in real-time 3D.
            </p>
          </div>
        )}

        {/* Orbit Helper Tip */}
        <div className="viewport-tip">
          <span>Rotate: Left Click + Drag | Pan: Right Click + Drag | Zoom: Scroll</span>
        </div>
      </div>
    </div>
  );
}
