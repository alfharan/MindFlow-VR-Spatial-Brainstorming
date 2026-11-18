/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  GraduationCap,
  FlaskConical,
  Palette,
  Sparkles,
  Volume2,
  VolumeX,
  Camera,
  Hand,
  Glasses,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { UserAudience, HandTrackingState } from '../types';
import { AUDIENCE_INFO } from '../templates/mindMapTemplates';

interface HeaderHUDProps {
  currentAudience: UserAudience;
  onAudienceChange: (audience: UserAudience) => void;
  handState: HandTrackingState;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  isStereoVR: boolean;
  onToggleStereoVR: () => void;
  onOpenHandGuide: () => void;
  onResetScene: () => void;
  nodeCount: number;
  linkCount: number;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  currentAudience,
  onAudienceChange,
  handState,
  isWebcamActive,
  onToggleWebcam,
  isAudioMuted,
  onToggleAudio,
  isStereoVR,
  onToggleStereoVR,
  onOpenHandGuide,
  onResetScene,
  nodeCount,
  linkCount,
}) => {
  const currentInfo = AUDIENCE_INFO[currentAudience];

  const getAudienceIcon = (aud: UserAudience) => {
    switch (aud) {
      case 'mahasiswa':
        return <GraduationCap className="w-4 h-4" />;
      case 'peneliti':
        return <FlaskConical className="w-4 h-4" />;
      case 'desainer':
        return <Palette className="w-4 h-4" />;
      case 'kreatif':
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getGestureLabel = () => {
    if (!handState.detected) return 'Menunggu Tangan...';
    if (handState.handsCount >= 2) {
      if (handState.dualHandInteraction === 'two_hand_pinch_zoom') {
        return '⚡ Zoom Spasial 2 Tangan';
      }
      if (handState.dualHandInteraction === 'two_hand_pan') {
        return '🖐️ Pan Dunia 2 Tangan';
      }
      return '👐 2 Tangan (Kiri & Kanan)';
    }
    switch (handState.gesture) {
      case 'pinch':
        return '🤏 Menjepit (Pinch)';
      case 'point':
        return '☝️ Laser Pointer';
      case 'open_palm':
        return '🖐️ Telapak Terbuka';
      case 'peace':
        return '✌️ Buat Node';
      case 'fist':
        return '✊ Tarik Kedalaman';
      default:
        return '👋 Tangan Terdeteksi';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      {/* Brand & Audience Selector Badge */}
      <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 border border-slate-700/60 rounded-2xl px-4 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5 pr-3 border-r border-slate-700/60">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
            <Hand className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">MindFlow</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                VR 3D
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Spatial Brainstorming</p>
          </div>
        </div>

        {/* Audience Profiles */}
        <div className="flex items-center gap-1">
          {(['mahasiswa', 'peneliti', 'desainer', 'kreatif'] as UserAudience[]).map((aud) => {
            const isActive = aud === currentAudience;
            const info = AUDIENCE_INFO[aud];
            return (
              <button
                key={aud}
                onClick={() => onAudienceChange(aud)}
                title={info.description}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                  {getAudienceIcon(aud)}
                </span>
                <span className="hidden sm:inline">{info.title}</span>
              </button>
            );
          })}
        </div>

        {/* Stats Pill */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-700/60 text-[11px] text-slate-400 font-mono">
          <span>{nodeCount} Konsep</span>
          <span>•</span>
          <span>{linkCount} Relasi</span>
        </div>
      </div>

      {/* Right Controls: Hand Gestures, Audio, VR Stereo, Help */}
      <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-2xl px-3 py-2 shadow-xl shadow-black/40 backdrop-blur-md">
        {/* Hand Gesture Status Indicator */}
        <div
          onClick={onToggleWebcam}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors border ${
            isWebcamActive
              ? handState.detected
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title={isWebcamActive ? 'Klik untuk matikan pelacakan tangan webcam' : 'Klik untuk aktifkan kamera pelacak tangan'}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{isWebcamActive ? getGestureLabel() : 'Aktifkan Sensor Tangan'}</span>
        </div>

        {/* Hand Guide Button */}
        <button
          onClick={onOpenHandGuide}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          title="Panduan Gestur Tangan"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Audio FX Toggle */}
        <button
          onClick={onToggleAudio}
          className={`p-2 rounded-xl transition-colors border ${
            isAudioMuted
              ? 'bg-slate-800 text-slate-500 border-slate-700'
              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
          }`}
          title={isAudioMuted ? 'Nyalakan Audio Spasial' : 'Bisukan Audio'}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* VR Stereo Mode Toggle */}
        <button
          onClick={onToggleStereoVR}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            isStereoVR
              ? 'bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Mode Stereoskopis Dual Lens VR (Cardboard / Headset)"
        >
          <Glasses className="w-4 h-4" />
          <span className="hidden sm:inline">VR Headset</span>
        </button>

        {/* Reset Template */}
        <button
          onClick={onResetScene}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          title="Muat Ulang Template Profil Ini"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
