import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import OpenAI from 'openai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 10000;
const pool = process.env.DATABASE_URL ? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

async function initDb() {
  if (!pool) return;
  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}
app.get('/api/health', async (_req, res) => {
  try { if (pool) await pool.query('SELECT 1'); res.json({ ok: true, database: !!pool }); }
  catch { res.status(503).json({ ok: false, database: false }); }
});
app.get('/api/plans', async (_req, res) => {
  if (!pool) return res.json([{ id: 0, name: 'Free Starter', price_ngn: 0, duration_days: 30, features: ['Sample practice','Basic progress tracking'] }]);
  try {
    const { rows } = await pool.query('SELECT id,name,price_ngn,duration_days,features FROM plans WHERE active=true ORDER BY price_ngn');
    res.json(rows);
  } catch { res.status(500).json({ error: 'Unable to load plans.' }); }
});
app.put('/api/admin/plans/:id', async (req, res) => {
  if (!process.env.ADMIN_SECRET || req.get('x-admin-secret') !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Admin authentication required.' });
  const { name, price_ngn, duration_days, features, active } = req.body || {};
  if (!name || !Number.isInteger(price_ngn) || price_ngn < 0 || !Number.isInteger(duration_days) || duration_days < 1 || !Array.isArray(features)) return res.status(400).json({ error: 'Invalid plan details.' });
  try {
    const { rows } = await pool.query(
      'UPDATE plans SET name=$1,price_ngn=$2,duration_days=$3,features=$4,active=$5 WHERE id=$6 RETURNING id,name,price_ngn,duration_days,features,active',
      [name, price_ngn, duration_days, JSON.stringify(features), active !== false, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found.' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Unable to update plan.' }); }
});
app.post('/api/assess', async (req, res) => {
  const { skill, prompt, response } = req.body || {};
  if (!['writing','speaking','reading','listening'].includes(skill) || typeof prompt !== 'string' || typeof response !== 'string' || !response.trim() || response.length > 12000) return res.status(400).json({ error: 'Please provide a valid skill, task and answer (maximum 12,000 characters).' });
  if (!openai) return res.status(503).json({ error: 'AI marking is not configured yet. Add OPENAI_API_KEY in Render environment settings.' });
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an IELTS preparation tutor. Give cautious practice feedback, never claim to be an official IELTS examiner. Return JSON with estimated_band (number 0-9 in 0.5 steps), strengths (array), improvements (array), corrections (array of objects with original and suggestion), and summary (string). For writing, assess task response/achievement, coherence, lexical resource and grammar. For speaking, note that text-only input cannot assess pronunciation or fluency reliably. For reading/listening, do not invent a score without answer key; explain that a supplied marking key is needed.' },
        { role: 'user', content: JSON.stringify({ skill, prompt, response }) }
      ]
    });
    const feedback = JSON.parse(completion.choices[0].message.content || '{}');
    if (pool) await pool.query('INSERT INTO practice_attempts(skill,prompt,response,estimated_band,feedback) VALUES($1,$2,$3,$4,$5)', [skill,prompt,response,feedback.estimated_band ?? null,JSON.stringify(feedback)]);
    res.json({ ...feedback, disclaimer: 'AI-generated practice estimate only; not an official IELTS score.' });
  } catch { res.status(500).json({ error: 'Assessment failed. Please try again.' }); }
});
const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
initDb().then(() => app.listen(port, () => console.log('IELTS Guru listening on ' + port))).catch(err => { console.error('Startup failed', err); process.exit(1); });