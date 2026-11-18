/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Tag, Check, Palette } from 'lucide-react';
import { MindNode, NodeCategory } from '../types';

interface NodeDetailModalProps {
  node: MindNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: MindNode) => void;
  onAiExpandWithCustomPrompt?: (node: MindNode, prompt: string) => void;
  isAiLoading?: boolean;
}

const CATEGORIES: { id: NodeCategory; label: string; color: string }[] = [
  { id: 'core', label: 'Ide Inti / Pusat', color: '#38bdf8' },
  { id: 'concept', label: 'Konsep Dasar', color: '#60a5fa' },
  { id: 'hypothesis', label: 'Hipotesis', color: '#a78bfa' },
  { id: 'evidence', label: 'Bukti / Data', color: '#34d399' },
  { id: 'action', label: 'Tindakan / Metode', color: '#f59e0b' },
  { id: 'question', label: 'Pertanyaan / Gap', color: '#f43f5e' },
  { id: 'insight', label: 'Temuan / Wawasan', color: '#c084fc' },
  { id: 'resource', label: 'Sumber Daya', color: '#ec4899' },
];

const PRESET_COLORS = [
  '#38bdf8', // sky
  '#60a5fa', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#06b6d4', // cyan
];

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
  onAiExpandWithCustomPrompt,
  isAiLoading = false,
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<NodeCategory>('concept');
  const [color, setColor] = useState('#38bdf8');
  const [tagsInput, setTagsInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    if (node) {
      setLabel(node.label || '');
      setDescription(node.description || '');
      setCategory(node.category || 'concept');
      setColor(node.color || '#38bdf8');
      setTagsInput(node.tags ? node.tags.join(', ') : '');
      setAiPrompt('');
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      ...node,
      label: label.trim() || 'Konsep Baru',
      description: description.trim(),
      category,
      color,
      tags,
    });
    onClose();
  };

  const handleAiTrigger = () => {
    if (onAiExpandWithCustomPrompt && node) {
      onAiExpandWithCustomPrompt(node, aiPrompt);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full shadow-md"
              style={{ backgroundColor: color }}
            />
            <h2 className="text-base font-bold text-white">Rincian Konsep 3D</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          {/* Label Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Judul Konsep / Node
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Desain Eksperimental, Analisis Kausal..."
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kategori Peran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setColor(cat.color);
                  }}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-all ${
                    category === cat.id
                      ? 'bg-slate-800 border-cyan-400 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  {category === cat.id && <Check className="w-3 h-3 text-cyan-400 ml-1 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Warna Aura Holografik</span>
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white shadow-lg' : 'hover:scale-110 opacity-75'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catatan / Argumen / Deskripsi
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan konteks, kutipan jurnal, atau poin diskusi..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Tag Kata Kunci (Dipisahkan koma)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Tesis, Metodologi, Skripsi"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* AI Expansion Box directly from modal */}
          <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/30 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Brainstorm Co-Pilot (Gemini)</span>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Permintaan khusus AI (misal: 'cari kelemahan teori ini')..."
                className="flex-1 bg-slate-950/90 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
              <button
                type="button"
                onClick={handleAiTrigger}
                disabled={isAiLoading}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isAiLoading ? 'Memproses...' : 'Ekspansi'}</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/25 transition-all"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
