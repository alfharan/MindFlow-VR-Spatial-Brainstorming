/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { HandTrackingState, HandGestureType, SingleHandData } from '../types';

interface HandCameraOverlayProps {
  isActive: boolean;
  onClose: () => void;
  handState: HandTrackingState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSimulateGesture?: (gesture: HandGestureType, isDual?: boolean) => void;
}

export const HandCameraOverlay: React.FC<HandCameraOverlayProps> = ({
  isActive,
  onClose,
  handState,
  videoRef,
  onSimulateGesture,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Draw 2D landmarks on the preview canvas for BOTH hands
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const handsToDraw: SingleHandData[] =
      handState.hands && handState.hands.length > 0
        ? handState.hands
        : handState.detected && handState.landmarks.length >= 21
        ? [
            {
              handType: handState.handType === 'left' ? 'left' : 'right',
              landmarks: handState.landmarks,
              gesture: handState.gesture,
              pinchDistance: handState.pinchDistance,
              pointerPos: handState.pointerPos,
              isPinching: handState.isPinching,
              confidence: handState.confidence,
            },
          ]
        : [];

    if (handsToDraw.length > 0) {
      const w = canvas.width;
      const h = canvas.height;

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
        [5, 9], [9, 13], [13, 17],            // Palm base
      ];

      handsToDraw.forEach((hand) => {
        const isLeft = hand.handType === 'left';
        const baseColor = isLeft ? '#c084fc' : '#38bdf8';
        const pinchColor = isLeft ? '#f472b6' : '#34d399';
        const tipColor = isLeft ? '#e879f9' : '#10b981';

        // Draw bone connections
        ctx.lineWidth = 2;
        ctx.strokeStyle = hand.isPinching ? pinchColor : baseColor;

        connections.forEach(([i, j]) => {
          const p1 = hand.landmarks[i];
          const p2 = hand.landmarks[j];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo((1 - p1.x) * w, p1.y * h); // mirror X
            ctx.lineTo((1 - p2.x) * w, p2.y * h);
            ctx.stroke();
          }
        });

        // Draw landmark points
        hand.landmarks.forEach((pt, idx) => {
          const isTip = [4, 8, 12, 16, 20].includes(idx);
          ctx.fillStyle = isTip ? (hand.isPinching ? tipColor : baseColor) : '#ffffff';
          ctx.beginPath();
          ctx.arc((1 - pt.x) * w, pt.y * h, isTip ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw laser ray origin indicator at index tip
        const indexTip = hand.landmarks[8];
        if (indexTip) {
          ctx.strokeStyle = isLeft ? '#f472b6' : '#38bdf8';
          ctx.beginPath();
          ctx.arc((1 - indexTip.x) * w, indexTip.y * h, 7, 0, Math.PI * 2);
          ctx.stroke();

          // Hand label text on wrist
          const wrist = hand.landmarks[0];
          if (wrist) {
            ctx.fillStyle = baseColor;
            ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
            ctx.fillText(isLeft ? 'TANGAN KIRI' : 'TANGAN KANAN', (1 - wrist.x) * w - 24, wrist.y * h + 14);
          }
        }
      });

      // If dual-hand interaction detected, draw bridge line between both index fingers
      if (handsToDraw.length >= 2 && handsToDraw[0].landmarks[8] && handsToDraw[1].landmarks[8]) {
        const p1 = handsToDraw[0].landmarks[8];
        const p2 = handsToDraw[1].landmarks[8];
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = handState.dualHandInteraction === 'two_hand_pinch_zoom' ? '#f59e0b' : '#a855f7';
        ctx.beginPath();
        ctx.moveTo((1 - p1.x) * w, p1.y * h);
        ctx.lineTo((1 - p2.x) * w, p2.y * h);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [handState, isActive]);

  return (
    <div
      className={`fixed bottom-24 right-4 z-30 transition-all duration-300 ${
        isActive
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl shadow-black/60 backdrop-blur-md w-72 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kamera Spasial AI</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              DUAL HAND
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white"
              title={isMinimized ? 'Perbesar' : 'Perkecil'}
            >
              {isMinimized ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Tutup Kamera"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video feed + Canvas skeleton overlay (Always mounted in DOM) */}
        <div
          className={`relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 mb-2.5 ${
            isMinimized ? 'hidden' : 'block'
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            width={240}
            height={135}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {!handState.detected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/60">
              <span className="text-xs text-amber-300 font-medium">Arahkan Tangan ke Kamera</span>
              <span className="text-[10px] text-slate-400 mt-1">Dukung 1 atau 2 tangan sekaligus</span>
            </div>
          )}
        </div>

        {/* Dual Hand Status Metrics */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tangan Terdeteksi:</span>
            <span className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200">
              {handState.handsCount === 2 ? '👐 2 Tangan Aktif' : handState.handsCount === 1 ? '👋 1 Tangan' : 'Menunggu...'}
            </span>
          </div>

          {/* Left Hand Indicator */}
          {handState.leftHand && (
            <div className="flex items-center justify-between bg-purple-950/30 border border-purple-500/20 px-2 py-1 rounded-lg">
              <span className="text-purple-300 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                Kiri (Ungu):
              </span>
              <span className="text-[10px] font-bold text-purple-200">
                {handState.leftHand.isPinching ? '🤏 Menjepit' : handState.leftHand.gesture.toUpperCase()}
              </span>
            </div>
          )}

          {/* Right Hand Indicator */}
          {handState.rightHand && (
            <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/20 px-2 py-1 rounded-lg">
              <span className="text-cyan-300 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                Kanan (Sian):
              </span>
              <span className="text-[10px] font-bold text-cyan-200">
                {handState.rightHand.isPinching ? '🤏 Menjepit' : handState.rightHand.gesture.toUpperCase()}
              </span>
            </div>
          )}

          {/* Dual Action Active Banner */}
          {handState.dualHandInteraction !== 'none' && (
            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-200 px-2 py-1 rounded-lg text-center font-bold text-[10px]">
              {handState.dualHandInteraction === 'two_hand_pinch_zoom'
                ? '⚡ DUAL-PINCH: ZOOM SPASIAL AKTIF'
                : handState.dualHandInteraction === 'two_hand_pan'
                ? '🖐️ DUAL-PALM: PAN DUNIA 3D'
                : '🔗 MODE HUBUNGKAN 2 KONSEP'}
            </div>
          )}
        </div>

        {/* Virtual Gesture Shortcuts (Useful for testing 1 or 2 hands) */}
        <div className="mt-2.5 pt-2 border-t border-slate-800">
          <div className="text-[10px] text-slate-400 font-medium mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Simulasi Cepat (1 / 2 Tangan):</span>
          </div>
          <div className="grid grid-cols-3 gap-1 mb-1">
            <button
              onClick={() => onSimulateGesture?.('pinch')}
              className="px-1.5 py-1 text-[10px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:bg-cyan-600"
              title="Gestur Jepit (Pinch) untuk ambil node"
            >
              🤏 Jepit
            </button>
            <button
              onClick={() => onSimulateGesture?.('thumbs_up')}
              className="px-1.5 py-1 text-[10px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 active:bg-emerald-600 active:text-white"
              title="Gestur Jempol Atas untuk Zoom In"
            >
              👍 Zoom In
            </button>
            <button
              onClick={() => onSimulateGesture?.('thumbs_down')}
              className="px-1.5 py-1 text-[10px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 active:bg-rose-600 active:text-white"
              title="Gestur Jempol Bawah untuk Zoom Out"
            >
              👎 Zoom Out
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 mb-1">
            <button
              onClick={() => onSimulateGesture?.('open_palm')}
              className="px-1.5 py-1 text-[10px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 active:bg-cyan-600 active:text-white"
              title="Gestur Telapak Terbuka untuk Putar Layar (Rotate Orbit)"
            >
              🔄 Putar Layar
            </button>
            <button
              onClick={() => onSimulateGesture?.('peace')}
              className="px-1.5 py-1 text-[10px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 active:bg-purple-600 active:text-white"
              title="Gestur Dua Jari (V-Sign) untuk melahirkan node baru"
            >
              ✌️ Buat Node
            </button>
          </div>
          <button
            onClick={() => onSimulateGesture?.('pinch', true)}
            className="w-full py-1 text-[10px] font-bold rounded bg-gradient-to-r from-purple-600/30 to-cyan-600/30 hover:from-purple-600/50 hover:to-cyan-600/50 text-slate-200 border border-purple-500/40"
          >
            👐 Uji Zoom & Rotasi 2 Tangan
          </button>
        </div>
      </div>
    </div>
  );
};
