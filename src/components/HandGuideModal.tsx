/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Hand, Sparkles, MousePointer, Info } from 'lucide-react';

interface HandGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateWebcam: () => void;
  isWebcamActive: boolean;
}

export const HandGuideModal: React.FC<HandGuideModalProps> = ({
  isOpen,
  onClose,
  onActivateWebcam,
  isWebcamActive,
}) => {
  if (!isOpen) return null;

  const gestures = [
    {
      title: 'Jepit (Pinch)',
      subtitle: 'Jari Jempol + Telunjuk saling menempel',
      action: 'Memegang & Menarik Objek 3D',
      desc: 'Tempelkan ujung jari telunjuk dan jempol. Saat laser mengenai bola ide, tahan jepitan untuk menyeretnya ke koordinat 3D manapun.',
      emoji: '🤏',
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    },
    {
      title: 'Arahkan (Point)',
      subtitle: 'Hanya jari telunjuk teracung ke depan',
      action: 'Laser Holografik Jarak Jauh',
      desc: 'Arahkan jari telunjuk ke arah kamera seperti remote pointer. Sinar laser 3D akan keluar dan menembak ide untuk memilih atau menginspeksi.',
      emoji: '☝️',
      color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    },
    {
      title: 'Dua Jari (Peace / V-Sign)',
      subtitle: 'Jari telunjuk & tengah membentuk huruf V',
      action: 'Buat Cabang Konsep Baru',
      desc: 'Tunjukkan gestur salam damai (V-sign) di depan kamera untuk langsung melahirkan node ide baru di titik sinar laser berada.',
      emoji: '✌️',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    },
    {
      title: 'Telapak Terbuka (Open Palm)',
      subtitle: 'Semua 5 jari terbuka tegak',
      action: 'Memutar Sudut Pandang Dunia 3D',
      desc: 'Gerakkan telapak tangan ke kiri/kanan atau atas/bawah untuk memutar rotasi kanvas 3D tanpa menyentuh mouse.',
      emoji: '🖐️',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    },
    {
      title: 'Hubungkan 2 Node Sekaligus',
      subtitle: 'Tangan Kiri & Kanan menjepit bersamaan',
      action: 'Interaksi Dua Tangan 🔗',
      desc: 'Jepit Konsep A dengan tangan kiri, lalu jepit Konsep B dengan tangan kanan. Garis relasi 3D akan otomatis terhubung seketika!',
      emoji: '👐',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    },
    {
      title: 'Zoom Spasial Dua Tangan',
      subtitle: 'Kedua tangan menjepit di ruang kosong',
      action: 'Dual Pinch to Zoom 🔍',
      desc: 'Jepit kedua tangan di area kosong lalu lebarkan/persempit jarak kedua tangan untuk melakukan zoom kamera 3D.',
      emoji: '🤏🤏',
      color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Panduan Interaksi Tangan (Spatial Hand Tracking)</h2>
              <p className="text-xs text-slate-400">Kontrol mind map 3D menggunakan gestur tangan alami di depan webcam</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Gestures Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {gestures.map((g, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">{g.emoji}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${g.color}`}>
                      {g.action}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-0.5">{g.title}</h3>
                  <p className="text-xs text-cyan-400/90 font-medium mb-1.5">{g.subtitle}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mouse / Trackpad Alternative */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
            <MousePointer className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block mb-0.5">Kontrol Mouse / Trackpad (Alternatif Tanpa Kamera):</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-slate-200">Klik & Geser pada Node:</strong> Memindahkan konsep dalam ruang 3D.</li>
                <li><strong className="text-slate-200">Klik & Geser pada Latar Belakang:</strong> Memutar sudut pandang (Orbit).</li>
                <li><strong className="text-slate-200">Scroll Roda Mouse:</strong> Zoom mendekat / menjauh di ruang spasial.</li>
              </ul>
            </div>
          </div>

          {/* Lighting & Environment Tips */}
          <div className="flex items-start gap-2.5 text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Tips Pelacakan Akurat:</strong> Pastikan ruangan memiliki pencahayaan cukup dan posisikan tangan sekitar 30cm – 60cm di depan lensa webcam.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            Tutup
          </button>

          {!isWebcamActive ? (
            <button
              onClick={() => {
                onActivateWebcam();
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nyalakan Kamera Tangan Sekarang</span>
            </button>
          ) : (
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Kamera Tangan Aktif
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
