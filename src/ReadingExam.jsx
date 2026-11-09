import React,{useEffect,useState} from 'react';

const passages = {
 academic:[
  {title:'PASSAGE 1 — Urban trees and city life',text:'Cities plant trees to improve neighbourhoods. Trees provide shade, reduce surface temperatures and absorb some pollutants. A study in several European cities found that streets with mature trees were cooler on summer afternoons than streets with little vegetation. The benefits depend on species, soil and maintenance.\n\nPeople are more likely to walk or sit outdoors where shade is available. However, planting programmes can fail when young trees are placed in small pits or are not watered during their first years. Some councils involve residents in monitoring trees, while specialists select species able to tolerate warmer and drier conditions.'},
  {title:'PASSAGE 2 — The changing workplace',text:'Flexible working has expanded as digital communication tools have improved. Employees may work from home for part of the week, while organisations use shared offices for meetings and collaborative tasks. Supporters say flexibility reduces commuting and helps people manage family responsibilities.\n\nResearchers caution that the effects differ between workers. New employees may find it harder to learn informally when they rarely meet colleagues. Some teams report that complex decisions take longer when discussions are spread across several platforms. Many employers are therefore experimenting with hybrid schedules rather than applying one policy to every department.'},
  {title:'PASSAGE 3 — How museums measure success',text:'Museums have traditionally measured success through visitor numbers and collection size. These measures remain useful, but reveal little about what visitors learn or remember. Recent research encourages museums to evaluate engagement, including whether exhibitions prompt discussion or help visitors connect history with contemporary questions.\n\nEvaluation is not straightforward. A visitor who spends a long time in a gallery may be interested or simply waiting for a companion. Interviews provide richer information, although they are expensive and involve small samples. Digital surveys reach more people but may attract responses mainly from visitors with strong opinions. Many institutions combine several methods and interpret results cautiously.'}
 ],
 general:[
  {title:'SECTION 1 — Community information',text:'RIVERSIDE COMMUNITY CENTRE\nOpen Monday to Friday, 7.00 am–9.00 pm, and Saturday, 9.00 am–5.00 pm. Closed Sundays. Members can book the sports hall up to seven days ahead. The swimming pool is closed for maintenance every Tuesday morning.\n\nGREEN STREET LIBRARY\nOpens at 9.30 am on weekdays and 10.00 am on Saturdays. A free computer session can be booked for 45 minutes. For longer access, speak to the librarian. Late books may be returned through the slot beside the main entrance.'},
  {title:'SECTION 2 — Staff training and workplace safety',text:'All new employees must complete an induction during their first week. It covers fire procedures, data protection and equipment use. Staff working with machinery must attend a practical safety session before operating it without supervision.\n\nTraining requests should be submitted to the department manager at least ten working days before a course. The company normally pays fees when training is relevant to the employee’s current role. Employees must keep copies of their certificates.'},
  {title:'SECTION 3 — Repair cafés and local communities',text:'Repair cafés are community events where volunteers help residents repair household objects rather than discard them. Visitors may bring small electrical items, clothing or bicycles, although organisers publish a list of items that cannot be accepted. The events also allow people to exchange practical skills and meet neighbours.\n\nSuccess depends on reliable volunteers and suitable equipment. Demand is often highest during the first few events and then becomes more predictable. Local authorities sometimes provide venues, but groups depend on donations for tools and replacement parts. Repairs are not guaranteed, and safety must take priority over saving an item.'}
 ]
};
const questions=[
[1,'Multiple choice','What effect can mature street trees have?','choice',['Cooler streets','No air pollution','More rainfall'],'A'],
[2,'Multiple choice','Why can tree-planting programmes fail?','choice',['Residents dislike parks','Young trees receive too little care','All species grow too quickly'],'B'],
[3,'True / False / Not Given','All tree species provide identical benefits in every city.','tfng',[],'FALSE'],
[4,'True / False / Not Given','Some councils involve residents in monitoring trees.','tfng',[],'TRUE'],
[5,'True / False / Not Given','The European study lasted twenty years.','tfng',[],'NOT GIVEN'],
[6,'Matching headings','Choose the best heading for Passage 1.','choice',['The need for ongoing care','A history of parks','Removing mature trees'],'A'],
[7,'Sentence completion','Trees can reduce surface ______ during hot weather.','text',[],'temperatures'],
[8,'Sentence completion','Young trees may need to be ______ during their first years.','text',[],'watered'],
[9,'Multiple choice','What is the main point of Passage 2?','choice',['Home working suits everyone','Flexible work brings benefits and challenges','Offices are no longer needed'],'B'],
[10,'Yes / No / Not Given','The writer believes one work arrangement suits every organisation.','yng',[],'NO'],
[11,'Yes / No / Not Given','Some new employees may miss informal learning opportunities.','yng',[],'YES'],
[12,'Yes / No / Not Given','Most companies have abandoned shared offices.','yng',[],'NOT GIVEN'],
[13,'Matching information','Which passage discusses informal learning at work?','choice',['Passage 1','Passage 2','Passage 3'],'B'],
[14,'Matching information','Which passage discusses the limits of digital surveys?','choice',['Passage 1','Passage 2','Passage 3'],'C'],
[15,'Matching information','Which passage mentions selecting species for a warmer climate?','choice',['Passage 1','Passage 2','Passage 3'],'A'],
[16,'Summary completion','Flexible work can reduce time spent ______.','text',[],'commuting'],
[17,'Summary completion','Some teams find complex decisions take ______.','text',[],'longer'],
[18,'Summary completion','Many employers are testing ______ schedules.','text',[],'hybrid'],
[19,'Matching features','Who selects suitable tree species?','choice',['City specialists','New employees','Museum visitors'],'A'],
[20,'Matching features','Who may find remote work makes informal learning harder?','choice',['City specialists','New employees','Museum visitors'],'B'],
[21,'Matching features','Who may respond to museum digital surveys?','choice',['City specialists','New employees','Museum visitors'],'C'],
[22,'Short-answer questions','What type of schedule combines office and remote work?','text',[],'hybrid'],
[23,'Short-answer questions','What do organisations use for meetings and collaborative tasks?','text',[],'shared offices'],
[24,'Matching sentence endings','Interviews can provide richer information, but they are…','choice',['expensive','always anonymous','the only method'],'A'],
[25,'Matching sentence endings','Digital surveys may attract people who…','choice',['visit for free','already have strong opinions','work for councils'],'B'],
[26,'Multiple choice','What is the central argument of Passage 3?','choice',['Visitor numbers are irrelevant','Museums should use several measures','Collections should be reduced'],'B'],
[27,'True / False / Not Given','Visitor numbers remain useful to museums.','tfng',[],'TRUE'],
[28,'True / False / Not Given','Every museum uses the same evaluation system.','tfng',[],'NOT GIVEN'],
[29,'Sentence completion','Museums increasingly examine visitor ______.','text',[],'engagement'],
[30,'Sentence completion','A visitor may be waiting for a ______.','text',[],'companion'],
[31,'Matching headings','Choose the best heading for Passage 2.','choice',['The mixed results of flexible employment','The end of training','Increasing commuting'],'A'],
[32,'Matching headings','Choose the best heading for Passage 3.','choice',['Collecting more objects','Rethinking museum success','The decline of exhibitions'],'B'],
[33,'Summary completion','Museums may combine several evaluation ______.','text',[],'methods'],
[34,'Short-answer questions','Who might a visitor be waiting for in a gallery?','text',[],'a companion'],
[35,'Yes / No / Not Given','The writer suggests that every evaluation method has limitations.','yng',[],'YES'],
[36,'Yes / No / Not Given','The writer recommends visitor numbers as the only measure.','yng',[],'NO'],
[37,'Yes / No / Not Given','Most visitors prefer online surveys to interviews.','yng',[],'NOT GIVEN'],
[38,'Multiple choice','Why can interviews be useful to museums?','choice',['They always include large samples','They can reveal richer information','They cost less than surveys'],'B'],
[39,'Multiple choice','What limitation can affect digital surveys?','choice',['They may attract a limited type of respondent','They cannot be completed online','They take several hours'],'A'],
[40,'Short-answer questions','How should institutions treat evaluation results?','text',[],'cautiously']
];
const generalQuestions=[
[1,'Multiple choice','When is Riverside Community Centre closed?','choice',['Saturday','Sunday','Tuesday'],'B'],
[2,'Short-answer questions','How many days ahead can the sports hall be booked?','text',[],'seven days'],
[3,'True / False / Not Given','The pool closes every Tuesday morning.','tfng',[],'TRUE'],
[4,'True / False / Not Given','Swimming lessons are free on Sundays.','tfng',[],'NOT GIVEN'],
[5,'Sentence completion','The centre closes at ______ pm on weekdays.','text',[],'9'],
[6,'Matching information','Which facility offers computer sessions?','choice',['Riverside Centre','Green Street Library'],'B'],
[7,'Short-answer questions','How long is a free computer session?','text',[],'45 minutes'],
[8,'True / False / Not Given','Late books can be returned through an entrance slot.','tfng',[],'TRUE'],
[9,'Multiple choice','Who should users speak to about longer computer access?','choice',['The librarian','The manager','The caretaker'],'A'],
[10,'Matching features','Which place opens at 7 am on weekdays?','choice',['Riverside Centre','Green Street Library'],'A'],
[11,'Sentence completion','The library opens at ______ am on Saturdays.','text',[],'10'],
[12,'Yes / No / Not Given','The library charges for every computer session.','yng',[],'NO'],
[13,'Short-answer questions','Where is the book-return slot?','text',[],'beside the main entrance'],
[14,'Multiple choice','When must new employees complete induction?','choice',['During their first week','After six months','Before applying'],'A'],
[15,'Matching information','Which programme covers fire procedures and data protection?','choice',['Induction','Machinery training','External course'],'A'],
[16,'True / False / Not Given','Employees can operate machinery alone before safety training.','tfng',[],'FALSE'],
[17,'Sentence completion','Training requests must be made ten working days before the ______.','text',[],'course'],
[18,'Short-answer questions','Who receives training requests?','text',[],'department manager'],
[19,'Yes / No / Not Given','The company normally pays for relevant job training.','yng',[],'YES'],
[20,'True / False / Not Given','Employees must hand their original certificates to the manager.','tfng',[],'NOT GIVEN'],
[21,'Matching features','Who needs practical safety training before using machinery alone?','choice',['All staff','Machinery staff','Visitors'],'B'],
[22,'Summary completion','Induction includes the correct use of ______.','text',[],'equipment'],
[23,'Multiple choice','What is the purpose of induction?','choice',['Explain essential workplace procedures','Choose managers','Set salaries'],'A'],
[24,'Matching sentence endings','Course fees are normally paid when training is…','choice',['unrelated to the role','relevant to the current role','optional for visitors'],'B'],
[25,'Yes / No / Not Given','Employees should keep copies of certificates.','yng',[],'YES'],
[26,'Short-answer questions','How many working days’ notice is needed for training requests?','text',[],'ten'],
[27,'Multiple choice','What is a repair café?','choice',['A shop selling appliances','A community repair event','A recycling factory'],'B'],
[28,'True / False / Not Given','Repair cafés accept every household item.','tfng',[],'FALSE'],
[29,'Sentence completion','Volunteers help people repair items rather than ______ them.','text',[],'discard'],
[30,'Short-answer questions','Name one item people may bring.','text',[],'clothing'],
[31,'Yes / No / Not Given','Repair cafés exist only to save people money.','yng',[],'NO'],
[32,'Matching information','Which section describes an activity bringing neighbours together?','choice',['Section 1','Section 2','Section 3'],'C'],
[33,'Matching headings','Choose the best heading for Section 3.','choice',['Community repair events','Buying new products','Local council offices'],'A'],
[34,'Summary completion','Visitors can exchange practical ______.','text',[],'skills'],
[35,'True / False / Not Given','Demand is highest after the events become established.','tfng',[],'FALSE'],
[36,'Multiple choice','What may local authorities provide?','choice',['Venues','Replacement parts','Paid volunteers'],'A'],
[37,'Short-answer questions','What do groups need donations to buy?','text',[],'tools and replacement parts'],
[38,'Yes / No / Not Given','Organisers guarantee that every object can be repaired.','yng',[],'NO'],
[39,'Matching features','What must come before saving an object?','choice',['Speed','Safety','Low cost'],'B'],
[40,'Sentence completion','Repair café success depends on volunteers and suitable ______.','text',[],'equipment']
];

export default function ReadingExam({testType='academic',testMode='practice',onClose,onComplete}){
 const [remaining,setRemaining]=useState(3600),[started,setStarted]=useState(false),[answers,setAnswers]=useState({}),[result,setResult]=useState(null);
 useEffect(()=>{if(!started)return;const t=setInterval(()=>setRemaining(v=>{if(v<=1){clearInterval(t);setStarted(false);return 0;}return v-1;}),1000);return()=>clearInterval(t);},[started]);
 const questionSet=testType==='academic'?questions:generalQuestions;
 const set=(n,v)=>setAnswers(a=>({...a,[n]:v}));
 const normalise=value=>String(value||'').trim().toLowerCase().replace(/[.,!?;:]/g,'').replace(/\s+/g,' ');
 const accepted=(question,value)=>{const expected=question[5];const aliases={7:['temperature'],8:['water'],16:['commuting'],17:['longer'],18:['hybrid'],22:['hybrid schedule'],23:['shared office'],29:['engagement'],30:['companion'],33:['methods'],34:['a companion'],40:['with caution','carefully']};return [expected,...(aliases[question[0]]||[])].some(item=>normalise(value)===normalise(item));};
 const submit=()=>{const score=questionSet.reduce((s,q)=>s+(accepted(q,answers[q[0]])?1:0),0);setResult({score,count:Object.values(answers).filter(x=>String(x).trim()).length});setStarted(false);onComplete?.({score,count:Object.values(answers).filter(x=>String(x).trim()).length,total:40});};
 return <div className="reading-exam">
  <div className="reading-head"><div><span className="tag">{testType==='academic'?'ACADEMIC READING':'GENERAL TRAINING READING'} · {testMode==='mock'?'MOCK TEST':'PRACTICE TEST'}</span><h3>{testMode==='mock'?'Timed Reading mock test':'Reading practice test'} · 40 questions</h3><p>60 minutes · Complete all three passages or sections. Questions are numbered in test order. Your answers are marked automatically against this practice set’s answer key.</p></div><div className="reading-clock">{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}<small>TIME REMAINING</small></div></div>
  {!started&&!result&&<div className="reading-start"><p>{testMode==='mock'?'Mock-test conditions: start the 60-minute clock, answer all 40 questions and submit before time expires.':'Practise all 40 questions at your own pace; start the clock whenever you are ready.'}</p><button className="primary" type="button" onClick={()=>setStarted(true)}>{testMode==='mock'?'Start timed mock test →':'Start Reading practice →'}</button></div>}
  {remaining===0&&!result&&<p className="notice">Time has ended. Submit your answers to see your result.</p>}
  <div className="reading-columns"><div className="reading-texts">{passages[testType].map(p=><article className="reading-passage" key={p.title}><h4>{p.title}</h4><p>{p.text}</p></article>)}</div><div className="reading-questions"><h4>Questions 1–40</h4><p className="reading-instructions">Follow each instruction. For multiple choice, select one answer. For matching tasks, choose the correct letter from the list. For statement tasks, choose TRUE / FALSE / NOT GIVEN or YES / NO / NOT GIVEN. Type short answers where requested.</p>{questionSet.map(q=><div className="reading-question" key={q[0]}><div><b>{q[0]}.</b> <span className="question-type">{q[1]}</span></div><p>{q[2]}</p>{q[3]==='choice'&&q[1].toLowerCase().startsWith('multiple choice')?<div className="reading-options">{q[4].map((o,i)=>{const v=String.fromCharCode(65+i);return <label key={v}><input type="radio" name={'q'+q[0]} checked={answers[q[0]]===v} onChange={()=>set(q[0],v)} disabled={!started}/><span>{v}. {o}</span></label>;})}</div>:q[3]==='tfng'||q[3]==='yng'?<select value={answers[q[0]]||''} onChange={e=>set(q[0],e.target.value)} disabled={!started}><option value="">Choose answer</option>{(q[3]==='tfng'?['TRUE','FALSE','NOT GIVEN']:['YES','NO','NOT GIVEN']).map(v=><option key={v}>{v}</option>)}</select>:q[3]==='choice'?<select value={answers[q[0]]||''} onChange={e=>set(q[0],e.target.value)} disabled={!started}><option value="">Choose the correct option</option>{q[4].map((o,i)=>{const v=String.fromCharCode(65+i);return <option key={v} value={v}>{v}. {o}</option>;})}</select>:<input className="reading-short-answer" value={answers[q[0]]||''} onChange={e=>set(q[0],e.target.value)} placeholder="Type your answer" disabled={!started}/>}</div>)}</div></div>
  <div className="reading-submit"><span>{Object.values(answers).filter(v=>String(v).trim()).length} / 40 answered</span><button type="button" className="primary" onClick={submit} disabled={!started&&remaining!==0}>Submit Reading test →</button></div>
  {result&&<div className="reading-result"><h3>Your {testMode==='mock'?'Reading mock-test':'Reading practice'} result</h3><strong>{result.score} / 40</strong><p>{result.count} questions answered. This is a raw practice score, not an official IELTS band. Band conversion varies by test version and between Academic and General Training.</p><button className="primary" type="button" onClick={()=>{setRemaining(3600);setAnswers({});setResult(null);setStarted(false);}}>Retake test</button></div>}
  <p className="reading-disclaimer">Original practice questions, not official IELTS exam content. Academic and General Training have separate texts and answer keys. IELTS task combinations vary between test versions; this prototype uses a representative range of IELTS task formats.</p>
 </div>;
}
