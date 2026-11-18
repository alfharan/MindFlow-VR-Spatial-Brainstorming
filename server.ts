/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIdx = process.argv.indexOf('--port');
const cliPort = portArgIdx !== -1 ? Number(process.argv[portArgIdx + 1]) : NaN;
const envPort =
  process.env.PORT && process.env.PORT !== process.env.NGINX_PORT
    ? Number(process.env.PORT)
    : NaN;
const PORT = !Number.isNaN(cliPort)
  ? cliPort
  : !Number.isNaN(envPort)
    ? envPort
    : Number(process.env.DEFAULT_APP_PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK on server-side with mandatory User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Fallback idea generator when Gemini API is unavailable or experiencing 503 high demand
function generateFallbackIdeas(concept: string, audience: string): any[] {
  const colorMap: Record<string, string[]> = {
    mahasiswa: ['#38bdf8', '#60a5fa', '#a78bfa', '#34d399', '#f59e0b'],
    peneliti: ['#10b981', '#34d399', '#06b6d4', '#6366f1', '#f43f5e'],
    desainer: ['#c084fc', '#e879f9', '#f472b6', '#818cf8', '#38bdf8'],
    kreatif: ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#ec4899'],
  };
  const colors = colorMap[audience] || colorMap.mahasiswa;

  if (audience === 'peneliti') {
    return [
      {
        label: `Variabel Inti: ${concept}`,
        category: 'hypothesis',
        description: `Konstruk determinan kausal yang diuji secara empiris dalam konteks ${concept}.`,
        relationship: 'causes',
        color: colors[0],
        tags: ['Variabel', 'Kausalitas'],
      },
      {
        label: `Desain Eksperimen Lapangan`,
        category: 'action',
        description: `Protokol metodologis kuantitatif dengan kelompok perlakuan dan kontrol acak.`,
        relationship: 'leads_to',
        color: colors[1],
        tags: ['Metode', 'Empiris'],
      },
      {
        label: `Efek Moderasi & Konteks`,
        category: 'concept',
        description: `Faktor lingkungan yang memperkuat atau melemahkan signifikansi korelasi.`,
        relationship: 'supports',
        color: colors[2],
        tags: ['Moderator'],
      },
      {
        label: `Batasan & Validitas Internal`,
        category: 'question',
        description: `Kondisi batas pengujian dan mitigasi bias pengukuran instrumen.`,
        relationship: 'contrasts',
        color: colors[3],
        tags: ['Validasi', 'Limitasi'],
      },
    ];
  } else if (audience === 'desainer') {
    return [
      {
        label: `Mental Model Pengguna`,
        category: 'insight',
        description: `Ekspektasi kognitif dan intuisi spasial pengguna saat berinteraksi dengan ${concept}.`,
        relationship: 'supports',
        color: colors[0],
        tags: ['UX', 'Mental Model'],
      },
      {
        label: `Gesture Affordance Spasial`,
        category: 'action',
        description: `Interaksi cubitan (pinch), sapuan telapak, dan umpan balik taktil 3D.`,
        relationship: 'subconcept',
        color: colors[1],
        tags: ['Interaksi', 'Haptic'],
      },
      {
        label: `Design System & Tipografi Ruang`,
        category: 'resource',
        description: `Standarisasi kontras visual, kedalaman z-index, dan kenyamanan visual headset.`,
        relationship: 'supports',
        color: colors[2],
        tags: ['Design System'],
      },
      {
        label: `Reduksi Beban Kognitif`,
        category: 'concept',
        description: `Menata arsitektur informasi agar alur berpikir tetap terfokus dan jernih.`,
        relationship: 'leads_to',
        color: colors[3],
        tags: ['Ergonomi'],
      },
    ];
  } else if (audience === 'kreatif') {
    return [
      {
        label: `Hook Viral Disrupsi`,
        category: 'action',
        description: `Pemicu kejutan 3 detik pertama yang mengubah persepsi audiens tentang ${concept}.`,
        relationship: 'leads_to',
        color: colors[0],
        tags: ['Viral', 'Hook'],
      },
      {
        label: `Metafora Narasi Spektakuler`,
        category: 'concept',
        description: `Menghubungkan esensi ide ini dengan analogi pop-culture yang emosional.`,
        relationship: 'supports',
        color: colors[1],
        tags: ['Storytelling'],
      },
      {
        label: `Aktivasi Imersif 360`,
        category: 'action',
        description: `Pengalaman langsung di mana audiens berpartisipasi membentuk narasi.`,
        relationship: 'leads_to',
        color: colors[2],
        tags: ['Experiential'],
      },
      {
        label: `Viral Co-Creation Loop`,
        category: 'insight',
        description: `Skema UGC di mana komunitas mengembangkan cabang cerita secara organik.`,
        relationship: 'subconcept',
        color: colors[3],
        tags: ['UGC', 'Komunitas'],
      },
    ];
  } else {
    // Default: mahasiswa
    return [
      {
        label: `Landasan Teori: ${concept}`,
        category: 'concept',
        description: `Sintesis literatur ilmiah dasar dan rujukan akademis utama untuk ${concept}.`,
        relationship: 'subconcept',
        color: colors[0],
        tags: ['Teori', 'Literatur'],
      },
      {
        label: `Hipotesis Penelitian Terukur`,
        category: 'hypothesis',
        description: `Pernyataan dugaan ilmiah yang akan diuji melalui analisis data empiris.`,
        relationship: 'supports',
        color: colors[1],
        tags: ['Hipotesis'],
      },
      {
        label: `Instrumen Pengumpulan Data`,
        category: 'action',
        description: `Kuesioner terstandarisasi, observasi lapangan, atau wawancara mendalam.`,
        relationship: 'leads_to',
        color: colors[2],
        tags: ['Metodologi'],
      },
      {
        label: `Analisis & Uji Signifikansi`,
        category: 'resource',
        description: `Verifikasi statistik dan interpretasi temuan terhadap implikasi nyata.`,
        relationship: 'subconcept',
        color: colors[3],
        tags: ['Analisis Data'],
      },
    ];
  }
}

// Endpoint: AI Brainstorm Idea Expansion
app.post('/api/ai/expand', async (req: Request, res: Response) => {
  const { concept, audience = 'mahasiswa', customPrompt, existingNodes = [] } = req.body;

  if (!concept || typeof concept !== 'string') {
    res.status(400).json({ error: 'Concept title is required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isApiKeyValid = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 5);

  if (!isApiKeyValid) {
    // Graceful rich generative fallback when running without configured API key
    const ideas = generateFallbackIdeas(concept, audience);
    res.json({ ideas, source: 'semantic_engine' });
    return;
  }

  const audienceGuides: Record<string, string> = {
    mahasiswa: 'Akademisi, mahasiswa skripsi dan tugas akhir. Fokus pada metodologi, teori dasar, variabel penelitian, hipotesis, dan instrumen analisis.',
    peneliti: 'Peneliti ilmiah dan ilmuwan. Fokus pada taksonomi variabel kausal, validitas internal/eksternal, desain eksperimen, dan pengujian empiris.',
    desainer: 'Desainer produk dan UI/UX spasial. Fokus pada user mental model, interaksi gestur tangan, arsitektur informasi, affordance, dan sensory feedback.',
    kreatif: 'Tim kreatif brand & storytelling. Fokus pada ide kampanye berani, analogi tak biasa, hook viral, narasi omnichannel, dan aktivasi emosional.',
  };

  const targetGuide = audienceGuides[audience] || audienceGuides.mahasiswa;

  const systemInstruction = `Kamu adalah MindFlow VR AI Co-pilot untuk aplikasi 3D Spatial Brainstorming.
Target audiens: ${targetGuide}.
Tugasmu adalah menurunkan ide baru yang relevan, mendalam, dan kaya untuk membentuk cabang mind map 3D dari ide sentral "${concept}".
Bahasa: Bahasa Indonesia yang profesional dan menginspirasi.
Hindari saran klise atau generik. Berikan 3 hingga 5 konsep turunan yang spesifik dan langsung dapat ditindaklanjuti.`;

  const promptText = customPrompt
    ? `Ide pusat: "${concept}". Permintaan spesifik: ${customPrompt}. Konteks node yang sudah ada: ${existingNodes.slice(0, 8).join(', ')}.`
    : `Ekspansi ide pusat "${concept}". Berikan 4 cabang gagasan baru yang melengkapi dan memperdalam peta pikiran spasial ini. Konteks yang ada: ${existingNodes.slice(0, 8).join(', ')}.`;

  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of candidateModels) {
    try {
      // 3.5-second timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini call timed out')), 3500)
      );

      const apiCall = ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Daftar node baru hasil brainstorming 3D',
            items: {
              type: Type.OBJECT,
              properties: {
                label: {
                  type: Type.STRING,
                  description: 'Judul konsep singkat (maksimal 4-6 kata agar terbaca jelas di 3D sprite)',
                },
                category: {
                  type: Type.STRING,
                  description: 'Kategori: concept, hypothesis, evidence, action, question, insight, resource',
                },
                description: {
                  type: Type.STRING,
                  description: 'Penjelasan ringkas 1-2 kalimat mengenai ide ini',
                },
                relationship: {
                  type: Type.STRING,
                  description: 'Hubungan dengan ide utama: supports, causes, leads_to, contrasts, subconcept',
                },
                color: {
                  type: Type.STRING,
                  description: 'Hex color yang sesuai dengan tema (misal #38bdf8, #a855f7, #34d399, #f59e0b, #ec4899)',
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '1-3 tag kata kunci',
                },
              },
              required: ['label', 'category', 'description', 'relationship'],
            },
          },
        },
      });

      const response: any = await Promise.race([apiCall, timeoutPromise]);
      const parsed = JSON.parse(response.text ?? '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        res.json({ ideas: parsed, source: 'gemini' });
        return;
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt error:`, err?.message || err);
      // If unauthorized or invalid key, other models will fail identically — break to fallback immediately
      const msg = String(err?.message || '');
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        msg.includes('403') ||
        msg.includes('401') ||
        msg.includes('unregistered') ||
        msg.includes('API key') ||
        msg.includes('API_KEY_INVALID')
      ) {
        break;
      }
    }
  }

  // If Gemini models encountered transient load spikes or errors, fallback seamlessly
  const fallbackIdeas = generateFallbackIdeas(concept, audience);
  res.json({ ideas: fallbackIdeas, source: 'semantic_fallback' });
});

// Endpoint: AI Synthesize connection between two nodes
app.post('/api/ai/connect', async (req: Request, res: Response) => {
  const { nodeA, nodeB, audience = 'mahasiswa' } = req.body;
  if (!nodeA || !nodeB) {
    res.status(400).json({ error: 'nodeA and nodeB are required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isApiKeyValid = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 5);

  if (!isApiKeyValid) {
    res.json({
      relationLabel: 'Sintesis Kausal',
      relationshipType: 'supports',
      explanation: `"${nodeA}" melengkapi dan menjadi fondasi penggerak bagi keberhasilan "${nodeB}".`,
    });
    return;
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connect call timed out')), 3000)
    );

    const apiCall = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Jelaskan sintesis mendalam atau jembatan hubungan logis antara konsep "${nodeA}" dan "${nodeB}" dalam konteks ${audience}.`,
      config: {
        systemInstruction: 'Berikan label relasi singkat (1-3 kata) dan penjelasan relasi (1 kalimat) dalam format JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relationLabel: { type: Type.STRING, description: 'Label relasi 1-3 kata' },
            relationshipType: { type: Type.STRING, description: 'supports, causes, leads_to, contrasts, atau subconcept' },
            explanation: { type: Type.STRING, description: 'Penjelasan relasi 1 kalimat' },
            bridgeConcept: { type: Type.STRING, description: 'Ide penengah jika ada (opsional)' },
          },
          required: ['relationLabel', 'relationshipType', 'explanation'],
        },
      },
    });

    const response: any = await Promise.race([apiCall, timeoutPromise]);
    const parsed = JSON.parse(response.text ?? '{}');
    res.json(parsed);
  } catch (err: any) {
    console.warn('Gemini connect fallback used:', err?.message || err);
    res.json({
      relationLabel: 'Hubungan Konseptual',
      relationshipType: 'supports',
      explanation: `Konsep "${nodeA}" memiliki relevansi timbal balik yang memperkuat "${nodeB}".`,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindFlow VR Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
