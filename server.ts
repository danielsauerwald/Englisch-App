import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { processChat, processEvaluation } from './src/server/geminiService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// API Endpoints
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    buildTime: '2026-10-20T12:00:00Z',
    name: 'DriveEnglish Car Mode',
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const result = await processChat(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error?.message || 'Chat processing error' });
  }
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const result = await processEvaluation(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Evaluate error:', error);
    res.status(500).json({ error: error?.message || 'Evaluation processing error' });
  }
});

// Serve static assets in production
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`DriveEnglish server running on http://0.0.0.0:${port}`);
});
