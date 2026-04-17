import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'
import { EMOJIS, PROVIDERS_DEF, ONB, EXT_ICON, SUBJ } from './utils/constants.js'
import { toast, showAIDone, fmtDate, compressImg, getExt, isImgExt, cleanText } from './utils/helpers.js'
import { parseQuiz, parseFC, parseMappa, parseRiassunto, parseOpenQuiz } from './utils/parsers.js'
import UploadAIModal from './components/UploadAIModal.jsx'


function SubjectIcon({emoji,size=52}){
  const d=SUBJ[emoji]||SUBJ['📚']
  const SVGs={
    '📚':<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    '🧮':<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>,
    '🖥️':<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    '🎵':<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  }
  const svg=SVGs[emoji]||SVGs['📚']
  return <div style={{width:size,height:size,background:d.bg,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 2px 8px ${d.fg}22`}}><div style={{width:size*.55,height:size*.55,color:d.fg,fontSize:size*.55}}>{svg||emoji}</div></div>
}

function LogoSVG({size=36}){
  return <div className="logo-icon" style={{width:size,height:size,background:'linear-gradient(135deg,#8B1A12,#D4692A)'}}><svg viewBox="0 0 58 58" width={size*.75} height={size*.75} xmlns="http://www.w3.org/2000/svg"><path d="M34 5 L16 31 L27 31 L24 53 L44 25 L32 25 Z" fill="#FFFFFF" stroke="#FFE8D6" strokeWidth="1.2"/></svg></div>
}
function Brand({size='1.1rem'}){return <div className="brand-name" style={{fontSize:size}}>Flash<em>Bacon</em></div>}
function Spinner(){return <div className="ai-spinner"/>}

/* ═══ APP HEADER — uniforme: back sinistra, titolo centrato, avatar destra ═══ */
function AppHeader({title, onBack, backLabel='← Indietro', right=null, titleNode=null}){
  return(
    <div className="app-header">
      <div className="app-header-left">
        {onBack&&<button className="back-btn" onClick={onBack}>{backLabel}</button>}
      </div>
      <div className="app-header-title">
        {titleNode||title}
      </div>
      <div className="app-header-right">
        {right}
      </div>
    </div>
  )
}

/* ═══ OUTPUT CFG SHEET ═══ */
function OutputCfgSheet({tool, cfg, onChange, onGenerate, onClose}){
  const isQuiz=tool==='quiz'||tool==='quiz-aperta'
  const isFC=tool==='flashcards'
  return(
    <div className="sheet-ov" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="cfg-sheet-title">⚙️ Personalizza output</div>
        <div className="cfg-sheet-sub">Impostazioni per {tool==='quiz'?'Quiz':tool==='quiz-aperta'?'Quiz Aperta':tool==='flashcards'?'Flash Cards':tool==='riassunto'?'Riassunto':tool==='mappa'?'Mappa Concettuale':'Punti Chiave'}</div>

        {/* Modalità quiz (multipla / aperta) */}
        {isQuiz&&(
          <div className="cfg-row">
            <span className="cfg-label">Modalità</span>
            <div className="cfg-btns">
              <button className={`cfg-btn ${(cfg.mode||'multipla')==='multipla'?'active':''}`} onClick={()=>onChange({...cfg,mode:'multipla'})}>Multipla</button>
              <button className={`cfg-btn ${cfg.mode==='aperta'?'active':''}`} onClick={()=>onChange({...cfg,mode:'aperta'})}>Aperta</button>
            </div>
          </div>
        )}

        {/* Lunghezza / numero */}
        {(isQuiz||isFC)?(
          <div className="cfg-row">
            <span className="cfg-label">N. domande</span>
            <div className="cfg-btns">
              {[5,10,20].map(n=><button key={n} className={`cfg-btn ${cfg.num===n?'active':''}`} onClick={()=>onChange({...cfg,num:n})}>{n}</button>)}
            </div>
          </div>
        ):(
          <div className="cfg-row">
            <span className="cfg-label">Lunghezza</span>
            <div className="cfg-btns">
              {['Breve','Media','Lunga'].map((l,i)=><button key={i} className={`cfg-btn ${cfg.length===(i+1)?'active':''}`} onClick={()=>onChange({...cfg,length:i+1})}>{l}</button>)}
            </div>
          </div>
        )}

        {/* Difficoltà per quiz */}
        {isQuiz&&(
          <div className="cfg-row">
            <span className="cfg-label">Difficoltà</span>
            <div className="cfg-btns">
              {['Facile','Medio','Difficile'].map((l,i)=><button key={i} className={`cfg-btn ${cfg.diff===(i+1)?'active':''}`} onClick={()=>onChange({...cfg,diff:i+1})}>{l}</button>)}
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={onGenerate}>Genera →</button>
      </div>
    </div>
  )
}

/* ═══ PROMPT MODE SHEET ═══ */
function PromptModeSheet({mode, customPrompt, onChange, onClose, chatLength=2, onLengthChange}){
  const [localCustom,setLocalCustom]=useState(customPrompt||'')
  const opts=[
    {key:'default',icon:'🤖',title:'Predefinita',desc:"Risposta bilanciata e informativa"},
    {key:'learning',icon:'🎓',title:'Guida all\'apprendimento',desc:"Concetti spiegati con analogie e connessioni"},
    {key:'custom',icon:'✍️',title:'Prompt personalizzato',desc:'Definisci tu lo stile di risposta'},
  ]
  return(
    <div className="sheet-ov" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <h3>Impostazioni risposta</h3>
        <div className="cfg-row" style={{marginBottom:12}}>
          <span className="cfg-label">Lunghezza</span>
          <div className="cfg-btns">
            {[['Breve',1],['Media',2],['Lunga',3]].map(([l,v])=>(
              <button key={v} className={`cfg-btn${chatLength===v?' active':''}`} onClick={()=>onLengthChange?.(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="prompt-mode-opts">
          {opts.map(o=>(
            <div key={o.key} className={`prompt-mode-opt ${mode===o.key?'active':''}`} onClick={()=>onChange({mode:o.key,customPrompt:localCustom})}>
              <span className="prompt-mode-opt-icon">{o.icon}</span>
              <div><div className="prompt-mode-opt-title">{o.title}</div><div className="prompt-mode-opt-desc">{o.desc}</div></div>
            </div>
          ))}
        </div>
        {mode==='custom'&&(
          <textarea className="prompt-custom-input" placeholder="Es: Rispondimi come un professore universitario, usa esempi pratici…" value={localCustom} onChange={e=>{setLocalCustom(e.target.value);onChange({mode:'custom',customPrompt:e.target.value})}}/>
        )}
        <button className="btn-primary" onClick={onClose}>Salva</button>
      </div>
    </div>
  )
}

/* ═══ MAIN APP ═══ */
export default function App(){
  const [screen,setScreen]=useState('loading')
const [showUploadModal,setShowUploadModal]=useState(false)
const [showFontiUpload,setShowFontiUpload]=useState(false)
const [showQuizPicker,setShowQuizPicker]=useState(false)
  const [utente,setUtente]=useState(null)
  const [materie,setMaterie]=useState([])
  const [argomenti,setArgomenti]=useState([])
  const [fonti,setFonti]=useState([])
  const [storico,setStorico]=useState([])
  const [providers,setProviders]=useState([])
  const [ripassi,setRipassi]=useState([])

  const [curMateriaId,setCurMateriaId]=useState(null)
  const [curArgId,setCurArgId]=useState(null)
  const [argTab,setArgTab]=useState('fonti')

  // UI sheets/modals
  const [sheetMat,setSheetMat]=useState(false)
  const [sheetArg,setSheetArg]=useState(false)
  const [sheetRename,setSheetRename]=useState(null)
  const [sheetRenameArg,setSheetRenameArg]=useState(null)
  const [sheetOutputCfg,setSheetOutputCfg]=useState(null) // {tool, cfg}
  const [sheetPromptMode,setSheetPromptMode]=useState(false)
  const [dialog,setDialog]=useState(null)
  const [fullpage,setFullpage]=useState(null)
  const [fpEditMode,setFpEditMode]=useState(false)
  const [loginTab,setLoginTab]=useState('accedi')
  const [loginErr,setLoginErr]=useState('')
  const [loading,setLoading]=useState(false)
  const [notifica,setNotifica]=useState(null)
  const [onb,setOnb]=useState(false)
  const [onbStep,setOnbStep]=useState(0)
  const [showDanger,setShowDanger]=useState(false)

  // Selection
  const [selFonti,setSelFonti]=useState(new Set())
  const [selStorico,setSelStorico]=useState(new Set())
  const [selMaterie,setSelMaterie]=useState(new Set())
  const [selArg,setSelArg]=useState(new Set())

  // Source preview
  const [previewFonte,setPreviewFonte]=useState(null)

  // Forms
  const [newMatNome,setNewMatNome]=useState('')
  const [newMatEmoji,setNewMatEmoji]=useState('📚')
  const [newArgNome,setNewArgNome]=useState('')
  const [loginEmail,setLoginEmail]=useState('')
  const [loginPass,setLoginPass]=useState('')
  const [regNome,setRegNome]=useState('')
  const [regEmail,setRegEmail]=useState('')
  const [regPass,setRegPass]=useState('')
  const [renameVal,setRenameVal]=useState('')

  // AI settings
  const [chatLength,setChatLength]=useState(2) // 1-3
  const [promptMode,setPromptMode]=useState({mode:'default',customPrompt:''})
  // Per-output cfg defaults
  const [outputCfg,setOutputCfg]=useState({num:10,diff:2,length:2})

  // Quiz
  const [quizData,setQuizData]=useState(null)
  const [quizIdx,setQuizIdx]=useState(0)
  const [quizAnswered,setQuizAnswered]=useState(false)
  const [quizScore,setQuizScore]=useState(0)
  const [quizWrong,setQuizWrong]=useState([])
  const [openAnswers,setOpenAnswers]=useState({})
  const [openFeedback,setOpenFeedback]=useState({})   // {idx: {loading,text}}
  const [openFinalEval,setOpenFinalEval]=useState(null) // {loading,text} | null
  const [tokenUsage,setTokenUsage]=useState({tokensUsed:0,tokenLimit:0,tokenResetDate:null})

  // FC
  const [fcCards,setFcCards]=useState([])
  const [fcIdx,setFcIdx]=useState(0)
  const [fcFlipped,setFcFlipped]=useState(false)

  // Mappa / Riassunto
  const [mappaData,setMappaData]=useState(null)
  const [expandedNodes,setExpandedNodes]=useState(new Set())
  const [riassuntoData,setRiassuntoData]=useState(null)
  const [expandedSecs,setExpandedSecs]=useState(new Set())

  // Chat
  const [chatMsgs,setChatMsgs]=useState([])
  const [chatInput,setChatInput]=useState('')
  const [chatLoading,setChatLoading]=useState(false)
  const chatEndRef=useRef(null)

  // Ripasso wizard
  const [rMat,setRMat]=useState(null)
  const [rArgs,setRArgs]=useState([])  // empty = tutti
  const [rFreqType,setRFreqType]=useState('D') // 'D'|'W'|'M'|'C'
  const [rDay,setRDay]=useState('lun')          // used when W
  const [rDayOfMonth,setRDayOfMonth]=useState(1) // used when M
  const [rCustomDays,setRCustomDays]=useState([])// used when C
  const [rOrario,setROrario]=useState('08:00')
  const [rQNum,setRQNum]=useState(10)
  const [rQMode,setRQMode]=useState('multipla')
  // Profilo delete confirm
  const [deleteConfirmStep,setDeleteConfirmStep]=useState(0)
  const [deleteConfirmText,setDeleteConfirmText]=useState('')
  // Guida search
  const [guidaSearch,setGuidaSearch]=useState('')
  // Desktop 3-col widths (%)
  const [colWidths,setColWidths]=useState(()=>{try{const s=sessionStorage.getItem('fb_col');return s?JSON.parse(s):[25,45,30]}catch{return [25,45,30]}})
  const dragRef=useRef(null) // {col: 0|1, startX, startWidths}
  // Ripasso V2
  const [rNome,setRNome]=useState('')
  const [rPrompt,setRPrompt]=useState('')
  const [rShowForm,setRShowForm]=useState(false)
  const [rEditId,setREditId]=useState(null)
  const [ripassiGenerating,setRipassiGenerating]=useState(false)
  const [ripassiGeneratingId,setRipassiGeneratingId]=useState(null)
  const [ripassiQuiz,setRipassiQuiz]=useState({}) // ripasso_id -> quiz row
  const [rRunning,setRRunning]=useState(null) // {ripasso, mode, domande} — inline quiz runner in Ripasso screen
  // Materia image search
  const [matImgQuery,setMatImgQuery]=useState('')
  const [matImgResults,setMatImgResults]=useState([])
  const [matImgLoading,setMatImgLoading]=useState(false)
  const [newMatCoverImg,setNewMatCoverImg]=useState(null)
  const [newMatDizionario,setNewMatDizionario]=useState(false)
  const [newMatLingua,setNewMatLingua]=useState('')
  // Lab inline (Dizionario)
  const [labInline,setLabInline]=useState(null) // {key,loading,data}
  const [labDizQuery,setLabDizQuery]=useState('')

  // Admin
  const [newProv,setNewProv]=useState('anthropic')
  const [newModel,setNewModel]=useState('claude-sonnet-4-5')
  const [newKey,setNewKey]=useState('')
  const [adminLoading,setAdminLoading]=useState(false)

  // Inline title editing
  const [editingArgTitle,setEditingArgTitle]=useState(false)
  const [argTitleVal,setArgTitleVal]=useState('')

  // Quiz-aperta one-at-a-time
  const [quizApertaIdx,setQuizApertaIdx]=useState(0)

  const lpRef=useRef(null)
  const pendingToolRef=useRef(null) // for background generation

  /* ── ANDROID BACK ── */
  useEffect(()=>{
    const backMap={materia:'home',profilo:'home',admin:'profilo',ripasso:'home',impostazioni:'profilo',argomenti:'home',guida:'profilo'}
    const handler=e=>{
      if(fullpage){e.preventDefault();setFullpage(null);return}
      if(dialog){e.preventDefault();setDialog(null);return}
      const sheets=[sheetMat,sheetArg,sheetRename,sheetOutputCfg,sheetPromptMode]
      if(sheets.some(Boolean)){e.preventDefault();closeAllSheets();return}
      const next=screen==='argomento'?(window.innerWidth<769?'materia':'home'):backMap[screen]
      if(next){e.preventDefault();navTo(next)}
    }
    window.addEventListener('popstate',handler)
    window.history.pushState({},'',window.location.href)
    return()=>window.removeEventListener('popstate',handler)
  },[screen,fullpage,dialog,sheetMat,sheetArg,sheetRename,sheetOutputCfg,sheetPromptMode])

  function closeAllSheets(){setSheetMat(false);setSheetArg(false);setSheetRename(null);setSheetOutputCfg(null);setSheetPromptMode(false);setShowQuizPicker(false)}

  /* ── SESSION STORAGE ── */
  useEffect(()=>{
    if(screen&&screen!=='loading'&&screen!=='login'){
      sessionStorage.setItem('fb_screen',screen)
      if(curMateriaId)sessionStorage.setItem('fb_mat',curMateriaId)
      if(curArgId)sessionStorage.setItem('fb_arg',curArgId)
      sessionStorage.setItem('fb_tab',argTab)
    }
  },[screen,curMateriaId,curArgId,argTab])

  /* ── COMPUTED token blocked ── */

  /* ── AUTH INIT ── */
  useEffect(()=>{
    const t=setTimeout(()=>setScreen('login'),5000)
    supabase.auth.getSession().then(({data:{session}})=>{
      clearTimeout(t)
      if(session)loadUser(session.user)
      else setScreen('login')
    }).catch(()=>{clearTimeout(t);setScreen('login')})
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
      // Only react to real sign-in/out events — ignore TOKEN_REFRESHED, USER_UPDATED etc.
      if(event==='SIGNED_IN'||event==='INITIAL_SESSION'){
        if(s)loadUser(s.user)
        else setScreen('login')
      }else if(event==='SIGNED_OUT'){
        setUtente(null);setScreen('login')
      }
    })
    return()=>subscription.unsubscribe()
  },[])

  /* ── RIPASSO PUSH NOTIFICATIONS ── */
  useEffect(()=>{
    if(!ripassi.length)return
    // Request permission immediately
    if('Notification' in window&&Notification.permission==='default'){
      Notification.requestPermission()
    }
    const check=()=>{
      const now=new Date()
      const hhmm=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0')
      const DOW=['dom','lun','mar','mer','gio','ven','sab'][now.getDay()]
      const DOM=now.getDate()
      ripassi.forEach(r=>{
        const f=r.frequenza||''
        let freqOk=false
        if(f==='giornaliero')freqOk=true
        else if(f==='settimanale')freqOk=DOW==='lun'
        else if(f===DOW)freqOk=true
        else if(f.startsWith('mensile-'))freqOk=Number(f.slice(8))===DOM
        else if(f.startsWith('custom:'))freqOk=f.slice(7).split(',').includes(DOW)
        if(r.orario===hhmm&&freqOk){
          const mat=materie.find(m=>m.id===r.materia_id)
          // Push notification (device-level)
          if('Notification' in window&&Notification.permission==='granted'){
            new Notification('⚡ FlashBacon — Ora di studiare!',{
              body:`Ripasso: ${mat?.nome||''}. Tocca per iniziare il quiz.`,
              icon:'/favicon.svg',
              tag:'ripasso-'+r.id,
            })
          }
          // In-app banner as fallback
          setNotifica({msg:`📅 Ripasso: ${mat?.nome||'Materia'}`,rData:r})
          setTimeout(()=>setNotifica(null),12000)
        }
      })
    }
    check()
    const interval=setInterval(check,60000)
    return()=>clearInterval(interval)
  },[ripassi,materie])

  /* ── SETTINGS PERSISTENCE (localStorage) ── */
  useEffect(()=>{
    const saved=localStorage.getItem('fb_settings')
    if(saved){try{const s=JSON.parse(saved);if(s.chatLength)setChatLength(s.chatLength);if(s.promptMode)setPromptMode(s.promptMode);if(s.outputCfg)setOutputCfg(s.outputCfg)}catch{}}
  },[])

  function saveSettings(patch){
    const current={chatLength,promptMode,outputCfg,...patch}
    localStorage.setItem('fb_settings',JSON.stringify(current))
  }

  /* ── DATA LOADERS ── */
  async function loadUser(user){
    try{
      const{data}=await supabase.from('profili').select('*').eq('id',user.id).single()
      const u=data||{id:user.id,nome:user.email.split('@')[0],email:user.email,is_admin:false}
      setUtente(u)
      // Load persisted settings
      const saved=localStorage.getItem('fb_settings')
      if(saved){try{const s=JSON.parse(saved);if(s.chatLength)setChatLength(s.chatLength);if(s.promptMode)setPromptMode(s.promptMode);if(s.outputCfg)setOutputCfg(s.outputCfg)}catch{}}
      await loadMaterie(u.email)
      const{data:args}=await supabase.from('argomenti').select('*').order('created_at')
      setArgomenti(args||[])
      const ripassiData=await loadRipassi(u.email)
      if(ripassiData?.length)await loadRipassiQuiz(ripassiData)
      loadTokenUsage(u.email)
      const isNew=!localStorage.getItem('fb_onb_'+u.id)
      if(isNew){setOnb(true);setOnbStep(0)}
      const ss=sessionStorage.getItem('fb_screen'),sm=sessionStorage.getItem('fb_mat'),sa=sessionStorage.getItem('fb_arg'),st=sessionStorage.getItem('fb_tab')
      if(ss==='argomento'&&sm&&sa){
        setCurMateriaId(sm);setCurArgId(sa);
        await loadFonti(sa,sm);
        const stData=await loadStorico(sa);
        const msgs=[];
        for(const e of stData.filter(s=>s.tipo==='chat').reverse()){
          const lines=e.contenuto.split('\n');let cur=null
          for(const line of lines){
            if(line.startsWith('Tu: ')){if(cur)msgs.push(cur);cur={role:'user',content:line.slice(4)}}
            else if(line.startsWith('AI: ')){if(cur)msgs.push(cur);cur={role:'ai',content:line.slice(4)}}
            else if(cur){cur.content+='\n'+line}
          }
          if(cur)msgs.push(cur)
        }
        setChatMsgs(msgs)
        if(st)setArgTab(st);setScreen('argomento')
      }
      else if(ss==='materia'&&sm){setCurMateriaId(sm);loadArgomenti(sm);setScreen('materia')}
      else setScreen('home')
    }catch{
      const u={id:user.id,nome:user.email.split('@')[0],email:user.email,is_admin:false}
      setUtente(u);setScreen('home')
    }
  }
  async function loadMaterie(email){const{data}=await supabase.from('materie').select('*').eq('utente_email',email).order('created_at');setMaterie(data||[])}
  async function loadArgomenti(mid){const{data}=await supabase.from('argomenti').select('*').eq('materia_id',mid).order('created_at');setArgomenti(prev=>[...prev.filter(a=>a.materia_id!==mid),...(data||[])])}
  async function loadFonti(aid,mid){
    const q=mid
      ?supabase.from('fonti').select('*').or(`argomento_id.eq.${aid},and(argomento_id.is.null,materia_id.eq.${mid})`)
      :supabase.from('fonti').select('*').eq('argomento_id',aid)
    const{data}=await q.order('created_at')
    setFonti(data||[])
  }
  async function loadStorico(aid){const{data}=await supabase.from('storico').select('*').eq('argomento_id',aid).order('created_at',{ascending:false});setStorico(data||[]);return data||[]}
  async function openArgomento(a){
    setCurArgId(a.id);setArgTab('chat');setChatMsgs([])
    loadFonti(a.id,curMateriaId)
    const{data}=await supabase.from('storico').select('*').eq('argomento_id',a.id).order('created_at',{ascending:false})
    setStorico(data||[])
    // Ricostruisci chat dallo storico in ordine cronologico
    const msgs=[]
    for(const e of (data||[]).filter(s=>s.tipo==='chat').reverse()){
      const lines=e.contenuto.split('\n');let cur=null
      for(const line of lines){
        if(line.startsWith('Tu: ')){if(cur)msgs.push(cur);cur={role:'user',content:line.slice(4)}}
        else if(line.startsWith('AI: ')){if(cur)msgs.push(cur);cur={role:'ai',content:line.slice(4)}}
        else if(cur){cur.content+='\n'+line}
      }
      if(cur)msgs.push(cur)
    }
    setChatMsgs(msgs)
    setScreen('argomento')
  }

  /* Drag handlers per 3-col desktop */
  function startDrag(col,e){
    e.preventDefault()
    dragRef.current={col,startX:e.clientX,startWidths:[...colWidths]}
    const onMove=mv=>{
      if(!dragRef.current)return
      const dx=mv.clientX-dragRef.current.startX
      const totalW=window.innerWidth
      const dpct=dx/totalW*100
      const w=[...dragRef.current.startWidths]
      const MIN=12
      if(col===0){
        w[0]=Math.max(MIN,Math.min(w[0]+w[1]-MIN,w[0]+dpct))
        w[1]=100-w[0]-w[2]
      }else{
        w[1]=Math.max(MIN,Math.min(w[0]+w[1]-MIN,w[1]+dpct))
        w[2]=100-w[0]-w[1]
      }
      if(w[0]>=MIN&&w[1]>=MIN&&w[2]>=MIN){setColWidths(w);sessionStorage.setItem('fb_col',JSON.stringify(w))}
    }
    const onUp=()=>{dragRef.current=null;window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}
    window.addEventListener('mousemove',onMove)
    window.addEventListener('mouseup',onUp)
  }
  async function loadProviders(){const{data}=await supabase.from('ai_providers').select('*').order('created_at');setProviders(data||[])}
  async function loadRipassi(email){const{data}=await supabase.from('studio_pianificato').select('*').eq('utente_email',email).order('created_at',{ascending:true});setRipassi(data||[]);return data||[]}
  async function loadRipassiQuiz(list){
    const ids=(list||ripassi).map(r=>r.id)
    if(!ids.length)return
    const{data}=await supabase.from('ripassi_quiz').select('*').in('ripasso_id',ids).order('created_at',{ascending:false})
    const map={}
    for(const q of (data||[])){if(!map[q.ripasso_id])map[q.ripasso_id]=q}
    setRipassiQuiz(map)
  }
  async function loadTokenUsage(email){
    const{data}=await supabase.from('profili').select('token_usati,token_reset_date,ruolo').eq('email',email).single()
    if(data){
      const role=data.ruolo||'beta'
      const limit={owner:150000,beta:10000}[role]??10000
      setTokenUsage({tokensUsed:data.token_usati||0,tokenLimit:limit,tokenResetDate:data.token_reset_date})
    }
  }

  /* ── NAVIGATION ── */
  function navTo(sc){
    setSelFonti(new Set());setSelStorico(new Set());setSelMaterie(new Set());setSelArg(new Set())
    if(sc==='home'){
      if(utente?.email)loadMaterie(utente.email)
      setLabInline(null)
      setScreen('home');return
    }
    setScreen(sc)
  }

  /* ── AUTH ── */
  async function doLogin(){setLoginErr('');setLoading(true);const{error}=await supabase.auth.signInWithPassword({email:loginEmail,password:loginPass});setLoading(false);if(error)setLoginErr(error.message)}
  async function doRegister(){if(!regNome){setLoginErr('Inserisci nome');return}setLoginErr('');setLoading(true);const{data,error}=await supabase.auth.signUp({email:regEmail,password:regPass});if(error){setLoading(false);setLoginErr(error.message);return}if(data.user)await supabase.from('profili').insert({id:data.user.id,nome:regNome,email:regEmail,is_admin:false});setLoading(false)}
  async function doLogout(){await supabase.auth.signOut();sessionStorage.clear();setMaterie([]);setArgomenti([]);setFonti([]);setStorico([])}
  function confirmDeleteAccount(){setDialog({icon:'⚠️',title:'Elimina account',msg:'Tutti i dati verranno eliminati definitivamente.',confirmLabel:'Sì, elimina',danger:true,onConfirm:async()=>{await supabase.from('profili').delete().eq('id',utente.id);await doLogout()}})}

  /* ── MATERIE ── */
  // Genera cover via Pollinations.ai (no API key richiesta)
  function pollinationsUrl(nome){
    const prompt=encodeURIComponent(`${nome} academic study subject, clean minimal, soft light background, professional, high quality`)
    const seed=Math.abs(nome.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%9999
    return `https://image.pollinations.ai/prompt/${prompt}?width=400&height=400&seed=${seed}&nologo=true&model=flux`
  }

  async function saveMateria(){
    if(!newMatNome.trim())return
    // Se nessuna immagine selezionata, usa Pollinations.ai
    const coverImg=newMatCoverImg||pollinationsUrl(newMatNome.trim())
    const{data,error}=await supabase.from('materie').insert({utente_email:utente.email,nome:newMatNome.trim(),emoji:newMatEmoji,cover_image:coverImg,dizionario:newMatDizionario,lingua:newMatDizionario?newMatLingua.trim()||null:null}).select().single()
    if(!error){setMaterie(p=>[...p,data]);toast('Materia creata ✓')}
    setSheetMat(false);setNewMatNome('');setNewMatCoverImg(null);setMatImgQuery('');setMatImgResults([]);setNewMatDizionario(false);setNewMatLingua('')
  }
  async function searchUnsplash(q){
    if(!q.trim())return
    setMatImgLoading(true)
    try{
      const r=await fetch(`/api/unsplash?q=${encodeURIComponent(q)}`)
      const d=await r.json()
      setMatImgResults(d.results||[])
    }catch{
      // Fallback: usa Pollinations.ai per preview
      setMatImgResults([])
      toast('Anteprima non disponibile, verrà generata alla creazione')
    }
    setMatImgLoading(false)
  }
  async function deleteMaterie(ids){for(const id of ids)await supabase.from('materie').delete().eq('id',id);setMaterie(p=>p.filter(m=>!ids.has(m.id)));setSelMaterie(new Set());toast('Eliminato ✓')}
  async function saveArgomento(){if(!newArgNome.trim())return;const{data,error}=await supabase.from('argomenti').insert({materia_id:curMateriaId,nome:newArgNome.trim()}).select().single();if(!error){setArgomenti(p=>[...p,data]);toast('Argomento creato ✓')};setSheetArg(false);setNewArgNome('')}
  async function deleteArgomenti(ids){for(const id of ids)await supabase.from('argomenti').delete().eq('id',id);setArgomenti(p=>p.filter(a=>!ids.has(a.id)));setSelArg(new Set());toast('Eliminato ✓')}

  /* ── FONTI ── */
  async function deleteFonte(f){
    if(f.url&&f.tipo==='file'){const p=f.url.split('/fonti/')[1];if(p)await supabase.storage.from('fonti').remove([decodeURIComponent(p)])}
    await supabase.from('fonti').delete().eq('id',f.id);setFonti(p=>p.filter(x=>x.id!==f.id))
  }
  async function deleteFontiSel(){for(const id of selFonti){const f=fonti.find(x=>x.id===id);if(f)await deleteFonte(f)};setSelFonti(new Set());toast('Fonti eliminate ✓')}
  async function renameFonte(f,nome){await supabase.from('fonti').update({nome}).eq('id',f.id);setFonti(p=>p.map(x=>x.id===f.id?{...x,nome}:x));setSheetRename(null);toast('Rinominato ✓')}
  async function renameArgomento(a,nome){if(!nome?.trim())return;await supabase.from('argomenti').update({nome:nome.trim()}).eq('id',a.id);setArgomenti(p=>p.map(x=>x.id===a.id?{...x,nome:nome.trim()}:x));setSheetRenameArg(null);toast('Rinominato ✓')}
  async function renameMateria(id,nome){if(!nome?.trim())return;await supabase.from('materie').update({nome:nome.trim()}).eq('id',id);setMaterie(p=>p.map(m=>m.id===id?{...m,nome:nome.trim()}:m));toast('Rinominato ✓')}

  /* ── STORICO ── */
  async function saveStorico(tipo,contenuto){const{data}=await supabase.from('storico').insert({utente_email:utente.email,materia_id:curMateriaId,argomento_id:curArgId,tipo,contenuto}).select().single();if(data)setStorico(p=>[data,...p])}
  async function deleteStoricoSel(){for(const id of selStorico)await supabase.from('storico').delete().eq('id',id);setStorico(p=>p.filter(s=>!selStorico.has(s.id)));setSelStorico(new Set());toast('Eliminati ✓')}
  async function deleteOneStorico(id){await supabase.from('storico').delete().eq('id',id);setStorico(p=>p.filter(s=>s.id!==id))}

  /* ── PREPARE FONTI ── */
  function prepareFonti(){
    // Include both argomento-specific fonti AND shared fonti (argomento_id===null) for this materia
    const af=fonti.filter(f=>f.argomento_id===curArgId||f.argomento_id===null)
    const images=af.filter(f=>(f.tipo==='file'||f.tipo==='audio')&&(isImgExt(getExt(f.nome))||getExt(f.nome)==='pdf')).map(f=>f.url)
    const textSources=af.filter(f=>f.testo).map(f=>f.testo||'')
    const urlSources=af.filter(f=>f.tipo==='url'||f.tipo==='youtube').map(f=>f.url)
    const docUrls=af.filter(f=>f.tipo==='file'&&!isImgExt(getExt(f.nome))&&getExt(f.nome)!=='pdf').map(f=>f.url)
    const fileNames=af.map(f=>`[Fonte: ${f.nome}]`).join(', ')
    return{images,textSources,urlSources:[...urlSources,...docUrls],fileNames}
  }

  /* ── BUILD SYSTEM CONTEXT ── */
  function buildSystemContext(){
    let base='Sei FlashBacon AI. '
    if(promptMode.mode==='learning'){
      base+='Usa uno stile da guida all\'apprendimento: aiuta lo studente a capire i concetti, non solo a memorizzarli. Fai connessioni, usa analogie, stimola il pensiero critico. '
    } else if(promptMode.mode==='custom'&&promptMode.customPrompt){
      base+=promptMode.customPrompt+' '
    }
    base+='Rispondi in italiano. Se l\'utente chiede esplicitamente di cercare informazioni su internet o di integrare con fonti esterne, puoi farlo. Altrimenti basati principalmente sulle fonti fornite.'
    return base
  }

  /* ── SSE stream reader — reads /api/ai SSE response ── */
  async function readAIStream(response,onChunk){
    const reader=response.body.getReader()
    const decoder=new TextDecoder()
    let buf='',fullText='',meta={}
    while(true){
      const{done,value}=await reader.read()
      if(done)break
      buf+=decoder.decode(value,{stream:true})
      const lines=buf.split('\n');buf=lines.pop()
      for(const line of lines){
        if(!line.startsWith('data: '))continue
        try{
          const d=JSON.parse(line.slice(6))
          if(d.error)throw new Error(d.error)
          if(d.chunk){fullText+=d.chunk;onChunk?.(d.chunk)}
          if(d.done)meta=d
        }catch(e){if(e.message!=='Unexpected end of JSON input'&&!e.message.includes('JSON'))throw e}
      }
    }
    if(meta.tokensUsed)setTokenUsage(p=>({...p,tokensUsed:meta.tokensUsed,tokenLimit:meta.tokenLimit||p.tokenLimit,tokenResetDate:meta.tokenResetDate||p.tokenResetDate}))
    return meta.result||fullText
  }

  /* ── AI CALL ── */
  async function callAI(prompt,settings={},onProgress=null,onChunk=null){
    const{images,textSources,urlSources,fileNames}=prepareFonti()
    const systemContext=buildSystemContext()

    const doFetch=async(p,imgs,extraText=[],chunkCb=null)=>{
      const res=await fetch('/api/ai',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prompt:p,images:imgs,textSources:[...textSources,...extraText],urlSources,settings,systemContext,fileNames,userEmail:utente?.email||''})
      })
      if(!res.ok){
        const e=await res.json().catch(()=>({}))
        if(e.tokenLimitReached)setTokenUsage(p=>({...p,tokensUsed:e.tokensUsed||p.tokensUsed,tokenLimit:e.tokenLimit||p.tokenLimit,tokenResetDate:e.tokenResetDate||p.tokenResetDate}))
        throw new Error(e.error||`Errore ${res.status}`)
      }
      return readAIStream(res,chunkCb)
    }

    const BATCH=8
    if(images.length<=BATCH) return doFetch(prompt,images,[],onChunk)

    // Batch mode — stream only the final merge step
    const batches=[]
    for(let i=0;i<images.length;i+=BATCH)batches.push(images.slice(i,i+BATCH))
    const partials=[]
    for(let i=0;i<batches.length;i++){
      onProgress?.(`Analisi batch ${i+1}/${batches.length}…`)
      const ctx=partials.length>0?[`Risultati dai batch precedenti:\n${partials.join('\n\n')}`]:[]
      partials.push(await doFetch(prompt,batches[i],ctx,null))
    }
    onProgress?.('Unificazione risultati…')
    const mergePrompt=`Combina questi ${batches.length} risultati parziali in un unico output coerente nel formato richiesto. Rimuovi duplicati. Restituisci solo il contenuto finale nel formato corretto, senza testo aggiuntivo.\n\n${partials.map((r,i)=>`[Batch ${i+1}]:\n${r}`).join('\n\n---\n\n')}`
    return doFetch(mergePrompt,[],[],onChunk)
  }

  /* ── BUILD PROMPTS ── */
  function buildPrompt(key,cfg=outputCfg){
    const a=argomenti.find(x=>x.id===curArgId),m=materie.find(x=>x.id===curMateriaId)
    const lenDesc=['breve','di media lunghezza','dettagliato e approfondito'][cfg.length-1]||'di media lunghezza'
    const base=`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\n`
    return{
      riassunto:base+`Crea un riassunto strutturato ${lenDesc} in italiano. Usa ## per le sezioni, ### per i sottotitoli, - per i punti. NON usare asterischi iniziali/finali nelle frasi.`,
      mappa:base+`Crea una mappa concettuale ${lenDesc} in italiano. Usa ## per il titolo principale, ### per i rami principali, - per i sotto-concetti. NON usare asterischi.`,
      punti:base+`Estrai i punti chiave ${lenDesc} più importanti in italiano. Numera con titolo e spiegazione. NON usare asterischi fuori dal grassetto.`,
      flashcards:base+`Crea esattamente ${cfg.num||10} flash card in italiano.\nFORMATO (separato da ---):\nFRONTE: [domanda]\nRETRO: [risposta]\n---`,
    }[key]||base+'Analizza il contenuto e rispondi.'
  }

  function buildQuizPrompt(cfg=outputCfg,mode='multipla'){
    const a=argomenti.find(x=>x.id===curArgId),m=materie.find(x=>x.id===curMateriaId)
    const dd=['elementari','di media difficoltà','avanzate'][(cfg.diff||2)-1]
    const num=cfg.num||10
    if(mode==='multipla')return`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nCrea ${num} domande a risposta multipla ${dd} in italiano.\n\nRispondi SOLO con un array JSON valido, nessun testo prima o dopo:\n[\n  {\n    "domanda": "testo della domanda",\n    "opzioni": ["opzione A", "opzione B", "opzione C", "opzione D"],\n    "corretta": "A",\n    "spiegazione": "spiegazione breve"\n  }\n]\n\nRegole: "corretta" è solo la lettera (A/B/C/D). "opzioni" sono 4 testi senza prefisso lettera. Genera esattamente ${num} domande.`
    return`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nCrea ${num} domande a risposta aperta ${dd} in italiano.\n\nFORMATO (separare con ---):\nDOMANDA: [testo]\nRISPOSTA: [risposta attesa]\n---`
  }

  /* ── AI TOOLS ── */
  function openToolCfg(key){
    setSheetOutputCfg({
      tool:key,
      cfg:{...outputCfg}
    })
  }

  async function runTool(key,cfg=outputCfg,isBackground=false){
    // Include shared (null argomento_id) fonti in check
    const af=fonti.filter(f=>f.argomento_id===curArgId||f.argomento_id===null)
    if(!af.length){toast('Carica almeno una fonte prima');return}

    const baseTitle={riassunto:'Riassunto',mappa:'Mappa Concettuale',punti:'Punti Chiave',flashcards:'Flash Cards',quiz:'Quiz',['quiz-aperta']:'Quiz Aperta'}[key]||key
    if(!isBackground){
      setFullpage({title:baseTitle,type:'loading',data:null})
    }

    const lenSettings={length:cfg.length||2}
    const onProgress=msg=>setFullpage(fp=>fp?{...fp,title:msg}:fp)

    try{
      let result
      if(key==='quiz'){result=await callAI(buildQuizPrompt(cfg,'multipla'),lenSettings,onProgress)}
      else if(key==='quiz-aperta'){result=await callAI(buildQuizPrompt(cfg,'aperta'),lenSettings,onProgress)}
      else{result=await callAI(buildPrompt(key,cfg),lenSettings,onProgress)}

      await saveStorico(key,result)

      if(isBackground){
        showAIDone(`✅ ${key} pronto!`)
        return
      }

      if(key==='flashcards'){const c=parseFC(result);setFcCards(c);setFcIdx(0);setFcFlipped(false);setFullpage({title:'Flash Cards',type:'fc',data:c})}
      else if(key==='mappa'){const d=parseMappa(result);setMappaData(d);setExpandedNodes(new Set());setFullpage({title:'Mappa Concettuale',type:'mappa',data:d})}
      else if(key==='riassunto'){const d=parseRiassunto(result);setRiassuntoData(d);setExpandedSecs(new Set(d.map((_,i)=>i)));setFullpage({title:'Riassunto',type:'riassunto',data:d})}
      else if(key==='quiz'){console.log('[quiz raw]',result);const p=parseQuiz(result);console.log('[quiz parsed]',p.length,'domande');setQuizData(p);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([]);setFullpage({title:'Quiz',type:'quiz',data:p,raw:result})}
      else if(key==='quiz-aperta'){
        const qs=parseOpenQuiz(result)
        setQuizData(qs);setQuizApertaIdx(0);setOpenAnswers({});setOpenFeedback({});setOpenFinalEval(null);setFullpage({title:'Quiz Aperta',type:'quiz-aperta',data:qs})
      }
      else setFullpage({title:'Punti Chiave',type:'text',data:result})
    }catch(e){
      if(!isBackground)setFullpage({title:'Errore',type:'text',data:`❌ ${e.message}\n\nAssicurati che un provider AI sia attivo nel Pannello Admin.`})
      else toast('❌ Errore AI: '+e.message)
    }
  }

  /* ── CHAT ── */
  async function sendChat(){
    if(!chatInput.trim()||chatLoading)return
    const msg=chatInput.trim();setChatInput('')
    // Add user message + empty AI placeholder for streaming
    setChatMsgs(prev=>[...prev,{role:'user',content:msg},{role:'ai',content:''}])
    setChatLoading(true)
    try{
      const a=argomenti.find(x=>x.id===curArgId),m=materie.find(x=>x.id===curMateriaId)
      const history=chatMsgs.slice(-8).map(x=>`${x.role==='user'?'Tu':'AI'}: ${x.content}`).join('\n')
      const lenDesc=['breve','normale','dettagliata'][(chatLength||2)-1]
      const prompt=`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nStorico:\n${history}\n\nTu: ${msg}\n\nRispondi in italiano con risposta ${lenDesc}.`
      // onChunk: append each chunk to the last message (typewriter effect)
      const onChunk=chunk=>setChatMsgs(prev=>{
        const msgs=[...prev]
        msgs[msgs.length-1]={role:'ai',content:msgs[msgs.length-1].content+chunk}
        return msgs
      })
      const result=await callAI(prompt,{length:chatLength},null,onChunk)
      // Ensure final state is consistent and save to storico
      setChatMsgs(prev=>{const msgs=[...prev];msgs[msgs.length-1]={role:'ai',content:result};return msgs})
      await saveStorico('chat',`Tu: ${msg}\nAI: ${result}`)
    }catch(e){
      setChatMsgs(prev=>{const msgs=[...prev];msgs[msgs.length-1]={role:'ai',content:'❌ '+e.message};return msgs})
    }
    setChatLoading(false)
  }
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'})},[chatMsgs])

  // Persist AI settings to localStorage whenever they change
  useEffect(()=>{
    if(!utente)return
    localStorage.setItem('fb_settings',JSON.stringify({chatLength,promptMode,outputCfg}))
  },[chatLength,promptMode,outputCfg])

  /* ── OPEN FROM STORICO ── */
  function openStorico(s){
    if(s.tipo==='chat'){
      const lines=s.contenuto.split('\n');const msgs=[];let cur=null
      for(const line of lines){
        if(line.startsWith('Tu: ')){if(cur)msgs.push(cur);cur={role:'user',content:line.replace('Tu: ','')}}
        else if(line.startsWith('AI: ')){if(cur)msgs.push(cur);cur={role:'ai',content:line.replace('AI: ','')}}
        else if(cur){cur.content+='\n'+line}
      }
      if(cur)msgs.push(cur)
      setChatMsgs(msgs);setArgTab('chat');toast('Conversazione ripristinata');return
    }
    if(s.tipo==='flashcards'){const c=parseFC(s.contenuto);if(c.length){setFcCards(c);setFcIdx(0);setFcFlipped(false);setFullpage({title:'Flash Cards',type:'fc',data:c});return}}
    if(s.tipo==='mappa'){const d=parseMappa(s.contenuto);setMappaData(d);setExpandedNodes(new Set());setFullpage({title:'Mappa Concettuale',type:'mappa',data:d});return}
    if(s.tipo==='riassunto'){const d=parseRiassunto(s.contenuto);setRiassuntoData(d);setExpandedSecs(new Set(d.map((_,i)=>i)));setFullpage({title:'Riassunto',type:'riassunto',data:d});return}
    if(s.tipo==='quiz'){console.log('[quiz storico raw]',s.contenuto);const p=parseQuiz(s.contenuto);console.log('[quiz storico parsed]',p.length,'domande');setQuizData(p);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([]);setFullpage({title:'Quiz',type:'quiz',data:p,raw:s.contenuto});return}
    if(s.tipo==='quiz-aperta'){const qs=parseOpenQuiz(s.contenuto);if(qs.length){setQuizData(qs);setQuizApertaIdx(0);setOpenAnswers({});setOpenFeedback({});setOpenFinalEval(null);setFullpage({title:'Quiz Aperta',type:'quiz-aperta',data:qs});return}}
    setFullpage({title:s.tipo,type:'text',data:s.contenuto})
  }

  /* ── RIPASSO V2 ── */
  function openNewRipassoForm(){
    setREditId(null);setRNome('');setRMat(null);setRArgs([])
    setRFreqType('D');setRDay('lun');setRDayOfMonth(1);setRCustomDays([])
    setROrario('08:00');setRQNum(10);setRQMode('multipla');setRPrompt('')
    setRShowForm(true)
  }
  function editRipasso(r){
    setREditId(r.id);setRNome(r.nome||'');setRMat(r.materia_id)
    setRArgs(r.argomento_id?[r.argomento_id]:[])
    const f=r.frequenza||'giornaliero'
    const DAYS=['lun','mar','mer','gio','ven','sab','dom']
    if(f==='giornaliero'){setRFreqType('D')}
    else if(DAYS.includes(f)){setRFreqType('W');setRDay(f)}
    else if(f==='settimanale'){setRFreqType('W');setRDay('lun')}
    else if(f.startsWith('mensile-')){setRFreqType('M');setRDayOfMonth(Number(f.slice(8))||1)}
    else if(f.startsWith('custom:')){setRFreqType('C');setRCustomDays(f.slice(7).split(',').filter(Boolean))}
    else{setRFreqType('D')}
    setROrario(r.orario||'08:00')
    setRQNum(r.quiz_num||10);setRQMode(r.quiz_modalita||'multipla')
    setRPrompt(r.prompt_personalizzato||'')
    loadArgomenti(r.materia_id);setRShowForm(true)
  }
  function serializeFreq(){
    if(rFreqType==='D')return 'giornaliero'
    if(rFreqType==='W')return rDay||'lun'
    if(rFreqType==='M')return 'mensile-'+String(rDayOfMonth||1)
    if(rFreqType==='C'){const d=rCustomDays.length?rCustomDays:['lun'];return 'custom:'+d.join(',')}
    return 'giornaliero'
  }
  async function openRipassoQuizFromTable(r){
    // Always load fresh from Supabase — no navigation, no generation.
    const{data:qRow,error}=await supabase.from('ripassi_quiz').select('*').eq('ripasso_id',r.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(error){toast('⚠️ Errore caricamento quiz: '+error.message);return}
    if(!qRow||!qRow.domande||!qRow.domande.length){toast('Quiz non ancora pronto per questo ripasso');return}
    setRipassiQuiz(p=>({...p,[r.id]:qRow}))
    const mode=qRow.modalita||r.quiz_modalita||'multipla'
    const domande=qRow.domande
    setRShowForm(false);setREditId(null)
    if(mode==='flashcard'){
      setFcCards(domande);setFcIdx(0);setFcFlipped(false)
    } else if(mode==='multipla'){
      setQuizData(domande);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([])
    }else{
      setQuizData(domande);setQuizApertaIdx(0);setOpenAnswers({});setOpenFeedback({});setOpenFinalEval(null)
    }
    setRRunning({ripasso:r,mode,domande})
  }
  function closeRipassoRunner(){
    setRRunning(null)
    setQuizData([]);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([])
    setQuizApertaIdx(0);setOpenAnswers({});setOpenFeedback({});setOpenFinalEval(null)
    setFcCards([]);setFcIdx(0);setFcFlipped(false)
  }
  async function saveRipasso(){
    if(!rMat){toast('Seleziona una materia');return}
    if('Notification' in window&&Notification.permission==='default') await Notification.requestPermission()
    const argomentoId=rArgs.length===1?rArgs[0]:null
    const fields={nome:rNome||null,materia_id:rMat,argomento_id:argomentoId,frequenza:serializeFreq(),orario:rOrario,difficolta:2,quiz_num:rQNum,quiz_modalita:rQMode,prompt_personalizzato:rPrompt||null}
    let ripassoRow
    if(rEditId){
      const{data}=await supabase.from('studio_pianificato').update(fields).eq('id',rEditId).select().single()
      ripassoRow=data;setRipassi(p=>p.map(r=>r.id===rEditId?data:r))
    }else{
      const{data}=await supabase.from('studio_pianificato').insert({...fields,utente_email:utente.email}).select().single()
      ripassoRow=data;if(data)setRipassi(p=>[...p,data])
    }
    toast(rEditId?'Ripasso aggiornato ✓':'Ripasso pianificato ✓')
    setRShowForm(false);setREditId(null)
    if(ripassoRow){
      setRipassiGeneratingId(ripassoRow.id)
      setRipassiGenerating(true)
      try{await generateRipassoAndSaveToTable(ripassoRow)}
      finally{setRipassiGenerating(false);setRipassiGeneratingId(null)}
    }
  }
  async function generateRipassoAndSaveToTable(r){
    const argId=r.argomento_id||(argomenti.find(a=>a.materia_id===r.materia_id)?.id)
    if(!argId)return
    try{
      const q=supabase.from('fonti').select('*').or(`argomento_id.eq.${argId},and(argomento_id.is.null,materia_id.eq.${r.materia_id})`)
      const{data:rFonti}=await q.order('created_at')
      const af=rFonti||[]
      const images=af.filter(f=>(f.tipo==='file')&&(isImgExt(getExt(f.nome))||getExt(f.nome)==='pdf')).map(f=>f.url)
      const textSources=af.filter(f=>f.tipo==='text').map(f=>f.testo||'')
      const urlSources=[...af.filter(f=>f.tipo==='url'||f.tipo==='youtube').map(f=>f.url),...af.filter(f=>f.tipo==='file'&&!isImgExt(getExt(f.nome))&&getExt(f.nome)!=='pdf').map(f=>f.url)]
      const fileNames=af.map(f=>`[Fonte: ${f.nome}]`).join(', ')
      const cfg={num:r.quiz_num||10,diff:2,length:2}
      const mode=(r.quiz_modalita==='misto'?'multipla':r.quiz_modalita)||'multipla'
      const systemContext=buildSystemContext()
      let finalPrompt
      if(mode==='flashcard'){
        const mat=materie.find(m=>m.id===r.materia_id)
        const arg=argomenti.find(a=>a.id===r.argomento_id)
        finalPrompt=`Materia: "${mat?.nome}" — Argomento: "${arg?.nome||'generale'}"\n\nCrea esattamente ${cfg.num} flash card in italiano basate sulle fonti.\nFORMATO (separato da ---):\nFRONTE: [concetto/domanda]\nRETRO: [definizione/risposta]\n---`
        if(r.prompt_personalizzato) finalPrompt+=`\n\nFocus: ${r.prompt_personalizzato}`
      } else {
        const basePrompt=buildQuizPromptDirect(r,cfg,mode)
        finalPrompt=r.prompt_personalizzato?basePrompt+`\n\nFocus: ${r.prompt_personalizzato}`:basePrompt
      }
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:finalPrompt,images,textSources,urlSources,settings:{length:2},systemContext,fileNames,userEmail:utente?.email||''})})
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`AI ${res.status}`)}
      const quizResult=await readAIStream(res,null)
      const parsed=mode==='flashcard'?parseFC(quizResult):mode==='multipla'?parseQuiz(quizResult):parseOpenQuiz(quizResult)
      // Sostituisci sempre il quiz più recente (delete vecchio + insert nuovo)
      await supabase.from('ripassi_quiz').delete().eq('ripasso_id',r.id)
      const{data:qRow}=await supabase.from('ripassi_quiz').insert({ripasso_id:r.id,domande:parsed,modalita:mode}).select().single()
      if(qRow)setRipassiQuiz(p=>({...p,[r.id]:qRow}))
      showAIDone(mode==='flashcard'?'Flashcard ripasso pronte!':'Quiz ripasso pronto!')
    }catch(e){console.warn('generateRipassoAndSaveToTable:',e.message);toast('⚠️ Quiz: '+e.message)}
  }

  async function generateRipassoAndSave(r){
    // Load fonti for the argomento and generate a quiz, save to storico (Lab)
    const argId=r.argomento_id||(argomenti.find(a=>a.materia_id===r.materia_id)?.id)
    if(!argId)return
    try{
      // Load fonti directly (don't update global state)
      const q=supabase.from('fonti').select('*').or(`argomento_id.eq.${argId},and(argomento_id.is.null,materia_id.eq.${r.materia_id})`)
      const{data:rFonti}=await q.order('created_at')
      const af=rFonti||[]
      const images=af.filter(f=>(f.tipo==='file')&&(isImgExt(getExt(f.nome))||getExt(f.nome)==='pdf')).map(f=>f.url)
      const textSources=af.filter(f=>f.tipo==='text').map(f=>f.testo||'')
      const urlSources=[...af.filter(f=>f.tipo==='url'||f.tipo==='youtube').map(f=>f.url),...af.filter(f=>f.tipo==='file'&&!isImgExt(getExt(f.nome))&&getExt(f.nome)!=='pdf').map(f=>f.url)]
      const fileNames=af.map(f=>`[Fonte: ${f.nome}]`).join(', ')

      const cfg={num:r.quiz_num||5,diff:2,length:2}
      const mode=r.quiz_modalita||'multipla'
      const prompt=buildQuizPromptDirect(r,cfg,mode)
      const systemContext=buildSystemContext()
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,images,textSources,urlSources,settings:{length:2},systemContext,fileNames,userEmail:utente?.email||''})})
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`AI ${res.status}`)}
      const quizResult=await readAIStream(res,null)
      // Save to storico for the argomento (Lab)
      await supabase.from('storico').insert({utente_email:utente.email,materia_id:r.materia_id,argomento_id:argId,tipo:mode==='multipla'?'quiz':'quiz-aperta',contenuto:quizResult})
      showAIDone('✅ Quiz ripasso generato e salvato nel Lab!')
    }catch(e){console.warn('generateRipassoAndSave:',e.message);toast('⚠️ Ripasso: '+e.message)}
  }
  async function deleteRipasso(id){
    await supabase.from('studio_pianificato').delete().eq('id',id)
    setRipassi(p=>p.filter(r=>r.id!==id))
    setRipassiQuiz(p=>{const n={...p};delete n[id];return n})
    toast('Eliminato')
  }

  async function runDizionario(parola){
    if(!parola?.trim())return
    setLabInline({key:'dizionario',loading:true,data:null})
    const mat=materie.find(m=>m.id===curMateriaId)
    const lingua=mat?.lingua||'italiano'
    const prompt=`Sei un dizionario. Per la parola "${parola.trim()}" in ${lingua} dammi in JSON valido:\n{"significati":["..."],"sinonimi":["..."],"traduzioni":{"it":"...","en":"...","es":"...","fr":"..."}}\nSii conciso, solo JSON, nessun testo extra.`
    try{
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,images:[],textSources:[],urlSources:[],settings:{length:1,maxTokens:400},systemContext:'Sei un dizionario preciso. Rispondi SOLO con JSON valido.',fileNames:'',userEmail:utente?.email||''})})
      if(!res.ok)throw new Error('Errore AI')
      const result=await readAIStream(res,null)
      let parsed=null
      try{
        const match=result.match(/\{[\s\S]*\}/)
        if(match)parsed=JSON.parse(match[0])
      }catch{}
      setLabInline({key:'dizionario',loading:false,data:parsed||{raw:result}})
    }catch(e){
      setLabInline({key:'dizionario',loading:false,data:{error:e.message}})
    }
  }

  async function startRipassoQuiz(r){
    // Load the argomento's fonti, then auto-generate quiz
    const argId=r.argomento_id||(argomenti.find(a=>a.materia_id===r.materia_id)?.id)
    if(!argId){toast('Nessun argomento trovato per questo ripasso');return}
    setCurMateriaId(r.materia_id);setCurArgId(argId)
    await loadFonti(argId,r.materia_id);await loadStorico(argId)
    setScreen('argomento');setArgTab('strumenti')
    // Auto-start quiz after a short delay to let state settle
    setTimeout(()=>{
      const cfg={num:r.quiz_num||5,diff:2,length:2}
      const mode=r.quiz_modalita||'multipla'
      setFullpage({title:'Generazione quiz ripasso…',type:'loading',data:null})
      const onProg=msg=>setFullpage(fp=>fp?{...fp,title:msg}:fp)
      callAI(buildQuizPromptDirect(r,cfg,mode),{length:2},onProg).then(async result=>{
        const parsed=mode==='flashcard'?parseFC(result):mode==='multipla'?parseQuiz(result):parseOpenQuiz(result)
        try{
          await supabase.from('ripassi_quiz').delete().eq('ripasso_id',r.id)
          const{data:qRow}=await supabase.from('ripassi_quiz').insert({ripasso_id:r.id,domande:parsed,modalita:mode}).select().single()
          if(qRow)setRipassiQuiz(p=>({...p,[r.id]:qRow}))
        }catch(e){console.warn('save ripassi_quiz:',e.message)}
        if(mode==='multipla'){
          setQuizData(parsed);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([])
          setFullpage({title:'Quiz Ripasso',type:'quiz',data:parsed})
        }else if(mode==='flashcard'){
          setFcCards(parsed);setFcIdx(0);setFcFlipped(false)
          setFullpage({title:'Flashcard Ripasso',type:'fc',data:parsed})
        }else{
          setQuizData(parsed);setQuizApertaIdx(0);setOpenAnswers({});setOpenFeedback({});setOpenFinalEval(null)
          setFullpage({title:'Quiz Aperta Ripasso',type:'quiz-aperta',data:parsed})
        }
      }).catch(e=>{setFullpage({title:'Errore',type:'text',data:'❌ '+e.message})})
    },800)
  }

  function buildQuizPromptDirect(r,cfg,mode){
    const mat=materie.find(m=>m.id===r.materia_id)
    const arg=argomenti.find(a=>a.id===r.argomento_id)
    const dd=['elementari','di media difficoltà','avanzate'][(cfg.diff||2)-1]
    const num=cfg.num||10
    const focus=r.prompt_personalizzato?`\nFocus richiesto: ${r.prompt_personalizzato}`:'';
    if(mode==='multipla')return`Materia: "${mat?.nome}" — Argomento: "${arg?.nome||'generale'}"${focus}\n\nCrea ${num} domande a risposta multipla ${dd} in italiano basate sulle fonti.\n\nRispondi SOLO con un array JSON valido, nessun testo prima o dopo:\n[\n  {\n    "domanda": "testo della domanda",\n    "opzioni": ["opzione A", "opzione B", "opzione C", "opzione D"],\n    "corretta": "A",\n    "spiegazione": "spiegazione breve"\n  }\n]\n\nRegole: "corretta" è solo la lettera (A/B/C/D). "opzioni" sono 4 testi senza prefisso lettera. Genera esattamente ${num} domande.`
    return`Materia: "${mat?.nome}" — Argomento: "${arg?.nome||'generale'}"${focus}\n\nCrea ${num} domande a risposta aperta ${dd} in italiano.\n\nFORMATO:\nDOMANDA: [testo]\nRISPOSTA: [risposta]\n---`
  }

  /* ── QUIZ APERTA — AI EVALUATION ── */
  const EVAL_SYS='Sei un professore AI. Valuta la risposta dello studente in italiano. Sii conciso, diretto e incoraggiante. Non usare asterischi (*) nel testo.'

  async function evalQuizOpen(idx){
    const q=quizData[idx]
    const risposta=(openAnswers[idx]||'').trim()
    if(!risposta)return
    setOpenFeedback(p=>({...p,[idx]:{loading:true,text:''}}))
    try{
      const domanda=q.dom||q.domanda||''
      const attesa=q.risp||q.risposta||''
      const prompt=`Domanda: ${domanda}\nRisposta attesa: ${attesa}\nRisposta studente: ${risposta}\n\nDai un feedback breve (massimo 3 frasi): cosa è corretto, cosa migliorare, voto su 10.`
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prompt,images:[],textSources:[],urlSources:[],settings:{length:1,maxTokens:300},systemContext:EVAL_SYS,fileNames:'',userEmail:utente?.email||''})})
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`Errore ${res.status}`)}
      const result=await readAIStream(res,null)
      setOpenFeedback(p=>({...p,[idx]:{loading:false,text:result.replace(/\*+/g,'')}}))
    }catch(e){
      setOpenFeedback(p=>({...p,[idx]:{loading:false,text:'❌ '+e.message}}))
    }
  }

  async function evalAllQuiz(){
    if(!quizData?.length)return
    setOpenFinalEval({loading:true,text:''})
    try{
      const pairs=quizData.map((q,i)=>{
        const domanda=q.dom||q.domanda||''
        const attesa=q.risp||q.risposta||''
        const risposta=(openAnswers[i]||'').trim()||'(nessuna risposta)'
        return `Domanda ${i+1}: ${domanda}\nRisposta attesa: ${attesa}\nRisposta studente: ${risposta}`
      }).join('\n\n---\n\n')
      const prompt=`Valuta queste ${quizData.length} risposte. Per ognuna scrivi 1-2 frasi di feedback e voto su 10. Inizia ogni valutazione con "Domanda X:" su una riga.\n\n${pairs}`
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prompt,images:[],textSources:[],urlSources:[],settings:{length:2,maxTokens:600},systemContext:EVAL_SYS,fileNames:'',userEmail:utente?.email||''})})
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`Errore ${res.status}`)}
      const result=await readAIStream(res,null)
      setOpenFinalEval({loading:false,text:result.replace(/\*+/g,'')})
    }catch(e){
      setOpenFinalEval({loading:false,text:'❌ '+e.message})
    }
  }

  /* ── ADMIN ── */
  async function addProvider(){if(!newKey.trim()){toast('Inserisci API key');return}setAdminLoading(true);try{const res=await fetch('/api/admin/save-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:newProv,nome_display:PROVIDERS_DEF[newProv].name,modello:newModel,api_key:newKey})});const d=await res.json();if(!res.ok)throw new Error(d.error||'Errore');toast('Provider aggiunto ✓');setNewKey('');await loadProviders()}catch(e){toast('Errore: '+e.message)}setAdminLoading(false)}
  async function activateProvider(id){try{const res=await fetch('/api/admin/set-active',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!res.ok)throw new Error('Errore');toast('Attivato ✓');await loadProviders()}catch(e){toast('Errore: '+e.message)}}
  async function deleteProvider(id){try{const res=await fetch('/api/admin/delete-provider',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!res.ok)throw new Error('Errore');toast('Eliminato');await loadProviders()}catch(e){toast('Errore: '+e.message)}}

  /* ══════ COMPUTED ══════ */
  const curMateria=materie.find(m=>m.id===curMateriaId)
  const curArgomento=argomenti.find(a=>a.id===curArgId)
  const activeProvider=providers.find(p=>p.attivo)
  const argFonti=fonti.filter(f=>f.argomento_id===curArgId||f.argomento_id==null)
  const argStorico=storico.filter(s=>s.argomento_id===curArgId&&s.tipo!=='chat')
  const aiBlocked=tokenUsage.tokenLimit>0&&tokenUsage.tokensUsed>=tokenUsage.tokenLimit

  /* ══════════════════════════════════════════
     JSX
  ══════════════════════════════════════════ */
  return(<div className="app-shell">

    {/* AI BLOCKED BANNER */}
    {aiBlocked&&screen!=='loading'&&screen!=='login'&&<div className="token-limit-banner">
      🚫 Limite token raggiunto ({tokenUsage.tokensUsed.toLocaleString('it')} / {tokenUsage.tokenLimit.toLocaleString('it')}).
      Reset il {tokenUsage.tokenResetDate||'—'}.
      <button onClick={()=>navTo('profilo')} style={{marginLeft:8,background:'none',border:'none',color:'inherit',fontWeight:700,cursor:'pointer',textDecoration:'underline'}}>Dettagli</button>
    </div>}

    {/* LOADING */}
    {screen==='loading'&&<div className="screen loading-screen" style={{background:'#ffffff',alignItems:'center',justifyContent:'center',gap:32}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
        <LogoSVG size={96}/><Brand size="2rem"/>
        <div className="loading-bar-track"><div className="loading-bar-fill"/></div>
      </div>
    </div>}

    {/* LOGIN */}
    {screen==='login'&&<div className="screen login-screen" style={{background:'#ffffff',alignItems:'center',justifyContent:'center',padding:24}}>
      <div className="login-card">
        <div className="login-header"><LogoSVG size={72}/><Brand size="1.6rem"/><p>Studia più veloce con l'AI</p></div>
        <div className="tabs">
          <button className={`tab ${loginTab==='accedi'?'active':''}`} onClick={()=>{setLoginTab('accedi');setLoginErr('')}}>Accedi</button>
          <button className={`tab ${loginTab==='registrati'?'active':''}`} onClick={()=>{setLoginTab('registrati');setLoginErr('')}}>Registrati</button>
        </div>
        {loginTab==='accedi'?<>
          <div className="field"><label>Email</label><input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="tua@email.com" onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
          <div className="field"><label>Password</label><input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div>
          <button className="btn-primary" onClick={doLogin} disabled={loading}>{loading?'Accesso…':'Accedi'}</button>
        </>:<>
          <div className="field"><label>Nome</label><input type="text" value={regNome} onChange={e=>setRegNome(e.target.value)} placeholder="Il tuo nome"/></div>
          <div className="field"><label>Email</label><input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="tua@email.com"/></div>
          <div className="field"><label>Password</label><input type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Min 6 caratteri"/></div>
          <button className="btn-primary" onClick={doRegister} disabled={loading}>{loading?'Creazione…':'Crea account'}</button>
        </>}
        {loginErr&&<div className="error-msg">{loginErr}</div>}
      </div>
    </div>}

    {/* HOME */}
    {screen==='home'&&<div className="screen anim home-screen-v3">

      {/* ── Header piatto Apple ── */}
      <div className="hv3-header">
        <span className="hv3-brand">FlashBacon</span>
        <button className="hv3-avatar" onClick={()=>setScreen('profilo')}>
          {utente?.nome?.[0]?.toUpperCase()||'?'}
        </button>
      </div>

      <div className="hv3-body">

        {/* ── Colonna sinistra: griglia materie ── */}
        <div className="hv3-left">
          <div className="hv3-scroll">
            {selMaterie.size>0&&<div className="sel-bar" style={{marginBottom:10}}>
              <span>{selMaterie.size} selezionate</span>
              <button className="btn-sm danger" onClick={()=>setDialog({icon:'🗑️',title:'Elimina materie?',msg:`Eliminare ${selMaterie.size} materie con tutti i contenuti?`,confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteMaterie(selMaterie)})}>Elimina</button>
            </div>}

            {materie.length===0
              ?<div className="hv3-empty"><span>📚</span><p>Nessuna materia ancora.</p></div>
              :<div className="hv3-grid">
                {materie.map(m=>{
                  const isSel=selMaterie.has(m.id)
                  const isActive=m.id===curMateriaId
                  return(
                    <div key={m.id}
                      className={`hv3-card${isActive?' active':''}${isSel?' sel':''}`}
                      onClick={()=>{
                        if(selMaterie.size>0){const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n);return}
                        setCurMateriaId(m.id)
                        loadArgomenti(m.id)
                        if(window.innerWidth<768)setScreen('materia')
                      }}
                      onContextMenu={e=>{e.preventDefault();const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n)}}
                      onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n)},600)}}
                      onTouchEnd={()=>clearTimeout(lpRef.current)}
                    >
                      {selMaterie.size>0&&<div className={`sel-check${isSel?' checked':''}`} style={{position:'absolute',top:6,left:6}}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                      <span className="hv3-card-emoji">{m.emoji||'📚'}</span>
                      <span className="hv3-card-name">{m.nome}</span>
                    </div>
                  )
                })}
              </div>
            }
          </div>

          {/* Bottom row: Ripasso + FAB + */}
          <div className="hv3-bottom-row">
            <button className="hv3-ripasso-btn" onClick={()=>navTo('ripasso')}>Ripasso</button>
            <button className="hv3-fab" onClick={()=>setShowUploadModal(true)}>+</button>
          </div>
        </div>

        {/* ── Colonna destra: argomenti (solo desktop) ── */}
        <div className="hv3-right">
          {curMateriaId
            ?<>
              <div className="hv3-right-header">
                <span className="hv3-right-title">{materie.find(m=>m.id===curMateriaId)?.nome}</span>
                <button className="hv3-nuovo-btn" onClick={()=>{setNewArgNome('');setSheetArg(true)}}>
                  <span className="hv3-nuovo-plus">+</span> Nuovo
                </button>
              </div>
              {argomenti.filter(a=>a.materia_id===curMateriaId).length===0
                ?<div className="hv3-empty" style={{padding:'24px 0'}}><span>📝</span><p>Nessun argomento.</p></div>
                :<div className="hv3-arg-list">
                  {argomenti.filter(a=>a.materia_id===curMateriaId).map(a=>(
                    <div key={a.id}
                      className={'hv3-arg-card'+(selArg.has(a.id)?' sel':'')}
                      onClick={()=>{if(selArg.size>0){const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n);return}openArgomento(a)}}
                      onContextMenu={e=>{e.preventDefault();const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)}}
                      onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)},600)}}
                      onTouchEnd={()=>clearTimeout(lpRef.current)}
                    >
                      <span className="hv3-arg-name">{a.nome}</span>
                      <span className="hv3-arg-arrow">›</span>
                    </div>
                  ))}
                </div>
              }
              {selArg.size>0&&<div className="sel-bar" style={{marginTop:10}}>
                <span>{selArg.size} selezionati</span>
                <button className="btn-sm danger" onClick={()=>setDialog({icon:'🗑️',title:'Elimina argomenti?',msg:'Elimina gli argomenti selezionati?',confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteArgomenti(selArg)})}>Elimina</button>
              </div>}
            </>
            :<div className="hv3-right-empty">Seleziona una materia</div>
          }
        </div>

      </div>
    </div>}

    {/* MATERIA — pannello argomenti (mobile: schermata dedicata) */}
    {screen==='materia'&&<div className="screen anim materia-screen">
      <AppHeader
        title={curMateria?.nome||''}
        onBack={()=>navTo('home')}
        backLabel="← Home"
        right={
          <button className="icon-btn" onClick={()=>{setNewArgNome('');setSheetArg(true)}}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        }
      />
      <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
        {selArg.size>0&&<div className="sel-bar" style={{marginBottom:10}}>
          <span>{selArg.size} selezionati</span>
          <button className="btn-sm danger" onClick={()=>setDialog({icon:'🗑️',title:'Elimina argomenti?',msg:'Elimina gli argomenti selezionati?',confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteArgomenti(selArg)})}>Elimina</button>
        </div>}
        <div className="argomenti-list">
          {argomenti.filter(a=>a.materia_id===curMateriaId).length===0&&<div className="empty"><span>📝</span><p>Nessun argomento. Creane uno con il "+" in alto!</p></div>}
          {argomenti.filter(a=>a.materia_id===curMateriaId).map(a=>(
            <div key={a.id} className="argomento-row"
              onClick={()=>{if(selArg.size>0){const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n);return}openArgomento(a)}}
              onContextMenu={e=>{e.preventDefault();const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)}}
              onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)},600)}}
              onTouchEnd={()=>clearTimeout(lpRef.current)}
            >
              {selArg.size>0&&<div className={`sel-check${selArg.has(a.id)?' checked':''}`} style={{position:'static',flexShrink:0}}>{selArg.has(a.id)&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
              <div className="argomento-name">{a.nome}</div>
              <div className="row-actions">
                <button className="row-del" onClick={e=>{e.stopPropagation();setDialog({icon:'🗑️',title:`Elimina "${a.nome}"?`,msg:'Fonti e storico verranno eliminati.',confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteArgomenti(new Set([a.id]))})}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
                <span style={{color:'var(--muted)'}}>›</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>}

    {/* ARGOMENTO DETAIL */}
    {screen==='argomento'&&<div className="screen anim arg-screen">

      {/* ── Header ── */}
      <div className="av3-header">
        <button className="av3-back" onClick={()=>navTo('home')}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="av3-title">
          {editingArgTitle
            ?<input className="av3-title-input" value={argTitleVal}
                onChange={e=>setArgTitleVal(e.target.value)}
                onBlur={()=>{renameArgomento(curArgomento,argTitleVal);setEditingArgTitle(false)}}
                onKeyDown={e=>{if(e.key==='Enter'){renameArgomento(curArgomento,argTitleVal);setEditingArgTitle(false)}else if(e.key==='Escape')setEditingArgTitle(false)}}
                autoFocus/>
            :<span onClick={()=>{setArgTitleVal(curArgomento?.nome||'');setEditingArgTitle(true)}}>{curArgomento?.nome}</span>
          }
        </div>
        <button className="av3-avatar" onClick={()=>setScreen('profilo')}>
          {utente?.nome?.[0]?.toUpperCase()||'?'}
        </button>
      </div>

      {/* ── 3 colonne (desktop) / tab panels (mobile) ── */}
      <div className="av3-body" style={{'--w0':`${colWidths[0]}%`,'--w1':`${colWidths[1]}%`,'--w2':`${colWidths[2]}%`}}>

        {/* ─ FONTI ─ */}
        <div className={`av3-panel av3-fonti${argTab==='fonti'?' av3-active':''}`}>
          <div className="av3-panel-inner">
            {selFonti.size>0&&<div className="sel-bar" style={{marginBottom:8}}>
              <span>{selFonti.size} selezionate</span>
              <button className="btn-sm danger" onClick={deleteFontiSel}>Elimina</button>
            </div>}
            {argFonti.length===0&&<div className="av3-empty"><svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg><span>Nessuna fonte</span></div>}
            {argFonti.map(f=>{
              const ext=getExt(f.nome)
              const isImg=isImgExt(ext)||(f.tipo==='file'&&f.url?.match(/.(jpg|jpeg|png|gif|webp)/i))
              const icon=f.tipo==='text'?'✏️':f.tipo==='url'?'🔗':(EXT_ICON[ext]||'📎')
              const isSel=selFonti.has(f.id)
              return(
                <div key={f.id} className={`av3-fonte-row${isSel?' sel':''}`}
                  onClick={()=>{if(selFonti.size>0){const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n);return}setPreviewFonte(f)}}
                  onContextMenu={e=>{e.preventDefault();const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n)}}
                  onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n)},600)}}
                  onTouchEnd={()=>clearTimeout(lpRef.current)}
                >
                  {selFonti.size>0&&<div className={'sel-check'+(isSel?' checked':'')} style={{position:'static',flexShrink:0}}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                  <div className="av3-fonte-thumb">{isImg?<img src={f.url} alt={f.nome}/>:<span>{icon}</span>}</div>
                  <div className="av3-fonte-info">
                    <div className="av3-fonte-name">{f.nome}</div>
                    <div className="av3-fonte-sub">{f.tipo==='text'?'Testo':f.tipo==='url'?'Link':ext.toUpperCase()}</div>
                  </div>
                  <button className="av3-fonte-btn" title="Rinomina" onClick={e=>{e.stopPropagation();setSheetRename(f);setRenameVal(f.nome)}}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="av3-fonte-btn av3-del" title="Elimina" onClick={e=>{e.stopPropagation();deleteFonte(f)}}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
          <button className="av3-add-fonte" onClick={()=>setShowFontiUpload(true)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Aggiungi fonte
          </button>
        </div>

        {/* Drag handle 1 */}
        <div className="av3-handle" onMouseDown={e=>startDrag(0,e)}/>

        {/* ─ CHAT ─ */}
        <div className={`av3-panel av3-chat${argTab==='chat'?' av3-active':''}`}>
          <div className="av3-chat-msgs">
            {chatMsgs.length===0&&<div className="av3-empty"><svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>Nessun messaggio</span></div>}
            {chatMsgs.map((m,i)=>(
              <div key={i} className={`av3-bubble av3-bubble-${m.role}`}>
                <div className="av3-bubble-sender">{m.role==='user'?'Tu':'AI'}</div>
                <div className="av3-bubble-text">{m.role==='ai'?cleanText(m.content):m.content}</div>
              </div>
            ))}
            {chatLoading&&<div className="av3-bubble av3-bubble-ai"><div className="av3-bubble-sender">AI</div><div style={{display:'flex',gap:6,alignItems:'center'}}><Spinner/><span style={{fontSize:'.83rem',color:'#888'}}>Sto pensando…</span></div></div>}
            <div ref={chatEndRef}/>
          </div>
          <div className="av3-chat-footer">
            <button className="av3-mode-btn" onClick={()=>setSheetPromptMode(true)} title="Impostazioni risposta">
              {promptMode.mode==='learning'?'🎓':promptMode.mode==='custom'?'✍️':'🤖'}<span className="av3-mode-len">{['B','M','L'][chatLength-1]}</span>
            </button>
            <textarea className="av3-chat-input" value={chatInput}
              onChange={e=>setChatInput(e.target.value)}
              onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'}}
              placeholder={aiBlocked?'Limite token raggiunto':'Scrivi un messaggio…'}
              disabled={aiBlocked} rows={1}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!aiBlocked){e.preventDefault();sendChat()}}}/>
            <button className="av3-send-btn" onClick={sendChat} disabled={chatLoading||aiBlocked}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
            </button>
          </div>
        </div>

        {/* Drag handle 2 */}
        <div className="av3-handle" onMouseDown={e=>startDrag(1,e)}/>

        {/* ─ LAB ─ */}
        <div className={`av3-panel av3-lab${argTab==='lab'?' av3-active':''}`}>
          <div className="av3-panel-inner">
            {activeProvider?.provider==='deepseek'&&argFonti.some(f=>f.tipo==='file')&&(
              <div className="av3-warn">⚠️ DeepSeek non supporta file allegati.</div>
            )}
            {aiBlocked&&<div className="av3-warn av3-warn-err">🚫 Limite token raggiunto.</div>}

            {/* Quiz wide */}
            <div className={`av3-tool-wide${aiBlocked?' av3-disabled':''}`} onClick={()=>!aiBlocked&&setShowQuizPicker(true)}>
              <span className="av3-tool-icon">❓</span>
              <div className="av3-tool-info"><div className="av3-tool-name">Quiz</div><div className="av3-tool-desc">Multipla · Aperta</div></div>
              <button className="av3-tool-cfg" onClick={e=>{e.stopPropagation();!aiBlocked&&openToolCfg('quiz')}}>✏️</button>
            </div>

            {/* Grid tools */}
            <div className="av3-tools-grid">
              {[
                {key:'riassunto',icon:'📝',name:'Riassunto',desc:'Sintesi'},
                {key:'flashcards',icon:'🃏',name:'Flash Cards',desc:'Flip 3D'},
                {key:'mappa',icon:'🗺️',name:'Mappa',desc:'Visuale'},
                {key:'punti',icon:'🎯',name:'Punti chiave',desc:'Concetti'},
                {key:'dizionario',icon:'📖',name:'Dizionario',desc:curMateria?.lingua||'Sinonimi'},
              ].map(t=>(
                <div key={t.key} className={`av3-tool${aiBlocked?' av3-disabled':''}`}
                  onClick={()=>{
                    if(aiBlocked)return
                    if(t.key==='dizionario'){setLabInline(p=>p?.key==='dizionario'?null:{key:'dizionario',loading:false,data:null});return}
                    runTool(t.key,outputCfg,false)
                  }}>
                  <button className="av3-tool-cfg" onClick={e=>{e.stopPropagation();!aiBlocked&&t.key!=='dizionario'&&openToolCfg(t.key)}}>✏️</button>
                  <span className="av3-tool-icon">{t.icon}</span>
                  <div className="av3-tool-name">{t.name}</div>
                  <div className="av3-tool-desc">{t.desc}</div>
                </div>
              ))}
            </div>

            {labInline?.key==='dizionario'&&(
              <div className="av3-diz">
                <div className="av3-diz-row">
                  <input className="av3-diz-input" value={labDizQuery} onChange={e=>setLabDizQuery(e.target.value)}
                    placeholder="Inserisci una parola…"
                    onKeyDown={e=>e.key==='Enter'&&runDizionario(labDizQuery)}/>
                  <button className="av3-send-btn" onClick={()=>runDizionario(labDizQuery)} disabled={labInline.loading||!labDizQuery.trim()}>
                    {labInline.loading?<Spinner/>:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>}
                  </button>
                </div>
                {labInline.data&&!labInline.loading&&(
                  labInline.data.error?<div style={{color:'#f87171',fontSize:'.82rem'}}>{labInline.data.error}</div>:
                  labInline.data.raw?<pre style={{fontSize:'.78rem',color:'#888',whiteSpace:'pre-wrap'}}>{labInline.data.raw}</pre>:
                  <div className="lab-diz-result">
                    {labInline.data.significati?.length>0&&<div className="lab-diz-section"><div className="lab-diz-label">Significati</div>{labInline.data.significati.map((s,i)=><div key={i} className="lab-diz-item">{s}</div>)}</div>}
                    {labInline.data.sinonimi?.length>0&&<div className="lab-diz-section"><div className="lab-diz-label">Sinonimi</div><div style={{display:'flex',flexWrap:'wrap',gap:4}}>{labInline.data.sinonimi.map((s,i)=><span key={i} className="lab-diz-chip">{s}</span>)}</div></div>}
                    {labInline.data.traduzioni&&<div className="lab-diz-section"><div className="lab-diz-label">Traduzioni</div><div className="lab-diz-traduzioni">{Object.entries(labInline.data.traduzioni).map(([lang,val])=><div key={lang} className="lab-diz-trad"><span className="lab-diz-lang">{lang.toUpperCase()}</span><span>{val}</span></div>)}</div></div>}
                  </div>
                )}
              </div>
            )}

            <div className="av3-section-label">Generati</div>
            {selStorico.size>0&&<div className="sel-bar" style={{marginBottom:8}}><span>{selStorico.size} selezionati</span><button className="btn-sm danger" onClick={deleteStoricoSel}>Elimina</button></div>}
            {argStorico.length===0&&<div className="av3-empty"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><span>Nessun output</span></div>}
            {argStorico.map(s=>{
              const isSel=selStorico.has(s.id)
              const isStarred=s.stellato||false
              const STLABEL={riassunto:'📝 Riassunto',mappa:'🗺️ Mappa',flashcards:'🃏 Flashcards',quiz:'❓ Quiz','quiz-aperta':'✍️ Quiz Aperta',punti:'🎯 Punti chiave'}
              const label=STLABEL[s.tipo]||s.tipo
              const preview=cleanText(s.contenuto).substring(0,60)
              return(
                <div key={s.id} className={`av3-storico-row${isSel?' sel':''}`}
                  onClick={()=>{if(selStorico.size>0){const n=new Set(selStorico);n.has(s.id)?n.delete(s.id):n.add(s.id);setSelStorico(n);return}openStorico(s)}}
                  onContextMenu={e=>{e.preventDefault();const n=new Set(selStorico);n.has(s.id)?n.delete(s.id):n.add(s.id);setSelStorico(n)}}
                  onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selStorico);n.has(s.id)?n.delete(s.id):n.add(s.id);setSelStorico(n)},600)}}
                  onTouchEnd={()=>clearTimeout(lpRef.current)}
                >
                  {selStorico.size>0&&<div className={'sel-check'+(isSel?' checked':'')} style={{position:'static',flexShrink:0}}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div className="av3-storico-label">{label}</div>
                    <div className="av3-storico-preview">{preview}{preview.length>=60?'…':''}</div>
                    <div className="av3-storico-date">{fmtDate(s.created_at)}</div>
                  </div>
                  <div style={{display:'flex',gap:2,flexShrink:0,alignItems:'center'}}>
                    <button className={`storico-star-btn${isStarred?' starred':''}`}
                      onClick={async e=>{e.stopPropagation();await supabase.from('storico').update({stellato:!isStarred}).eq('id',s.id);setStorico(p=>p.map(x=>x.id===s.id?{...x,stellato:!isStarred}:x))}}
                    >★</button>
                    <button className="row-del" onClick={e=>{e.stopPropagation();deleteOneStorico(s.id)}}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <div className="av3-tabbar">
        {[
          {id:'fonti',label:'Fonti',path:'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'},
          {id:'chat',label:'Chat',path:'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'},
          {id:'lab',label:'Lab',path:'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18'},
        ].map(t=>(
          <button key={t.id} className={`av3-tab-btn${argTab===t.id?' active':''}`} onClick={()=>setArgTab(t.id)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={argTab===t.id?2.5:1.8} viewBox="0 0 24 24"><path d={t.path}/></svg>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

    </div>}
    {/* PROFILO */}
    {screen==='profilo'&&<div className="screen anim profilo-screen">
      <AppHeader title="Profilo" onBack={()=>navTo('home')} backLabel="← Home"/>
      <div className="prof-scroll">

        <div className="prof-hero">
          <div className="prof-avatar">{utente?.nome?.[0]?.toUpperCase()||'?'}</div>
          <div className="prof-hero-info">
            <div className="prof-hero-name">{utente?.nome||'Utente'}</div>
            <div className="prof-hero-email">{utente?.email}</div>
          </div>
          <div className={`prof-badge${utente?.ruolo==='owner'?' pro':''}`}>
            {utente?.ruolo==='owner'?'Pro':'Gratis'}
          </div>
        </div>

        <div className="prof-list">
          <button className="prof-row" onClick={()=>setScreen('impostazioni')}>
            <span className="prof-row-icon">🤖</span>
            <span className="prof-row-label">Mod AI</span>
            <span className="prof-row-arrow">›</span>
          </button>
          <button className="prof-row" onClick={()=>{setGuidaSearch('');setScreen('guida')}}>
            <span className="prof-row-icon">📖</span>
            <span className="prof-row-label">Guida</span>
            <span className="prof-row-arrow">›</span>
          </button>
          {utente?.is_admin&&(
            <button className="prof-row" onClick={()=>{loadProviders();setScreen('admin')}}>
              <span className="prof-row-icon">⚙️</span>
              <span className="prof-row-label">Pannello Admin</span>
              <span className="prof-row-arrow">›</span>
            </button>
          )}
        </div>

        <div className="prof-footer">
          <button className="prof-action prof-logout" onClick={doLogout}>Esci</button>
          {deleteConfirmStep===0&&(
            <button className="prof-action prof-delete" onClick={()=>setDeleteConfirmStep(1)}>Elimina account</button>
          )}
          {deleteConfirmStep===1&&(
            <div className="prof-delete-confirm">
              <p>Sei sicuro? Digita <strong>ELIMINA</strong> per confermare. Tutti i dati verranno cancellati.</p>
              <input className="rip-input" value={deleteConfirmText}
                onChange={e=>setDeleteConfirmText(e.target.value)}
                placeholder="ELIMINA" autoFocus/>
              <div className="prof-delete-btns">
                <button className="prof-action" onClick={()=>{setDeleteConfirmStep(0);setDeleteConfirmText('')}}>Annulla</button>
                <button className="prof-action prof-delete-confirm-btn" disabled={deleteConfirmText!=='ELIMINA'}
                  onClick={async()=>{await supabase.from('profili').delete().eq('id',utente.id);await doLogout()}}>
                  Conferma eliminazione
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>}

    {/* GUIDA */}
    {screen==='guida'&&(()=>{
      const ITEMS=[
        {a:'Chat',t:'Chat con AI',d:'Fai domande sulle fonti caricate. L\'AI risponde usando il contesto dei tuoi materiali in tempo reale.'},
        {a:'Chat',t:'Impostazioni risposta',d:'Cambia stile (predefinita/apprendimento/custom) e lunghezza con il pulsante in alto nella Chat.'},
        {a:'Chat',t:'Storico conversazioni',d:'Le chat vengono salvate nel Lab e possono essere riaperte per continuare.'},
        {a:'Lab',t:'Quiz multipla scelta',d:'Genera domande con 4 opzioni. Configura difficoltà e numero tramite la pennina. Feedback immediato ad ogni risposta.'},
        {a:'Lab',t:'Quiz risposta aperta',d:'Scrivi le risposte liberamente. L\'AI valuta ogni risposta e alla fine fornisce un report completo.'},
        {a:'Lab',t:'Riassunto',d:'Genera riassunti strutturati con sezioni espandibili. Lunghezza configurabile.'},
        {a:'Lab',t:'Flash Cards',d:'Carte fronte/retro per ripasso attivo. Tocca per girare, naviga con i tasti.'},
        {a:'Lab',t:'Mappa Concettuale',d:'Albero visivo dei concetti. Tocca i nodi per espandere i sottoconcetti.'},
        {a:'Lab',t:'Punti chiave',d:'Estrai i concetti più importanti dal materiale in modo rapido.'},
        {a:'Lab',t:'Dizionario',d:'Cerca significati, sinonimi e traduzioni. Funziona in qualsiasi lingua.'},
        {a:'Fonti',t:'Carica fonti',d:'Aggiungi PDF, immagini, audio, link web, YouTube o testo. L\'AI le usa come contesto per tutte le funzioni.'},
        {a:'Fonti',t:'Upload AI',d:'Carica materiali e l\'AI organizza automaticamente materie e argomenti. Modifica prima di salvare.'},
        {a:'Fonti',t:'Estrazione automatica',d:'Il testo viene estratto da PDF e immagini (OCR) e salvato come contesto per le risposte AI.'},
        {a:'Ripasso',t:'Ripasso pianificato',d:'Crea sessioni automatiche con notifiche. Scegli materia, argomento, frequenza e orario.'},
        {a:'Ripasso',t:'Quiz ripasso',d:'L\'AI genera un quiz diverso ogni volta. Tipo multipla o flashcard.'},
        {a:'Ripasso',t:'Notifiche',d:'Ricevi notifiche push all\'orario impostato. Abilita i permessi quando richiesto.'},
        {a:'Profilo',t:'Impostazioni AI globali',d:'Stile e lunghezza risposta applicati a tutte le materie. Modificabili dal Profilo.'},
        {a:'Profilo',t:'Materie e argomenti',d:'Organizza i materiali in materie (es. Matematica) e argomenti (es. Derivate).'},
      ]
      const q=guidaSearch.toLowerCase()
      const filtered=ITEMS.filter(i=>!q||i.t.toLowerCase().includes(q)||i.d.toLowerCase().includes(q)||i.a.toLowerCase().includes(q))
      const areas=[...new Set(filtered.map(i=>i.a))]
      return(
        <div className="screen anim" style={{background:'var(--bg)'}}>
          <AppHeader title="Guida" onBack={()=>setScreen('profilo')} backLabel="← Profilo"/>
          <div className="guida-body">
            <input className="guida-search" placeholder="Cerca funzionalità…" value={guidaSearch} onChange={e=>setGuidaSearch(e.target.value)}/>
            {areas.length===0&&<div className="empty"><span>?</span><p>Nessun risultato per "{guidaSearch}"</p></div>}
            {areas.map(area=>(
              <div key={area} className="guida-section">
                <div className="guida-area-label">{area}</div>
                {filtered.filter(i=>i.a===area).map((item,k)=>(
                  <div key={k} className="guida-item">
                    <div className="guida-item-title">{item.t}</div>
                    <div className="guida-item-desc">{item.d}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    })()}

    {/* IMPOSTAZIONI AI */}
    {screen==='impostazioni'&&<div className="screen anim" style={{background:'var(--bg)'}}>
      <AppHeader title="Impostazioni AI" onBack={()=>setScreen('profilo')} backLabel="← Profilo"/>
      <div style={{padding:20,display:'flex',flexDirection:'column',gap:14,maxWidth:480,margin:'0 auto',width:'100%'}}>
        <div style={{background:'var(--surface)',borderRadius:16,padding:16,border:'1px solid var(--border)'}}>
          <div style={{fontSize:'.75rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Lunghezza risposta</div>
          <div style={{display:'flex',gap:6}}>
            {['Breve','Media','Lunga'].map((l,i)=><button key={i} className={`cfg-btn ${chatLength===(i+1)?'active':''}`} onClick={()=>setChatLength(i+1)}>{l}</button>)}
          </div>
        </div>
        <div style={{background:'var(--surface)',borderRadius:16,padding:16,border:'1px solid var(--border)'}}>
          <div style={{fontSize:'.75rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Provider AI attivo</div>
          {providers.length===0?<p style={{fontSize:'.85rem',color:'var(--muted)'}}>Nessun provider. Vai al Pannello Admin.</p>:providers.filter(p=>p.attivo).map(p=>(
            <div key={p.id}><div style={{fontWeight:700,fontSize:'.9rem'}}>{p.nome_display}</div><div style={{fontSize:'.78rem',color:'var(--muted)',marginTop:2}}>{p.modello}</div></div>
          ))}
        </div>
        {tokenUsage.tokenLimit>0&&<div style={{background:'var(--surface)',borderRadius:16,padding:16,border:'1px solid var(--border)'}}>
          <div style={{fontSize:'.75rem',fontWeight:700,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Utilizzo Token AI</div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.85rem',marginBottom:8}}>
            <span>{tokenUsage.tokensUsed.toLocaleString('it')} / {tokenUsage.tokenLimit.toLocaleString('it')} token</span>
            <span style={{color:'var(--muted)'}}>{Math.round(tokenUsage.tokensUsed/tokenUsage.tokenLimit*100)}%</span>
          </div>
          <div style={{background:'var(--surface-2)',borderRadius:99,height:8,overflow:'hidden'}}>
            <div style={{width:`${Math.min(100,Math.round(tokenUsage.tokensUsed/tokenUsage.tokenLimit*100))}%`,height:'100%',background:aiBlocked?'#ef4444':'var(--accent)',borderRadius:99,transition:'width .4s'}}/>
          </div>
          {tokenUsage.tokenResetDate&&<div style={{fontSize:'.75rem',color:'var(--muted)',marginTop:8}}>Reset il {tokenUsage.tokenResetDate}</div>}
          {aiBlocked&&<div style={{marginTop:10,fontSize:'.82rem',color:'#ef4444',fontWeight:600}}>Limite raggiunto. Le funzioni AI sono disabilitate fino al reset.</div>}
        </div>}
        <button className="btn-primary" onClick={()=>{saveSettings({chatLength,promptMode,outputCfg});toast('Salvato ✓');setScreen('profilo')}}>Salva</button>
      </div>
    </div>}

    {/* ADMIN */}
    {screen==='admin'&&<div className="screen anim" style={{background:'var(--bg)'}}>
      <AppHeader title="Pannello Admin" onBack={()=>setScreen('profilo')} backLabel="← Profilo"/>
      <div className="admin-top" style={{borderBottom:'none',paddingTop:8}}>
        <p style={{padding:'0 20px',color:'var(--muted)',fontSize:'.85rem'}}>Gestisci provider AI</p>
      </div>
      <div className="admin-body">
        {activeProvider&&<div className="banner-active">⚡ Attivo: <strong>{activeProvider.nome_display}</strong> — {activeProvider.modello}</div>}
        {providers.length===0&&<div className="empty"><span>🔑</span><p>Nessun provider. Aggiungine uno.</p></div>}
        {providers.map(p=>(
          <div key={p.id} className={`provider-card ${p.attivo?'active-p':''}`}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div className="provider-name">{p.nome_display}</div><div className="provider-model">{p.modello}</div></div>
              <span className={p.attivo?'badge-active':'badge-inactive'}>{p.attivo?'Attivo':'Inattivo'}</span>
            </div>
            <div className="provider-actions">
              {!p.attivo&&<button className="btn-sm primary" onClick={()=>activateProvider(p.id)}>Attiva</button>}
              <button className="btn-sm danger" onClick={()=>deleteProvider(p.id)}>Elimina</button>
            </div>
          </div>
        ))}
        <div className="admin-form">
          <h3>➕ Aggiungi provider</h3>
          <select className="select-field" value={newProv} onChange={e=>{setNewProv(e.target.value);setNewModel(PROVIDERS_DEF[e.target.value].models[0])}}>
            {Object.entries(PROVIDERS_DEF).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
          </select>
          <select className="select-field" value={newModel} onChange={e=>setNewModel(e.target.value)}>
            {PROVIDERS_DEF[newProv].models.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <div className="field" style={{marginBottom:12}}><label>API Key</label><input type="password" value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder="Inserisci chiave API…"/></div>
          <button className="btn-primary" onClick={addProvider} disabled={adminLoading}>{adminLoading?'Salvataggio…':'Salva provider'}</button>
        </div>
      </div>
    </div>}

    {/* RIPASSO — Apple white split layout */}
    {screen==='ripasso'&&<div className="screen anim ripasso-screen">
      <AppHeader title="Ripasso" onBack={()=>navTo('home')} backLabel="← Home"/>

      <div className="rip-split">

        {/* Colonna sinistra (~35%): lista ripassi */}
        <aside className={`rip-list-col${rShowForm||rRunning?' rip-hide-sm':''}`}>
          <div className="rip-list-hdr">I tuoi ripassi</div>
          {ripassi.length===0
            ? <div className="rip-empty">Nessun ripasso pianificato.<br/>Tocca il + per crearne uno.</div>
            : <div className="rip-list">
                {ripassi.map(r=>{
                  const mat=materie.find(m=>m.id===r.materia_id)
                  const hasQuiz=!!ripassiQuiz[r.id]
                  const isGenerating=ripassiGeneratingId===r.id
                  const FDOW={lun:'Lun',mar:'Mar',mer:'Mer',gio:'Gio',ven:'Ven',sab:'Sab',dom:'Dom'}
                  let freqLbl=r.frequenza
                  if(r.frequenza==='giornaliero')freqLbl='Ogni giorno'
                  else if(FDOW[r.frequenza])freqLbl='Ogni '+FDOW[r.frequenza].toLowerCase()+'edì'.replace('lunedì','lunedì')
                  else if(r.frequenza==='settimanale')freqLbl='Settimanale'
                  else if(r.frequenza?.startsWith('mensile-'))freqLbl='Ogni mese il '+r.frequenza.slice(8)
                  else if(r.frequenza?.startsWith('custom:'))freqLbl=r.frequenza.slice(7).split(',').map(d=>FDOW[d]||d).join(', ')
                  const tipoLbl=r.quiz_modalita==='flashcard'?'Cards':'Quiz'
                  return(
                    <div key={r.id} className={`rip-card${(rEditId===r.id&&rShowForm)||rRunning?.ripasso?.id===r.id?' rip-card-active':''}`}>
                      <div className="rip-card-body" onClick={()=>openRipassoQuizFromTable(r)}>
                        <div className="rip-card-title">Ripasso su {mat?.nome||'—'}</div>
                        <div className="rip-card-meta">{freqLbl} · {r.orario} · {r.quiz_num} {tipoLbl}</div>
                        {isGenerating
                          ? <div className="rip-card-badge rip-gen"><Spinner/> Generazione…</div>
                          : hasQuiz
                            ? <div className="rip-card-badge rip-ready">● Pronto</div>
                            : <div className="rip-card-badge rip-wait">○ In attesa</div>}
                      </div>
                      <div className="rip-card-actions">
                        <button onClick={e=>{e.stopPropagation();editRipasso(r)}} title="Modifica">✎</button>
                        <button className="danger" onClick={e=>{e.stopPropagation();setDialog({icon:'🗑️',title:'Elimina ripasso?',msg:'Verranno eliminati anche i quiz generati.',confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteRipasso(r.id)})}} title="Elimina">✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </aside>

        {/* Colonna destra (~65%): runner quiz inline | form nuovo/modifica | empty */}
        <section className={`rip-form-col${!rShowForm&&!rRunning?' rip-hide-sm':''}`}>
          {rRunning?(<>
            <div className="rip-form-hdr">
              <h2>{rRunning.ripasso.nome||('Ripasso su '+(materie.find(m=>m.id===rRunning.ripasso.materia_id)?.nome||'—'))}</h2>
              <button className="rip-close-btn" onClick={closeRipassoRunner} title="Chiudi">✕</button>
            </div>

            {rRunning.mode==='multipla'&&(
              quizIdx>=quizData.length?(
                <div className="quiz-score">
                  <div className="quiz-score-circle">{quizScore}/{quizData.length}</div>
                  <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.3rem'}}>Quiz completato!</h2>
                  <p style={{color:'var(--muted)',marginBottom:quizWrong.length?16:0}}>
                    Hai risposto correttamente a <strong>{quizScore}</strong> su {quizData.length}.
                  </p>
                  {quizWrong.length>0&&<div className="quiz-wrong-list">
                    <p className="quiz-wrong-title">❌ Risposte errate ({quizWrong.length})</p>
                    {quizWrong.map(({qi,q})=>(
                      <div key={qi} className="quiz-wrong-item">
                        <div className="quiz-wrong-q">{cleanText(q.dom||q.domanda||'')}</div>
                        <div className="quiz-wrong-ans">✓ {cleanText((q.opts||q.opzioni||[])[q.cor??q.corretta??0]||'')}</div>
                      </div>
                    ))}
                  </div>}
                  <button className="btn-primary" style={{maxWidth:220,marginTop:16}} onClick={()=>{setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([])}}>Riprova</button>
                </div>
              ):(
                <div className="quizm-fit">
                  <div className="quiz-progressbar-wrap"><div className="quiz-progressbar" style={{width:`${(quizIdx/quizData.length)*100}%`}}/></div>
                  <span className="quiz-counter">{quizIdx+1} / {quizData.length}</span>
                  <QuizErrorBoundary raw={''}>
                    <QuizQ key={quizIdx} q={quizData[quizIdx]||{dom:'',opts:[],cor:0,spieg:''}} idx={quizIdx} total={quizData.length}
                      onNext={()=>{setQuizIdx(i=>i+1);setQuizAnswered(false)}}
                      onCorrect={()=>setQuizScore(s=>s+1)}
                      onWrong={q=>setQuizWrong(p=>[...p,{qi:quizIdx,q}])}/>
                  </QuizErrorBoundary>
                </div>
              )
            )}

            {rRunning.mode==='aperta'&&quizData&&quizData.length>0&&(
              quizApertaIdx>=quizData.length?(
                <div className="quiz-score">
                  <div className="quiz-score-circle" style={{fontSize:'1.2rem'}}>✓</div>
                  <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.3rem'}}>Completato!</h2>
                  <p style={{color:'var(--muted)',marginBottom:16}}>Hai risposto a tutte le {quizData.length} domande.</p>
                  {!openFinalEval?(
                    <button className="btn-primary" style={{maxWidth:260}} onClick={evalAllQuiz}>🤖 Valuta tutto con AI</button>
                  ):openFinalEval.loading?(
                    <div style={{display:'flex',gap:10,alignItems:'center',color:'var(--muted)',fontSize:'.88rem'}}><Spinner/> Valutazione in corso…</div>
                  ):(
                    <div className="quiz-final-eval">
                      <p className="quiz-final-eval-title">📊 Valutazione AI</p>
                      <pre className="quiz-final-eval-text">{cleanText(openFinalEval.text)}</pre>
                    </div>
                  )}
                  <button className="btn-secondary" style={{marginTop:8,maxWidth:220}} onClick={()=>{setQuizApertaIdx(0);setOpenAnswers({});setOpenFeedback({});setOpenFinalEval(null)}}>Riprova</button>
                </div>
              ):(
                <div className="quiz-fit">
                  <div className="quiz-progressbar-wrap"><div className="quiz-progressbar" style={{width:`${(quizApertaIdx/quizData.length)*100}%`}}/></div>
                  <span className="quiz-counter">{quizApertaIdx+1} / {quizData.length}</span>
                  <div key={quizApertaIdx} className="quiz-card quiz-card-anim" style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
                    <div className="quiz-q">{cleanText(quizData[quizApertaIdx]?.dom||quizData[quizApertaIdx]?.domanda||'')}</div>
                    <textarea className="quiz-open-input" placeholder="Scrivi la tua risposta…"
                      value={openAnswers[quizApertaIdx]||''}
                      onChange={e=>setOpenAnswers(p=>({...p,[quizApertaIdx]:e.target.value}))}/>
                    {openFeedback[quizApertaIdx]?.loading&&(
                      <div style={{display:'flex',gap:8,alignItems:'center',fontSize:'.84rem',color:'var(--muted)',marginBottom:10}}><Spinner/>Valutazione AI…</div>
                    )}
                    {openFeedback[quizApertaIdx]?.text&&(
                      <div className="quiz-ai-feedback">{cleanText(openFeedback[quizApertaIdx].text)}</div>
                    )}
                    {!openFeedback[quizApertaIdx]&&(openAnswers[quizApertaIdx]||'').trim()&&(
                      <button className="btn-sm primary" style={{marginBottom:10}} onClick={()=>evalQuizOpen(quizApertaIdx)}>✓ Valuta risposta</button>
                    )}
                    <button className="btn-primary" style={{marginTop:'auto',paddingTop:14}} onClick={()=>setQuizApertaIdx(i=>i+1)}>
                      {quizApertaIdx+1<quizData.length?'Prossima →':'Vedi risultato'}
                    </button>
                  </div>
                </div>
              )
            )}

            {rRunning.mode==='flashcard'&&fcCards.length>0&&(
              <div className="fc-wrap-fit">
                <div className="fc-progress">{fcCards.map((_,i)=><div key={i} className={`fc-dot ${i<=fcIdx?'seen':''}`}/>)}</div>
                <div className="fc-scene" onClick={()=>setFcFlipped(f=>!f)} style={{flex:1,display:'flex',flexDirection:'column'}}>
                  <div className="fc-card" style={{transform:fcFlipped?'rotateY(180deg)':'none',flex:1,position:'relative'}}>
                    <div className="fc-face fc-front"><div className="fc-label">FRONTE</div><div className="fc-text">{cleanText(fcCards[fcIdx]?.front||'')}</div></div>
                    <div className="fc-face fc-back"><div className="fc-label">RETRO</div><div className="fc-text">{cleanText(fcCards[fcIdx]?.back||'')}</div></div>
                  </div>
                </div>
                <div className="fc-hint">Tocca per girare</div>
                <div className="fc-nav">
                  <button onClick={()=>{setFcIdx(i=>Math.max(0,i-1));setFcFlipped(false)}} disabled={fcIdx===0}>← Prec.</button>
                  <span className="fc-counter">{fcIdx+1} / {fcCards.length}</span>
                  <button onClick={()=>{setFcIdx(i=>Math.min(fcCards.length-1,i+1));setFcFlipped(false)}} disabled={fcIdx===fcCards.length-1}>Succ. →</button>
                </div>
              </div>
            )}
          </>):rShowForm?(<>
            <div className="rip-form-hdr">
              <h2>{rEditId?'Modifica ripasso':'Nuovo ripasso'}</h2>
              {rEditId&&<button className="rip-close-btn" onClick={()=>{setRShowForm(false);setREditId(null)}}>✕</button>}
            </div>

            <div className="rip-field">
              <label>Nome ripasso <span className="rip-opt">(opzionale)</span></label>
              <input className="rip-input" type="text" value={rNome} onChange={e=>setRNome(e.target.value)}
                placeholder="Es. Ripasso serale"/>
            </div>

            <div className="rip-field">
              <label>Materia</label>
              <select className="rip-input" value={rMat||''}
                onChange={e=>{const v=e.target.value||null;setRMat(v);if(v)loadArgomenti(v);setRArgs([])}}>
                <option value="">Seleziona una materia…</option>
                {materie.map(m=>(<option key={m.id} value={m.id}>{m.nome}</option>))}
              </select>
            </div>

            {rMat&&argomenti.filter(a=>a.materia_id===rMat).length>0&&(
              <div className="rip-field">
                <label>Argomenti <span className="rip-opt">(nessuno selezionato = tutti)</span></label>
                <div className="rip-chip-row">
                  {argomenti.filter(a=>a.materia_id===rMat).map(a=>(
                    <button key={a.id} type="button"
                      className={`rip-chip${rArgs.includes(a.id)?' sel':''}`}
                      onClick={()=>setRArgs(p=>p.includes(a.id)?p.filter(x=>x!==a.id):[...p,a.id])}>
                      {a.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rip-field">
              <label>Frequenza</label>
              <div className="rip-toggle">
                {[['D','Giornaliera'],['W','Settimanale'],['M','Mensile'],['C','Personalizzata']].map(([v,l])=>(
                  <button key={v} type="button"
                    className={`rip-toggle-btn${rFreqType===v?' sel':''}`}
                    onClick={()=>setRFreqType(v)}>{l}</button>
                ))}
              </div>
              {rFreqType==='W'&&(
                <div className="rip-chip-row" style={{marginTop:10}}>
                  {[['lun','Lun'],['mar','Mar'],['mer','Mer'],['gio','Gio'],['ven','Ven'],['sab','Sab'],['dom','Dom']].map(([v,l])=>(
                    <button key={v} type="button" className={`rip-chip${rDay===v?' sel':''}`} onClick={()=>setRDay(v)}>{l}</button>
                  ))}
                </div>
              )}
              {rFreqType==='M'&&(
                <div style={{marginTop:10,display:'flex',alignItems:'center',gap:10}}>
                  <span className="rip-opt">Giorno del mese:</span>
                  <input className="rip-input" type="number" min={1} max={31} value={rDayOfMonth}
                    onChange={e=>setRDayOfMonth(Math.max(1,Math.min(31,Number(e.target.value)||1)))}
                    style={{maxWidth:100}}/>
                </div>
              )}
              {rFreqType==='C'&&(
                <div className="rip-chip-row" style={{marginTop:10}}>
                  {[['lun','Lun'],['mar','Mar'],['mer','Mer'],['gio','Gio'],['ven','Ven'],['sab','Sab'],['dom','Dom']].map(([v,l])=>(
                    <button key={v} type="button"
                      className={`rip-chip${rCustomDays.includes(v)?' sel':''}`}
                      onClick={()=>setRCustomDays(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}>{l}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="rip-field">
              <label>Orario</label>
              <input className="rip-input" type="time" value={rOrario}
                onChange={e=>setROrario(e.target.value)} style={{maxWidth:160}}/>
            </div>

            <div className="rip-field">
              <label>Tipo output</label>
              <div className="rip-toggle">
                <button type="button" className={`rip-toggle-btn${rQMode==='multipla'?' sel':''}`} onClick={()=>setRQMode('multipla')}>Quiz</button>
                <button type="button" className={`rip-toggle-btn${rQMode==='flashcard'?' sel':''}`} onClick={()=>setRQMode('flashcard')}>Cards</button>
              </div>
            </div>

            <div className="rip-field">
              <label>Numero domande</label>
              <input className="rip-input" type="number" min={3} max={50}
                value={rQNum} onChange={e=>setRQNum(Math.max(3,Math.min(50,Number(e.target.value)||10)))}
                style={{maxWidth:120}}/>
            </div>

            <div className="rip-field">
              <label>Personalizzazione <span className="rip-opt">(opzionale)</span></label>
              <textarea className="rip-input rip-textarea" rows={3}
                placeholder="Es. Concentrati sulle formule del secondo capitolo…"
                value={rPrompt} onChange={e=>setRPrompt(e.target.value)}/>
            </div>

            {ripassiGenerating&&(
              <div className="rip-generating"><Spinner/><span>Generazione quiz in corso…</span></div>
            )}

            <button className="rip-save-btn" onClick={saveRipasso} disabled={!rMat||ripassiGenerating}>
              {ripassiGenerating?'Generando…':(rEditId?'Aggiorna e rigenera':'Salva')}
            </button>
          </>):(
            <div className="rip-form-empty">
              <div className="rip-form-empty-icon">+</div>
              <p>Tocca il pulsante <strong>+</strong> per creare un nuovo ripasso,<br/>oppure seleziona un ripasso dalla lista.</p>
            </div>
          )}
        </section>

      </div>

      {!rRunning&&<button className="fab-diamond rip-fab" onClick={openNewRipassoForm} title="Nuovo ripasso">
        <span className="fab-diamond-inner">+</span>
      </button>}
    </div>}

    {/* FULLPAGE MODAL */}
    {fullpage&&<div className="fullpage">
      <div className="fp-header">
        <button className="back-btn" onClick={()=>{setFullpage(null);setFpEditMode(false)}}>← Indietro</button>
        <div className="fp-title">{fullpage.title}</div>
        {fullpage.type!=='loading'&&<button className="fp-edit-btn" onClick={()=>setFpEditMode(p=>!p)}>✏️ {fpEditMode?'Chiudi':'Modifica'}</button>}
      </div>
      {fpEditMode&&fullpage.type!=='loading'&&<div style={{padding:'12px 20px',background:'var(--white)',borderBottom:'1px solid var(--gray2)'}}>
        <OutputCfgSheet
          tool={fullpage.title==='Quiz'?'quiz':fullpage.title==='Quiz Aperta'?'quiz-aperta':fullpage.title==='Flash Cards'?'flashcards':fullpage.title==='Mappa Concettuale'?'mappa':fullpage.title==='Riassunto'?'riassunto':'punti'}
          cfg={outputCfg}
          onChange={setOutputCfg}
          onGenerate={()=>{setFpEditMode(false);const key=fullpage.title==='Quiz'?'quiz':fullpage.title==='Quiz Aperta'?'quiz-aperta':fullpage.title==='Flash Cards'?'flashcards':fullpage.title==='Mappa Concettuale'?'mappa':fullpage.title==='Riassunto'?'riassunto':'punti';runTool(key,outputCfg)}}
          onClose={()=>setFpEditMode(false)}
        />
      </div>}
      {/* fp-noscroll for quiz/fc/mappa; default scrollable for text/riassunto/loading */}
      <div className={`fp-body${(fullpage.type==='quiz'||fullpage.type==='fc'||fullpage.type==='mappa'||fullpage.type==='quiz-aperta')?' fp-noscroll':''}`}>
        {fullpage.type==='loading'&&<div className="ai-loading"><Spinner/><p>L'AI sta elaborando le tue fonti…</p></div>}
        {fullpage.type==='text'&&<div style={{fontSize:'.9rem',lineHeight:1.75,whiteSpace:'pre-wrap',color:'var(--ink)'}}>{cleanText(fullpage.data||'')}</div>}

        {fullpage.type==='riassunto'&&riassuntoData&&<div className="riassunto-list">
          {riassuntoData.map((sec,i)=>(
            <div key={i} className="riassunto-sec">
              <div className={`riassunto-sec-hdr ${expandedSecs.has(i)?'open':''}`} onClick={()=>{const n=new Set(expandedSecs);n.has(i)?n.delete(i):n.add(i);setExpandedSecs(n)}}>
                {sec.title}<span>{expandedSecs.has(i)?'▲':'▼'}</span>
              </div>
              {expandedSecs.has(i)&&<div className="riassunto-sec-body">
                {sec.items.map((it,j)=>it.type==='h3'?<h3 key={j}>{cleanText(it.text)}</h3>:it.type==='li'?<ul key={j}><li>{cleanText(it.text)}</li></ul>:<p key={j}>{cleanText(it.text)}</p>)}
              </div>}
            </div>
          ))}
        </div>}

        {fullpage.type==='quiz'&&(
          !quizData||quizData.length===0
          ? <div style={{fontSize:'.88rem',lineHeight:1.75,whiteSpace:'pre-wrap',color:'var(--ink)',padding:'4px 0'}}>{fullpage.raw||'(nessun contenuto)'}</div>
          : quizIdx>=quizData.length
            ? <div className="quiz-score">
                <div className="quiz-score-circle">{quizScore}/{quizData.length}</div>
                <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.3rem'}}>Quiz completato!</h2>
                <p style={{color:'var(--muted)',marginBottom:quizWrong.length?16:0}}>
                  Hai risposto correttamente a <strong>{quizScore}</strong> su {quizData.length}.
                </p>
                {quizWrong.length>0&&<div className="quiz-wrong-list">
                  <p className="quiz-wrong-title">❌ Risposte errate ({quizWrong.length})</p>
                  {quizWrong.map(({qi,q})=>(
                    <div key={qi} className="quiz-wrong-item">
                      <div className="quiz-wrong-q">{cleanText(q.dom||q.domanda||'')}</div>
                      <div className="quiz-wrong-ans">✓ {cleanText((q.opts||q.opzioni||[])[q.cor??q.corretta??0]||'')}</div>
                    </div>
                  ))}
                </div>}
                <button className="btn-primary" style={{maxWidth:220,marginTop:16}} onClick={()=>{setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([])}}>Riprova</button>
              </div>
            : <div className="quizm-fit">
                <div className="quiz-progressbar-wrap"><div className="quiz-progressbar" style={{width:`${(quizIdx/quizData.length)*100}%`}}/></div>
                <span className="quiz-counter">{quizIdx+1} / {quizData.length}</span>
                <QuizErrorBoundary raw={fullpage.raw}>
                  <QuizQ key={quizIdx} q={quizData[quizIdx]||{dom:'',opts:[],cor:0,spieg:''}} idx={quizIdx} total={quizData.length}
                    onNext={()=>{setQuizIdx(i=>i+1);setQuizAnswered(false)}}
                    onCorrect={()=>setQuizScore(s=>s+1)}
                    onWrong={q=>setQuizWrong(p=>[...p,{qi:quizIdx,q}])}/>
                </QuizErrorBoundary>
              </div>
        )}

        {fullpage.type==='quiz-aperta'&&quizData&&quizData.length>0&&(
          quizApertaIdx>=quizData.length?(
            <div className="quiz-score">
              <div className="quiz-score-circle" style={{fontSize:'1.2rem'}}>✓</div>
              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.3rem'}}>Completato!</h2>
              <p style={{color:'var(--muted)',marginBottom:16}}>Hai risposto a tutte le {quizData.length} domande.</p>
              {!openFinalEval?(
                <button className="btn-primary" style={{maxWidth:260}} onClick={evalAllQuiz}>🤖 Valuta tutto con AI</button>
              ):openFinalEval.loading?(
                <div style={{display:'flex',gap:10,alignItems:'center',color:'var(--muted)',fontSize:'.88rem'}}><Spinner/> Valutazione in corso…</div>
              ):(
                <div className="quiz-final-eval">
                  <p className="quiz-final-eval-title">📊 Valutazione AI</p>
                  <pre className="quiz-final-eval-text">{cleanText(openFinalEval.text)}</pre>
                </div>
              )}
              <button className="btn-secondary" style={{marginTop:8,maxWidth:220}} onClick={()=>{setQuizApertaIdx(0);setOpenAnswers({});setOpenFeedback({});setOpenFinalEval(null)}}>Riprova</button>
            </div>
          ):(
            <div className="quiz-fit">
              <div className="quiz-progressbar-wrap"><div className="quiz-progressbar" style={{width:`${(quizApertaIdx/quizData.length)*100}%`}}/></div>
              <span className="quiz-counter">{quizApertaIdx+1} / {quizData.length}</span>
              <div key={quizApertaIdx} className="quiz-card quiz-card-anim" style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
                <div className="quiz-q">{cleanText(quizData[quizApertaIdx]?.dom||quizData[quizApertaIdx]?.domanda||'')}</div>
                <textarea className="quiz-open-input" placeholder="Scrivi la tua risposta…"
                  value={openAnswers[quizApertaIdx]||''}
                  onChange={e=>setOpenAnswers(p=>({...p,[quizApertaIdx]:e.target.value}))}/>

                {/* AI evaluation */}
                {openFeedback[quizApertaIdx]?.loading&&(
                  <div style={{display:'flex',gap:8,alignItems:'center',fontSize:'.84rem',color:'var(--muted)',marginBottom:10}}><Spinner/>Valutazione AI…</div>
                )}
                {openFeedback[quizApertaIdx]?.text&&(
                  <div className="quiz-ai-feedback">{cleanText(openFeedback[quizApertaIdx].text)}</div>
                )}
                {!openFeedback[quizApertaIdx]&&(openAnswers[quizApertaIdx]||'').trim()&&(
                  <button className="btn-sm primary" style={{marginBottom:10}} onClick={()=>evalQuizOpen(quizApertaIdx)}>✓ Valuta risposta</button>
                )}

                <button className="btn-primary" style={{marginTop:'auto',paddingTop:14}} onClick={()=>setQuizApertaIdx(i=>i+1)}>
                  {quizApertaIdx+1<quizData.length?'Prossima →':'Vedi risultato'}
                </button>
              </div>
            </div>
          )
        )}

        {fullpage.type==='fc'&&fcCards.length>0&&<div className="fc-wrap-fit">
          <div className="fc-progress">{fcCards.map((_,i)=><div key={i} className={`fc-dot ${i<=fcIdx?'seen':''}`}/>)}</div>
          <div className="fc-scene" onClick={()=>setFcFlipped(f=>!f)} style={{flex:1,display:'flex',flexDirection:'column'}}>
            <div className="fc-card" style={{transform:fcFlipped?'rotateY(180deg)':'none',flex:1,position:'relative'}}>
              <div className="fc-face fc-front"><div className="fc-label">FRONTE</div><div className="fc-text">{cleanText(fcCards[fcIdx]?.front||'')}</div></div>
              <div className="fc-face fc-back"><div className="fc-label">RETRO</div><div className="fc-text">{cleanText(fcCards[fcIdx]?.back||'')}</div></div>
            </div>
          </div>
          <div className="fc-hint">Tocca per girare</div>
          <div className="fc-nav">
            <button onClick={()=>{setFcIdx(i=>Math.max(0,i-1));setFcFlipped(false)}} disabled={fcIdx===0}>← Prec.</button>
            <span className="fc-counter">{fcIdx+1} / {fcCards.length}</span>
            <button onClick={()=>{setFcIdx(i=>Math.min(fcCards.length-1,i+1));setFcFlipped(false)}} disabled={fcIdx===fcCards.length-1}>Succ. →</button>
          </div>
        </div>}

        {fullpage.type==='mappa'&&mappaData&&<div className="map-fit">
          <div className="map-root">{mappaData.title||'Mappa Concettuale'}</div>
          <div className="map-connector-down"/>
          <div className="map-branches-row">
            {(mappaData.branches||[]).map((b,i)=>(
              <div key={i} className="map-branch">
                <div className="map-connector-down"/>
                <div className={`map-node ${expandedNodes.has(i)?'expanded':''}`} onClick={()=>{const n=new Set(expandedNodes);n.has(i)?n.delete(i):n.add(i);setExpandedNodes(n)}}>
                  {cleanText(b.title)}
                  {b.children?.length>0&&<span style={{fontSize:'.7rem',color:'var(--muted)',display:'block',marginTop:2}}>{b.children.length} sottoconcetti</span>}
                </div>
                {expandedNodes.has(i)&&b.children?.length>0&&<div className="map-children">
                  {b.children.map((c,j)=><div key={j} className="map-child">{cleanText(c)}</div>)}
                </div>}
              </div>
            ))}
          </div>
        </div>}
      </div>
    </div>}

    {/* DIALOG */}
    {dialog&&<div className="dialog-ov" onClick={()=>setDialog(null)}>
      <div className="dialog-box" onClick={e=>e.stopPropagation()}>
        <div className="dialog-icon">{dialog.icon}</div>
        <div className="dialog-title">{dialog.title}</div>
        <div className="dialog-msg">{dialog.msg}</div>
        <div className="dialog-actions">
          <button className="btn-primary" style={{background:dialog.danger?'#DC2626':'var(--gradient)'}} onClick={()=>{dialog.onConfirm();setDialog(null)}}>{dialog.confirmLabel||'Conferma'}</button>
          <button className="btn-secondary" style={{marginTop:0}} onClick={()=>setDialog(null)}>Annulla</button>
        </div>
      </div>
    </div>}

    {/* SHEETS */}
    {sheetMat&&<div className="sheet-ov" onClick={()=>{setSheetMat(false);setMatImgResults([]);setNewMatCoverImg(null)}}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Nuova Materia</h3>
      <div className="field">
        <label>Nome</label>
        <input type="text" value={newMatNome} autoFocus
          onChange={e=>setNewMatNome(e.target.value)}
          placeholder="Es. Matematica"
          onKeyDown={e=>e.key==='Enter'&&newMatNome.trim()&&searchUnsplash(newMatNome)}/>
      </div>
      {newMatNome.trim()&&<div className="mat-img-section">
        <div className="mat-img-search-row">
          <input className="mat-img-search" placeholder={`Cerca immagine per "${newMatNome}"…`}
            value={matImgQuery} onChange={e=>setMatImgQuery(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&searchUnsplash(matImgQuery||newMatNome)}/>
          <button className="btn-sm primary" onClick={()=>searchUnsplash(matImgQuery||newMatNome)} disabled={matImgLoading}>
            {matImgLoading?'…':'🔍'}
          </button>
          {!matImgResults.length&&<button className="btn-sm" onClick={()=>searchUnsplash(newMatNome)} disabled={matImgLoading}>Auto</button>}
        </div>
        {newMatCoverImg&&<div className="mat-img-preview" style={{backgroundImage:`url(${newMatCoverImg})`}}><span>✓ Selezionata</span></div>}
        {matImgResults.length>0&&<div className="mat-img-grid">
          {matImgResults.map(img=>(
            <div key={img.id}
              className={`mat-img-opt${newMatCoverImg===img.urls.small?' selected':''}`}
              style={{backgroundImage:`url(${img.urls.thumb})`}}
              onClick={()=>setNewMatCoverImg(newMatCoverImg===img.urls.small?null:img.urls.small)}
              title={img.alt}/>
          ))}
        </div>}
      </div>}
      <div className="field">
        <label style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>Dizionario</span>
          <button className={`toggle-switch${newMatDizionario?' on':''}`} onClick={()=>setNewMatDizionario(p=>!p)}
            style={{background:newMatDizionario?'var(--accent)':'var(--surface-3)',border:'none',borderRadius:99,width:42,height:24,cursor:'pointer',transition:'background .2s',position:'relative',flexShrink:0}}>
            <span style={{position:'absolute',top:3,left:newMatDizionario?20:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
          </button>
        </label>
        {newMatDizionario&&(
          <input type="text" value={newMatLingua} onChange={e=>setNewMatLingua(e.target.value)}
            placeholder="Lingua (es. Inglese, Francese…)"
            style={{marginTop:8,width:'100%',padding:'10px 12px',background:'var(--surface-2)',border:'1.5px solid var(--border-md)',borderRadius:10,color:'var(--ink)',fontSize:'.9rem',outline:'none'}}/>
        )}
      </div>
      <button className="btn-primary" onClick={saveMateria} disabled={!newMatNome.trim()}>Crea materia</button>
    </div></div>}

    {sheetArg&&<div className="sheet-ov" onClick={()=>setSheetArg(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Nuovo Argomento</h3>
      <div className="field"><label>Nome</label><input type="text" value={newArgNome} onChange={e=>setNewArgNome(e.target.value)} placeholder="Es. Derivate" onKeyDown={e=>e.key==='Enter'&&saveArgomento()}/></div>
      <button className="btn-primary" onClick={saveArgomento}>Crea argomento</button>
    </div></div>}

    {sheetRename&&<div className="sheet-ov" onClick={()=>setSheetRename(null)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Rinomina fonte</h3>
      <div className="field"><label>Nuovo nome</label><input type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&renameFonte(sheetRename,renameVal)}/></div>
      <button className="btn-primary" onClick={()=>renameFonte(sheetRename,renameVal)}>Salva</button>
    </div></div>}

    {/* QUIZ PICKER */}
    {showQuizPicker&&<div className="sheet-ov" onClick={()=>setShowQuizPicker(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>❓ Tipo di Quiz</h3>
      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
        <div className="quiz-type-opt" onClick={()=>{setShowQuizPicker(false);runTool('quiz',outputCfg)}}>
          <div className="quiz-type-icon">🔤</div>
          <div><div className="quiz-type-name">Risposta multipla</div><div className="quiz-type-desc">4 opzioni, una sola corretta</div></div>
        </div>
        <div className="quiz-type-opt" onClick={()=>{setShowQuizPicker(false);runTool('quiz-aperta',outputCfg)}}>
          <div className="quiz-type-icon">✍️</div>
          <div><div className="quiz-type-name">Risposta aperta</div><div className="quiz-type-desc">Scrivi la risposta con testo libero</div></div>
        </div>
      </div>
      <button className="btn-sm" style={{width:'100%',padding:'10px'}} onClick={()=>{setShowQuizPicker(false);openToolCfg('quiz')}}>✏️ Personalizza (n. domande, difficoltà)</button>
    </div></div>}

    {sheetOutputCfg&&<OutputCfgSheet
      tool={sheetOutputCfg.tool}
      cfg={sheetOutputCfg.cfg}
      onChange={cfg=>setSheetOutputCfg({...sheetOutputCfg,cfg})}
      onGenerate={()=>{
        const{tool,cfg}=sheetOutputCfg
        setOutputCfg(cfg);setSheetOutputCfg(null)
        // Resolve actual tool key: quiz with mode='aperta' → 'quiz-aperta'
        const actualTool=(tool==='quiz'&&cfg.mode==='aperta')?'quiz-aperta':tool
        runTool(actualTool,cfg)
      }}
      onClose={()=>setSheetOutputCfg(null)}
    />}

    {sheetPromptMode&&<PromptModeSheet
      mode={promptMode.mode}
      customPrompt={promptMode.customPrompt}
      onChange={v=>setPromptMode(v)}
      chatLength={chatLength}
      onLengthChange={v=>{setChatLength(v);saveSettings({chatLength:v,promptMode,outputCfg})}}
      onClose={()=>setSheetPromptMode(false)}
    />}

    {/* NOTIFICA */}
    {notifica&&<div className="notifica" onClick={()=>{if(notifica.rData)startRipassoQuiz(notifica.rData);setNotifica(null)}}>
      <span>{notifica.msg} — Tocca per il quiz</span><span>→</span>
    </div>}

    {/* FONTE PREVIEW */}
    {previewFonte&&<FontePreviewModal fonte={previewFonte} onClose={()=>setPreviewFonte(null)}/>}

    {/* ONBOARDING */}
    {onb&&<div className="onb-ov"><div className="onb-card">
      <div className="onb-icon">{ONB[onbStep].icon}</div>
      <div className="onb-title">{ONB[onbStep].title}</div>
      <div className="onb-desc">{ONB[onbStep].desc}</div>
      <div className="onb-dots">{ONB.map((_,i)=><div key={i} className={`onb-dot ${i===onbStep?'active':''}`}/>)}</div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <button className="btn-primary" onClick={()=>{if(onbStep<ONB.length-1)setOnbStep(s=>s+1);else{setOnb(false);localStorage.setItem('fb_onb_'+utente?.id,'1')}}}>
          {onbStep<ONB.length-1?'Avanti →':'Inizia a studiare ⚡'}
        </button>
        <button style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:'.85rem',padding:'6px'}} onClick={()=>{setOnb(false);localStorage.setItem('fb_onb_'+utente?.id,'1')}}>Salta</button>
      </div>
    </div></div>}

    {/* RENAME ARGOMENTO SHEET */}
    {sheetRenameArg&&<div className="sheet-ov" onClick={()=>setSheetRenameArg(null)}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <h3>✏️ Rinomina argomento</h3>
        <div className="field"><label>Nome</label><input type="text" value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&renameArgomento(sheetRenameArg,renameVal)} autoFocus/></div>
        <button className="btn-primary" onClick={()=>renameArgomento(sheetRenameArg,renameVal)}>Salva</button>
        <button className="btn-secondary" onClick={()=>setSheetRenameArg(null)}>Annulla</button>
      </div>
    </div>}

    {/* UPLOAD AI MODAL (home) */}
    {showUploadModal&&<UploadAIModal
      materie={materie}
      utente={utente}
      aiBlocked={aiBlocked}
      onClose={()=>setShowUploadModal(false)}
      onComplete={async()=>{
        setShowUploadModal(false)
        await loadMaterie(utente.email)
        const{data:args}=await supabase.from('argomenti').select('*').order('created_at')
        setArgomenti(args||[])
        toast('✓ Struttura salvata!')
      }}
    />}

    {/* FONTI UPLOAD MODAL (argomento) */}
    {showFontiUpload&&<UploadAIModal
      directUpload={true}
      curMateriaId={curMateriaId}
      curArgId={curArgId}
      utente={utente}
      materie={materie}
      aiBlocked={aiBlocked}
      onClose={()=>setShowFontiUpload(false)}
      onComplete={async()=>{
        setShowFontiUpload(false)
        await loadFonti(curArgId,curMateriaId)
      }}
    />}

  </div>)
}

/* ═══ FONTE PREVIEW MODAL ═══ */
function FontePreviewModal({fonte,onClose}){
  const ext=getExt(fonte.nome)
  const isImg=isImgExt(ext)||(fonte.tipo==='file'&&fonte.url?.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i))
  const isPdf=ext==='pdf'
  const ytId=fonte.tipo==='youtube'?fonte.url?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1]:null
  return(
    <div className="fonte-modal-ov" onClick={onClose}>
      <div className="fonte-modal" onClick={e=>e.stopPropagation()}>
        <div className="fonte-modal-hdr">
          <span className="fonte-modal-name">{fonte.nome}</span>
          <button className="fonte-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="fonte-modal-body">
          {fonte.tipo==='text'&&(
            <textarea className="fonte-modal-text" readOnly value={fonte.testo||''}/>
          )}
          {isImg&&(
            <img src={fonte.url} alt={fonte.nome} className="fonte-modal-img"/>
          )}
          {isPdf&&!isImg&&(
            <iframe src={fonte.url} className="fonte-modal-iframe" title={fonte.nome}/>
          )}
          {fonte.tipo==='audio'&&(
            <div className="fonte-modal-audio">
              <div className="fonte-modal-audio-icon">🎵</div>
              <p style={{fontSize:'.9rem',color:'var(--muted)',marginBottom:16}}>{fonte.nome}</p>
              <audio controls src={fonte.url} style={{width:'100%'}}/>
            </div>
          )}
          {ytId&&(
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              className="fonte-modal-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen title={fonte.nome}
            />
          )}
          {fonte.tipo==='url'&&(
            <div className="fonte-modal-url-body">
              <div style={{fontSize:'2rem',marginBottom:12}}>🔗</div>
              <p style={{fontSize:'.88rem',color:'var(--muted)',wordBreak:'break-all',marginBottom:20}}>{fonte.url}</p>
              <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{display:'inline-block',textDecoration:'none',padding:'12px 24px'}}>
                Apri nel browser
              </a>
            </div>
          )}
          {fonte.tipo==='file'&&!isImg&&!isPdf&&fonte.url&&(
            <div className="fonte-modal-url-body">
              <div style={{fontSize:'2rem',marginBottom:12}}>{EXT_ICON[ext]||'📎'}</div>
              <p style={{fontSize:'.88rem',color:'var(--muted)',marginBottom:20}}>{fonte.nome}</p>
              <a href={fonte.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{display:'inline-block',textDecoration:'none',padding:'12px 24px'}}>
                ⬇️ Scarica / Apri
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══ QUIZ ERROR BOUNDARY ═══ */
class QuizErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={crashed:false,err:null} }
  static getDerivedStateFromError(err){ return {crashed:true,err} }
  componentDidCatch(err,info){ console.error('[QuizErrorBoundary]',err,info) }
  render(){
    if(this.state.crashed){
      return(
        <div style={{fontSize:'.85rem',lineHeight:1.75,whiteSpace:'pre-wrap',color:'var(--ink)',padding:'4px 0',overflowY:'auto'}}>
          <p style={{color:'#F87171',fontWeight:600,marginBottom:8}}>⚠️ Errore rendering quiz: {this.state.err?.message}</p>
          {this.props.raw||''}
        </div>
      )
    }
    return this.props.children
  }
}

/* ═══ QUIZ QUESTION (multipla) ═══ */
function QuizQ({q,idx,total,onNext,onCorrect,onWrong}){
  const [chosen,setChosen]=useState(null)
  if(!q||typeof q!=='object') return null
  const corIdx=typeof q.cor==='number'?Math.min(q.cor,3):typeof q.corretta==='number'?Math.min(q.corretta,3):0
  const answered=chosen!==null
  function answer(i){
    if(answered)return
    setChosen(i)
    if(i===corIdx)onCorrect?.()
    else onWrong?.(q)
  }
  const rawOpts=Array.isArray(q.opts)?q.opts:Array.isArray(q.opzioni)?q.opzioni:[]
  const opts=rawOpts.slice(0,4)
  if(opts.filter(Boolean).length<2) return(
    <div style={{padding:20,color:'var(--muted)',fontSize:'.9rem',whiteSpace:'pre-wrap'}}>{String(q.dom||'')}</div>
  )
  return(
    <div className="quizm-card quiz-card-anim">
      <div className="quizm-question">{cleanText(String(q.dom||q.domanda||''))}</div>
      <div className="quizm-opts">
        {opts.map((o,i)=>{
          let state=''
          if(answered){
            if(i===corIdx) state='correct'
            else if(i===chosen) state='wrong'
            else state='dim'
          }
          return(
            <button key={i} className={`quizm-opt ${state}`} onClick={()=>answer(i)} disabled={answered}>
              <span className="quizm-letter">{['A','B','C','D'][i]}</span>
              <span className="quizm-opt-text">{cleanText(String(o||''))}</span>
              {answered&&i===corIdx&&<span className="quizm-tick">✓</span>}
              {answered&&i===chosen&&i!==corIdx&&<span className="quizm-tick">✗</span>}
            </button>
          )
        })}
      </div>
      {answered&&(q.spieg||q.spiegazione)&&(
        <div className="quizm-exp">💡 {cleanText(String(q.spieg||q.spiegazione||''))}</div>
      )}
      {answered&&(
        <button className="btn-primary" style={{marginTop:12,flexShrink:0}} onClick={onNext}>
          {idx+1<total?'Prossima domanda →':'Vedi risultato'}
        </button>
      )}
    </div>
  )
}


