/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Glasses } from 'lucide-react';

interface VRStereoViewProps {
  isActive: boolean;
  onExit: () => void;
}

export const VRStereoView: React.FC<VRStereoViewProps> = ({ isActive, onExit }) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex">
      {/* Center divider line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-1 -translate-x-1/2 bg-black flex items-center justify-center pointer-events-auto">
        <button
          onClick={onExit}
          className="p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white shadow-xl hover:scale-110 transition-transform"
          title="Keluar dari Mode VR Headset"
        >
          <X className="w-5 h-5 text-rose-400" />
        </button>
      </div>

      {/* Left Eye Reticle */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center relative">
        <div className="w-3 h-3 rounded-full border border-cyan-400/80 bg-cyan-400/20" />
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-slate-800 text-[11px] text-cyan-300">
          <Glasses className="w-3.5 h-3.5" />
          <span>Mata Kiri (VR Eye L)</span>
        </div>
      </div>

      {/* Right Eye Reticle */}
      <div className="w-1/2 h-full flex flex-col items-center justify-center relative">
        <div className="w-3 h-3 rounded-full border border-cyan-400/80 bg-cyan-400/20" />
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-slate-800 text-[11px] text-cyan-300">
          <Glasses className="w-3.5 h-3.5" />
          <span>Mata Kanan (VR Eye R)</span>
        </div>
      </div>
    </div>
  );
};
