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

export default function SpeakingExam({ testType = 'academic', testMode = 'practice', onComplete }) {
  const [phase, setPhase] = useState('intro');
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(60);
  const [stageRemaining, setStageRemaining] = useState(270);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recorded, setRecorded] = useState(false);
  const [part1TopicIndex, setPart1TopicIndex] = useState(0);
  const [part1QuestionIndex, setPart1QuestionIndex] = useState(0);
  const [part3QuestionIndex, setPart3QuestionIndex] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const blobRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [questions] = useState(() => {
    const source = sets[testType] || sets.academic;
    const shuffle = items => [...items].sort(() => Math.random() - 0.5);
    const cueCards = testType === 'academic' ? [
      { cue: `Describe a skill you would like to learn.

You should say:
• what the skill is
• why you would like to learn it
• how you would learn it
and explain how this skill could help you.`, part3: ['Why do adults decide to learn new skills?', 'Should schools give more attention to practical skills?', 'How has technology changed the way people learn?', 'Do people learn better independently or with a teacher?'] },
      { cue: `Describe a place you visited that made a strong impression on you.

You should say:
• where the place is
• when you visited it
• what you did there
and explain why the place made such a strong impression on you.`, part3: ['Why do some places attract more visitors than others?', 'How can tourism benefit local communities?', 'Should governments spend more money protecting historic places?', 'How might travel habits change in the future?'] },
      { cue: `Describe an important decision you made.

You should say:
• what the decision was
• when you made it
• what factors influenced you
and explain how the decision affected your life.`, part3: ['Why do some people find decision-making difficult?', 'Should young people make important decisions independently?', 'How do people balance short-term and long-term benefits?', 'Do people rely too much on advice from others?'] }
    ] : [
      { cue: `Describe a person who has helped you.

You should say:
• who the person is
• how the person helped you
• when this happened
and explain how you felt about the help you received.`, part3: ['Why is it important for people to help one another?', 'Should children be encouraged to volunteer?', 'How can local communities support people in difficulty?', 'Do people help strangers as much as they used to?'] },
      { cue: `Describe a useful service in your local area.

You should say:
• what the service is
• where people can use it
• who benefits from it
and explain why it is useful to the community.`, part3: ['Which public services are most important in a community?', 'Who should be responsible for improving local services?', 'How can technology make public services more accessible?', 'Should people pay more for better public services?'] },
      { cue: `Describe a journey you remember well.

You should say:
• where you went
• how you travelled
• who you travelled with
and explain why you remember this journey.`, part3: ['How has transport changed the way people travel?', 'What are the advantages of public transport?', 'Should governments discourage people from using private cars?', 'How might journeys change in the next twenty years?'] }
    ];
    const selectedCue = cueCards[Math.floor(Math.random() * cueCards.length)];
    return { ...source, part1: shuffle(source.part1).slice(0, 2), cue: selectedCue.cue, part3: selectedCue.part3 };
  });

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!recording || !['part1', 'part2', 'part3'].includes(phase)) return;
    const duration = phase === 'part2' ? 120 : 270;
    setStageRemaining(duration);
    const id = setInterval(() => setStageRemaining(value => {
      if (value <= 1) {
        clearInterval(id);
        if (phase === 'part1') { setPreparing(true); setPrepSeconds(60); setPhase('prep'); }
        else if (phase === 'part2') { setPhase('part3'); }
        else {
          if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
          setRecording(false); setPreparing(false); setPhase('complete');
        }
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [phase, recording]);
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
      onComplete?.({estimatedBand:data.estimated_band??null,summary:data.summary??''});
    } catch (err) {
      setError(err.message || 'Unable to submit your recording. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="speaking-exam">
    <div className="reading-head">
      <div><span className="tag">{testType === 'academic' ? 'ACADEMIC' : 'GENERAL TRAINING'} SPEAKING · {testMode === 'mock' ? 'MOCK TEST' : 'PRACTICE TEST'}</span><h3>{testMode === 'mock' ? 'Mock Speaking interview' : 'Speaking practice interview'} · Parts 1–3</h3><p>11–14 minutes · Part 1: 4–5 min · Part 2: 1 min preparation + up to 2 min speaking · Part 3: 4–5 min.</p></div>
      <div className="reading-clock">{clock(seconds)}<small>{recording ? 'RECORDING TIME' : 'ELAPSED TIME'}</small></div>
    </div>
    {phase === 'intro' && <div className="speaking-start">
      <h4>Before you begin</h4>
      <ul><li>Find a quiet place and allow microphone access.</li><li>Speak naturally and answer in complete sentences.</li><li>The examiner will move through questions one at a time. Keep recording throughout all three parts.</li><li>Your audio is submitted to the configured AI service for transcription and practice feedback after the interview.</li></ul>
      <button className="primary" type="button" onClick={startRecording}>Allow microphone & start interview →</button>
    </div>}
    {phase === 'part1' && <section className="speaking-part">
      <span className="tag">PART 1 · 4–5 MINUTES</span><h4>Introduction and interview</h4><p>Answer the examiner’s questions about familiar topics. Aim for natural answers of two to four sentences. The section advances after its allotted time.</p><div className="prep-clock">{clock(stageRemaining)}<small>PART 1 TIME REMAINING</small></div>
      <article className="speaking-topic">
        <b>Topic: {questions.part1[part1TopicIndex]?.[0]}</b>
        <p className="speaking-question">{questions.part1[part1TopicIndex]?.[part1QuestionIndex + 1]}</p>
        <small>Question {part1QuestionIndex + 1} of 3 · Topic {part1TopicIndex + 1} of {questions.part1.length}</small>
      </article>
      <button className="primary" type="button" disabled={!recording} onClick={() => {
        if (part1QuestionIndex < 2) setPart1QuestionIndex(index => index + 1);
        else if (part1TopicIndex < questions.part1.length - 1) { setPart1TopicIndex(index => index + 1); setPart1QuestionIndex(0); }
        else { setPhase('prep'); setPrepSeconds(60); setPreparing(true); }
      }}>{part1QuestionIndex < 2 || part1TopicIndex < questions.part1.length - 1 ? 'Next examiner question →' : 'Continue to Part 2 →'}</button>
    </section>}
    {phase === 'prep' && <section className="speaking-part">
      <span className="tag">PART 2 · PREPARATION</span><h4>Individual long turn</h4><p>You have one minute to prepare. You may make brief notes, then speak for up to two minutes.</p>
      <pre className="speaking-cue">{questions.cue}</pre>
      <div className="prep-clock">{clock(prepSeconds)}<small>PREPARATION TIME</small></div>
      <button className="primary" type="button" onClick={() => { setPreparing(false); setPhase('part2'); }}>Start speaking now →</button>
    </section>}
    {phase === 'part2' && <section className="speaking-part">
      <span className="tag">PART 2 · 3–4 MINUTES</span><h4>Your long turn</h4><pre className="speaking-cue">{questions.cue}</pre><p>Speak for up to two minutes. The interview will move to Part 3 when the time ends.</p><div className="prep-clock">{clock(stageRemaining)}<small>LONG TURN TIME REMAINING</small></div>
      <button className="primary" type="button" onClick={() => setPhase('part3')}>Continue to Part 3 →</button>
    </section>}
    {phase === 'part3' && <section className="speaking-part">
      <span className="tag">PART 3 · 4–5 MINUTES</span><h4>Two-way discussion</h4><p>Give developed answers, explain your opinions and support them with reasons or examples. The interview ends when the discussion time expires.</p><div className="prep-clock">{clock(stageRemaining)}<small>PART 3 TIME REMAINING</small></div>
      <article className="speaking-topic">
        <b>Discussion question {part3QuestionIndex + 1} of {questions.part3.length}</b>
        <p className="speaking-question">{questions.part3[part3QuestionIndex]}</p>
        <small>Develop your answer with reasons, comparisons or examples.</small>
      </article>
      <button className="primary" type="button" onClick={() => {
        if (part3QuestionIndex < questions.part3.length - 1) setPart3QuestionIndex(index => index + 1);
        else stopRecording();
      }}>{part3QuestionIndex < questions.part3.length - 1 ? 'Next discussion question →' : 'Finish interview →'}</button>
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
