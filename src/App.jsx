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
  return <div className="logo-icon" style={{width:size,height:size,background:'linear-gradient(135deg,#0F0F2D,#1E1B4B)'}}><svg viewBox="0 0 58 58" width={size*.75} height={size*.75} xmlns="http://www.w3.org/2000/svg"><path d="M34 5 L16 31 L27 31 L24 53 L44 25 L32 25 Z" fill="#67E8F9" stroke="#A78BFA" strokeWidth="1.2"/></svg></div>
}
function Brand({size='1.1rem'}){return <div className="brand-name" style={{fontSize:size}}>Flash<em>Bacon</em></div>}
function Spinner(){return <div className="ai-spinner"/>}

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
function PromptModeSheet({mode, customPrompt, onChange, onClose}){
  const [localCustom,setLocalCustom]=useState(customPrompt||'')
  const opts=[
    {key:'default',icon:'🤖',title:'Predefinita',desc:"L'AI risponde in modo bilanciato e informativo"},
    {key:'learning',icon:'🎓',title:'Guida all\'apprendimento',desc:"L'AI cerca di farti capire i concetti, non solo darli"},
    {key:'custom',icon:'✍️',title:'Prompt personalizzato',desc:'Definisci tu come l\'AI deve risponderti'},
  ]
  return(
    <div className="sheet-ov" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <h3>💬 Stile risposta AI</h3>
        <div className="prompt-mode-opts">
          {opts.map(o=>(
            <div key={o.key} className={`prompt-mode-opt ${mode===o.key?'active':''}`} onClick={()=>onChange({mode:o.key,customPrompt:localCustom})}>
              <span className="prompt-mode-opt-icon">{o.icon}</span>
              <div><div className="prompt-mode-opt-title">{o.title}</div><div className="prompt-mode-opt-desc">{o.desc}</div></div>
            </div>
          ))}
        </div>
        {mode==='custom'&&(
          <textarea className="prompt-custom-input" placeholder="Es: Rispondimi come se fossi un professore universitario, usa esempi pratici…" value={localCustom} onChange={e=>{setLocalCustom(e.target.value);onChange({mode:'custom',customPrompt:e.target.value})}}/>
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
  const [openRevealed,setOpenRevealed]=useState({})

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
  const [rStep,setRStep]=useState(1)
  const [rMat,setRMat]=useState(null)
  const [rArgs,setRArgs]=useState([])  // empty = tutti
  const [rFreq,setRFreq]=useState('settimanale')
  const [rOrario,setROrario]=useState('08:00')
  const [rQNum,setRQNum]=useState(5)
  const [rQMode,setRQMode]=useState('multipla')

  // Admin
  const [newProv,setNewProv]=useState('anthropic')
  const [newModel,setNewModel]=useState('claude-sonnet-4-5')
  const [newKey,setNewKey]=useState('')
  const [adminLoading,setAdminLoading]=useState(false)

  // Inline title editing
  const [editingArgTitle,setEditingArgTitle]=useState(false)
  const [argTitleVal,setArgTitleVal]=useState('')
  const [editingMateriaTitle,setEditingMateriaTitle]=useState(false)
  const [materiaTitleVal,setMaterialaTitleVal]=useState('')

  // Quiz-aperta one-at-a-time
  const [quizApertaIdx,setQuizApertaIdx]=useState(0)

  const lpRef=useRef(null)
  const pendingToolRef=useRef(null) // for background generation

  /* ── ANDROID BACK ── */
  useEffect(()=>{
    const backMap={argomento:'argomenti',argomenti:'home',profilo:'home',admin:'profilo',ripasso:'home',impostazioni:'profilo'}
    const handler=e=>{
      if(fullpage){e.preventDefault();setFullpage(null);return}
      if(dialog){e.preventDefault();setDialog(null);return}
      const sheets=[sheetMat,sheetArg,sheetRename,sheetOutputCfg,sheetPromptMode]
      if(sheets.some(Boolean)){e.preventDefault();closeAllSheets();return}
      const next=backMap[screen]
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
    }
  },[screen,curMateriaId,curArgId])

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
      ripassi.forEach(r=>{
        if(r.orario===hhmm){
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
      await loadRipassi(u.email)
      const isNew=!localStorage.getItem('fb_onb_'+u.id)
      if(isNew){setOnb(true);setOnbStep(0)}
      const ss=sessionStorage.getItem('fb_screen'),sm=sessionStorage.getItem('fb_mat'),sa=sessionStorage.getItem('fb_arg')
      if(ss==='argomento'&&sm&&sa){setCurMateriaId(sm);setCurArgId(sa);await loadFonti(sa,sm);await loadStorico(sa);setScreen('argomento')}
      else if(ss==='argomenti'&&sm){setCurMateriaId(sm);setScreen('argomenti')}
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
  async function loadStorico(aid){const{data}=await supabase.from('storico').select('*').eq('argomento_id',aid).order('created_at',{ascending:false});setStorico(data||[])}
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
  async function loadProviders(){const{data}=await supabase.from('ai_providers').select('*').order('created_at');setProviders(data||[])}
  async function loadRipassi(email){const{data}=await supabase.from('studio_pianificato').select('*').eq('utente_email',email).order('created_at',{ascending:true});setRipassi(data||[])}

  /* ── NAVIGATION ── */
  function navTo(sc){
    setSelFonti(new Set());setSelStorico(new Set());setSelMaterie(new Set());setSelArg(new Set())
    if(sc==='home'){setScreen('home');return}
    if(sc==='argomenti'){loadArgomenti(curMateriaId);setScreen('argomenti');return}
    setScreen(sc)
  }

  /* ── AUTH ── */
  async function doLogin(){setLoginErr('');setLoading(true);const{error}=await supabase.auth.signInWithPassword({email:loginEmail,password:loginPass});setLoading(false);if(error)setLoginErr(error.message)}
  async function doRegister(){if(!regNome){setLoginErr('Inserisci nome');return}setLoginErr('');setLoading(true);const{data,error}=await supabase.auth.signUp({email:regEmail,password:regPass});if(error){setLoading(false);setLoginErr(error.message);return}if(data.user)await supabase.from('profili').insert({id:data.user.id,nome:regNome,email:regEmail,is_admin:false});setLoading(false)}
  async function doLogout(){await supabase.auth.signOut();sessionStorage.clear();setMaterie([]);setArgomenti([]);setFonti([]);setStorico([])}
  function confirmDeleteAccount(){setDialog({icon:'⚠️',title:'Elimina account',msg:'Tutti i dati verranno eliminati definitivamente.',confirmLabel:'Sì, elimina',danger:true,onConfirm:async()=>{await supabase.from('profili').delete().eq('id',utente.id);await doLogout()}})}

  /* ── MATERIE ── */
  async function saveMateria(){if(!newMatNome.trim())return;const{data,error}=await supabase.from('materie').insert({utente_email:utente.email,nome:newMatNome.trim(),emoji:newMatEmoji}).select().single();if(!error){setMaterie(p=>[...p,data]);toast('Materia creata ✓')};setSheetMat(false);setNewMatNome('')}
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
    const textSources=af.filter(f=>f.tipo==='text').map(f=>f.testo||'')
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

  /* ── AI CALL ── */
  async function callAI(prompt,settings={}){
    const{images,textSources,urlSources,fileNames}=prepareFonti()
    const systemContext=buildSystemContext()
    const res=await fetch('/api/ai',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt,images,textSources,urlSources,settings,systemContext,fileNames})
    })
    if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||`Errore ${res.status}`)}
    const d=await res.json();return d.result
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
    if(mode==='multipla')return`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nCrea ${num} domande a risposta multipla ${dd} in italiano.\n\nFORMATO (separare con ---):\nDOMANDA: [testo]\nA) [opzione]\nB) [opzione]\nC) [opzione]\nD) [opzione]\nCORRECTA: [A/B/C/D]\nSPIEGAZIONE: [spiegazione]\n---\n\nGenera esattamente ${num} domande.`
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

    if(!isBackground){
      setFullpage({title:{riassunto:'Riassunto',mappa:'Mappa Concettuale',punti:'Punti Chiave',flashcards:'Flash Cards',quiz:'Quiz',['quiz-aperta']:'Quiz Aperta'}[key]||key,type:'loading',data:null})
    }

    const lenSettings={length:cfg.length||2}

    try{
      let result
      if(key==='quiz'){result=await callAI(buildQuizPrompt(cfg,'multipla'),lenSettings)}
      else if(key==='quiz-aperta'){result=await callAI(buildQuizPrompt(cfg,'aperta'),lenSettings)}
      else{result=await callAI(buildPrompt(key,cfg),lenSettings)}

      await saveStorico(key,result)

      if(isBackground){
        showAIDone(`✅ ${key} pronto!`)
        return
      }

      if(key==='flashcards'){const c=parseFC(result);setFcCards(c);setFcIdx(0);setFcFlipped(false);setFullpage({title:'Flash Cards',type:'fc',data:c})}
      else if(key==='mappa'){const d=parseMappa(result);setMappaData(d);setExpandedNodes(new Set());setFullpage({title:'Mappa Concettuale',type:'mappa',data:d})}
      else if(key==='riassunto'){const d=parseRiassunto(result);setRiassuntoData(d);setExpandedSecs(new Set(d.map((_,i)=>i)));setFullpage({title:'Riassunto',type:'riassunto',data:d})}
      else if(key==='quiz'){const p=parseQuiz(result);setQuizData(p);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([]);setFullpage({title:'Quiz',type:'quiz',data:p})}
      else if(key==='quiz-aperta'){
        const qs=parseOpenQuiz(result)
        setQuizData(qs);setQuizApertaIdx(0);setOpenAnswers({});setOpenRevealed({});setFullpage({title:'Quiz Aperta',type:'quiz-aperta',data:qs})
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
    const newMsgs=[...chatMsgs,{role:'user',content:msg}]
    setChatMsgs(newMsgs);setChatLoading(true)
    try{
      const a=argomenti.find(x=>x.id===curArgId),m=materie.find(x=>x.id===curMateriaId)
      const history=chatMsgs.slice(-8).map(x=>`${x.role==='user'?'Tu':'AI'}: ${x.content}`).join('\n')
      const lenDesc=['breve','normale','dettagliata'][(chatLength||2)-1]
      const prompt=`Argomento: "${a?.nome}" — Materia: "${m?.nome}"\n\nStorico:\n${history}\n\nTu: ${msg}\n\nRispondi in italiano con risposta ${lenDesc}.`
      const result=await callAI(prompt,{length:chatLength})
      const updated=[...newMsgs,{role:'ai',content:result}]
      setChatMsgs(updated)
      await saveStorico('chat',`Tu: ${msg}\nAI: ${result}`)
    }catch(e){setChatMsgs(p=>[...p,{role:'ai',content:'❌ '+e.message}])}
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
    if(s.tipo==='quiz'){const p=parseQuiz(s.contenuto);if(p.length){setQuizData(p);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([]);setFullpage({title:'Quiz',type:'quiz',data:p});return}}
    if(s.tipo==='quiz-aperta'){const qs=parseOpenQuiz(s.contenuto);if(qs.length){setQuizData(qs);setQuizApertaIdx(0);setOpenAnswers({});setOpenRevealed({});setFullpage({title:'Quiz Aperta',type:'quiz-aperta',data:qs});return}}
    setFullpage({title:s.tipo,type:'text',data:s.contenuto})
  }

  /* ── RIPASSO ── */
  async function saveRipasso(){
    // Ask notification permission at creation time
    if('Notification' in window&&Notification.permission==='default'){
      await Notification.requestPermission()
    }
    // single selection → use that argomento; multiple or none → null (all)
    const argomentoId=rArgs.length===1?rArgs[0]:null
    const{data}=await supabase.from('studio_pianificato').insert({utente_email:utente.email,materia_id:rMat,argomento_id:argomentoId,frequenza:rFreq,orario:rOrario,difficolta:2,quiz_num:rQNum,quiz_modalita:rQMode}).select().single()
    if(data){
      setRipassi(p=>[...p,data]) // ascending order: new entries at end
      // Generate quiz immediately and save to Lab
      generateRipassoAndSave(data)
    }
    toast('Ripasso pianificato ✓')
    navTo('home')
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
      const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,images,textSources,urlSources,settings:{length:2},systemContext,fileNames})})
      if(!res.ok)return
      const d=await res.json()
      // Save to storico for the argomento (Lab)
      await supabase.from('storico').insert({utente_email:utente.email,materia_id:r.materia_id,argomento_id:argId,tipo:mode==='multipla'?'quiz':'quiz-aperta',contenuto:d.result})
      showAIDone('✅ Quiz ripasso generato e salvato nel Lab!')
    }catch(e){console.warn('generateRipassoAndSave:',e.message)}
  }
  async function deleteRipasso(id){await supabase.from('studio_pianificato').delete().eq('id',id);setRipassi(p=>p.filter(r=>r.id!==id));toast('Eliminato')}

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
      callAI(buildQuizPromptDirect(r,cfg,mode),{length:2}).then(async result=>{
        await saveStorico(mode==='multipla'?'quiz':'quiz-aperta',result)
        if(mode==='multipla'){
          const p=parseQuiz(result)
          setQuizData(p);setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([])
          setFullpage({title:'Quiz Ripasso',type:'quiz',data:p})
        }else{
          const qs=parseOpenQuiz(result)
          setQuizData(qs);setQuizApertaIdx(0);setOpenAnswers({});setOpenRevealed({})
          setFullpage({title:'Quiz Aperta Ripasso',type:'quiz-aperta',data:qs})
        }
      }).catch(e=>{setFullpage({title:'Errore',type:'text',data:'❌ '+e.message})})
    },800)
  }

  function buildQuizPromptDirect(r,cfg,mode){
    const mat=materie.find(m=>m.id===r.materia_id)
    const arg=argomenti.find(a=>a.id===r.argomento_id)
    const dd=['elementari','di media difficoltà','avanzate'][(cfg.diff||2)-1]
    const num=cfg.num||5
    if(mode==='multipla')return`Materia: "${mat?.nome}" — Argomento: "${arg?.nome||'generale'}"\n\nCrea ${num} domande a risposta multipla ${dd} in italiano basate sulle fonti.\n\nFORMATO:\nDOMANDA: [testo]\nA) [opzione]\nB) [opzione]\nC) [opzione]\nD) [opzione]\nCORRECTA: [A/B/C/D]\nSPIEGAZIONE: [spiegazione]\n---`
    return`Materia: "${mat?.nome}" — Argomento: "${arg?.nome||'generale'}"\n\nCrea ${num} domande a risposta aperta ${dd} in italiano.\n\nFORMATO:\nDOMANDA: [testo]\nRISPOSTA: [risposta]\n---`
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
  const argStorico=storico.filter(s=>s.argomento_id===curArgId)

  /* ══════════════════════════════════════════
     JSX
  ══════════════════════════════════════════ */
  return(<div className="app-shell">

    {/* LOADING */}
    {screen==='loading'&&<div className="screen" style={{background:'var(--dark-bg)',alignItems:'center',justifyContent:'center',gap:32}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
        <LogoSVG size={96}/><Brand size="2rem"/>
        <div className="loading-bar-track"><div className="loading-bar-fill"/></div>
      </div>
    </div>}

    {/* LOGIN */}
    {screen==='login'&&<div className="screen" style={{background:'var(--gradient)',alignItems:'center',justifyContent:'center',padding:24}}>
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
    {screen==='home'&&<div className="screen anim">

      {/* ── Header ── */}
      <div className="home-header">
        <div style={{width:38,flexShrink:0}}/>
        <span className="home-header-title">Flash<em>Bacon</em></span>
        <button className="account-btn" onClick={()=>setScreen('profilo')}>
          {utente?.nome?.[0]?.toUpperCase()||'?'}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="home-body">

        {/* Materie section header */}
        <div className="home-section-hdr">
          <span className="section-title">Le tue materie</span>
          {selMaterie.size>0
            ?<button className="btn-sm danger" onClick={()=>setDialog({icon:'🗑️',title:'Elimina materie?',msg:`Eliminare ${selMaterie.size} materie con tutti i contenuti?`,confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteMaterie(selMaterie)})}>🗑 Elimina {selMaterie.size}</button>
            :<button className="home-add-mat-btn" onClick={()=>{setNewMatNome('');setNewMatEmoji('📚');setSheetMat(true)}}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Nuova
            </button>
          }
        </div>

        {/* Materie grid */}
        {materie.length===0
          ?<div className="empty"><span>📚</span><p>Nessuna materia. Usa il pulsante + qui sotto per iniziare!</p></div>
          :<div className="materia-grid">
            {materie.map(m=>{
              const isSel=selMaterie.has(m.id)
              return(
                <div key={m.id} className={`materia-card${isSel?' selected':''}`}
                  onClick={()=>{
                    if(selMaterie.size>0){const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n);return}
                    setCurMateriaId(m.id);loadArgomenti(m.id);setScreen('argomenti')
                  }}
                  onContextMenu={e=>{e.preventDefault();const n=new Set(selMaterie);n.has(m.id)?n.delete(m.id):n.add(m.id);setSelMaterie(n)}}
                >
                  {selMaterie.size>0&&<div className={`sel-check${isSel?' checked':''}`}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                  <SubjectIcon emoji={m.emoji}/>
                  <div className="materia-name">{m.nome}</div>
                  <div className="materia-count">{argomenti.filter(a=>a.materia_id===m.id).length} argomenti</div>
                </div>
              )
            })}
          </div>
        }

        {/* Pulsante + AI upload + Ripasso */}
        <div className="home-actions">
          <div className="big-plus-wrap">
            <button className="big-plus-btn" onClick={()=>setShowUploadModal(true)}>
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <span className="big-plus-label">Carica e analizza con AI</span>
          </div>
          <button className="ripasso-home-btn" onClick={()=>{setRStep(1);setRMat(null);setRArgs([]);setScreen('ripasso')}}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Ripasso
          </button>
        </div>

      </div>
    </div>}

    {/* ARGOMENTI */}
    {screen==='argomenti'&&<div className="screen anim">
      <div className="top-bar">
        <button className="back-btn" onClick={()=>navTo('home')}>← Home</button>
        <button className="icon-btn" onClick={()=>{setNewArgNome('');setSheetArg(true)}}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div className="screen-title-bar">
        {editingMateriaTitle
          ?<input
              className="materia-title-input"
              value={materiaTitleVal}
              onChange={e=>setMaterialaTitleVal(e.target.value)}
              onBlur={()=>{renameMateria(curMateriaId,materiaTitleVal);setEditingMateriaTitle(false)}}
              onKeyDown={e=>{if(e.key==='Enter'){renameMateria(curMateriaId,materiaTitleVal);setEditingMateriaTitle(false)}else if(e.key==='Escape')setEditingMateriaTitle(false)}}
              autoFocus
            />
          :<h1 className="materia-title-editable" onClick={()=>{setMaterialaTitleVal(curMateria?.nome||'');setEditingMateriaTitle(true)}}>
            {curMateria?.emoji} {curMateria?.nome}
          </h1>
        }
      </div>
      <div className="home-body">
        {selArg.size>0&&<div className="sel-bar"><span>{selArg.size} selezionati</span><button className="btn-sm danger" onClick={()=>setDialog({icon:'🗑️',title:'Elimina argomenti?',msg:'Elimina gli argomenti selezionati?',confirmLabel:'Elimina',danger:true,onConfirm:()=>deleteArgomenti(selArg)})}>Elimina</button></div>}
        <div className="argomenti-list">
          {argomenti.filter(a=>a.materia_id===curMateriaId).length===0&&<div className="empty"><span>📝</span><p>Nessun argomento. Creane uno!</p></div>}
          {argomenti.filter(a=>a.materia_id===curMateriaId).map(a=>(
            <div key={a.id} className="argomento-row"
              onClick={()=>{if(selArg.size>0){const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n);return}openArgomento(a)}}
              onContextMenu={e=>{e.preventDefault();const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)}}
              onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selArg);n.has(a.id)?n.delete(a.id):n.add(a.id);setSelArg(n)},600)}}
              onTouchEnd={()=>clearTimeout(lpRef.current)}
            >
              {selArg.size>0&&<div className={`sel-check ${selArg.has(a.id)?'checked':''}`} style={{position:'static'}}>{selArg.has(a.id)&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
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
    {screen==='argomento'&&<div className="screen anim">

      {/* ── Header ── */}
      <div className="arg-header">
        <button className="back-btn" onClick={()=>{loadArgomenti(curMateriaId);setScreen('argomenti')}}>← Indietro</button>
        <div className="arg-header-center">
          {editingArgTitle
            ?<input
                className="arg-title-input"
                value={argTitleVal}
                onChange={e=>setArgTitleVal(e.target.value)}
                onBlur={()=>{renameArgomento(curArgomento,argTitleVal);setEditingArgTitle(false)}}
                onKeyDown={e=>{if(e.key==='Enter'){renameArgomento(curArgomento,argTitleVal);setEditingArgTitle(false)}else if(e.key==='Escape')setEditingArgTitle(false)}}
                autoFocus
              />
            :<span className="arg-header-title" onClick={()=>{setArgTitleVal(curArgomento?.nome||'');setEditingArgTitle(true)}}>
              {curArgomento?.nome}
            </span>
          }
        </div>
        <div style={{width:80}}/>
      </div>

      {/* ── Tab content ── */}
      <div className="arg-content">

        {/* ─ FONTI ─ */}
        {argTab==='fonti'&&<div className="arg-body">
          <button className="fonti-add-btn" onClick={()=>setShowFontiUpload(true)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Aggiungi fonti
          </button>
          {selFonti.size>0&&<div className="sel-bar">
            <span>{selFonti.size} selezionate</span>
            <button className="btn-sm danger" onClick={deleteFontiSel}>Elimina</button>
          </div>}
          {argFonti.length===0&&<div className="empty"><span>📂</span><p>Nessuna fonte. Aggiungine una sopra.</p></div>}
          {argFonti.map(f=>{
            const ext=getExt(f.nome)
            const isImg=isImgExt(ext)||(f.tipo==='file'&&f.url?.match(/.(jpg|jpeg|png|gif|webp)/i))
            const icon=f.tipo==='text'?'✏️':f.tipo==='url'?'🔗':(EXT_ICON[ext]||'📎')
            const isSel=selFonti.has(f.id)
            return(
              <div key={f.id} className="fonte-row"
                style={{border:isSel?'2px solid var(--primary-lt)':'2px solid transparent',cursor:'pointer'}}
                onClick={()=>{
                  if(selFonti.size>0){const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n);return}
                  setPreviewFonte(f)
                }}
                onContextMenu={e=>{e.preventDefault();const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n)}}
                onTouchStart={()=>{lpRef.current=setTimeout(()=>{const n=new Set(selFonti);n.has(f.id)?n.delete(f.id):n.add(f.id);setSelFonti(n)},600)}}
                onTouchEnd={()=>clearTimeout(lpRef.current)}
              >
                {selFonti.size>0&&<div className={'sel-check'+(isSel?' checked':'')} style={{position:'static',flexShrink:0}}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                <div className="fonte-preview">{isImg?<img src={f.url} alt={f.nome}/>:<span>{icon}</span>}</div>
                <div className="fonte-name">
                  {f.nome}
                  <span className="fonte-type">{f.tipo==='text'?'Testo incollato':f.tipo==='url'?'Link web':ext.toUpperCase()}</span>
                </div>
                <button className="fonte-btn" onClick={e=>{e.stopPropagation();setSheetRename(f);setRenameVal(f.nome)}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button className="fonte-btn del" onClick={e=>{e.stopPropagation();deleteFonte(f)}}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            )
          })}
        </div>}

        {/* ─ CHAT ─ */}
        {argTab==='chat'&&<div className="arg-chat-container">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <span style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)'}}>Chat con le tue fonti</span>
            <button className="chat-prompt-btn" onClick={()=>setSheetPromptMode(true)}>
              {promptMode.mode==='learning'?'🎓':promptMode.mode==='custom'?'✍️':'🤖'}
              {' '}{promptMode.mode==='learning'?'Guida':promptMode.mode==='custom'?'Custom':'Default'}
            </button>
          </div>
          <div className="arg-chat-messages">
            {chatMsgs.length===0&&<div className="empty"><span>💬</span><p>Chatta con l'AI sulle fonti caricate</p></div>}
            {chatMsgs.map((m,i)=>(
              <div key={i} className={'chat-bubble '+m.role}>
                <div className="chat-sender">{m.role==='user'?'Tu':'FlashBacon AI'}</div>
                {m.role==='ai'?cleanText(m.content):m.content}
              </div>
            ))}
            {chatLoading&&<div className="chat-bubble ai"><div style={{display:'flex',gap:6,alignItems:'center'}}><Spinner/><span style={{fontSize:'.85rem'}}>Sto pensando…</span></div></div>}
            <div ref={chatEndRef}/>
          </div>
          <div className="chat-input-row" style={{flexShrink:0}}>
            <button className="chat-len-btn" onClick={()=>setChatLength(l=>l%3+1)} title="Lunghezza risposta">
              {['S','M','L'][chatLength-1]}
            </button>
            <input className="chat-input" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Fai una domanda…" onKeyDown={e=>e.key==='Enter'&&sendChat()}/>
            <button className="btn-send" onClick={sendChat} disabled={chatLoading}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
            </button>
          </div>
        </div>}

        {/* ─ LAB ─ */}
        {argTab==='lab'&&<div className="arg-body">
          {activeProvider?.provider==='deepseek'&&argFonti.some(f=>f.tipo==='file')&&<div style={{background:'rgba(248,113,113,.08)',border:'1.5px solid rgba(248,113,113,.2)',borderRadius:12,padding:'10px 14px',fontSize:'.82rem',color:'#F87171'}}>⚠️ DeepSeek non supporta file. Solo testo e link funzioneranno.</div>}

          <div className="lab-section-label">Genera con AI</div>

          {/* Quiz button — click = pick type, ⚙️ = settings */}
          <div className="tool-card tool-card-wide" onClick={()=>setShowQuizPicker(true)}>
            <div className="tool-icon">❓</div>
            <div>
              <div className="tool-name">Quiz</div>
              <div className="tool-desc">Multipla · Aperta</div>
            </div>
            <button className="tool-cfg-btn" style={{position:'static',marginLeft:'auto'}} onClick={e=>{e.stopPropagation();openToolCfg('quiz')}} title="Personalizza">⚙️</button>
          </div>

          <div className="tools-grid">
            {[
              {key:'riassunto',icon:'📝',name:'Riassunto',desc:'Sintesi strutturata'},
              {key:'flashcards',icon:'🃏',name:'Flash Cards',desc:'Carte flip 3D'},
              {key:'mappa',icon:'🗺️',name:'Mappa concett.',desc:'Visuale interattiva'},
              {key:'punti',icon:'🎯',name:'Punti chiave',desc:'Concetti chiave'},
            ].map(t=>(
              <div key={t.key} className="tool-card" onClick={()=>runTool(t.key,outputCfg,true)}>
                <button className="tool-cfg-btn" onClick={e=>{e.stopPropagation();openToolCfg(t.key)}} title="Personalizza">⚙️</button>
                <div>
                  <div className="tool-icon">{t.icon}</div>
                  <div className="tool-name">{t.name}</div>
                  <div className="tool-desc">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="lab-section-label" style={{marginTop:6}}>Generati</div>
          {selStorico.size>0&&<div className="sel-bar"><span>{selStorico.size} selezionati</span><button className="btn-sm danger" onClick={deleteStoricoSel}>Elimina</button></div>}
          {argStorico.length===0&&<div className="empty"><span>📋</span><p>Nessun output ancora. Genera qualcosa sopra!</p></div>}
          {argStorico.map(s=>{
            const isSel=selStorico.has(s.id)
            return(
              <div key={s.id} className={'storico-row'+(isSel?' sel':'')}
                onClick={()=>{const n=new Set(selStorico);n.has(s.id)?n.delete(s.id):n.add(s.id);setSelStorico(n)}}
                onContextMenu={e=>{e.preventDefault();const n=new Set(selStorico);n.has(s.id)?n.delete(s.id):n.add(s.id);setSelStorico(n)}}
              >
                {selStorico.size>0&&<div className={'sel-check'+(isSel?' checked':'')} style={{position:'static',flexShrink:0}}>{isSel&&<svg width="12" height="12" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>}</div>}
                <div className="storico-info">
                  <span className="storico-tipo">{s.tipo}</span>
                  <div className="storico-preview">{cleanText(s.contenuto).substring(0,80)}…</div>
                  <div className="storico-data">{fmtDate(s.created_at)}</div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button className="btn-sm" onClick={e=>{e.stopPropagation();openStorico(s)}}>Apri</button>
                  <button className="row-del" onClick={e=>{e.stopPropagation();deleteOneStorico(s.id)}}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>
                </div>
              </div>
            )
          })}
        </div>}

      </div>

      {/* ── Bottom Nav ── */}
      <div className="arg-bottom-nav">
        <button className={'arg-nav-btn'+(argTab==='fonti'?' active':'')} onClick={()=>setArgTab('fonti')}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={argTab==='fonti'?2.5:2} viewBox="0 0 24 24">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          Fonti
        </button>
        <button className={'arg-nav-btn'+(argTab==='chat'?' active':'')} onClick={()=>setArgTab('chat')}>
          <svg width="22" height="22" fill={argTab==='chat'?'var(--primary-lt)':'none'} stroke={argTab==='chat'?'var(--primary-lt)':'currentColor'} strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Chat
        </button>
        <button className={'arg-nav-btn'+(argTab==='lab'?' active':'')} onClick={()=>setArgTab('lab')}>
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={argTab==='lab'?2.5:2} viewBox="0 0 24 24">
            <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Lab
        </button>
      </div>

    </div>}
    {/* PROFILO */}
    {screen==='profilo'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="profilo-top">
        <div className="top-bar" style={{background:'transparent',padding:'12px 16px 0'}}>
          <button className="back-btn" onClick={()=>navTo('home')}>← Home</button>
        </div>
        <div className="avatar">{utente?.nome?.[0]?.toUpperCase()||'👤'}</div>
        <div className="profilo-name">{utente?.nome}</div>
        <div className="profilo-email">{utente?.email}</div>
      </div>
      <div className="profilo-body">
        <div className="settings-section">
          <div className="settings-row" onClick={()=>setScreen('impostazioni')}>
            <span className="settings-row-label">⚙️ Impostazioni AI</span><span className="settings-row-icon">›</span>
          </div>
          <div className="settings-row" onClick={()=>{setOnb(true);setOnbStep(0)}}>
            <span className="settings-row-label">📖 Guida FlashBacon</span><span className="settings-row-icon">›</span>
          </div>
          {utente?.is_admin&&<div className="settings-row" onClick={()=>{loadProviders();setScreen('admin')}}>
            <span className="settings-row-label">🔑 Pannello Admin</span><span className="settings-row-icon">›</span>
          </div>}
        </div>
        <button className="btn-secondary" style={{marginTop:0}} onClick={doLogout}>Esci dall'account</button>
        <button style={{background:'none',border:'none',color:'var(--muted)',fontSize:'.8rem',cursor:'pointer',textAlign:'center',padding:'8px'}} onClick={()=>setShowDanger(p=>!p)}>
          {showDanger?'▲ Nascondi':'▼ Opzioni'}
        </button>
        {showDanger&&<button style={{background:'none',border:'1.5px solid rgba(220,38,38,.3)',borderRadius:16,padding:'12px',color:'#DC2626',fontSize:'.88rem',cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}} onClick={confirmDeleteAccount}>
          🗑️ Elimina account e tutti i dati
        </button>}
      </div>
    </div>}

    {/* IMPOSTAZIONI AI */}
    {screen==='impostazioni'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="top-bar"><button className="back-btn" onClick={()=>setScreen('profilo')}>← Profilo</button></div>
      <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>
        <div className="section-title">Impostazioni Chat AI</div>
        <div style={{background:'var(--white)',borderRadius:16,padding:16,boxShadow:'0 2px 12px rgba(79,70,229,.06)'}}>
          <div style={{fontSize:'.75rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Lunghezza risposta predefinita</div>
          <div style={{display:'flex',gap:6}}>
            {['Breve','Media','Lunga'].map((l,i)=><button key={i} className={`cfg-btn ${chatLength===(i+1)?'active':''}`} onClick={()=>setChatLength(i+1)}>{l}</button>)}
          </div>
        </div>
        <div style={{background:'var(--white)',borderRadius:16,padding:16,boxShadow:'0 2px 12px rgba(79,70,229,.06)'}}>
          <div style={{fontSize:'.75rem',fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:10}}>Provider AI attivo</div>
          {providers.length===0?<p style={{fontSize:'.85rem',color:'var(--muted)'}}>Nessun provider. Vai al Pannello Admin.</p>:providers.filter(p=>p.attivo).map(p=>(
            <div key={p.id}><div style={{fontWeight:700,fontSize:'.9rem'}}>{p.nome_display}</div><div style={{fontSize:'.78rem',color:'var(--muted)',marginTop:2}}>{p.modello}</div></div>
          ))}
        </div>
        <button className="btn-primary" onClick={()=>{saveSettings({chatLength,promptMode,outputCfg});toast('Salvato ✓');setScreen('profilo')}}>Salva</button>
      </div>
    </div>}

    {/* ADMIN */}
    {screen==='admin'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="admin-top">
        <div className="top-bar" style={{background:'transparent',padding:'12px 16px 0'}}><button className="back-btn" onClick={()=>setScreen('profilo')}>← Profilo</button></div>
        <h1>Pannello Admin</h1><p>Gestisci provider AI</p>
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

    {/* RIPASSO */}
    {screen==='ripasso'&&<div className="screen anim" style={{background:'var(--gray)'}}>
      <div className="top-bar" style={{background:'var(--dark-bg)'}}><button className="back-btn" onClick={()=>navTo('home')}>← Home</button><Brand size="1rem"/></div>
      <div className="ripasso-body">
        <div className="section-title">📅 Ripasso Pianificato</div>
        {ripassi.length>0&&<>
          <p style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)'}}>PIANIFICATI</p>
          {ripassi.map(r=>{
            const mat=materie.find(m=>m.id===r.materia_id),arg=argomenti.find(a=>a.id===r.argomento_id)
            return(
              <div key={r.id} className="ripasso-item">
                <div>
                  <div style={{fontWeight:600,fontSize:'.9rem'}}>{mat?.emoji} {mat?.nome}</div>
                  <div className="ripasso-meta">{r.argomento_id?arg?.nome:'Tutti gli argomenti'} · {r.frequenza} · {r.orario} · {r.quiz_num} dom. {r.quiz_modalita}</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn-sm primary" onClick={()=>startRipassoQuiz(r)}>▶ Quiz</button>
                  <button className="btn-sm danger" onClick={()=>deleteRipasso(r.id)}>✕</button>
                </div>
              </div>
            )
          })}
        </>}
        <p style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)',marginTop:4}}>NUOVO RIPASSO</p>
        {rStep===1&&<><div className="ripasso-card"><h4>1. Scegli la materia</h4>{materie.map(m=><button key={m.id} className={`ripasso-opt ${rMat===m.id?'sel':''}`} onClick={()=>setRMat(m.id)}>{m.emoji} {m.nome}</button>)}</div><button className="btn-primary" onClick={()=>setRStep(2)} disabled={!rMat}>Avanti →</button></>}
        {rStep===2&&<><div className="ripasso-card"><h4>2. Argomenti</h4>
          <p style={{fontSize:'.78rem',color:'var(--muted)',marginBottom:8}}>Seleziona uno o più argomenti (vuoto = tutti)</p>
          <button className={`ripasso-opt ripasso-opt-check ${rArgs.length===0?'sel':''}`} onClick={()=>setRArgs([])}>
            <span className="ripasso-check">{rArgs.length===0?'☑':'☐'}</span> Tutti gli argomenti
          </button>
          {argomenti.filter(a=>a.materia_id===rMat).map(a=>(
            <button key={a.id} className={`ripasso-opt ripasso-opt-check ${rArgs.includes(a.id)?'sel':''}`}
              onClick={()=>setRArgs(prev=>prev.includes(a.id)?prev.filter(x=>x!==a.id):[...prev,a.id])}>
              <span className="ripasso-check">{rArgs.includes(a.id)?'☑':'☐'}</span> {a.nome}
            </button>
          ))}
        </div><div style={{display:'flex',gap:8}}><button className="btn-secondary" style={{marginTop:0}} onClick={()=>setRStep(1)}>←</button><button className="btn-primary" onClick={()=>setRStep(3)}>Avanti →</button></div></>}
        {rStep===3&&<><div className="ripasso-card"><h4>3. Opzioni</h4>
          <div className="field" style={{marginBottom:12}}><label>Frequenza</label><select className="select-field" value={rFreq} onChange={e=>setRFreq(e.target.value)}><option value="giornaliero">Giornaliero</option><option value="settimanale">Settimanale</option><option value="mensile">Mensile</option></select></div>
          <div className="field" style={{marginBottom:12}}><label>Orario</label><input type="time" className="select-field" value={rOrario} onChange={e=>setROrario(e.target.value)}/></div>
          <div className="field" style={{marginBottom:12}}><label>Numero domande</label><select className="select-field" value={rQNum} onChange={e=>setRQNum(Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></div>
          <div className="field" style={{marginBottom:0}}><label>Modalità</label><select className="select-field" value={rQMode} onChange={e=>setRQMode(e.target.value)}><option value="multipla">Risposta multipla</option><option value="aperta">Risposta aperta</option></select></div>
        </div>
        <div style={{display:'flex',gap:8}}><button className="btn-secondary" style={{marginTop:0}} onClick={()=>setRStep(2)}>←</button><button className="btn-primary" onClick={saveRipasso}>💾 Salva</button></div></>}
      </div>
    </div>}

    {/* FULLPAGE MODAL */}
    {fullpage&&<div className="fullpage">
      <div className="fp-header">
        <button className="back-btn" style={{background:'var(--gray)',color:'var(--ink)'}} onClick={()=>{setFullpage(null);setFpEditMode(false)}}>← Indietro</button>
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

        {fullpage.type==='quiz'&&quizData&&(quizIdx>=quizData.length?(
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
                  <div className="quiz-wrong-ans">✓ {cleanText((q.opts||q.opzioni||[])[q.cor??q.corretta]||'')}</div>
                </div>
              ))}
            </div>}
            <button className="btn-primary" style={{maxWidth:220,marginTop:16}} onClick={()=>{setQuizIdx(0);setQuizAnswered(false);setQuizScore(0);setQuizWrong([])}}>Riprova</button>
          </div>
        ):<div className="quiz-fit">
          <div className="quiz-progressbar-wrap"><div className="quiz-progressbar" style={{width:`${(quizIdx/quizData.length)*100}%`}}/></div>
          <span className="quiz-counter">{quizIdx+1} / {quizData.length}</span>
          <QuizQ key={quizIdx} q={quizData[quizIdx]} idx={quizIdx} total={quizData.length} answered={quizAnswered} setAnswered={setQuizAnswered} onNext={()=>{setQuizIdx(i=>i+1);setQuizAnswered(false)}} onCorrect={()=>setQuizScore(s=>s+1)} onWrong={q=>setQuizWrong(p=>[...p,{qi:quizIdx,q}])}/>
        </div>)}

        {fullpage.type==='quiz-aperta'&&quizData&&quizData.length>0&&(
          quizApertaIdx>=quizData.length?(
            <div className="quiz-score">
              <div className="quiz-score-circle" style={{fontSize:'1.2rem'}}>✓</div>
              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.3rem'}}>Completato!</h2>
              <p style={{color:'var(--muted)'}}>Hai risposto a tutte le {quizData.length} domande.</p>
              <button className="btn-primary" style={{maxWidth:220}} onClick={()=>{setQuizApertaIdx(0);setOpenAnswers({});setOpenRevealed({})}}>Riprova</button>
            </div>
          ):(
            <div className="quiz-fit">
              <div className="quiz-progress">{quizData.map((_,i)=><div key={i} className={`quiz-dot ${i<quizApertaIdx?'done':i===quizApertaIdx?'current':''}`}/>)}</div>
              <div className="quiz-card" style={{flex:1,overflowY:'auto'}}>
                <p style={{fontSize:'.76rem',color:'var(--muted)',fontWeight:600,marginBottom:10}}>Domanda {quizApertaIdx+1} di {quizData.length}</p>
                <div className="quiz-q">{cleanText(quizData[quizApertaIdx]?.dom||quizData[quizApertaIdx]?.domanda||'')}</div>
                <textarea className="quiz-open-input" placeholder="Scrivi la tua risposta…" value={openAnswers[quizApertaIdx]||''} onChange={e=>setOpenAnswers(p=>({...p,[quizApertaIdx]:e.target.value}))}/>
                {!openRevealed[quizApertaIdx]
                  ?<button className="btn-sm primary" onClick={()=>setOpenRevealed(p=>({...p,[quizApertaIdx]:true}))}>Mostra risposta attesa</button>
                  :<div className="quiz-reveal"><strong>Risposta attesa:</strong><br/>{cleanText(quizData[quizApertaIdx]?.risp||quizData[quizApertaIdx]?.risposta||'')}</div>
                }
                {openRevealed[quizApertaIdx]&&<button className="btn-primary" style={{marginTop:12}} onClick={()=>setQuizApertaIdx(i=>i+1)}>{quizApertaIdx+1<quizData.length?'Prossima →':'Vedi risultato'}</button>}
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
    {sheetMat&&<div className="sheet-ov" onClick={()=>setSheetMat(false)}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <h3>Nuova Materia</h3>
      <div className="emoji-grid">{EMOJIS.map(e=><div key={e} className={`emoji-opt ${newMatEmoji===e?'sel':''}`} onClick={()=>setNewMatEmoji(e)}>{e}</div>)}</div>
      <div className="field"><label>Nome</label><input type="text" value={newMatNome} onChange={e=>setNewMatNome(e.target.value)} placeholder="Es. Matematica" onKeyDown={e=>e.key==='Enter'&&saveMateria()}/></div>
      <button className="btn-primary" onClick={saveMateria}>Crea materia</button>
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
        <div className="quiz-type-opt" onClick={()=>{setShowQuizPicker(false);runTool('quiz',outputCfg,true)}}>
          <div className="quiz-type-icon">🔤</div>
          <div><div className="quiz-type-name">Risposta multipla</div><div className="quiz-type-desc">4 opzioni, una sola corretta</div></div>
        </div>
        <div className="quiz-type-opt" onClick={()=>{setShowQuizPicker(false);runTool('quiz-aperta',outputCfg,true)}}>
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

/* ═══ QUIZ QUESTION ═══ */
function QuizQ({q,idx,total,answered,setAnswered,onNext,onCorrect,onWrong}){
  const [chosen,setChosen]=useState(null)
  function answer(i){
    if(answered)return
    setChosen(i);setAnswered(true)
    if(i===(q.cor??q.corretta))onCorrect?.()
    else onWrong?.(q)
  }
  return(
    <div className="quiz-card quiz-card-anim" style={{flex:1,overflowY:'auto'}}>
      <div className="quiz-q">{cleanText(q.dom||q.domanda||'')}</div>
      <div className="quiz-opts-list">
        {(q.opts||q.opzioni||[]).map((o,i)=>(
          <button key={i} className={`quiz-opt ${answered?(i===(q.cor??q.corretta)?'correct':i===chosen?'wrong':''):''}`} onClick={()=>answer(i)} disabled={answered}>
            <span className="quiz-letter">{['A','B','C','D'][i]}</span>
            <span className="quiz-opt-text">{cleanText(o||'')}</span>
          </button>
        ))}
      </div>
      {answered&&<div className="quiz-exp">💡 {cleanText(q.spieg||q.spiegazione||'')}</div>}
      {answered&&<button className="btn-primary" style={{marginTop:14}} onClick={onNext}>{idx+1<total?'Prossima →':'Vedi risultato'}</button>}
    </div>
  )
}


