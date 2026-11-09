import React, { useEffect, useRef, useState } from 'react';

const sets = {
  academic: {
    part1: [
      ['Work or study', 'Do you work or are you a student?', 'What do you enjoy most about your work or studies?', 'What would you like to do in the future?'],
      ['Your home', 'Can you describe the place where you live?', 'What is your favourite room? Why?', 'Would you like to live somewhere else in the future?'],
      ['Free time', 'What do you usually do in your free time?', 'Do you prefer spending free time alone or with others?', 'Has the way you spend your free time changed?']
    ],
    cue: 'Describe a skill you would like to learn.\n\nYou should say:\n• what the skill is\n• why you would like to learn it\n• how you would learn it\nand explain how this skill could help you.',
    part3: ['Why do adults decide to learn new skills?', 'Should schools give more attention to practical skills?', 'How has technology changed the way people learn?', 'Do you think people learn better independently or with a teacher?']
  },
  general: {
    part1: [
      ['Your neighbourhood', 'What do you like about the area where you live?', 'Is it a good place for families?', 'Has your neighbourhood changed in recent years?'],
      ['Daily routine', 'What is your usual daily routine?', 'Which part of the day do you enjoy most?', 'Would you like to change anything about your routine?'],
      ['Friends', 'Do you often spend time with friends?', 'What activities do you enjoy doing together?', 'Is it easy to make new friends where you live?']
    ],
    cue: 'Describe a person who has helped you.\n\nYou should say:\n• who the person is\n• how the person helped you\n• when this happened\nand explain how you felt about the help you received.',
    part3: ['Why is it important for people to help one another?', 'Should children be encouraged to volunteer?', 'How can local communities support people in difficulty?', 'Do people help strangers as much as they used to?']
  }
};

export default function SpeakingExam({ testType = 'academic', testMode = 'practice' }) {
  const [phase, setPhase] = useState('intro');
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(60);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recorded, setRecorded] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const questions = sets[testType] || sets.academic;

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!preparing) return;
    const id = setInterval(() => setPrepSeconds(s => {
      if (s <= 1) { clearInterval(id); setPreparing(false); setPhase('part2'); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [preparing]);

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const clock = n => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;

  async function startRecording() {
    setError('');
    setFeedback(null);
    setSeconds(0);
    chunksRef.current = [];
    blobRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => window.MediaRecorder?.isTypeSupported?.(type));
      const recorder = preferred
        ? new MediaRecorder(stream, { mimeType: preferred, audioBitsPerSecond: 32000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecorded(true);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
      setPhase('part1');
    } catch {
      setError('Microphone access was not available. Allow microphone access in your browser settings, then try again.');
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
    setPreparing(false);
    setPhase('complete');
  }

  async function submitRecording() {
    if (!blobRef.current) return;
    if (blobRef.current.size > 12 * 1024 * 1024) {
      setError('This recording is larger than the upload limit. Please retake the test with a shorter recording.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blobRef.current);
      });
      const response = await fetch('/api/assess-speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: blobRef.current.type, testType, durationSeconds: seconds })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Speaking assessment is unavailable.');
      setFeedback(data);
    } catch (err) {
      setError(err.message || 'Unable to submit your recording. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="speaking-exam">
    <div className="reading-head">
      <div><span className="tag">{testType === 'academic' ? 'ACADEMIC' : 'GENERAL TRAINING'} SPEAKING · {testMode === 'mock' ? 'MOCK TEST' : 'PRACTICE TEST'}</span><h3>{testMode === 'mock' ? 'Mock Speaking interview' : 'Speaking practice interview'} · Parts 1–3</h3><p>11–14 minutes · Record one continuous interview, then receive AI-assisted feedback.</p></div>
      <div className="reading-clock">{clock(seconds)}<small>{recording ? 'RECORDING TIME' : 'ELAPSED TIME'}</small></div>
    </div>
    {phase === 'intro' && <div className="speaking-start">
      <h4>Before you begin</h4>
      <ul><li>Find a quiet place and allow microphone access.</li><li>Speak naturally and answer in complete sentences.</li><li>Keep recording throughout all three parts for a more realistic interview.</li><li>Your audio is sent securely to the configured AI service for transcription and practice feedback.</li></ul>
      <button className="primary" type="button" onClick={startRecording}>Allow microphone & start interview →</button>
    </div>}
    {phase === 'part1' && <section className="speaking-part">
      <span className="tag">PART 1 · 4–5 MINUTES</span><h4>Introduction and interview</h4><p>Answer the examiner’s questions about familiar topics. Aim for natural answers of two to four sentences.</p>
      {questions.part1.map((group, i) => <article className="speaking-topic" key={group[0]}><b>{group[0]}</b>{group.slice(1).map((q, j) => <p key={j}>{i * 3 + j + 1}. {q}</p>)}</article>)}
      <button className="primary" type="button" disabled={!recording} onClick={() => { setPhase('prep'); setPrepSeconds(60); setPreparing(true); }}>Continue to Part 2 →</button>
    </section>}
    {phase === 'prep' && <section className="speaking-part">
      <span className="tag">PART 2 · PREPARATION</span><h4>Individual long turn</h4><p>You have one minute to prepare. You may make brief notes, then speak for up to two minutes.</p>
      <pre className="speaking-cue">{questions.cue}</pre>
      <div className="prep-clock">{clock(prepSeconds)}<small>PREPARATION TIME</small></div>
      <button className="primary" type="button" onClick={() => { setPreparing(false); setPhase('part2'); }}>Start speaking now →</button>
    </section>}
    {phase === 'part2' && <section className="speaking-part">
      <span className="tag">PART 2 · 3–4 MINUTES</span><h4>Your long turn</h4><pre className="speaking-cue">{questions.cue}</pre><p>Speak for up to two minutes. When you are ready, continue to Part 3.</p>
      <button className="primary" type="button" onClick={() => setPhase('part3')}>Continue to Part 3 →</button>
    </section>}
    {phase === 'part3' && <section className="speaking-part">
      <span className="tag">PART 3 · 4–5 MINUTES</span><h4>Two-way discussion</h4><p>Give developed answers, explain your opinions and support them with reasons or examples.</p>
      {questions.part3.map((q, i) => <p className="speaking-question" key={i}>{i + 1}. {q}</p>)}
      <button className="primary" type="button" onClick={stopRecording}>Finish interview →</button>
    </section>}
    {recording && <div className="recording-status"><span className="recording-dot"></span> Microphone recording · Keep speaking naturally <button type="button" onClick={stopRecording}>End recording</button></div>}
    {phase === 'complete' && <section className="speaking-part">
      <span className="tag">INTERVIEW COMPLETED</span><h4>Your recording is ready</h4><p>Recorded duration: {clock(seconds)}. Submit it for transcription and feedback against the four IELTS Speaking assessment criteria.</p>
      <button className="primary" type="button" onClick={submitRecording} disabled={busy || !recorded}>{busy ? 'Transcribing & assessing…' : 'Submit for AI speaking assessment →'}</button>
    </section>}
    {error && <p className="notice">{error}</p>}
    {feedback && <div className="feedback">
      <div className="feedback-top"><b>Speaking practice feedback</b><strong>{feedback.estimated_band ?? '—'} <small>estimated band</small></strong></div>
      <p>{feedback.summary}</p>
      <h4>Four IELTS assessment criteria</h4>
      <div className="speaking-criteria">{(feedback.criteria || []).map(item => <article key={item.name}><b>{item.name}</b><strong>{item.band ?? '—'}</strong><p>{item.feedback}</p></article>)}</div>
      <h4>What went well</h4><ul>{(feedback.strengths || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      <h4>Areas to improve</h4><ul>{(feedback.improvements || []).map((item, i) => <li key={i}>{item}</li>)}</ul>
      {feedback.transcript && <details><summary>View your transcript</summary><p>{feedback.transcript}</p></details>}
      <small>{feedback.disclaimer}</small>
    </div>}
    <p className="reading-disclaimer">Original practice prompts, not official IELTS exam content. AI feedback is an estimate and cannot guarantee an official IELTS band score.</p>
  </div>;
}
