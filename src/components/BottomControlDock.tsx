/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Link as LinkIcon,
  Sparkles,
  Layers,
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Edit3,
  Network,
  Sun,
  GitFork,
  Orbit,
  Maximize2,
  FileText,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { MindNode, LayoutMode, UserAudience } from '../types';

interface BottomControlDockProps {
  selectedNode: MindNode | null;
  onAddNode: () => void;
  onEditNode: () => void;
  onDeleteNode: () => void;
  onStartConnect: () => void;
  isConnectingMode: boolean;
  onAiExpand: () => void;
  isAiLoading: boolean;
  currentLayout: LayoutMode;
  onSelectLayout: (layout: LayoutMode) => void;
  onCameraView: (view: 'angled' | 'top' | 'front' | 'focusNode') => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onToggleAutoOrbit?: () => void;
  isAutoRotating?: boolean;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  onCaptureScreenshot: () => void;
  currentAudience: UserAudience;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  selectedNode,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onStartConnect,
  isConnectingMode,
  onAiExpand,
  isAiLoading,
  currentLayout,
  onSelectLayout,
  onCameraView,
  onZoomIn,
  onZoomOut,
  onRotateLeft,
  onRotateRight,
  onToggleAutoOrbit,
  isAutoRotating = false,
  onExportMarkdown,
  onExportJson,
  onCaptureScreenshot,
  currentAudience,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodes' | 'layout' | 'camera' | 'export'>('nodes');

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center w-[94vw] max-w-[920px]">
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="mb-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-700/80 shadow-lg text-xs font-semibold backdrop-blur-md transition-all"
        title="Toggle Dock (Shortcut: H)"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tampilkan Panel Kontrol</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Mode Zen / Sembunyikan</span>
          </>
        )}
      </button>

      {/* Main Glassmorphic Dock Container */}
      {!isCollapsed && (
        <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/60 backdrop-blur-md transition-all">
          {/* Top Tab Switcher */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('nodes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'nodes'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ide & Node</span>
              </button>

              <button
                onClick={() => setActiveTab('layout')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'layout'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tata Ruang 3D</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'camera'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Sudut Pandang</span>
              </button>

              <button
                onClick={() => setActiveTab('export')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'export'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Ekspor & Dokumen</span>
              </button>
            </div>

            {/* Selected Node Status preview in dock header */}
            {selectedNode && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="text-slate-400">Terpilih:</span>
                <span
                  className="font-bold px-2 py-0.5 rounded text-[11px] truncate max-w-[150px]"
                  style={{
                    backgroundColor: `${selectedNode.color}25`,
                    color: selectedNode.color,
                    borderColor: `${selectedNode.color}50`,
                  }}
                >
                  {selectedNode.label}
                </span>
              </div>
            )}
          </div>

          {/* Tab Content Panel */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {activeTab === 'nodes' && (
              <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {/* Add Node Button */}
                  <button
                    onClick={onAddNode}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/25 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Konsep 3D</span>
                  </button>

                  {/* Connect Nodes */}
                  <button
                    onClick={onStartConnect}
                    disabled={!selectedNode}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isConnectingMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md'
                        : selectedNode
                        ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                    }`}
                    title={
                      selectedNode
                        ? 'Klik node target lain di ruang 3D untuk menyambungkan kabel ide'
                        : 'Pilih satu node terlebih dahulu'
                    }
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{isConnectingMode ? 'Pilih Target di 3D...' : 'Hubungkan Relasi'}</span>
                  </button>

                  {/* Edit Selected Node */}
                  {selectedNode && (
                    <button
                      onClick={onEditNode}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Rincian</span>
                    </button>
                  )}

                  {/* Delete Selected Node */}
                  {selectedNode && (
                    <button
                      onClick={onDeleteNode}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all"
                      title="Hapus konsep ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* AI Co-pilot Expand Idea Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onAiExpand}
                    disabled={!selectedNode || isAiLoading}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                      selectedNode && !isAiLoading
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25 active:scale-95'
                        : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                    }`}
                    title="Turunkan cabang ide baru secara cerdas menggunakan Gemini AI"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin text-purple-300' : 'text-purple-300'}`} />
                    <span>{isAiLoading ? 'Gemini Berpikir...' : 'AI Ekspansi Cabang'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="flex flex-wrap items-center gap-2 w-full">
                <span className="text-xs text-slate-400 font-medium mr-1">Algoritma Penataan 3D:</span>
                {[
                  { id: 'force3d', label: 'Fisika Gravitasi (3D Force)', icon: Network },
                  { id: 'radial', label: 'Tata Surya (Solar Orbit)', icon: Sun },
                  { id: 'tree', label: 'Pohon Hierarki (Mind Tree)', icon: GitFork },
                  { id: 'helix', label: 'Heliks Galaksi (Helix)', icon: Orbit },
                ].map((item) => {
                  const Icon = item.icon;
                  const isCur = currentLayout === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectLayout(item.id as LayoutMode)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isCur
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'camera' && (
              <div className="flex flex-col gap-2.5 w-full">
                {/* Presets Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium mr-1">Preset Kamera:</span>
                  <button
                    onClick={() => onCameraView('angled')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    <Orbit className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Perspektif 3D</span>
                  </button>
                  <button
                    onClick={() => onCameraView('top')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Bird's Eye (Atas)</span>
                  </button>
                  <button
                    onClick={() => onCameraView('front')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tampak Depan</span>
                  </button>
                  {selectedNode && (
                    <button
                      onClick={() => onCameraView('focusNode')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/40"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Fokus ke Node Terpilih</span>
                    </button>
                  )}
                </div>

                {/* Direct Zoom & Screen Rotation Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400 font-medium mr-1">Kontrol Layar & Zoom:</span>
                  {/* Zoom In */}
                  <button
                    onClick={onZoomIn}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all"
                    title="Zoom In (Dekati kanvas 3D) - Gestur: 👍 Jempol Atas / Pinch Lebar"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Zoom In (+)</span>
                  </button>
                  {/* Zoom Out */}
                  <button
                    onClick={onZoomOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all"
                    title="Zoom Out (Jauhi kanvas 3D) - Gestur: 👎 Jempol Bawah / Pinch Rapat"
                  >
                    <ZoomOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Zoom Out (-)</span>
                  </button>

                  {/* Rotate Left */}
                  <button
                    onClick={onRotateLeft}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all"
                    title="Putar Layar ke Kiri - Gestur: Sapuan Telapak / Putar Setir Dua Tangan"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Putar Kiri</span>
                  </button>
                  {/* Rotate Right */}
                  <button
                    onClick={onRotateRight}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition-all"
                    title="Putar Layar ke Kanan - Gestur: Sapuan Telapak / Putar Setir Dua Tangan"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Putar Kanan</span>
                  </button>

                  {/* Auto-Orbit 360 */}
                  <button
                    onClick={onToggleAutoOrbit}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isAutoRotating
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                    title="Mode Putar Layar Otomatis 360 Derajat untuk Presentasi"
                  >
                    <Orbit className={`w-3.5 h-3.5 ${isAutoRotating ? 'text-purple-400 animate-spin' : 'text-slate-400'}`} />
                    <span>{isAutoRotating ? 'Auto-Orbit Aktif' : 'Auto-Orbit 360°'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={onExportMarkdown}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Salin Kerangka (Markdown)</span>
                  </button>
                  <button
                    onClick={onExportJson}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unduh File (.json)</span>
                  </button>
                  <button
                    onClick={onCaptureScreenshot}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tangkapan Layar 3D (PNG)</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">
                  <span>Profil Aktif: </span>
                  <span className="font-semibold text-slate-200 capitalize">{currentAudience}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
