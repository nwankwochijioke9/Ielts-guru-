import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import OpenAI, { toFile } from 'openai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 10000;
const pool = process.env.DATABASE_URL ? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const cookieName = 'ielts_guru_session';
const hashToken = token => createHash('sha256').update(token).digest('hex');
async function hashPassword(password) { const salt=randomBytes(16).toString('hex'); const key=await scrypt(password,salt,64); return `${salt}:${Buffer.from(key).toString('hex')}`; }
async function verifyPassword(password, stored) { try { const [salt,hex]=stored.split(':'); const expected=Buffer.from(hex,'hex'); const actual=Buffer.from(await scrypt(password,salt,64)); return expected.length===actual.length && timingSafeEqual(expected,actual); } catch { return false; } }
function readCookie(req,name) { const part=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`)); return part ? decodeURIComponent(part.slice(name.length+1)) : ''; }
function setSessionCookie(res,token) { res.cookie(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_DAYS*24*60*60*1000}); }
async function requireLearner(req,res,next) { try { if(!pool) return res.status(503).json({error:'Account services require the database to be configured.'}); const token=readCookie(req,cookieName); if(!token) return res.status(401).json({error:'Please create an account or sign in to continue.'}); const {rows}=await pool.query('SELECT l.id,l.email FROM learner_sessions s JOIN learners l ON l.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()',[hashToken(token)]); if(!rows[0]) return res.status(401).json({error:'Your session has expired. Please sign in again.'}); req.learner=rows[0]; next(); } catch { res.status(500).json({error:'Unable to verify your account.'}); } }
async function getTrial(userId) { await pool.query('INSERT INTO free_trials(trial_id,user_id) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[String(userId),userId]); const {rows}=await pool.query('SELECT started_at,expires_at,ai_reviews_used,(expires_at>NOW()) AS active, GREATEST(0,CEIL(EXTRACT(EPOCH FROM (expires_at-NOW()))/86400))::int AS days_left FROM free_trials WHERE user_id=$1',[userId]); return rows[0]; }

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '18mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

async function initDb() {
  if (!pool) return;
  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}
app.post('/api/auth/register', async (req,res) => {
  const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||'');
  if(!/^[^\s@]+@[^\s@]+\\.[^\s@]+$/.test(email) || email.length>254) return res.status(400).json({error:'Enter a valid email address.'});
  if(password.length<10 || password.length>128) return res.status(400).json({error:'Use a password between 10 and 128 characters.'});
  if(!pool) return res.status(503).json({error:'Account creation is temporarily unavailable.'});
  try { const passwordHash=await hashPassword(password); const {rows}=await pool.query('INSERT INTO learners(email,password_hash) VALUES($1,$2) RETURNING id,email',[email,passwordHash]); const learner=rows[0]; const token=randomBytes(32).toString('base64url'); await pool.query('INSERT INTO learner_sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+($3 * INTERVAL \'1 day\'))',[learner.id,hashToken(token),SESSION_DAYS]); setSessionCookie(res,token); const trial=await getTrial(learner.id); res.status(201).json({user:learner,trial:{active:trial.active,days_left:trial.days_left,expires_at:trial.expires_at,ai_reviews_used:trial.ai_reviews_used}}); }
  catch(error) { if(error?.code==='23505') return res.status(409).json({error:'An account with this email already exists. Please sign in.'}); console.error('Registration failed:',error?.message||error); res.status(500).json({error:'Unable to create your account. Please try again.'}); }
});
app.post('/api/auth/login', async (req,res) => {
  const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||'');
  if(!pool) return res.status(503).json({error:'Sign-in is temporarily unavailable.'});
  try { const {rows}=await pool.query('SELECT id,email,password_hash FROM learners WHERE email=$1',[email]); if(!rows[0] || !(await verifyPassword(password,rows[0].password_hash))) return res.status(401).json({error:'Email or password is incorrect.'}); const learner={id:rows[0].id,email:rows[0].email}; const token=randomBytes(32).toString('base64url'); await pool.query('INSERT INTO learner_sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+($3 * INTERVAL \'1 day\'))',[learner.id,hashToken(token),SESSION_DAYS]); setSessionCookie(res,token); const trial=await getTrial(learner.id); res.json({user:learner,trial:{active:trial.active,days_left:trial.days_left,expires_at:trial.expires_at,ai_reviews_used:trial.ai_reviews_used}}); }
  catch(error) { console.error('Login failed:',error?.message||error); res.status(500).json({error:'Unable to sign in. Please try again.'}); }
});
app.get('/api/auth/me', requireLearner, async (req,res) => { const trial=await getTrial(req.learner.id); res.json({user:req.learner,trial:{active:trial.active,days_left:trial.days_left,expires_at:trial.expires_at,ai_reviews_used:trial.ai_reviews_used}}); });
app.post('/api/auth/logout', async (req,res) => { const token=readCookie(req,cookieName); if(token && pool) await pool.query('DELETE FROM learner_sessions WHERE token_hash=$1',[hashToken(token)]).catch(()=>{}); res.clearCookie(cookieName,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'}); res.json({ok:true}); });
app.get('/api/trial/status', requireLearner, async (req,res) => { const trial=await getTrial(req.learner.id); res.json({active:trial.active,days_left:trial.days_left,expires_at:trial.expires_at,ai_reviews_used:trial.ai_reviews_used,ai_reviews_remaining:Math.max(0,1-trial.ai_reviews_used)}); });
app.get('/api/health', async (_req, res) => {
  try { if (pool) await pool.query('SELECT 1'); res.json({ ok: true, database: !!pool }); }
  catch { res.status(503).json({ ok: false, database: false }); }
});
app.get('/api/plans', async (_req, res) => {
  if (!pool) return res.json([{ id: 0, name: 'Free Starter', price_ngn: 0, price_usd: 0, duration_days: 3, features: ['3-day limited trial','Sample practice questions','One introductory AI writing review','Basic progress preview'] },{id:1,name:'Basic',price_ngn:5000,price_usd:4,duration_days:30,features:['Daily IELTS practice','Limited AI writing corrections','Academic and General Training practice','Basic progress tracking']},{id:2,name:'Standard',price_ngn:12000,price_usd:9,duration_days:30,features:['Everything in Basic','More AI writing assessments and corrections','Full Listening and Reading practice sets','Speaking practice and feedback','Timed skill tests']},{id:3,name:'Premium',price_ngn:25000,price_usd:19,duration_days:30,features:['Everything in Standard','Full IELTS mock-test access','Detailed AI writing feedback and model answers','Speaking transcript and assessment','Personalised improvement recommendations','Performance history and band tracking']},{id:4,name:'VIP',price_ngn:50000,price_usd:39,duration_days:30,features:['Everything in Premium','Highest AI assessment allowance','Advanced performance analytics','Personalised study plan','Priority access to new practice materials','Comprehensive progress reports']}]);
  try {
    const { rows } = await pool.query('SELECT id,name,price_ngn,price_usd,duration_days,features FROM plans WHERE active=true ORDER BY price_ngn');
    res.json(rows);
  } catch { res.status(500).json({ error: 'Unable to load plans.' }); }
});
app.put('/api/admin/plans/:id', async (req, res) => {
  if (!process.env.ADMIN_SECRET || req.get('x-admin-secret') !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Admin authentication required.' });
  const { name, price_ngn, price_usd = 0, duration_days, features, active } = req.body || {};
  if (!name || !Number.isInteger(price_ngn) || price_ngn < 0 || !Number.isFinite(Number(price_usd)) || Number(price_usd) < 0 || !Number.isInteger(duration_days) || duration_days < 1 || !Array.isArray(features)) return res.status(400).json({ error: 'Invalid plan details.' });
  try {
    const { rows } = await pool.query(
      'UPDATE plans SET name=$1,price_ngn=$2,price_usd=$3,duration_days=$4,features=$5,active=$6 WHERE id=$7 RETURNING id,name,price_ngn,price_usd,duration_days,features,active',
      [name, price_ngn, Number(price_usd), duration_days, JSON.stringify(features), active !== false, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found.' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Unable to update plan.' }); }
});
app.post('/api/assess', requireLearner, async (req, res) => {
  const { skill, prompt, response } = req.body || {};
  if (!['writing','speaking','reading','listening'].includes(skill) || typeof prompt !== 'string' || typeof response !== 'string' || !response.trim() || response.length > 12000) return res.status(400).json({ error: 'Please provide a valid skill, task and answer (maximum 12,000 characters).' });
  const trial = await getTrial(req.learner.id);
  if (!trial.active) return res.status(403).json({ error: 'Your 3-day free trial has ended. Choose a membership plan to continue with AI marking.', code: 'TRIAL_EXPIRED' });
  if (skill !== 'writing') return res.status(403).json({ error: 'The free trial includes one introductory AI Writing review. Subscribe to unlock AI feedback for all four skills.', code: 'UPGRADE_REQUIRED' });
  if (trial.ai_reviews_used >= 1) return res.status(403).json({ error: 'You have used your free AI Writing review. Subscribe to unlock unlimited practice feedback.', code: 'TRIAL_LIMIT_REACHED' });
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
    await pool.query('INSERT INTO practice_attempts(skill,prompt,response,estimated_band,feedback) VALUES($1,$2,$3,$4,$5)', [skill,prompt,response,feedback.estimated_band ?? null,JSON.stringify(feedback)]);
    await pool.query('UPDATE free_trials SET ai_reviews_used=ai_reviews_used+1 WHERE user_id=$1',[req.learner.id]);
    res.json({ ...feedback, disclaimer: 'AI-generated practice estimate only; not an official IELTS score.' });
  } catch { res.status(500).json({ error: 'Assessment failed. Please try again.' }); }
});

app.post('/api/assess-speaking', requireLearner, async (req, res) => {
  const { audio, mimeType, testType, durationSeconds } = req.body || {};
  if (typeof audio !== 'string' || !audio || audio.length > 16 * 1024 * 1024 || !['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav','audio/x-m4a'].includes(String(mimeType).split(';')[0]) || !['academic','general'].includes(testType)) {
    return res.status(400).json({ error: 'Please submit a valid Speaking recording.' });
  }
  const trial = await getTrial(req.learner.id);
  if (!trial.active) return res.status(403).json({ error: 'Your 3-day free trial has ended. Subscribe to unlock Speaking assessments.', code: 'TRIAL_EXPIRED' });
  return res.status(403).json({ error: 'AI Speaking assessment is included in paid memberships. Your free trial includes one introductory Writing review.', code: 'UPGRADE_REQUIRED' });
  if (!openai) return res.status(503).json({ error: 'AI assessment is not configured. Add OPENAI_API_KEY in Render environment settings.' });
  try {
    const mime = String(mimeType).split(';')[0];
    const extension = mime === 'audio/mp4' || mime === 'audio/x-m4a' ? 'm4a' : mime === 'audio/wav' ? 'wav' : mime === 'audio/ogg' ? 'ogg' : mime === 'audio/mpeg' ? 'mp3' : 'webm';
    const bytes = Buffer.from(audio, 'base64');
    if (!bytes.length || bytes.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'Recording is too large. Please record a shorter interview.' });
    const file = await toFile(bytes, `speaking.${extension}`, { type: mime });
    const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1' });
    const transcript = String(transcription.text || '').trim();
    if (transcript.length < 40) return res.status(422).json({ error: 'The recording was too short or speech could not be transcribed clearly. Please try again in a quiet place.' });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an IELTS Speaking preparation tutor. Assess only what can responsibly be inferred from this transcript. Return JSON with summary (string), criteria (array of exactly four objects with name, band, feedback), strengths (array), improvements (array), transcript (string), estimated_band (null), and disclaimer (string). The four criterion names must be Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation. Give cautious 0-9 half-band scores only for the first three transcript-assessable criteria. For Pronunciation set band to null and explicitly state that pronunciation cannot be reliably assessed from a text transcript. Do not invent pauses, hesitation, accent, intonation or sound quality. Do not provide an overall estimated band because the audio has only been transcribed and the four criteria cannot all be assessed. Give useful, specific feedback and make clear this is not an official IELTS score.' },
        { role: 'user', content: JSON.stringify({ testType, durationSeconds, transcript }) }
      ]
    });
    const feedback = JSON.parse(completion.choices[0].message.content || '{}');
    res.json({ ...feedback, transcript, estimated_band: null, disclaimer: 'AI-generated transcript-based practice feedback only. Pronunciation and an overall IELTS Speaking band cannot be reliably assessed from this transcript. This is not an official IELTS score.' });
  } catch (error) {
    console.error('Speaking assessment failed:', error?.message || error);
    res.status(500).json({ error: 'Speaking assessment failed. Please try again.' });
  }
});

app.post('/api/listening-audio', async (req, res) => {
  const { script } = req.body || {};
  if (typeof script !== 'string' || !script.trim() || script.length > 10000) return res.status(400).json({ error: 'A valid listening script is required.' });
  if (!openai) return res.status(503).json({ error: 'Natural AI audio is not configured. Add OPENAI_API_KEY in Render environment settings.' });
  try {
    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      input: script,
      instructions: 'Speak clearly and naturally in a neutral British English accent, at a measured IELTS listening-test pace. Pronounce names, dates, addresses and numbers distinctly. Preserve pauses between sentences. Do not add or omit any words.'
    });
    const audio = Buffer.from(await speech.arrayBuffer());
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': String(audio.length), 'Cache-Control': 'private, max-age=3600' });
    res.send(audio);
  } catch (error) {
    console.error('Listening audio generation failed:', error?.message || error);
    res.status(502).json({ error: 'Unable to generate listening audio right now.' });
  }
});
const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
initDb().then(() => app.listen(port, () => console.log('IELTS Guru listening on ' + port))).catch(err => { console.error('Startup failed', err); process.exit(1); });