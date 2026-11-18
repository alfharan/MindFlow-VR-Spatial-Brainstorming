/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MindFlowScene } from './three/MindFlowScene';
import { HeaderHUD } from './components/HeaderHUD';
import { BottomControlDock } from './components/BottomControlDock';
import { HandCameraOverlay } from './components/HandCameraOverlay';
import { NodeDetailModal } from './components/NodeDetailModal';
import { HandGuideModal } from './components/HandGuideModal';
import { VRStereoView } from './components/VRStereoView';
import { TEMPLATES } from './templates/mindMapTemplates';
import {
  MindNode,
  MindLink,
  UserAudience,
  HandTrackingState,
  LayoutMode,
  HandGestureType,
} from './types';
import { handTracker } from './services/handTracking';
import { expandConceptAI } from './services/aiBrainstorm';
import { soundFx } from './audio/spatialAudio';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<MindFlowScene | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Core Mind Map Data
  const [audience, setAudience] = useState<UserAudience>('mahasiswa');
  const [nodes, setNodes] = useState<MindNode[]>(() => TEMPLATES.mahasiswa.nodes);
  const [links, setLinks] = useState<MindLink[]>(() => TEMPLATES.mahasiswa.links);

  // Selection & Interaction
  const [selectedNode, setSelectedNode] = useState<MindNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MindNode | null>(null);
  const [isConnectingMode, setIsConnectingMode] = useState<boolean>(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Hand Tracking
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [handState, setHandState] = useState<HandTrackingState>({
    detected: false,
    handType: 'right',
    handsCount: 0,
    hands: [],
    dualHandInteraction: 'none',
    landmarks: [],
    gesture: 'none',
    pinchDistance: 1,
    pointerPos: { x: 0, y: 0 },
    isPinching: false,
    confidence: 0,
  });

  // Settings & Layout
  const [currentLayout, setCurrentLayout] = useState<LayoutMode>('force3d');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isStereoVR, setIsStereoVR] = useState<boolean>(false);

  // Modals & UI States
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Peace gesture debounce tracker
  const lastPeaceTimeRef = useRef<number>(0);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    window.clearTimeout((showToast as any).timer);
    (showToast as any).timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // 1. Initialize Three.js 3D Scene
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const scene = new MindFlowScene(canvasMountRef.current);
    sceneRef.current = scene;

    // Load initial nodes
    scene.setMindMap({ nodes: TEMPLATES.mahasiswa.nodes, links: TEMPLATES.mahasiswa.links });

    // Hook callbacks
    scene.onNodeSelect = (node) => {
      setSelectedNode(node);
    };

    scene.onNodeHover = (node) => {
      setHoveredNode(node);
    };

    scene.onConnectNodes = (sourceId, targetId) => {
      handleCreateLink(sourceId, targetId);
    };

    scene.onNodePositionChange = (id, x, y, z) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, x, y, z } : n))
      );
    };

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // 2. Audience Profile Change handler
  const handleAudienceChange = (newAudience: UserAudience) => {
    setAudience(newAudience);
    const template = TEMPLATES[newAudience];
    setNodes(template.nodes);
    setLinks(template.links);
    setSelectedNode(null);
    setIsConnectingMode(false);
    setConnectingSourceId(null);

    if (sceneRef.current) {
      sceneRef.current.setMindMap({ nodes: template.nodes, links: template.links });
      sceneRef.current.resetCameraView('angled');
    }
    soundFx.playSpawn();
    showToast(`Template ${newAudience.toUpperCase()} berhasil dimuat!`, 'info');
  };

  // 3. Reset Template
  const handleResetScene = () => {
    const template = TEMPLATES[audience];
    setNodes(template.nodes);
    setLinks(template.links);
    setSelectedNode(null);
    if (sceneRef.current) {
      sceneRef.current.setMindMap({ nodes: template.nodes, links: template.links });
      sceneRef.current.resetCameraView('angled');
    }
    soundFx.playSpawn();
    showToast('Template dikembalikan ke kondisi awal', 'info');
  };

  // 4. Create Link between two nodes
  const handleCreateLink = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    // Check if link already exists
    const exists = links.some(
      (l) =>
        (l.source === sourceId && l.target === targetId) ||
        (l.source === targetId && l.target === sourceId)
    );

    if (exists) {
      showToast('Relasi antar ide ini sudah ada!', 'info');
      setIsConnectingMode(false);
      setConnectingSourceId(null);
      if (sceneRef.current) sceneRef.current.setConnectingMode(null);
      return;
    }

    const newLink: MindLink = {
      id: `link-${Date.now()}`,
      source: sourceId,
      target: targetId,
      label: 'Relasi Ide',
      relationship: 'supports',
      color: '#38bdf8',
    };

    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);
    setIsConnectingMode(false);
    setConnectingSourceId(null);

    if (sceneRef.current) {
      sceneRef.current.setConnectingMode(null);
      sceneRef.current.rebuildLinks(updatedLinks);
    }

    soundFx.playConnect();
    showToast('Relasi konsep berhasil terhubung di ruang 3D!', 'success');
  }, [links]);

  // 5. Add New Node
  const handleAddNode = () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 3.5 + Math.random() * 2;

    const basePos = selectedNode
      ? { x: selectedNode.x + Math.cos(angle) * 3, y: selectedNode.y + (Math.random() - 0.5) * 2, z: selectedNode.z + Math.sin(angle) * 3 }
      : { x: Math.cos(angle) * dist, y: (Math.random() - 0.5) * 3 + 1, z: Math.sin(angle) * dist };

    const newNode: MindNode = {
      id: `node-${Date.now()}`,
      label: `Konsep Baru #${nodes.length + 1}`,
      category: 'concept',
      description: 'Deskripsi ide baru...',
      x: basePos.x,
      y: basePos.y,
      z: basePos.z,
      color: '#38bdf8',
      audience,
      tags: ['Ide'],
    };

    const updatedNodes = [...nodes, newNode];
    let updatedLinks = links;

    // Automatically link to selected node if available
    if (selectedNode) {
      const autoLink: MindLink = {
        id: `link-${Date.now()}`,
        source: selectedNode.id,
        target: newNode.id,
        relationship: 'subconcept',
        label: 'Cabang Baru',
        color: '#38bdf8',
      };
      updatedLinks = [...links, autoLink];
    }

    setNodes(updatedNodes);
    setLinks(updatedLinks);
    setSelectedNode(newNode);

    if (sceneRef.current) {
      sceneRef.current.setMindMap({ nodes: updatedNodes, links: updatedLinks });
    }

    soundFx.playSpawn();
    showToast('Konsep 3D baru berhasil ditambahkan!', 'success');
  };

  // 6. Delete Node
  const handleDeleteNode = () => {
    if (!selectedNode) return;
    const nodeId = selectedNode.id;

    const updatedNodes = nodes.filter((n) => n.id !== nodeId);
    const updatedLinks = links.filter((l) => l.source !== nodeId && l.target !== nodeId);

    setNodes(updatedNodes);
    setLinks(updatedLinks);
    setSelectedNode(null);

    if (sceneRef.current) {
      sceneRef.current.setMindMap({ nodes: updatedNodes, links: updatedLinks });
    }

    soundFx.playRelease();
    showToast('Konsep telah dihapus dari ruang 3D', 'info');
  };

  // 7. Save Node edit
  const handleSaveNode = (updated: MindNode) => {
    const updatedNodes = nodes.map((n) => (n.id === updated.id ? updated : n));
    setNodes(updatedNodes);
    setSelectedNode(updated);

    if (sceneRef.current) {
      sceneRef.current.setMindMap({ nodes: updatedNodes, links });
    }
    soundFx.playSelect();
    showToast('Perubahan konsep berhasil disimpan', 'success');
  };

  // 8. Start Connecting Mode
  const handleStartConnect = () => {
    if (!selectedNode) {
      showToast('Pilih konsep asal terlebih dahulu', 'info');
      return;
    }
    const newMode = !isConnectingMode;
    setIsConnectingMode(newMode);
    setConnectingSourceId(newMode ? selectedNode.id : null);
    if (sceneRef.current) {
      sceneRef.current.setConnectingMode(newMode ? selectedNode.id : null);
    }
    if (newMode) {
      showToast('Mode Hubungkan Aktif: Klik konsep target di ruang 3D', 'info');
    }
  };

  // 9. AI Co-Pilot Idea Expansion (Gemini)
  const handleAiExpand = async (customPrompt?: string) => {
    if (!selectedNode || isAiLoading) return;
    setIsAiLoading(true);

    try {
      showToast('Gemini sedang menganalisis & merumuskan cabang konsep...', 'info');
      const existingLabels = nodes.map((n) => n.label);
      const results = await expandConceptAI(selectedNode.label, audience, customPrompt, existingLabels);

      if (!results || results.length === 0) {
        showToast('Tidak ada cabang ide yang dihasilkan', 'info');
        return;
      }

      // Generate 3D spatial positions for new ideas surrounding the selected node
      const newNodesList: MindNode[] = [];
      const newLinksList: MindLink[] = [];

      results.forEach((idea, i) => {
        const angle = (i / results.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const radius = 3.8 + (i % 2) * 1.5;
        const yElev = selectedNode.y + (Math.sin(i * 1.8) * 1.5);

        const newId = `node-ai-${Date.now()}-${i}`;
        const node: MindNode = {
          id: newId,
          label: idea.label,
          category: idea.category,
          description: idea.description,
          x: selectedNode.x + Math.cos(angle) * radius,
          y: yElev,
          z: selectedNode.z + Math.sin(angle) * radius,
          color: idea.color || '#a855f7',
          tags: idea.tags || ['AI Gemini', audience],
          audience,
        };

        const link: MindLink = {
          id: `link-ai-${Date.now()}-${i}`,
          source: selectedNode.id,
          target: newId,
          relationship: idea.relationship,
          label: idea.relationship.toUpperCase(),
          color: idea.color || '#a855f7',
        };

        newNodesList.push(node);
        newLinksList.push(link);
      });

      const updatedNodes = [...nodes, ...newNodesList];
      const updatedLinks = [...links, ...newLinksList];

      setNodes(updatedNodes);
      setLinks(updatedLinks);

      if (sceneRef.current) {
        sceneRef.current.setMindMap({ nodes: updatedNodes, links: updatedLinks });
      }

      soundFx.playAiSpark();
      showToast(`Berhasil! Gemini melahirkan ${results.length} cabang konsep baru.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memproses ekspansi AI', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // 10. Hand Tracking Management
  const handleToggleWebcam = async () => {
    if (isWebcamActive) {
      handTracker.stop();
      setIsWebcamActive(false);
      setHandState((prev) => ({ ...prev, detected: false }));
      if (sceneRef.current) {
        sceneRef.current.updateHandTracking({
          detected: false,
          handType: 'right',
          handsCount: 0,
          hands: [],
          dualHandInteraction: 'none',
          landmarks: [],
          gesture: 'none',
          pinchDistance: 1,
          pointerPos: { x: 0, y: 0 },
          isPinching: false,
          confidence: 0,
        });
      }
      showToast('Sensor kamera tangan dimatikan', 'info');
    } else {
      if (!videoRef.current) return;
      setIsWebcamActive(true);
      showToast('Mengaktifkan kamera & model pelacak tangan...', 'info');

      const success = await handTracker.startWebcam(
        videoRef.current,
        (state) => {
          setHandState(state);
          if (sceneRef.current) {
            sceneRef.current.updateHandTracking(state);
          }

          // Check Peace Gesture (✌️) -> spawn node
          if (state.gesture === 'peace') {
            const now = Date.now();
            if (now - lastPeaceTimeRef.current > 2000) {
              lastPeaceTimeRef.current = now;
              handleAddNode();
            }
          }
        },
        (err) => {
          setIsWebcamActive(false);
          showToast(`Kamera belum aktif: ${err.message || 'Periksa izin kamera'}`, 'error');
        }
      );

      if (success) {
        showToast('Kamera tangan aktif! Silakan gerakkan tangan di depan kamera', 'success');
      } else {
        setIsWebcamActive(false);
      }
    }
  };

  // 11. Virtual gesture simulation for non-webcam testing (1 or 2 hands)
  const handleSimulateGesture = (gesture: HandGestureType, isDual = false) => {
    const isPinch = gesture === 'pinch';

    if (isDual) {
      const leftHandData = {
        handType: 'left' as const,
        landmarks: Array.from({ length: 21 }, (_, i) => ({
          x: 0.25 + (i === 8 ? 0.05 : 0),
          y: 0.5 + (i === 8 ? -0.1 : 0),
          z: 0.1,
        })),
        gesture,
        pinchDistance: isPinch ? 0.04 : 0.18,
        pointerPos: { x: -0.4, y: 0.1 },
        isPinching: isPinch,
        confidence: 0.95,
      };

      const rightHandData = {
        handType: 'right' as const,
        landmarks: Array.from({ length: 21 }, (_, i) => ({
          x: 0.75 + (i === 8 ? 0.05 : 0),
          y: 0.5 + (i === 8 ? -0.1 : 0),
          z: 0.1,
        })),
        gesture,
        pinchDistance: isPinch ? 0.04 : 0.18,
        pointerPos: { x: 0.4, y: 0.1 },
        isPinching: isPinch,
        confidence: 0.95,
      };

      const fakeState: HandTrackingState = {
        detected: true,
        handType: 'both',
        handsCount: 2,
        hands: [leftHandData, rightHandData],
        leftHand: leftHandData,
        rightHand: rightHandData,
        dualHandInteraction: isPinch ? 'two_hand_pinch_zoom' : 'none',
        dualHandDistance: 0.5,
        landmarks: rightHandData.landmarks,
        gesture,
        pinchDistance: rightHandData.pinchDistance,
        pointerPos: rightHandData.pointerPos,
        isPinching: rightHandData.isPinching,
        confidence: 0.95,
      };

      setHandState(fakeState);
      if (sceneRef.current) {
        sceneRef.current.updateHandTracking(fakeState);
      }
      showToast('Simulasi 2 Tangan Aktif: Tangan Kiri (Ungu) & Kanan (Sian)', 'info');
      return;
    }

    const singleHandData = {
      handType: 'right' as const,
      landmarks: Array.from({ length: 21 }, (_, i) => ({
        x: 0.5 + (i === 8 ? 0.05 : 0),
        y: 0.5 + (i === 8 ? -0.1 : 0),
        z: 0.1,
      })),
      gesture,
      pinchDistance: isPinch ? 0.04 : 0.18,
      pointerPos: { x: 0, y: 0 },
      isPinching: isPinch,
      confidence: 1,
    };

    const fakeState: HandTrackingState = {
      detected: true,
      handType: 'right',
      handsCount: 1,
      hands: [singleHandData],
      rightHand: singleHandData,
      dualHandInteraction: 'none',
      landmarks: singleHandData.landmarks,
      gesture,
      pinchDistance: isPinch ? 0.04 : 0.18,
      pointerPos: { x: 0, y: 0 },
      isPinching: isPinch,
      confidence: 1,
    };

    setHandState(fakeState);
    if (sceneRef.current) {
      sceneRef.current.updateHandTracking(fakeState);
    }
    if (gesture === 'peace') {
      handleAddNode();
    } else if (gesture === 'thumbs_up') {
      handleZoomIn();
    } else if (gesture === 'thumbs_down') {
      handleZoomOut();
    } else if (gesture === 'open_palm') {
      handleRotateRight();
    }
  };

  // 12. Audio Mute Toggle
  const handleToggleAudio = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    soundFx.setMuted(next);
  };

  // 13. Layout Change
  const handleSelectLayout = (mode: LayoutMode) => {
    setCurrentLayout(mode);
    if (sceneRef.current) {
      sceneRef.current.applyLayout(mode);
    }
    soundFx.playSelect(650);
    showToast(`Tata letak 3D diubah ke: ${mode.toUpperCase()}`, 'info');
  };

  // 14. Camera Navigation Handlers (Zoom & Screen Rotation)
  const handleCameraView = (view: 'angled' | 'top' | 'front' | 'focusNode') => {
    if (sceneRef.current) {
      sceneRef.current.resetCameraView(view);
    }
    soundFx.playSelect(550);
  };

  const handleZoomIn = () => {
    sceneRef.current?.zoomCamera(1.5);
    showToast('Zoom In (+)', 'info');
  };

  const handleZoomOut = () => {
    sceneRef.current?.zoomCamera(-1.5);
    showToast('Zoom Out (-)', 'info');
  };

  const handleRotateLeft = () => {
    sceneRef.current?.rotateCamera(Math.PI / 6);
    showToast('Putar Layar Kiri (30°)', 'info');
  };

  const handleRotateRight = () => {
    sceneRef.current?.rotateCamera(-Math.PI / 6);
    showToast('Putar Layar Kanan (30°)', 'info');
  };

  const handleToggleAutoOrbit = () => {
    const active = sceneRef.current?.toggleAutoRotate();
    setIsAutoRotating(Boolean(active));
    showToast(active ? 'Auto-Orbit 360° Berjalan' : 'Auto-Orbit Berhenti', 'info');
  };

  // 15. Export Functions
  const handleExportMarkdown = () => {
    const lines = [
      `# MindFlow VR: ${TEMPLATES[audience].title}`,
      `*Target Audiens: ${audience.toUpperCase()}*\n`,
      `## Daftar Konsep Spasial (${nodes.length} Node)`,
    ];

    nodes.forEach((n, idx) => {
      lines.push(`### ${idx + 1}. [${n.category.toUpperCase()}] ${n.label}`);
      if (n.description) lines.push(`- ${n.description}`);
      if (n.tags?.length) lines.push(`- *Tag:* ${n.tags.join(', ')}`);
    });

    lines.push(`\n## Hubungan & Relasi Kausal (${links.length} Tautan)`);
    links.forEach((l) => {
      const src = nodes.find((n) => n.id === l.source)?.label || l.source;
      const tgt = nodes.find((n) => n.id === l.target)?.label || l.target;
      lines.push(`- **${src}** ➔ [${l.label || l.relationship || 'Terkait'}] ➔ **${tgt}**`);
    });

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    showToast('Kerangka peta pikiran berhasil disalin ke Clipboard (Markdown)!', 'success');
  };

  const handleExportJson = () => {
    const data = {
      app: 'MindFlow VR',
      exportedAt: new Date().toISOString(),
      audience,
      nodes,
      links,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindflow-vr-${audience}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File JSON peta pikiran berhasil diunduh', 'success');
  };

  const handleCaptureScreenshot = () => {
    const canvas = canvasMountRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindflow-3d-scene-${Date.now()}.png`;
      a.click();
      showToast('Tangkapan layar 3D resolusi tinggi berhasil disimpan!', 'success');
    } catch {
      showToast('Gagal menangkap canvas layar', 'error');
    }
  };

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) handleDeleteNode();
      } else if (e.key === 'Escape') {
        setSelectedNode(null);
        setIsConnectingMode(false);
        setConnectingSourceId(null);
        if (sceneRef.current) {
          sceneRef.current.setConnectingMode(null);
          sceneRef.current.setSelectedNode(null);
        }
      } else if (e.key.toLowerCase() === 'n') {
        handleAddNode();
      } else if (e.key.toLowerCase() === 'c') {
        handleStartConnect();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '[' || e.key.toLowerCase() === 'r') {
        handleRotateLeft();
      } else if (e.key === ']') {
        handleRotateRight();
      } else if (e.key.toLowerCase() === 'o') {
        handleToggleAutoOrbit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090e]">
      {/* 3D WebGL Canvas Viewport (100% Unobstructed Center) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-default select-none z-0"
      />

      {/* VR Stereoscopic Overlay */}
      <VRStereoView isActive={isStereoVR} onExit={() => setIsStereoVR(false)} />

      {/* Top Header HUD */}
      <HeaderHUD
        currentAudience={audience}
        onAudienceChange={handleAudienceChange}
        handState={handState}
        isWebcamActive={isWebcamActive}
        onToggleWebcam={handleToggleWebcam}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
        isStereoVR={isStereoVR}
        onToggleStereoVR={() => setIsStereoVR(!isStereoVR)}
        onOpenHandGuide={() => setIsGuideModalOpen(true)}
        onResetScene={handleResetScene}
        nodeCount={nodes.length}
        linkCount={links.length}
      />

      {/* Floating Hover Indicator in Viewport */}
      {hoveredNode && !selectedNode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full shadow"
            style={{ backgroundColor: hoveredNode.color }}
          />
          <span className="text-xs font-bold text-white">{hoveredNode.label}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            [{hoveredNode.category.toUpperCase()}]
          </span>
        </div>
      )}

      {/* Connecting mode banner */}
      {isConnectingMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-amber-500/20 border border-amber-500/50 text-amber-200 px-5 py-2 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-xs font-semibold">
            Mode Hubungkan: Klik ide lain di kanvas 3D untuk menyambungkan relasi
          </span>
          <button
            onClick={() => {
              setIsConnectingMode(false);
              setConnectingSourceId(null);
              if (sceneRef.current) sceneRef.current.setConnectingMode(null);
            }}
            className="text-[11px] font-bold underline hover:text-white"
          >
            Batalkan
          </button>
        </div>
      )}

      {/* Webcam Hand Tracking Miniature HUD */}
      <HandCameraOverlay
        isActive={isWebcamActive}
        onClose={handleToggleWebcam}
        handState={handState}
        videoRef={videoRef}
        onSimulateGesture={handleSimulateGesture}
      />

      {/* Bottom Unified Control Dock (Collapsible) */}
      <BottomControlDock
        selectedNode={selectedNode}
        onAddNode={handleAddNode}
        onEditNode={() => setIsEditModalOpen(true)}
        onDeleteNode={handleDeleteNode}
        onStartConnect={handleStartConnect}
        isConnectingMode={isConnectingMode}
        onAiExpand={() => handleAiExpand()}
        isAiLoading={isAiLoading}
        currentLayout={currentLayout}
        onSelectLayout={handleSelectLayout}
        onCameraView={handleCameraView}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onToggleAutoOrbit={handleToggleAutoOrbit}
        isAutoRotating={isAutoRotating}
        onExportMarkdown={handleExportMarkdown}
        onExportJson={handleExportJson}
        onCaptureScreenshot={handleCaptureScreenshot}
        currentAudience={audience}
      />

      {/* Node Detail Edit Modal */}
      <NodeDetailModal
        node={selectedNode}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveNode}
        onAiExpandWithCustomPrompt={(node, prompt) => {
          setIsEditModalOpen(false);
          handleAiExpand(prompt);
        }}
        isAiLoading={isAiLoading}
      />

      {/* Hand Gesture Guide Modal */}
      <HandGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onActivateWebcam={handleToggleWebcam}
        isWebcamActive={isWebcamActive}
      />

      {/* Global Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                : toastMessage.type === 'info'
                ? 'bg-slate-900/90 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900/90 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
