import React,{useEffect,useRef,useState} from 'react';

const parts=[
{title:'PART 1 — Booking a community course',context:'A conversation between a caller and a community centre receptionist.',script:'Receptionist: Good morning, Westbridge Community Centre. How can I help? Caller: Hello. I would like to book a place on the evening cooking course. Receptionist: Certainly. The next course begins on Thursday the fourteenth of May and runs for six weeks. Caller: Is it every Thursday? Receptionist: Yes, from six thirty until eight thirty in the evening. The fee is eighty-four pounds, and that includes ingredients. Caller: Where is the centre? Receptionist: We are at 26 Market Street, opposite the post office. Caller: Do I need to bring anything? Receptionist: Just an apron. We provide all the equipment. Caller: I would like to register. My name is Daniel Morris. Receptionist: Could you spell Morris? Caller: M O R R I S. Receptionist: Thank you. And your contact number? Caller: 07942 618350. Receptionist: Great. There are still three places available. Please arrive ten minutes early on the first evening.'},
{title:'PART 2 — Information about a city park',context:'A local guide gives information about a public park.',script:'Welcome to Greenbank Park. The main entrance is on Willow Road, beside the bus stop. If you are cycling, please use the bicycle entrance on the eastern side, where you will find the cycle racks. The café is in the old stone building near the lake, and it opens at nine every morning. The children’s playground is north of the lake, next to the picnic lawn. Our small museum is in the southern corner of the park. It is open from Tuesday to Sunday and admission is free. The guided nature walk starts at the information office at half past ten. Please book in advance because groups are limited to fifteen people. Dogs are welcome, but they must be kept on a lead. The rose garden is currently closed for restoration and is expected to reopen in July. Please do not feed the ducks, as the food can make them ill.'},
{title:'PART 3 — Students discussing a research project',context:'A discussion between two students and their tutor.',script:'Tutor: Let us review your project on public transport habits. Student 1: We have completed the questionnaire, but we received fewer responses than expected. Student 2: We collected most responses online. Perhaps we should also have interviewed people at the station. Tutor: That could have produced a wider range of views. What did the results show? Student 1: Cost was the main reason people chose the bus. Student 2: We expected journey time to be the most important factor, but it came second. Tutor: Interesting. Did you find differences between age groups? Student 1: Yes. Younger respondents mentioned convenience, while older respondents were more concerned about reliability. Tutor: Your next step should be to compare weekday and weekend travel. Remember to explain that your sample was relatively small. Student 2: We will add a chart to show the age differences. Tutor: Good. Put the limitations before your recommendations in the final report.'},
{title:'PART 4 — Lecture on coastal wetlands',context:'A university lecture about the role of coastal wetlands.',script:'Today I will discuss coastal wetlands and their importance. Wetlands form where land is regularly covered by shallow water. They provide habitats for birds, fish and many other species. One important function is flood protection. Wetland plants slow the movement of water and their roots help hold soil in place. Wetlands can also store carbon in their soils, sometimes for very long periods. However, these environments face pressure from urban development, pollution and changes in water flow. Restoration projects often begin by removing barriers that prevent natural tides from reaching the wetland. Scientists then monitor water quality and plant growth. A common mistake is to measure success only by the area of land restored. It is equally important to examine biodiversity and whether native species return. Local communities can contribute by reporting changes in wildlife and helping to remove litter. Long-term monitoring is essential because ecological recovery may take many years.'}
];
const questions=[
[1,'Form completion','Course name','text','cooking course'],
[2,'Form completion','First class day','text','Thursday'],
[3,'Form completion','Course duration (number of weeks)','text','6'],
[4,'Form completion','Course fee (in pounds)','text','84'],
[5,'Form completion','Centre address: 26 ______ Street','text','Market'],
[6,'Form completion','Item the caller must bring','text','apron'],
[7,'Form completion','Caller’s first name','text','Daniel'],
[8,'Form completion','Caller’s surname','text','Morris'],
[9,'Form completion','Contact number','text','07942 618350'],
[10,'Form completion','Number of places still available','text','3'],
[11,'Multiple choice','Where is the main park entrance?','choice',['Willow Road','Lake Road','Museum Street'],'A'],
[12,'Multiple choice','Where should cyclists enter?','choice',['Western side','Eastern side','Southern corner'],'B'],
[13,'Note completion','The café is in the old ______ building.','text','stone'],
[14,'Note completion','The playground is beside the picnic ______.','text','lawn'],
[15,'Note completion','The museum is in the ______ corner of the park.','text','southern'],
[16,'Note completion','The guided walk begins at ______.','text','10:30'],
[17,'Multiple choice','What is the maximum size of a guided walk group?','choice',['10','15','20'],'B'],
[18,'Multiple choice','When is the rose garden expected to reopen?','choice',['May','June','July'],'C'],
[19,'Map / plan labelling','The bicycle entrance is on which side of the park?','choice',['North','South','East','West'],'C'],
[20,'Multiple choice','Which place is located near the lake?','choice',['The café','The museum','The playground'],'A'],
[21,'Multiple choice','How did the students collect most of their responses?','choice',['By telephone','Online','At the station'],'B'],
[22,'Multiple choice','What was the main reason people chose the bus?','choice',['Cost','Journey time','Comfort'],'A'],
[23,'Matching','Younger respondents were more concerned about…','choice',['reliability','convenience','ticket design'],'B'],
[24,'Matching','Older respondents were more concerned about…','choice',['reliability','convenience','ticket design'],'A'],
[25,'Sentence completion','The students received fewer responses than they had ______.','text','expected'],
[26,'Sentence completion','They should compare travel on weekdays and ______.','text','weekends'],
[27,'Multiple choice','What should be included to show age differences?','choice',['A chart','A map','A photograph'],'A'],
[28,'Multiple choice','Where should limitations appear in the report?','choice',['After recommendations','Before recommendations','In the title'],'B'],
[29,'Multiple choice','What is the tutor’s main advice about the sample?','choice',['Claim it represents everyone','Explain that it was relatively small','Remove the questionnaire'],'B'],
[30,'Sentence completion','Journey time came ______ in the results.','text','second'],
[31,'Note completion','Wetlands form where land is regularly covered by shallow ______.','text','water'],
[32,'Note completion','Wetland roots help hold ______ in place.','text','soil'],
[33,'Multiple choice','What can wetlands store in their soils?','choice',['Carbon','Plastic','Salt'],'A'],
[34,'Multiple choice','Which activity can damage wetlands?','choice',['Urban development','Bird watching','Guided walks'],'A'],
[35,'Sentence completion','Restoration may begin by removing barriers to natural ______.','text','tides'],
[36,'Multiple choice','What do scientists monitor after restoration begins?','choice',['Water quality and plant growth','Road traffic','Tourist spending'],'A'],
[37,'Multiple choice','Why is measuring restored land area alone insufficient?','choice',['Biodiversity also matters','It is too expensive','It cannot be mapped'],'A'],
[38,'Sentence completion','Native species should ______ to the restored wetland.','text','return'],
[39,'Multiple choice','How can local communities contribute?','choice',['Report wildlife changes','Change tidal patterns','Build new roads'],'A'],
[40,'Sentence completion','Ecological recovery may take many ______.','text','years']
];
const norm=s=>String(s||'').trim().toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ');
export default function ListeningExam({testType='academic',testMode='practice',onComplete}){
 const [answers,setAnswers]=useState({}),[activePart,setActivePart]=useState(0),[playing,setPlaying]=useState(false),[audioLoading,setAudioLoading]=useState(false),[played,setPlayed]=useState({}),[result,setResult]=useState(null),[remaining,setRemaining]=useState(1800),[timerStarted,setTimerStarted]=useState(false);
 const audioRef=useRef(null),playbackToken=useRef(0);
 const mock=testMode==='mock';
 useEffect(()=>()=>{playbackToken.current++;if(typeof window!=='undefined'&&window.speechSynthesis)window.speechSynthesis.cancel();if(audioRef.current){audioRef.current.pause();audioRef.current.src='';}},[]);
 useEffect(()=>{if(!mock||!timerStarted)return;const timer=setInterval(()=>setRemaining(v=>{if(v<=1){clearInterval(timer);setTimerStarted(false);if(window.speechSynthesis)window.speechSynthesis.cancel();setPlaying(false);return 0;}return v-1;}),1000);return()=>clearInterval(timer);},[mock,timerStarted]);
 const play=async()=>{
  const token=++playbackToken.current;
  if(mock&&!timerStarted)setTimerStarted(true);
  setAudioLoading(true);
  if(window.speechSynthesis)window.speechSynthesis.cancel();
  if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
  try{
   const response=await fetch('/api/listening-audio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({script:parts[activePart].script})});
   if(!response.ok)throw new Error('Natural audio is unavailable');
   const payload=await response.json();
   if(!Array.isArray(payload.segments)||!payload.segments.length)throw new Error('Audio segments are unavailable');
   setPlaying(true);
   for(const segment of payload.segments){
    if(token!==playbackToken.current)return;
    await new Promise((resolve,reject)=>{
     const audio=new Audio('data:audio/mpeg;base64,'+segment.audio);
     audioRef.current=audio;
     audio.onended=resolve;
     audio.onpause=()=>{if(token!==playbackToken.current)resolve();};
     audio.onerror=()=>reject(new Error('A speaker recording could not be played'));
     audio.play().catch(reject);
    });
   }
   if(token!==playbackToken.current)return;
   setPlaying(false);
   setPlayed(p=>({...p,[activePart]:true}));
  }catch{
   if(token!==playbackToken.current)return;
   if(typeof window==='undefined'||!window.speechSynthesis){setAudioLoading(false);alert('Audio playback is not supported in this browser.');return;}
   // Keep the browser fallback conversational too: split labelled dialogue into turns
   // and alternate available British English voices instead of reading the whole script
   // in one uninterrupted narrator voice.
   const script=parts[activePart].script;
   const speakerLabels=['Receptionist','Caller','Tutor','Student 1','Student 2'];
   const matcher=new RegExp('('+speakerLabels.map(label=>label.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\   const utterance=new SpeechSynthesisUtterance(parts[activePart].script);
   utterance.rate=0.94;utterance.pitch=1;
   utterance.onstart=()=>setPlaying(true);
   utterance.onend=()=>{setPlaying(false);setPlayed(p=>({...p,[activePart]:true}));};
   utterance.onerror=()=>setPlaying(false);
   window.speechSynthesis.speak(utterance);')).join('|')+'):', 'g');
   const matches=[...script.matchAll(matcher)];
   const turns=matches.length?matches.map((match,index)=>({
    speaker:match[1],
    text:script.slice(match.index+match[0].length,index+1<matches.length?matches[index+1].index:script.length).trim()
   })).filter(turn=>turn.text):[{speaker:'Narrator',text:script}];
   const available=window.speechSynthesis.getVoices().filter(v=>/^en-GB/i.test(v.lang));
   const distinct=available.filter((voice,index)=>available.findIndex(v=>v.voiceURI===voice.voiceURI)===index);
   setPlaying(true);
   for(let index=0;index<turns.length;index++){
    if(token!==playbackToken.current)break;
    const turn=turns[index];
    await new Promise(resolve=>{
     const utterance=new SpeechSynthesisUtterance(turn.text);
     if(distinct.length)utterance.voice=distinct[index%distinct.length];
     utterance.lang='en-GB';
     utterance.rate=turn.speaker==='Narrator'?0.94:(index%2?0.97:0.93);
     utterance.pitch=turn.speaker==='Narrator'?1:(index%2?1.08:0.92);
     utterance.onend=resolve;
     utterance.onerror=resolve;
     window.speechSynthesis.speak(utterance);
    });
   }
   if(token===playbackToken.current){setPlaying(false);setPlayed(p=>({...p,[activePart]:true}));}
  }finally{setAudioLoading(false);}
 };
 const stop=()=>{playbackToken.current++;if(window.speechSynthesis)window.speechSynthesis.cancel();if(audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0;audioRef.current=null;}setPlaying(false);};
 const submit=()=>{stop();const score=questions.reduce((n,q)=>{const response=norm(answers[q[0]]);const expected=q[3]==='choice'?q[5]:q[4];const aliases={2:['14th of may','the fourteenth of may'],4:['£84','84 pounds'],9:['07942618350','07942-618350'],16:['10:30','half past ten','half past 10'],26:['weekend']};const accepted=[expected,...(aliases[q[0]]||[])];return n+(accepted.some(v=>response===norm(v))?1:0);},0);const answered=Object.values(answers).filter(v=>String(v||'').trim()).length;setResult({score,answered});onComplete?.({score,answered,total:40});};
 return <div className="listening-exam">
  <div className="listening-top"><div><span className="tag">IELTS LISTENING · {testType==='academic'?'ACADEMIC':'GENERAL TRAINING'}</span><h3>Listening test · 40 questions</h3><p>4 parts · approximately 30 minutes · 10 questions per part. In mock mode, complete each recording in order; each part can be played once.</p></div><div className="listening-progress">{mock?String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'):Object.values(answers).filter(v=>String(v||'').trim()).length}<small>{mock?' time left':' / 40 answered'}</small></div></div>
  <div className="listening-notice"><b>Audio format note:</b> Conversations use distinct AI voices for each speaker, while talks and lectures use a single presenter. If AI audio is unavailable, your browser’s speech voice is used as a fallback. These are original practice scripts, not official IELTS recordings.</div>
  {mock&&remaining===0&&<p className="notice">The 30-minute test time has ended. Submit your answers to see your result.</p>}<div className="listening-part-tabs">{parts.map((p,i)=><button type="button" className={activePart===i?'active':''} key={p.title} onClick={()=>{stop();setActivePart(i);}} disabled={mock&&i>0&&!played[i-1]}>{'Part '+(i+1)}</button>)}</div>
  <div className="listening-player"><div><small>NOW PLAYING · PART {activePart+1}</small><h4>{parts[activePart].title}</h4><p>{parts[activePart].context}</p></div><div className="listening-controls"><button type="button" className="primary" onClick={play} disabled={playing||audioLoading||(mock&&(played[activePart]||remaining===0))}>{audioLoading?'Preparing audio…':playing?'Playing…':played[activePart]?(mock?'Recording played':'Play again'):'▶ Play recording'}</button><button type="button" className="secondary" onClick={stop} disabled={!playing}>Stop</button></div>{mock&&played[activePart]&&<small className="played-note">Mock mode: this part has been played once.</small>}</div>
  <div className="listening-questions"><h4>Part {activePart+1} questions</h4><p className="reading-instructions">Listen to the recording and answer the questions in this part. You can move between parts.</p>{questions.filter(q=>Math.ceil(q[0]/10)===activePart+1).map(q=><div className="listening-question" key={q[0]}><div><b>{q[0]}.</b> <span className="question-type">{q[1]}</span></div><p>{q[2]}</p>{q[3]==='choice'?<div className="reading-options">{q[3+1].map((v,i)=>{const k=String.fromCharCode(65+i);return <label key={k}><input type="radio" name={'listen'+q[0]} checked={answers[q[0]]===k} onChange={()=>setAnswers(a=>({...a,[q[0]]:k}))} disabled={mock&&remaining===0}/><span>{k}. {v}</span></label>;})}</div>:<input className="reading-short-answer" value={answers[q[0]]||''} onChange={e=>setAnswers(a=>({...a,[q[0]]:e.target.value}))} placeholder="Your answer" disabled={mock&&remaining===0}/>}</div>)}</div>
  <div className="listening-bottom"><button type="button" className="secondary" onClick={()=>{stop();setActivePart(Math.max(0,activePart-1));}} disabled={activePart===0}>← Previous part</button><button type="button" className="secondary" onClick={()=>{stop();setActivePart(Math.min(3,activePart+1));}} disabled={activePart===3}>Next part →</button><button type="button" className="primary" onClick={submit} disabled={mock&&!timerStarted&&remaining>0}>Submit Listening test →</button></div>
  {result&&<div className="reading-result"><h3>Your Listening practice result</h3><strong>{result.score} / 40</strong><p>{result.answered} questions answered. This is a raw practice score, not an official IELTS band. Check spelling and singular/plural forms carefully.</p><button type="button" className="primary" onClick={()=>{setAnswers({});setPlayed({});setActivePart(0);setResult(null);setRemaining(1800);setTimerStarted(false);}}>Retake test</button></div>}
  <p className="reading-disclaimer">Original practice material using IELTS-style section order and question types. It is not an official IELTS paper. Audio is AI-generated rather than an official recording. The prototype does not yet reproduce official answer-transfer time or every official question layout. Listening content is shared across Academic and General Training.</p>
 </div>;
}
