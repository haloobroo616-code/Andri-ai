import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

const app = express();
const PORT = 3000;

app.use(express.json());

// Andri AI Client Logic
const BASE_URL = 'https://felo.ai';
const ACCOUNT_URL = 'https://account.felo.ai';

class AndriAIClient {
  private _token: string | null = null;
  private _deviceId = crypto.randomBytes(16).toString('hex');
  private _visitor = crypto.randomUUID();

  private request(method: string, baseUrl: string, urlPath: string, { body, headers: extra = {} }: any = {}) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const url = new URL(urlPath, baseUrl);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137.0.0.0 Mobile Safari/537.36',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...extra,
        },
        timeout: 30000,
      }, res => {
        const chunks: any[] = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed;
          try { parsed = JSON.parse(raw); } catch { return resolve({ raw }); }
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(parsed?.detail?.message || parsed?.message || `HTTP ${res.statusCode}`));
          }
          resolve(parsed);
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  async search(query: string, lang = 'id') {
    console.log(`[AndriAIClient] Mencari: "${query}" dalam bahasa: ${lang}`);
    const body = {
      query,
      search_uuid: crypto.randomUUID(),
      visitor: this._visitor,
      lang: '',
      agent_lang: lang,
      search_options: { langcode: lang },
      search_video: true,
      mode: 'concise',
    };

    const url = new URL('/api/search/threads', BASE_URL);
    const data = JSON.stringify(body);

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': `${BASE_URL}/`,
          'Origin': BASE_URL,
          'Cookie': `visitor=${this._visitor}`,
          'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
        },
        timeout: 60000,
      }, res => {
        console.log(`[AndriAIClient] Status Respons: ${res.statusCode}`);
        if (res.statusCode && res.statusCode >= 400) {
          let errorBody = '';
          res.on('data', chunk => errorBody += chunk);
          res.on('end', () => {
            console.error(`[AndriAIClient] Error dari API: ${res.statusCode} - ${errorBody}`);
            reject(new Error(`API Andri AI mengembalikan ${res.statusCode}`));
          });
          return;
        }

        let buf = '';
        let answer = '';
        let sources: any[] = [];

        res.on('data', chunk => {
          buf += chunk.toString('utf8');
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const raw = trimmed.slice(5).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const ev = JSON.parse(raw);
              if (ev?.type === 'answer' && ev?.data?.text) {
                answer = ev.data.text;
              }
              if (ev?.type === 'search_result' && Array.isArray(ev?.data?.results)) {
                sources = ev.data.results.map((r: any) => ({ title: r.title, url: r.url }));
              }
            } catch (e) {}
          }
        });

        res.on('end', () => {
          resolve({ answer, sources });
        });

        res.on('error', reject);
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

const andriAI = new AndriAIClient();

// API Routes
app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const lowerQuery = query.toLowerCase().trim();
  if (lowerQuery === 'kamu siapa' || lowerQuery === 'who are you' || lowerQuery === 'siapa kamu') {
    return res.json({
      answer: "Saya adalah Andri AI yang dibuat oleh Andrison. Saya di sini untuk membantu Anda mencari informasi dengan cerdas dan cepat.",
      sources: []
    });
  }

  try {
    const result: any = await andriAI.search(query);
    
    // Memberikan sentuhan personal: ganti semua identitas Felo menjadi Andri AI
    if (result && result.answer) {
      result.answer = result.answer
        .replace(/Felo\.ai/gi, 'Andri AI')
        .replace(/Felo/g, 'Andri AI')
        .replace(/tim Andri AI/gi, 'Andrison');
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
