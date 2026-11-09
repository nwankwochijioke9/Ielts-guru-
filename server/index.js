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
async function getActiveSubscription(userId) { const result=await pool.query('SELECT s.id,p.id AS plan_id,p.name,p.features,s.ends_at FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 AND s.status=$2 AND s.ends_at>NOW() ORDER BY s.ends_at DESC LIMIT 1',[userId,'active']); return result.rows[0]||null; }
async function hashPassword(password) { const salt=randomBytes(16).toString('hex'); const key=await scrypt(password,salt,64); return `${salt}:${Buffer.from(key).toString('hex')}`; }
async function verifyPassword(password, stored) { try { const [salt,hex]=stored.split(':'); const expected=Buffer.from(hex,'hex'); const actual=Buffer.from(await scrypt(password,salt,64)); return expected.length===actual.length && timingSafeEqual(expected,actual); } catch { return false; } }
function readCookie(req,name) { const part=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`)); return part ? decodeURIComponent(part.slice(name.length+1)) : ''; }
function setSessionCookie(res,token) { res.cookie(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_DAYS*24*60*60*1000}); }
async function requireLearner(req,res,next) { try { if(!pool) return res.status(503).json({error:'Account services require the database to be configured.'}); const token=readCookie(req,cookieName); if(!token) return res.status(401).json({error:'Please create an account or sign in to continue.'}); const {rows}=await pool.query('SELECT l.id,l.email FROM learner_sessions s JOIN learners l ON l.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND l.email_verified_at IS NOT NULL',[hashToken(token)]); if(!rows[0]) return res.status(401).json({error:'Your session has expired. Please sign in again.'}); req.learner=rows[0]; next(); } catch { res.status(500).json({error:'Unable to verify your account.'}); } }
async function getTrial(userId) { await pool.query('INSERT INTO free_trials(trial_id,user_id) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[String(userId),userId]); const {rows}=await pool.query('SELECT started_at,expires_at,ai_reviews_used,(expires_at>NOW()) AS active, GREATEST(0,CEIL(EXTRACT(EPOCH FROM (expires_at-NOW()))/86400))::int AS days_left FROM free_trials WHERE user_id=$1',[userId]); return rows[0]; }

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '18mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

async function initDb() {
  if (!pool) return;
  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}
async function issueSession(learner,res) {
 const token=randomBytes(32).toString('base64url'); await pool.query("INSERT INTO learner_sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+($3 * INTERVAL '1 day'))",[learner.id,hashToken(token),SESSION_DAYS]); setSessionCookie(res,token); const trial=await getTrial(learner.id);
 return {user:learner,trial:{active:trial.active,days_left:trial.days_left,expires_at:trial.expires_at,ai_reviews_used:trial.ai_reviews_used},subscription:await getActiveSubscription(learner.id)};
}
async function sendVerificationEmail(email,token) {
 if(!process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !process.env.APP_URL) throw new Error('Email verification is not configured. Add RESEND_API_KEY, MAIL_FROM and APP_URL in Render.');
 const link=process.env.APP_URL.replace(/\/$/,'')+'/api/auth/verify-email?token='+encodeURIComponent(token);
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.MAIL_FROM,to:[email],subject:'Verify your IELTS Guru account',html:'<p>Welcome to IELTS Guru.</p><p>Please verify your email address to activate your 3-day trial.</p><p><a href="'+link+'">Verify my email address</a></p><p>This link expires in 30 minutes. If you did not create this account, ignore this email.</p>'})});
 if(!response.ok) throw new Error('Unable to send verification email. Check your Resend settings and verified sender domain.');
}
app.post('/api/auth/register', async (req,res) => {
 const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) return res.status(400).json({error:'Enter a valid email address.'});
 if(password.length<10 || password.length>128) return res.status(400).json({error:'Use a password between 10 and 128 characters.'});
 if(!pool || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !process.env.APP_URL) return res.status(503).json({error:'Account registration requires the database and email verification settings to be configured.'});
 let learner;
 try { const passwordHash=await hashPassword(password); const result=await pool.query('INSERT INTO learners(email,password_hash) VALUES($1,$2) RETURNING id,email',[email,passwordHash]); learner=result.rows[0]; const token=randomBytes(32).toString('hex'); await pool.query("UPDATE learners SET email_verification_token_hash=$1,email_verification_expires_at=NOW()+INTERVAL '30 minutes' WHERE id=$2",[hashToken(token),learner.id]); await sendVerificationEmail(email,token); res.status(201).json({verification_required:true,message:'Check your email and click the verification link to activate your account and start your 3-day trial.'}); }
 catch(error) { if(learner) await pool.query('DELETE FROM learners WHERE id=$1',[learner.id]).catch(()=>{}); if(error?.code==='23505') return res.status(409).json({error:'An account with this email already exists. Please sign in or request a new verification email.'}); console.error('Registration failed:',error?.message||error); res.status(503).json({error:error?.message||'Unable to create your account. Please try again.'}); }
});
app.get('/api/auth/verify-email', async (req,res) => {
 const token=String(req.query.token||''); if(!/^[a-f0-9]{64}$/.test(token) || !pool) return res.status(400).send('This verification link is invalid.');
 try { const result=await pool.query('UPDATE learners SET email_verified_at=NOW(),email_verification_token_hash=NULL,email_verification_expires_at=NULL WHERE email_verification_token_hash=$1 AND email_verification_expires_at>NOW() RETURNING id',[hashToken(token)]); if(!result.rows[0]) return res.status(400).send('This verification link is invalid or has expired. Return to IELTS Guru and request a new one.'); await pool.query('INSERT INTO free_trials(trial_id,user_id) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING',[String(result.rows[0].id),result.rows[0].id]); res.redirect('/?verified=1'); } catch { res.status(500).send('Unable to verify your email right now. Please try again.'); }
});
app.post('/api/auth/resend-verification', async (req,res) => {
 const email=String(req.body?.email||'').trim().toLowerCase(); if(!pool || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !process.env.APP_URL) return res.status(503).json({error:'Email verification is not configured.'});
 try { const result=await pool.query('SELECT id FROM learners WHERE email=$1 AND email_verified_at IS NULL',[email]); if(result.rows[0]) { const token=randomBytes(32).toString('hex'); await pool.query("UPDATE learners SET email_verification_token_hash=$1,email_verification_expires_at=NOW()+INTERVAL '30 minutes' WHERE id=$2",[hashToken(token),result.rows[0].id]); await sendVerificationEmail(email,token); } res.json({message:'If this address has an unverified account, a new verification link has been sent.'}); } catch(error) { res.status(503).json({error:error.message||'Unable to send a verification email.'}); }
});
app.post('/api/auth/login', async (req,res) => {
 const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||''); if(!pool) return res.status(503).json({error:'Sign-in is temporarily unavailable.'});
 try { const result=await pool.query('SELECT id,email,password_hash,email_verified_at FROM learners WHERE email=$1',[email]); if(!result.rows[0] || !(await verifyPassword(password,result.rows[0].password_hash))) return res.status(401).json({error:'Email or password is incorrect.'}); if(!result.rows[0].email_verified_at) return res.status(403).json({error:'Please verify your email first. Use the resend verification option if needed.',code:'EMAIL_NOT_VERIFIED'}); res.json(await issueSession({id:result.rows[0].id,email:result.rows[0].email},res)); } catch(error) { console.error('Login failed:',error?.message||error); res.status(500).json({error:'Unable to sign in. Please try again.'}); }
});app.get('/api/auth/me', requireLearner, async (req,res) => { const trial=await getTrial(req.learner.id); const subscription=await getActiveSubscription(req.learner.id); res.json({user:req.learner,trial:{active:trial.active,days_left:trial.days_left,expires_at:trial.expires_at,ai_reviews_used:trial.ai_reviews_used},subscription}); });
app.post('/api/auth/logout', async (req,res) => { const token=readCookie(req,cookieName); if(token && pool) await pool.query('DELETE FROM learner_sessions WHERE token_hash=$1',[hashToken(token)]).catch(()=>{}); res.clearCookie(cookieName,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'}); res.json({ok:true}); });
app.get('/api/trial/status', requireLearner, async (req,res) => { const trial=await getTrial(req.learner.id); const subscription=await getActiveSubscription(req.learner.id); res.json({active:trial.active,days_left:trial.days_left,expires_at:trial.expires_at,ai_reviews_used:trial.ai_reviews_used,ai_reviews_remaining:Math.max(0,1-trial.ai_reviews_used),subscription}); });
async function verifyFlutterwaveTransaction(transactionId,expectedRef) {
 if(!process.env.FLW_SECRET_KEY) throw new Error('Flutterwave is not configured.');
 const response=await fetch('https://api.flutterwave.com/v3/transactions/'+encodeURIComponent(transactionId)+'/verify',{headers:{Authorization:'Bearer '+process.env.FLW_SECRET_KEY}}); const payload=await response.json();
 if(!response.ok || payload.status!=='success' || payload.data?.status!=='successful' || payload.data?.tx_ref!==expectedRef) throw new Error('Payment could not be verified.'); return payload.data;
}
async function activatePaidPlan(payment) {
 const client=await pool.connect();
 try { await client.query('BEGIN'); const locked=await client.query('SELECT id,user_id,plan_id,amount,currency,status FROM payment_transactions WHERE tx_ref=$1 FOR UPDATE',[payment.tx_ref]); const pending=locked.rows[0];
  if(!pending || pending.status==='successful') { await client.query('COMMIT'); return false; }
  if(pending.status!=='pending' || Number(payment.amount)<Number(pending.amount) || payment.currency!==pending.currency) throw new Error('Payment amount or currency does not match the selected plan.');
  const plan=await client.query('SELECT duration_days FROM plans WHERE id=$1 AND active=true',[pending.plan_id]); if(!plan.rows[0]) throw new Error('The selected plan is no longer available.');
  await client.query("UPDATE payment_transactions SET status='successful',provider_transaction_id=$1,paid_at=NOW() WHERE id=$2",[String(payment.id),pending.id]);
  await client.query("UPDATE subscriptions SET status='expired' WHERE user_id=$1 AND status='active'",[pending.user_id]);
  await client.query("INSERT INTO subscriptions(user_id,plan_id,payment_ref,starts_at,ends_at,status) VALUES($1,$2,$3,NOW(),NOW()+($4 * INTERVAL '1 day'),'active')",[pending.user_id,pending.plan_id,pending.tx_ref,plan.rows[0].duration_days]); await client.query('COMMIT'); return true;
 } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
app.post('/api/payments/initialize', requireLearner, async (req,res) => {
 if(!process.env.FLW_SECRET_KEY) return res.status(503).json({error:'Online payments are not configured yet. Add FLW_SECRET_KEY in Render.'});
 try { const result=await pool.query('SELECT id,name,price_ngn,duration_days FROM plans WHERE id=$1 AND active=true AND price_ngn>0',[Number(req.body?.plan_id)]); if(!result.rows[0]) return res.status(404).json({error:'This paid plan is unavailable.'});
  const plan=result.rows[0], txRef='IG-'+req.learner.id+'-'+randomBytes(12).toString('hex'); const email=await pool.query('SELECT email FROM learners WHERE id=$1',[req.learner.id]);
  await pool.query("INSERT INTO payment_transactions(user_id,plan_id,tx_ref,amount,currency,status) VALUES($1,$2,$3,$4,'NGN','pending')",[req.learner.id,plan.id,txRef,plan.price_ngn]);
  const response=await fetch('https://api.flutterwave.com/v3/payments',{method:'POST',headers:{Authorization:'Bearer '+process.env.FLW_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({tx_ref:txRef,amount:plan.price_ngn,currency:'NGN',redirect_url:(process.env.APP_URL||'https://ielts-guru.onrender.com')+'/?payment=return',customer:{email:email.rows[0].email},customizations:{title:'IELTS Guru',description:plan.name+' membership — '+plan.duration_days+' days'},meta:{user_id:String(req.learner.id),plan_id:String(plan.id)}})});
  const payload=await response.json(); if(!response.ok || payload.status!=='success' || !payload.data?.link) throw new Error(payload.message||'Unable to start checkout.'); res.json({checkout_url:payload.data.link,tx_ref:txRef});
 } catch(error) { console.error('Payment initialization failed:',error.message); res.status(502).json({error:error.message||'Unable to start payment.'}); }
});
app.post('/api/payments/verify', requireLearner, async (req,res) => {
 const txRef=String(req.body?.tx_ref||'');
 try { const result=await pool.query('SELECT tx_ref FROM payment_transactions WHERE tx_ref=$1 AND user_id=$2',[txRef,req.learner.id]); if(!result.rows[0]) return res.status(404).json({error:'Payment reference not found.'});
  const response=await fetch('https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref='+encodeURIComponent(txRef),{headers:{Authorization:'Bearer '+process.env.FLW_SECRET_KEY}});
  const result=await response.json();
  if(!response.ok || result.status!=='success' || !result.data?.id) return res.status(202).json({pending:true,message:'Payment is still being confirmed. Refresh your membership status shortly.'});
  if(result.data.status!=='successful' || result.data.tx_ref!==txRef) return res.status(400).json({error:'Flutterwave has not confirmed a successful payment.'});
  await activatePaidPlan(await verifyFlutterwaveTransaction(result.data.id,txRef)); res.json({success:true,subscription:await getActiveSubscription(req.learner.id)});
 } catch(error) { res.status(400).json({error:error.message||'Unable to verify payment.'}); }
});
app.post('/api/payments/webhook', async (req,res) => {
 const signature=req.get('verif-hash'); if(!process.env.FLW_WEBHOOK_HASH || !signature || signature!==process.env.FLW_WEBHOOK_HASH) return res.sendStatus(401);
 try { const data=req.body?.data; if(data?.id && data?.tx_ref) await activatePaidPlan(await verifyFlutterwaveTransaction(data.id,data.tx_ref)); res.sendStatus(200); } catch(error) { console.error('Flutterwave webhook verification failed:',error.message); res.sendStatus(400); }
});
app.get('/api/health', async (_req, res) => {
  try { if (pool) await pool.query('SELECT 1'); res.json({ ok: true, database: !!pool }); }
  catch { res.status(503).json({ ok: false, database: false }); }
});
app.get('/api/plans', async (_req, res) => {
  if (!pool) return res.json([{ id: 0, name: 'Free Starter', price_ngn: 0, price_usd: 0, duration_days: 3, features: ['3-day limited trial','Sample practice questions','One introductory AI writing review','Basic progress preview'] },{id:1,name:'Basic',price_ngn:5000,price_usd:4,duration_days:30,features:['Daily IELTS practice','Limited AI writing corrections','Academic and General Training practice','Basic progress tracking']},{id:2,name:'Standard',price_ngn:12000,price_usd:9,duration_days:30,features:['Everything in Basic','More AI writing assessments and corrections','Full Listening and Reading practice sets','Speaking practice and feedback','Timed skill tests']},{id:3,name:'Premium',price_ngn:25000,price_usd:19,duration_days:30,features:['Everything in Standard','Full IELTS mock-test access','Detailed AI writing feedback and model answers','Speaking transcript and assessment','Personalised improvement recommendations','Performance history and band tracking']},{id:4,name:'VIP',price_ngn:50000,price_usd:39,duration_days:30,features:['Everything in Premium','Highest AI assessment allowance','Advanced performance analytics','Personalised study plan','Priority access to new practice materials','Comprehensive progress reports']}]);
  try {
    const { rows } = await pool.query('SELECT id,name,price_ngn,price_usd,duration_days,features,active FROM plans WHERE active=true ORDER BY price_ngn');
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
  const subscription = await getActiveSubscription(req.learner.id);
  if (!subscription && !trial.active) return res.status(403).json({ error: 'Your 3-day free trial has ended. Choose a membership plan to continue with AI marking.', code: 'TRIAL_EXPIRED' });
  if (!subscription && skill !== 'writing') return res.status(403).json({ error: 'The free trial includes one introductory AI Writing review. Subscribe to unlock AI feedback for all four skills.', code: 'UPGRADE_REQUIRED' });
  if (!subscription && trial.ai_reviews_used >= 1) return res.status(403).json({ error: 'You have used your free AI Writing review. Subscribe to unlock unlimited practice feedback.', code: 'TRIAL_LIMIT_REACHED' });
  if (!openai) return res.status(503).json({ error: 'AI marking is not configured yet. Add OPENAI_API_KEY in Render environment settings.' });
  if (!subscription) { const reservation = await pool.query('UPDATE free_trials SET ai_reviews_used=ai_reviews_used+1 WHERE user_id=$1 AND ai_reviews_used<1 AND expires_at>NOW() RETURNING ai_reviews_used',[req.learner.id]); if (!reservation.rowCount) return res.status(403).json({ error: 'Your free AI Writing review has already been used. Choose a membership to continue.', code: 'TRIAL_LIMIT_REACHED' }); }
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
    res.json({ ...feedback, disclaimer: 'AI-generated practice estimate only; not an official IELTS score.' });
  } catch { if (!subscription) await pool.query('UPDATE free_trials SET ai_reviews_used=GREATEST(0,ai_reviews_used-1) WHERE user_id=$1',[req.learner.id]).catch(()=>{}); res.status(500).json({ error: 'Assessment failed. Please try again.' }); }
});

app.post('/api/assess-speaking', requireLearner, async (req, res) => {
  const { audio, mimeType, testType, durationSeconds } = req.body || {};
  if (typeof audio !== 'string' || !audio || audio.length > 16 * 1024 * 1024 || !['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav','audio/x-m4a'].includes(String(mimeType).split(';')[0]) || !['academic','general'].includes(testType)) {
    return res.status(400).json({ error: 'Please submit a valid Speaking recording.' });
  }
  const trial = await getTrial(req.learner.id);
  if (!(await getActiveSubscription(req.learner.id))) return res.status(403).json({ error: 'AI Speaking assessment is included in paid memberships. Subscribe to unlock it.', code: 'UPGRADE_REQUIRED' });
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

app.post('/api/listening-audio', requireLearner, async (req, res) => {
  const trial = await getTrial(req.learner.id);
  if (!trial.active && !(await getActiveSubscription(req.learner.id))) return res.status(403).json({ error: 'Your 3-day trial has ended. Subscribe to continue practising.' });
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