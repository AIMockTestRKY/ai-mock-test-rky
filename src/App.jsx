import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, apiBase, founderEmail, requireConfig } from './supabase';
import { BookOpen, Clock3, LogOut, History, Settings, ShieldCheck, Sparkles, Crown, Menu, X, CheckCircle2, Circle, Flag, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

const EXAMS = ['SSC','Railway','UPSC','Bank Exam','State Govt Exam','Board Exam','Custom'];
const RULES = {
  SSC:{seconds:36,negative:0.25}, 'Bank Exam':{seconds:36,negative:0.25},
  Railway:{seconds:54,negative:0.33}, UPSC:{seconds:72,negative:0.33},
  'State Govt Exam':{seconds:60,negative:0.25}, Custom:{seconds:60,negative:0.25},
  'Board Exam':{seconds:90,negative:0}
};
const money = n => `₹${Number(n).toFixed(n % 1 ? 2 : 0)}`;
const fmtTime = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const errText = e => e?.message || 'Something went wrong. Please try again.';
const headers = async () => {
  const { data:{session} } = await supabase.auth.getSession();
  return { 'Content-Type':'application/json', ...(session?.access_token ? {Authorization:`Bearer ${session.access_token}`} : {}) };
};

function Brand() {
  return <header className="brand"><div className="brand-mark"><BookOpen size={22}/></div><div><div className="brand-name">AI Mock Test <span>RKY</span></div><div className="founder">Founder: Rahul Kumar Yadav</div></div><div className="brand-tag">AI POWERED CBT</div></header>;
}
function Button({children,variant='primary',...props}) { return <button className={`btn ${variant}`} {...props}>{children}</button>; }
function Field({label,children}) { return <label className="field"><span>{label}</span>{children}</label>; }

function Auth({onAuth}) {
  const [mode,setMode]=useState('login'), [email,setEmail]=useState(''), [password,setPassword]=useState(''), [name,setName]=useState('');
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      requireConfig();
      if(mode==='signup') {
        const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
        if(error) throw error;
        if(!data.session) setMessage('Account created. Check your email to confirm your account, then log in.');
        else onAuth();
      } else {
        const {error}=await supabase.auth.signInWithPassword({email,password});
        if(error) throw error; onAuth();
      }
    } catch(e) { setMessage(errText(e)); } finally { setBusy(false); }
  }
  return <div className="auth-wrap"><Brand/><div className="auth-card"><div className="eyebrow">WELCOME TO YOUR PRACTICE ROOM</div><h1>{mode==='login'?'Login to continue':'Create your account'}</h1><p className="muted">Practice with exam-focused AI mock tests and track your progress.</p>
    <form onSubmit={submit} className="stack">
      {mode==='signup'&&<Field label="Full name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></Field>}
      <Field label="Email address"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></Field>
      <Field label="Password"><input type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></Field>
      <Button disabled={busy}>{busy?'Please wait…':mode==='login'?'Login':'Create account'}</Button>
    </form>
    {message&&<div className="notice">{message}</div>}
    <p className="switch">{mode==='login'?"New here?":"Already registered?"} <button onClick={()=>{setMode(mode==='login'?'signup':'login');setMessage('')}}>{mode==='login'?'Create an account':'Login'}</button></p>
  </div><p className="footnote">Your account and test records are stored securely.</p></div>;
}

function Setup({profile,onStart,onUpgrade,loading}) {
  const [exam,setExam]=useState('SSC'),[custom,setCustom]=useState(''),[difficulty,setDifficulty]=useState('Medium'),[count,setCount]=useState(20),[language,setLanguage]=useState('Bilingual');
  const examName=exam==='Custom'?(custom.trim()||'Custom'):exam, rule=RULES[exam]||RULES.Custom;
  const freeBlocked=!profile?.is_pro&&(profile?.free_tests_used>=2||count>20);
  return <div className="panel setup"><div className="section-head"><div><div className="eyebrow">BUILD YOUR PRACTICE SESSION</div><h2>Start a mock test</h2><p className="muted">Choose your exam pattern and let AI prepare the questions.</p></div><div className="icon-tile"><Sparkles/></div></div>
    <div className="form-grid">
      <Field label="Exam / subject name"><select value={exam} onChange={e=>setExam(e.target.value)}>{EXAMS.map(x=><option key={x}>{x}</option>)}</select></Field>
      {exam==='Custom'&&<Field label="Custom exam name"><input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Enter exam or subject" required/></Field>}
      <Field label="Difficulty"><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{['Easy','Medium','Hard'].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label={`Number of questions · ${count}`}><input type="range" min="5" max="100" step="1" value={count} onChange={e=>setCount(Number(e.target.value))}/><div className="range-label"><span>5</span><strong>{count} questions</strong><span>100</span></div></Field>
      <Field label="Language"><select value={language} onChange={e=>setLanguage(e.target.value)}><option>Hindi</option><option>English</option><option>Bilingual</option></select></Field>
    </div>
    <div className="test-facts"><div><span>Estimated duration</span><strong>{Math.ceil(count*rule.seconds/60)} min</strong></div><div><span>Negative marking</span><strong>{rule.negative===0?'None':`-${rule.negative}`}</strong></div><div><span>Question count</span><strong>{count}</strong></div></div>
    {!profile?.is_pro&&<div className="free-note"><Crown size={17}/> {Math.max(0,2-(profile?.free_tests_used||0))} free test(s) remaining · Free tests support up to 20 questions.</div>}
    <Button disabled={loading||!examName.trim()} onClick={()=>freeBlocked?onUpgrade():onStart({examName,difficulty,count,language,examKey:exam})}>{loading?'Generating questions…':freeBlocked?'Upgrade to Pro':'Generate AI mock test'} <ArrowRight size={17}/></Button>
  </div>;
}

function Exam({test,onFinish}) {
  const [answers,setAnswers]=useState({}),[marked,setMarked]=useState([]),[index,setIndex]=useState(0),[seconds,setSeconds]=useState(test.durationSeconds),[confirm,setConfirm]=useState(false);
  const q=test.questions[index];
  const finishRef=useRef(null);
  finishRef.current=()=>onFinish(answers,marked);
  useEffect(()=>{const id=setInterval(()=>setSeconds(s=>{if(s<=1){clearInterval(id);finishRef.current?.();return 0;}return s-1;}),1000);return()=>clearInterval(id)},[]);
  const answered=Object.keys(answers).length;
  return <div className="exam-layout"><div className="exam-main"><div className="exam-top"><div><div className="eyebrow">{test.examName} · {test.difficulty}</div><h2>Mock Test</h2></div><div className={`timer ${seconds<60?'urgent':''}`}><Clock3 size={18}/>{fmtTime(seconds)}</div></div>
    <div className="progress"><span style={{width:`${((index+1)/test.questions.length)*100}%`}}/></div>
    <div className="question-card"><div className="question-meta"><span>QUESTION {index+1} OF {test.questions.length}</span><button className={`mark-btn ${marked.includes(index)?'active':''}`} onClick={()=>setMarked(a=>a.includes(index)?a.filter(x=>x!==index):[...a,index])}><Flag size={15}/> {marked.includes(index)?'Marked':'Mark for review'}</button></div><h3>{q.question}</h3>
      <div className="options">{q.options.map((o,i)=><button key={i} className={`option ${answers[index]===i?'selected':''}`} onClick={()=>setAnswers(a=>({...a,[index]:i}))}><span className="option-letter">{String.fromCharCode(65+i)}</span>{o}</button>)}</div>
    </div>
    <div className="exam-actions"><Button variant="secondary" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ArrowLeft size={16}/> Previous</Button><Button onClick={()=>index===test.questions.length-1?setConfirm(true):setIndex(i=>i+1)}>{index===test.questions.length-1?'Submit test':'Save & next'} <ArrowRight size={16}/></Button></div>
    {confirm&&<div className="modal-backdrop"><div className="modal"><h2>Submit your test?</h2><p className="muted">You answered {answered} of {test.questions.length} questions. Unanswered questions will be marked incorrect.</p><div className="modal-actions"><Button variant="secondary" onClick={()=>setConfirm(false)}>Continue test</Button><Button onClick={finish}>Submit now</Button></div></div></div>}
  </div><aside className="palette"><h3>Question palette</h3><div className="palette-legend"><span><i className="dot done"/> Answered</span><span><i className="dot"/> Not answered</span><span><i className="dot review"/> Review</span></div><div className="palette-grid">{test.questions.map((_,i)=><button key={i} className={`palette-num ${answers[i]!==undefined?'done':''} ${marked.includes(i)?'review':''} ${index===i?'current':''}`} onClick={()=>setIndex(i)}>{i+1}</button>)}</div><div className="palette-count"><span>{answered} answered</span><span>{test.questions.length-answered} remaining</span></div><Button variant="secondary" onClick={()=>setConfirm(true)}>Submit test</Button></aside></div>;
}

function Result({record,onRetake,onNew}) {
  const q=record.questions||[], correct=q.filter(x=>x.userAnswer===x.correctIndex).length;
  const attempted=q.filter(x=>x.userAnswer!==null&&x.userAnswer!==undefined).length;
  const wrong=attempted-correct, score=correct-wrong*record.negativeMarking;
  const accuracy=attempted?Math.round(correct/attempted*100):0;
  return <div className="panel"><div className="result-head"><div className="eyebrow">TEST COMPLETED</div><h2>Your result</h2><p className="muted">{record.exam_name||record.examName} · {record.difficulty}</p></div><div className="score-grid"><div className="score-main"><span>Final score</span><strong>{score.toFixed(2)}</strong><small>out of {q.length}</small></div><div><span>Accuracy</span><strong>{accuracy}%</strong></div><div><span>Correct</span><strong>{correct}</strong></div><div><span>Incorrect</span><strong>{wrong}</strong></div></div><div className="result-actions"><Button onClick={onRetake}><RefreshCw size={16}/> Retake same test</Button><Button variant="secondary" onClick={onNew}>New test</Button></div><h3 className="solutions-title">Detailed solutions</h3>{q.map((x,i)=><article className="solution" key={i}><div className="solution-title"><strong>Q{i+1}. {x.question}</strong><span className={x.userAnswer===x.correctIndex?'correct':'incorrect'}>{x.userAnswer===x.correctIndex?'Correct':'Incorrect / skipped'}</span></div><p><b>Correct answer:</b> {x.options[x.correctIndex]}</p>{x.userAnswer!==null&&x.userAnswer!==undefined&&<p><b>Your answer:</b> {x.options[x.userAnswer]}</p>}<p className="muted">{x.solution}</p></article>)}</div>;
}

function Upgrade({offer,onClose,onCheckout,busy}) {
  return <div className="modal-backdrop"><div className="modal upgrade-modal"><button className="close" onClick={onClose}><X/></button><div className="icon-tile"><Crown/></div><div className="eyebrow">UNLOCK YOUR FULL POTENTIAL</div><h2>Upgrade to Pro</h2><p className="muted">Unlimited AI mock tests with up to 100 questions per test.</p>
    <div className="offer-banner">50% OFF FOR FIRST 100 STUDENTS · {offer.remaining} SPOTS LEFT</div>
    <div className="plans"><div className="plan"><span>Monthly</span><strong>{money(offer.monthly)}</strong>{offer.discount&&<del>₹19</del>}<Button disabled={busy} onClick={()=>onCheckout('monthly')}>Choose monthly</Button></div><div className="plan featured"><span>Yearly · Best value</span><strong>{money(offer.yearly)}</strong>{offer.discount&&<del>₹99</del>}<Button disabled={busy} onClick={()=>onCheckout('yearly')}>Choose yearly</Button></div></div>
    <p className="tiny muted">Payments are processed securely by Razorpay. Subscription billing and renewal terms are shown at checkout.</p>
  </div></div>;
}

export default function App() {
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[page,setPage]=useState('dashboard'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[test,setTest]=useState(null),[record,setRecord]=useState(null),[history,setHistory]=useState([]),[upgrade,setUpgrade]=useState(false),[offer,setOffer]=useState({monthly:9.5,yearly:49.5,discount:true,remaining:100}),[admin,setAdmin]=useState(null),[menu,setMenu]=useState(false);
  const email=session?.user?.email?.toLowerCase()||'';
  const isFounder=!!founderEmail&&email===founderEmail;

  const loadData=useCallback(async()=>{
    if(!supabase||!session?.user)return;
    try {
      const [{data:p,error:pe},{data:h,error:he}]=await Promise.all([
        supabase.from('profiles').select('*').eq('id',session.user.id).single(),
        supabase.from('test_records').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100)
      ]);
      if(pe)throw pe;if(he)throw he;setProfile(p);setHistory(h||[]);
    } catch(e){setError(errText(e));}
  },[session]);
  useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session)).catch(e=>setError(errText(e)));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
  useEffect(()=>{if(session)loadData();else{setProfile(null);setHistory([])}},[session,loadData]);
  useEffect(()=>{if(!supabase)return;const loadOffer=async()=>{try{const h=await headers();const r=await fetch(`${apiBase}/api/pricing`,{headers:h});if(r.ok)setOffer(await r.json())}catch(e){console.warn('Pricing unavailable',e)}};loadOffer()},[session]);

  async function startTest(config) {
    setBusy(true);setError('');
    try {
      const h=await headers();const r=await fetch(`${apiBase}/api/generate`,{method:'POST',headers:h,body:JSON.stringify(config)});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Question generation failed.');
      setTest({...config,questions:data.questions,durationSeconds:config.count*(RULES[config.examKey]?.seconds||60),negativeMarking:RULES[config.examKey]?.negative??0.25});setPage('exam');
    } catch(e){setError(errText(e))}finally{setBusy(false)}
  }
  async function finishTest(answers,marked) {
    if(!test)return;setBusy(true);setError('');
    try {
      const questions=test.questions.map((q,i)=>({...q,userAnswer:answers[i]??null,markedForReview:marked.includes(i)}));
      const body={exam_name:test.examName,difficulty:test.difficulty,language:test.language,question_count:test.count,negative_marking:test.negativeMarking,questions,answers,marked_for_review:marked};
      const h=await headers();const r=await fetch(`${apiBase}/api/submit`,{method:'POST',headers:h,body:JSON.stringify(body)});
      const data=await r.json();if(!r.ok)throw new Error(data.error||'Could not save your test.');
      const completed={...body,...data.record,questions};setRecord(completed);setPage('result');await loadData();
    }catch(e){setError(errText(e))}finally{setBusy(false)}
  }
  async function checkout(plan) {
    setBusy(true);setError('');
    try {
      const h=await headers();const r=await fetch(`${apiBase}/api/checkout`,{method:'POST',headers:h,body:JSON.stringify({plan})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not start checkout.');
      if(!window.Razorpay)throw new Error('Razorpay Checkout did not load. Refresh and try again.');
      const rz=new window.Razorpay({...d.checkout,handler:async()=>{setUpgrade(false);setError('Payment submitted. Pro access will activate after server-side payment verification/webhook confirmation.');setTimeout(loadData,1800)},modal:{ondismiss:()=>setBusy(false)}});
      rz.open();
    }catch(e){setError(errText(e));setBusy(false)}
  }
  async function openHistoryItem(item) {
    setRecord({...item,questions:item.questions||[]});setPage('result');
  }
  function retakeRecord(saved) {
    const examName=saved.exam_name||saved.examName||'Custom';
    const examKey=EXAMS.includes(examName)?examName:'Custom';
    const questions=(saved.questions||[]).map(({userAnswer,markedForReview,...q})=>q);
    setTest({examName,examKey,difficulty:saved.difficulty||'Medium',count:questions.length,language:saved.language||'Bilingual',questions,durationSeconds:questions.length*(RULES[examKey]?.seconds||60),negativeMarking:Number(saved.negative_marking??saved.negativeMarking??RULES[examKey]?.negative??.25)});
    setPage('exam');
  }
  async function openAdmin() {
    setBusy(true);try{const h=await headers();const r=await fetch(`${apiBase}/api/admin/overview`,{headers:h});const d=await r.json();if(!r.ok)throw new Error(d.error||'Admin access denied');setAdmin(d);setPage('admin')}catch(e){setError(errText(e))}finally{setBusy(false)}
  }
  async function logout(){await supabase.auth.signOut();setPage('dashboard')}
  if(!session)return <Auth onAuth={()=>supabase.auth.getSession().then(({data})=>setSession(data.session))}/>;
  return <div className="app-shell"><Brand/><nav className="nav"><button className="mobile-menu" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button><div className={`nav-links ${menu?'open':''}`}><button className={page==='dashboard'?'active':''} onClick={()=>{setPage('dashboard');setMenu(false)}}><BookOpen size={16}/> Dashboard</button><button className={page==='history'?'active':''} onClick={()=>{setPage('history');setMenu(false)}}><History size={16}/> My Test History</button>{isFounder&&<button onClick={openAdmin}><ShieldCheck size={16}/> Admin Overview</button>}</div><div className="nav-user"><span>{session.user.email}</span><button title="Logout" onClick={logout}><LogOut size={17}/></button></div></nav>
    <main className="content">{error&&<div className="notice error-notice">{error}<button onClick={()=>setError('')}>×</button></div>}
      {page==='dashboard'&&<><div className="welcome"><div><div className="eyebrow">YOUR PERSONAL EXAM COMPANION</div><h1>Good practice starts here.</h1><p className="muted">Build consistency. Measure progress. Improve every attempt.</p></div><div className="welcome-art"><Sparkles size={40}/></div></div><Setup profile={profile} loading={busy} onStart={startTest} onUpgrade={()=>setUpgrade(true)}/></>}
      {page==='exam'&&test&&<Exam test={test} onFinish={finishTest}/>}
      {page==='result'&&record&&<Result record={record} onRetake={()=>retakeRecord(record)} onNew={()=>{setRecord(null);setPage('dashboard')}}/>}
      {page==='history'&&<div className="panel"><div className="section-head"><div><div className="eyebrow">YOUR PERFORMANCE JOURNEY</div><h2>My Test History</h2></div><History/></div>{history.length===0?<p className="muted">No tests completed yet. Your submitted tests will appear here.</p>:<div className="history-list">{history.map(item=><div className="history-item" key={item.id}><div><strong>{item.exam_name}</strong><p className="muted">{new Date(item.created_at).toLocaleString()} · {item.difficulty} · {item.question_count} questions</p></div><div className="history-score"><strong>{Number(item.score).toFixed(2)}</strong><small>{item.accuracy}% accuracy</small></div><Button variant="secondary" onClick={()=>openHistoryItem(item)}>Solutions</Button></div>)}</div>}</div>}
      {page==='admin'&&admin&&<div className="panel"><div className="eyebrow">FOUNDER CONSOLE</div><h2>Admin overview</h2><div className="score-grid"><div><span>Paid subscribers</span><strong>{admin.paidSubscribers}/100</strong></div><div><span>Active Pro users</span><strong>{admin.activeProUsers}</strong></div><div><span>Offer spots remaining</span><strong>{admin.remaining}</strong></div></div></div>}
    </main>
    <footer>© {new Date().getFullYear()} AI Mock Test RKY · Founder: Rahul Kumar Yadav</footer>
    {upgrade&&<Upgrade offer={offer} onClose={()=>setUpgrade(false)} onCheckout={checkout} busy={busy}/>}
    <script/>
  </div>;
}
