import React, { useState, useRef, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { compressImg, getExt, isImgExt, toast } from '../utils/helpers.js'

const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'weba']
const VISION_PROVIDERS = ['anthropic', 'openai', 'google', 'mistral']
const SUBJ_EMOJIS = ['📚','🔬','🧮','🌍','🎨','📖','🧬','⚗️','🏛️','🎵','🖥️','🌿','📐','🔭','🧠','💡','⚙️','🌊','🏆','📊','🔑','✏️','🗺️','🎯','🏗️','🧪']

export const MATERIE_BASE = [
  "Matematica","Fisica","Chimica","Biologia","Storia","Geografia",
  "Italiano","Latino","Greco","Inglese","Filosofia","Arte",
  "Musica","Educazione Fisica","Religione","Scienze",
  "Letteratura Italiana","Letteratura Inglese","Letteratura Latina",
  "Storia dell'Arte","Storia della Filosofia","Matematica Avanzata",
  "Fisica Moderna","Chimica Organica","Chimica Inorganica",
  "Biologia Molecolare","Anatomia","Fisiologia","Ecologia","Genetica",
  "Astronomia","Geologia","Economia","Diritto","Psicologia","Sociologia",
  "Antropologia","Pedagogia","Logica","Statistica","Informatica",
  "Analisi Matematica","Algebra Lineare","Geometria","Calcolo",
  "Fisica Teorica","Chimica Fisica","Biochimica","Microbiologia",
  "Neuroscienze","Immunologia","Farmacologia","Patologia",
  "Medicina","Giurisprudenza","Economia Politica","Macroeconomia",
  "Microeconomia","Marketing","Management","Contabilità",
  "Architettura","Urbanistica","Ingegneria","Elettronica",
  "Meccanica","Termodinamica","Idraulica","Topografia",
  "Linguistica","Semiotica","Estetica","Etica","Metafisica",
  "Epistemologia","Storia Medievale","Storia Moderna","Storia Contemporanea",
  "Storia Antica","Archeologia","Paleontologia","Numismatica",
  "Storia della Musica","Storia del Cinema","Teatro","Danza",
  "Francese","Spagnolo","Tedesco","Russo","Cinese","Giapponese","Arabo",
  "Programmazione","Algoritmi","Intelligenza Artificiale",
  "Machine Learning","Data Science","Cybersecurity","Reti",
  "Sistemi Operativi","Database","Sviluppo Web","Sviluppo Mobile",
  "Robotica","Automazione","Elettrotecnica","Telecomunicazioni",
  "Biotecnologie","Nanotecnologie","Energie Rinnovabili",
  "Ambiente e Sostenibilità","Tecnologia"
]

const STATUS_MSGS = {
  extracting: '⚙️ Estrazione testo…',
  analyzing:  '🔍 Analisi AI in corso…',
  finishing:  '✅ Elaborazione risultati…',
}

async function readSSE(response) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', fullText = '', meta = {}
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const d = JSON.parse(line.slice(6))
        if (d.error) throw new Error(d.error)
        if (d.chunk) fullText += d.chunk
        if (d.done) meta = d
      } catch(e) { if (!e.message?.includes('JSON')) throw e }
    }
  }
  return meta.result || fullText
}

function cleanFileName(name) {
  return name
    .replace(/\.[^.]+$/, '')                        // rimuovi estensione
    .replace(/WhatsApp\s*(Image|Video|Audio)/gi, '') // rimuovi prefisso WhatsApp
    .replace(/\d{4}[-_.]\d{2}[-_.]\d{2}/g, '')      // rimuovi date YYYY-MM-DD
    .replace(/\d{2}[-_.]\d{2}[-_.]\d{4}/g, '')      // rimuovi date DD-MM-YYYY
    .replace(/[-_]+/g, ' ')                          // separatori → spazio
    .replace(/\s+/g, ' ')
    .trim()
}

function isYouTubeUrl(url) {
  return /youtube\.com\/watch|youtu\.be\//.test(url)
}
function extractYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

async function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

async function compressImgToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
    img.onload = () => {
      const M = 800
      let { width: w, height: h } = img
      if (w > M || h > M) { const r = Math.min(M / w, M / h); w = Math.round(w * r); h = Math.round(h * r) }
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      c.toBlob(b => {
        if (!b) { URL.revokeObjectURL(objectUrl); reject(new Error('toBlob returned null')); return }
        const reader = new FileReader()
        reader.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('FileReader error')) }
        reader.onload = e2 => { resolve(e2.target.result); URL.revokeObjectURL(objectUrl) }
        reader.readAsDataURL(b)
      }, 'image/jpeg', 0.5)
    }
    img.src = objectUrl
  })
}

async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    text += tc.items.map(s => s.str).join(' ') + '\n'
  }
  return text.trim()
}

async function ocrImage(file) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['ita', 'eng'])
  try {
    const dataUrl = await fileToDataUrl(file)
    const { data: { text } } = await worker.recognize(dataUrl)
    return text
  } finally {
    await worker.terminate()
  }
}

function ItemChip({ item, onRemove }) {
  const ext = item.type === 'file' ? getExt(item.name) : item.type
  const icon =
    item.type === 'text'      ? '✏️'
    : item.type === 'url'     ? '🔗'
    : item.type === 'youtube' ? '▶️'
    : item.type === 'audio'   ? '🎵'
    : isImgExt(ext)           ? null
    : ext === 'pdf'           ? '📄'
    : ext === 'doc' || ext === 'docx' ? '📝'
    : ext === 'ppt' || ext === 'pptx' ? '📊'
    : '📎'

  return (
    <div className="up-chip">
      <div className="up-chip-thumb">
        {item.preview
          ? <img src={item.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:6}}/>
          : <span style={{fontSize:'1.1rem'}}>{icon}</span>}
      </div>
      <span className="up-chip-name">{item.name}</span>
      <button className="up-chip-del" onClick={onRemove}>✕</button>
    </div>
  )
}

/* ══════ MAIN COMPONENT ══════ */
export default function UploadAIModal({
  onClose, materie, utente, onComplete,
  directUpload = false, curMateriaId, curArgId,
  aiBlocked = false
}) {
  const [items, setItems]         = useState([])
  const [step, setStep]           = useState('upload')
  const [dragOver, setDragOver]   = useState(false)
  const [showText, setShowText]   = useState(false)
  const [showUrl, setShowUrl]     = useState(false)
  const [textVal, setTextVal]     = useState('')
  const [urlVal, setUrlVal]       = useState('')
  const [proposal, setProposal]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')
  const [mergePickerFor, setMergePickerFor] = useState(null)
  const [analyzeStatus, setAnalyzeStatus]   = useState('')
  const [originalProposal, setOriginalProposal] = useState(null)
  const [proposalDiverged, setProposalDiverged] = useState(false)
  const [showEmojiFor, setShowEmojiFor] = useState(null)
  const fileRef = useRef()

  /* ── Add items ── */
  async function addFiles(files) {
    const newItems = []
    for (const f of Array.from(files)) {
      const ext = getExt(f.name)
      if (AUDIO_EXTS.includes(ext)) {
        newItems.push({ type: 'audio', file: f, name: f.name, ext, preview: null })
      } else {
        let preview = null
        let description = ''
        if (isImgExt(ext)) {
          preview = URL.createObjectURL(f)
          description = cleanFileName(f.name)
        }
        newItems.push({ type: 'file', file: f, name: f.name, ext, preview, description })
      }
    }
    setItems(p => [...p, ...newItems])
  }

  function addText() {
    if (!textVal.trim()) return
    const name = 'Testo — ' + new Date().toLocaleDateString('it-IT')
    setItems(p => [...p, { type: 'text', text: textVal.trim(), name }])
    setTextVal(''); setShowText(false)
  }

  function addUrl() {
    const url = urlVal.trim()
    if (!url || !url.startsWith('http')) { setErr('URL non valido'); return }
    if (isYouTubeUrl(url)) {
      const vid = extractYouTubeId(url)
      const name = 'YouTube — ' + (vid || url.split('/').pop())
      setItems(p => [...p, { type: 'youtube', url, name, videoId: vid }])
    } else {
      const name = url.replace(/^https?:\/\//, '').split('/')[0]
      setItems(p => [...p, { type: 'url', url, name }])
    }
    setUrlVal(''); setShowUrl(false); setErr('')
  }

  /* ── Direct upload (no AI) ── */
  async function directSave() {
    if (!items.length) { setErr('Aggiungi almeno un file o testo'); return }
    setErr(''); setSaving(true)
    try {
      for (const item of items) await uploadItem(item, curMateriaId, curArgId)
      toast('✓ Fonti aggiunte!')
      onComplete()
    } catch (e) {
      setErr('Errore: ' + e.message)
    }
    setSaving(false)
  }

  /* ── Drag & drop ── */
  const onDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [])
  const onDragOver = e => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)

  /* ── AI analysis — estrazione testo client-side, poi singola chiamata AI ── */
  async function analyze() {
    if (!items.length) { setErr('Aggiungi almeno un file o testo'); return }
    setErr(''); setStep('analyzing'); setAnalyzeStatus('extracting')

    try {
      const workItems = items.map(i => ({ ...i }))
      const sources = [] // { name, content }
      let anyAudioError = false

      for (const item of workItems) {
        let content = ''

        if (item.type === 'text') {
          setAnalyzeStatus(`Elaborazione ${item.name}…`)
          content = item.text

        } else if (item.type === 'audio') {
          setAnalyzeStatus(`🎤 Trascrizione ${item.name}…`)
          try {
            const fd = new FormData()
            fd.append('file', item.file)
            const tr = await fetch('/api/transcribe', { method: 'POST', body: fd })
            const td = await tr.json()
            if (td.transcript) {
              content = td.transcript
            } else {
              content = `[trascrizione audio non disponibile]`
              anyAudioError = true
            }
          } catch {
            content = `[errore trascrizione audio]`
            anyAudioError = true
          }

        } else if (item.type === 'file') {
          const ext = getExt(item.name)
          if (ext === 'pdf') {
            setAnalyzeStatus(`📄 Lettura PDF: ${item.name}…`)
            try {
              const extracted = await extractPdfText(item.file)
              content = extracted.trim() || `[PDF senza testo selezionabile: ${cleanFileName(item.name)}]`
            } catch {
              content = `[PDF: ${cleanFileName(item.name)}]`
            }
          } else if (isImgExt(ext)) {
            setAnalyzeStatus(`🔍 OCR: ${item.name}…`)
            const userDesc = item.description?.trim()
            try {
              const ocr = await ocrImage(item.file)
              if (ocr && ocr.trim().length > 10) {
                content = (userDesc ? `Descrizione: ${userDesc}\n\n` : '') + `Testo rilevato:\n${ocr.trim()}`
              } else {
                content = userDesc || cleanFileName(item.name)
              }
            } catch {
              content = userDesc || cleanFileName(item.name)
            }
          } else {
            setAnalyzeStatus(`Elaborazione ${item.name}…`)
            content = `[${ext.toUpperCase()}: ${cleanFileName(item.name)}]`
          }

        } else if (item.type === 'url') {
          setAnalyzeStatus(`🌐 Lettura URL: ${item.name}…`)
          try {
            const r = await fetch(`/api/fetch-url?url=${encodeURIComponent(item.url)}`)
            const d = await r.json()
            content = d.text || `[URL: ${item.url}]`
          } catch {
            content = `[URL: ${item.url}]`
          }

        } else if (item.type === 'youtube') {
          setAnalyzeStatus(`▶️ Trascrizione YouTube: ${item.name}…`)
          try {
            const tr = await fetch(`/api/transcript?v=${item.videoId}`)
            const td = await tr.json()
            content = td.transcript || `[YouTube: trascrizione non disponibile]`
          } catch {
            content = `[YouTube: ${item.name}]`
          }
        }

        const extracted = content.slice(0, 3000)
        item.estratto = extracted
        sources.push({ name: item.name, content: extracted })
      }

      if (anyAudioError) toast('⚠️ Alcune trascrizioni audio non erano disponibili. Procedo comunque.')

      const existingList = materie.length
        ? materie.map(m => `- "${m.nome}" (id: ${m.id})`).join('\n')
        : '(nessuna materia esistente)'

      const sourcesList = sources.map((s, i) =>
        `---\nFonte ${i + 1}: ${s.name}\nContenuto completo:\n${s.content}\n---`
      ).join('\n')

      const systemContext = `Sei un organizzatore accademico esperto per FlashBacon, un'app di studio.
Il tuo compito è classificare i materiali didattici forniti, proporre una struttura materie/argomenti E generare un mini-riassunto tecnico per ogni fonte.

MATERIE STANDARD (usa queste quando il contenuto corrisponde):
${MATERIE_BASE.join(', ')}

REGOLE:
- Analizza il CONTENUTO EFFETTIVO di ogni fonte, non solo il nome file
- Abbina alla materia standard più appropriata basandoti sul contenuto
- Massimo 1 materia per upload, salvo materiali chiaramente distinti
- MAX 3 ARGOMENTI PER MATERIA — raggruppa se necessario
- Nomi argomenti = capitoli o concetti reali trovati nel contenuto
- Non usare nomi generici come "Documento 1", "Appunti", "Materiale"
- Preferisci aggiungere a materia esistente se il contenuto corrisponde
- Lingua: usa la stessa lingua del materiale sorgente
- LIMITE ASSOLUTO: MASSIMO 3 ARGOMENTI PER MATERIA
- emoji: scegli l'emoji più appropriata al contenuto (non sempre 📚)
- riassunti_file: per ogni fonte (index 0-based) scrivi 1-2 frasi tecniche che descrivono il contenuto reale

OUTPUT: Rispondi SOLO con JSON valido. Nessun markdown, nessuna spiegazione.
{
  "nuove_materie": [
    { "nome": "...", "emoji": "📚", "argomenti": ["...", "..."], "item_indices": [0, 2] }
  ],
  "aggiunte_esistenti": [
    { "materia_id": "...", "materia_nome": "...", "argomenti": ["..."], "item_indices": [1] }
  ],
  "riassunti_file": [
    { "index": 0, "riassunto": "Breve descrizione tecnica del contenuto del file." }
  ]
}`

      const prompt = `Analizza INTERAMENTE le seguenti fonti didattiche e proponi una struttura materie/argomenti.

Materie già esistenti nell'app (aggiungi a queste se il contenuto corrisponde):
${existingList}

Fonti:
${sourcesList}

Rispondi SOLO con il JSON richiesto.`

      setAnalyzeStatus('analyzing')
      console.log('[analyze]', { numItems: workItems.length, sources: sources.map(s => ({ name: s.name, len: s.content.length })) })

      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt, images: [],
          textSources: [], urlSources: [],
          settings: { length: 2 }, systemContext,
          fileNames: items.map((it, i) => `[${i}] ${it.name} (${it.type})`).join('\n'),
          userEmail: utente?.email || ''
        })
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Errore AI') }
      const result = await readSSE(res)

      setAnalyzeStatus('finishing')
      const match = result.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Risposta AI non JSON')
      const parsed = JSON.parse(match[0])

      // Attach AI-generated mini-riassunti to workItems
      for (const r of (parsed.riassunti_file || [])) {
        if (typeof r.index === 'number' && workItems[r.index]) {
          workItems[r.index].mini_riassunto = r.riassunto || ''
        }
      }

      const newProposal = {
        nuove: (parsed.nuove_materie || []).map((m, i) => ({ ...m, _id: 'new-' + i })),
        esistenti: parsed.aggiunte_esistenti || [],
      }

      setItems(workItems)
      setProposal(newProposal)
      setOriginalProposal(JSON.parse(JSON.stringify(newProposal)))
      setProposalDiverged(false)
      setShowEmojiFor(null)
      setStep('confirm')

    } catch (e) {
      setErr('Errore: ' + e.message)
      setStep('upload')
    }
    setAnalyzeStatus('')
  }

  /* ── Save ── */
  async function confirmSave() {
    if (!proposal || saving) return
    setSaving(true)
    try {
      for (const mat of (proposal.nuove || [])) {
        const { data: newMat, error: matErr } = await supabase.from('materie').insert({
          utente_email: utente.email,
          nome: mat.nome,
          emoji: mat.emoji || '📚',
          cover_image: mat.cover_image || null,
        }).select().single()
        if (matErr || !newMat) {
          console.error('[confirmSave] materie insert:', matErr?.message, mat.nome)
          continue
        }

        let firstArgId = null
        const validArgs = (mat.argomenti || []).filter(a => a?.trim())
        for (const argNome of validArgs) {
          const { data: newArg, error: argErr } = await supabase.from('argomenti').insert({
            materia_id: newMat.id, nome: argNome.trim(),
          }).select().single()
          if (argErr) { console.error('[confirmSave] argomenti insert:', argErr.message); continue }
          if (newArg && !firstArgId) firstArgId = newArg.id
        }

        // Always upload items — even if no argomenti were created (use null argomento_id)
        const uploadArgId = validArgs.length > 1 ? null : (firstArgId || null)
        for (const idx of (mat.item_indices || [])) {
          if (items[idx]) await uploadItem(items[idx], newMat.id, uploadArgId)
        }
      }

      for (const add of (proposal.esistenti || [])) {
        const mat = materie.find(m => m.id === add.materia_id)
        if (!mat) continue
        let firstArgId = null
        const validArgs = (add.argomenti || []).filter(a => a?.trim())
        for (const argNome of validArgs) {
          const { data: newArg, error: argErr } = await supabase.from('argomenti').insert({
            materia_id: mat.id, nome: argNome.trim(),
          }).select().single()
          if (argErr) { console.error('[confirmSave] argomenti insert (esistente):', argErr.message); continue }
          if (newArg && !firstArgId) firstArgId = newArg.id
        }

        const uploadArgId = validArgs.length > 1 ? null : (firstArgId || null)
        for (const idx of (add.item_indices || [])) {
          if (items[idx]) await uploadItem(items[idx], mat.id, uploadArgId)
        }
      }

      toast('✓ Salvato!')
      onComplete()
    } catch (e) {
      console.error('[confirmSave] fatal:', e.message)
      setErr('Errore salvataggio: ' + e.message)
    }
    setSaving(false)
  }

  async function uploadItem(item, materiaId, argomentoId) {
    console.log('[uploadItem]', item.type, item.name, { materiaId, argomentoId })

    if (item.type === 'file' || item.type === 'audio') {
      // Pre-uploaded during analysis (text-only provider path) → skip storage, just write to DB
      if (item.preUploadedUrl) {
        const { error } = await supabase.from('fonti').insert({
          utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
          nome: item.name, url: item.preUploadedUrl,
          tipo: item.type === 'audio' ? 'audio' : 'file',
        })
        if (error) console.error('[uploadItem] fonti insert (preUploaded):', error.message)
        return
      }

      const ext = getExt(item.name)
      const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      let blob = item.file, ct = item.file.type || 'application/octet-stream'
      if (isImgExt(ext)) {
        try { blob = await compressImg(item.file); ct = 'image/jpeg' }
        catch (ce) { console.warn('[uploadItem] compress failed:', ce.message) }
      }

      const path = `${utente.id}/${argomentoId || materiaId}/${Date.now()}_${safeName}`
      const { error: ue } = await supabase.storage.from('fonti').upload(path, blob, { contentType: ct })
      if (ue) {
        console.error('[uploadItem] storage upload error:', ue.message, path)
        return
      }

      const { data: urlData } = supabase.storage.from('fonti').getPublicUrl(path)
      const { error: ie } = await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: urlData.publicUrl,
        tipo: item.type === 'audio' ? 'audio' : 'file',
        testo: item.estratto || null,
      })
      if (ie) console.error('[uploadItem] fonti insert error:', ie.message)
      else console.log('[uploadItem] ✓ saved', item.name)

    } else if (item.type === 'text') {
      const { error } = await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: '', testo: item.text, tipo: 'text',
      })
      if (error) console.error('[uploadItem] text insert:', error.message)
      else console.log('[uploadItem] ✓ saved text', item.name)

    } else if (item.type === 'url') {
      const { error } = await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: item.url, tipo: 'url',
        testo: item.estratto || null,
      })
      if (error) console.error('[uploadItem] url insert:', error.message)

    } else if (item.type === 'youtube') {
      const { error } = await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: item.url, tipo: 'youtube',
        testo: item.estratto || null,
      })
      if (error) console.error('[uploadItem] youtube insert:', error.message)
    }
  }

  /* ── Proposal edit helpers ── */
  function updateNuovaNome(i, nome) {
    setProposal(p => ({ ...p, nuove: p.nuove.map((m, j) => j === i ? { ...m, nome } : m) }))
  }
  function updateNuovaEmoji(i, emoji) {
    setProposal(p => ({ ...p, nuove: p.nuove.map((m, j) => j === i ? { ...m, emoji } : m) }))
    setProposalDiverged(true)
  }
  function updateNuovaArg(i, ai, val) {
    setProposal(p => ({ ...p, nuove: p.nuove.map((m, j) => j !== i ? m : { ...m, argomenti: m.argomenti.map((a, k) => k === ai ? val : a) }) }))
  }
  function updateEsistenteArg(i, ai, val) {
    setProposal(p => ({ ...p, esistenti: p.esistenti.map((m, j) => j !== i ? m : { ...m, argomenti: m.argomenti.map((a, k) => k === ai ? val : a) }) }))
  }
  function removeNuova(i) {
    setProposal(p => ({ ...p, nuove: p.nuove.filter((_, j) => j !== i) }))
    if (mergePickerFor === i) setMergePickerFor(null)
  }
  function removeNuovaArg(i, ai) {
    setProposal(p => ({ ...p, nuove: p.nuove.map((m, j) => j !== i ? m : { ...m, argomenti: m.argomenti.filter((_, k) => k !== ai) }) }))
  }
  function addNuovaArg(i) {
    setProposal(p => ({ ...p, nuove: p.nuove.map((m, j) => j !== i ? m : { ...m, argomenti: [...m.argomenti, ''] }) }))
  }
  function mergeNuovaInto(srcI, tgtI) {
    setProposal(p => {
      const src = p.nuove[srcI], tgt = p.nuove[tgtI]
      const merged = { ...tgt, argomenti: [...tgt.argomenti, ...src.argomenti], item_indices: [...(tgt.item_indices || []), ...(src.item_indices || [])] }
      return { ...p, nuove: p.nuove.map((m, j) => j === tgtI ? merged : m).filter((_, j) => j !== srcI) }
    })
    setMergePickerFor(null)
  }
  function removeEsistente(i) {
    setProposal(p => ({ ...p, esistenti: p.esistenti.filter((_, j) => j !== i) }))
  }
  function removeEsistenteArg(i, ai) {
    setProposal(p => ({ ...p, esistenti: p.esistenti.map((m, j) => j !== i ? m : { ...m, argomenti: m.argomenti.filter((_, k) => k !== ai) }) }))
  }
  function convertToNuova(i) {
    const add = proposal.esistenti[i]
    const mat = materie.find(m => m.id === add.materia_id)
    setProposal(p => ({
      nuove: [...p.nuove, {
        nome: add.materia_nome, emoji: mat?.emoji || '📚',
        argomenti: [...add.argomenti], item_indices: [...(add.item_indices || [])],
        _id: 'new-' + Date.now()
      }],
      esistenti: p.esistenti.filter((_, j) => j !== i)
    }))
    setProposalDiverged(true)
  }
  function revertToOriginal() {
    setProposal(JSON.parse(JSON.stringify(originalProposal)))
    setProposalDiverged(false)
    setMergePickerFor(null)
  }

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="up-modal-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="up-modal">

        {/* ── Header ── */}
        <div className="up-modal-hdr">
          <button className="up-close-btn" onClick={onClose}>✕</button>
          <span className="up-modal-title">
            {directUpload
              ? 'Aggiungi fonti'
              : step === 'upload'    ? 'Carica materiali'
              : step === 'analyzing' ? 'Analisi in corso…'
              : 'Conferma struttura'}
          </span>
          {!directUpload && step === 'upload' && items.length > 0 && (
            <button className="btn-sm primary" onClick={analyze} disabled={aiBlocked}>Analizza →</button>
          )}
          {directUpload && items.length > 0 && (
            <button className="btn-sm primary" onClick={directSave} disabled={saving}>
              {saving ? '…' : 'Aggiungi ✓'}
            </button>
          )}
          {!directUpload && step === 'confirm' && <div style={{width:70}}/>}
          {(!directUpload && (step === 'analyzing' || (step === 'upload' && !items.length))) && <div style={{width:70}}/>}
          {(directUpload && !items.length) && <div style={{width:70}}/>}
        </div>

        {/* ─────── STEP: UPLOAD ─────── */}
        {step === 'upload' && (
          <div className="up-body">
            <div
              className={`up-dropzone${dragOver ? ' drag-over' : ''}`}
              onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" multiple
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp3,.m4a,.wav,.aac,.ogg"
                style={{display:'none'}} onChange={e => addFiles(e.target.files)}/>
              <div className="up-drop-icon">
                <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="up-drop-title">Trascina qui i file</p>
              <p className="up-drop-sub">o clicca per selezionare</p>
              <div className="up-drop-formats">
                <span>Immagini</span><span>PDF</span><span>Word</span><span>PPT</span><span>Audio</span>
              </div>
            </div>

            <div className="up-extra-btns">
              <button className={`up-extra-btn${showText ? ' active' : ''}`} onClick={() => { setShowText(p => !p); setShowUrl(false) }}>
                ✏️ Testo
              </button>
              <button className={`up-extra-btn${showUrl ? ' active' : ''}`} onClick={() => { setShowUrl(p => !p); setShowText(false) }}>
                🔗 Link / YouTube
              </button>
            </div>

            {showText && (
              <div className="up-text-area-wrap">
                <textarea className="up-textarea" placeholder="Incolla testo, appunti, definizioni…" value={textVal} onChange={e => setTextVal(e.target.value)} rows={4}/>
                <button className="btn-sm primary" onClick={addText} disabled={!textVal.trim()}>Aggiungi</button>
              </div>
            )}

            {showUrl && (
              <div className="up-url-row">
                <input className="up-url-input" type="url" placeholder="https://…" value={urlVal} onChange={e => setUrlVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()}/>
                <button className="btn-sm primary" onClick={addUrl}>+</button>
              </div>
            )}

            {items.length > 0 && (
              <div className="up-chips">
                {items.map((item, i) => {
                  const isImg = item.type === 'file' && isImgExt(getExt(item.name))
                  return (
                    <div key={i} className={isImg ? 'up-img-item' : ''}>
                      <ItemChip item={item} onRemove={() => setItems(p => p.filter((_, j) => j !== i))}/>
                      {isImg && (
                        <input
                          className="up-img-desc-input"
                          placeholder="Descrivi (es. Appunti storia romana — Augusto)"
                          value={item.description || ''}
                          onChange={e => {
                            const val = e.target.value
                            setItems(p => p.map((it, j) => j === i ? { ...it, description: val } : it))
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {err && <p className="error-msg">{err}</p>}

            {aiBlocked && !directUpload && (
              <p style={{color:'#ef4444',fontSize:'.85rem',fontWeight:600,textAlign:'center'}}>🚫 Limite token raggiunto. Vai in Profilo → Impostazioni AI per i dettagli.</p>
            )}
            {items.length > 0 && (
              <button className="btn-primary" onClick={directUpload ? directSave : analyze} disabled={saving||(aiBlocked&&!directUpload)}>
                {directUpload
                  ? (saving ? 'Salvataggio…' : '✓ Aggiungi fonti')
                  : 'Analizza con AI →'}
              </button>
            )}
          </div>
        )}

        {/* ─────── STEP: ANALYZING ─────── */}
        {step === 'analyzing' && (
          <div className="up-body up-analyzing">
            <div className="ai-spinner" style={{width:56,height:56,borderWidth:4}}/>
            <p style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'1.05rem',color:'var(--ink)'}}>
              {STATUS_MSGS[analyzeStatus] || analyzeStatus || 'Elaborazione in corso…'}
            </p>
            <p style={{fontSize:'.85rem',color:'var(--muted)',textAlign:'center',maxWidth:260,lineHeight:1.6}}>
              Analisi di {items.length} {items.length === 1 ? 'file' : 'file'} in corso
            </p>
            <div className="analyze-steps">
              {['extracting','analyzing','finishing'].map((s, i) => {
                const steps = ['extracting','analyzing','finishing']
                const normalizedStatus = STATUS_MSGS[analyzeStatus] ? analyzeStatus : 'extracting'
                const currentIdx = steps.indexOf(normalizedStatus)
                const isDone = i < currentIdx
                const isCurrent = i === currentIdx
                return (
                  <div key={s} className={`analyze-step${isDone?' done':isCurrent?' active':''}`}>
                    <span className="analyze-step-dot"/>
                    <span>{STATUS_MSGS[s]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─────── STEP: CONFIRM ─────── */}
        {step === 'confirm' && proposal && (
          <div className="up-body">
            <p style={{fontSize:'.82rem',color:'var(--muted)',lineHeight:1.6}}>
              Rivedi la struttura proposta. Puoi rinominare, rimuovere, unire materie e argomenti.
            </p>

            {/* Restore original AI suggestion */}
            {proposalDiverged && (
              <button className="up-revert-btn" onClick={revertToOriginal}>
                ← Torna al suggerimento AI
              </button>
            )}

            {/* Nuove materie */}
            {proposal.nuove?.length > 0 && <>
              <div className="up-section-label">📚 Nuove materie da creare</div>
              {proposal.nuove.map((mat, i) => (
                <div key={mat._id} className="up-proposal-card">
                  <div className="up-proposal-header">
                    <div className="up-emoji-picker-wrap">
                      <button className="up-prop-emoji-btn" onClick={() => setShowEmojiFor(showEmojiFor === i ? null : i)} title="Cambia emoji">
                        {mat.emoji}
                      </button>
                      {showEmojiFor === i && (
                        <div className="up-emoji-grid">
                          {SUBJ_EMOJIS.map(e => (
                            <button key={e} className="up-emoji-opt" onClick={() => { updateNuovaEmoji(i, e); setShowEmojiFor(null) }}>
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input className="up-prop-name-input" value={mat.nome} onChange={e => updateNuovaNome(i, e.target.value)}/>
                    <button className="up-card-remove" onClick={() => removeNuova(i)} title="Rimuovi materia">✕</button>
                  </div>
                  <div className="up-prop-args">
                    <span className="up-prop-args-label">Argomenti:</span>
                    {mat.argomenti?.map((arg, ai) => (
                      <div key={ai} className="up-arg-row">
                        <input className="up-arg-input" value={arg} onChange={e => updateNuovaArg(i, ai, e.target.value)}/>
                        <button className="up-arg-remove" onClick={() => removeNuovaArg(i, ai)}>✕</button>
                      </div>
                    ))}
                    <button className="up-add-arg-btn" onClick={() => addNuovaArg(i)}>+ arg</button>
                  </div>
                  {mat.item_indices?.length > 0 && (
                    <div className="up-prop-files">
                      {mat.item_indices.map(idx => items[idx] && (
                        <span key={idx} className="up-prop-file-chip">
                          {items[idx].type === 'text' ? '✏️' : items[idx].type === 'url' ? '🔗' : '📄'} {items[idx].name}
                        </span>
                      ))}
                    </div>
                  )}
                  {mat.item_indices?.some(idx => items[idx]?.mini_riassunto) && (
                    <div className="up-file-summaries">
                      {mat.item_indices.map(idx => items[idx]?.mini_riassunto ? (
                        <div key={idx} className="up-file-summary">
                          <span className="up-file-summary-name">{items[idx].name}:</span> {items[idx].mini_riassunto}
                        </div>
                      ) : null)}
                    </div>
                  )}
                  {proposal.nuove.length > 1 && (
                    <div className="up-merge-wrap">
                      <button className={`up-merge-btn${mergePickerFor === i ? ' active' : ''}`} onClick={() => setMergePickerFor(mergePickerFor === i ? null : i)}>
                        ⤵ Unisci a...
                      </button>
                      {mergePickerFor === i && (
                        <div className="up-merge-picker">
                          {proposal.nuove.map((tgt, j) => j === i ? null : (
                            <button key={j} className="up-merge-option" onClick={() => mergeNuovaInto(i, j)}>
                              {tgt.emoji} {tgt.nome}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>}

            {/* Aggiunte a esistenti */}
            {proposal.esistenti?.length > 0 && <>
              <div className="up-section-label">➕ Da aggiungere a materie esistenti</div>
              {proposal.esistenti.map((add, i) => {
                const mat = materie.find(m => m.id === add.materia_id)
                return (
                  <div key={i} className="up-proposal-card up-existing">
                    <div className="up-proposal-header">
                      <span className="up-prop-emoji">{mat?.emoji || '📚'}</span>
                      <span className="up-prop-existing-name">{add.materia_nome}</span>
                      <span className="up-existing-badge">Esistente</span>
                      <button className="up-card-remove" onClick={() => removeEsistente(i)} title="Rimuovi">✕</button>
                    </div>
                    <div className="up-prop-args">
                      <span className="up-prop-args-label">Nuovi argomenti:</span>
                      {add.argomenti?.map((arg, ai) => (
                        <div key={ai} className="up-arg-row">
                          <input className="up-arg-input" value={arg} onChange={e => updateEsistenteArg(i, ai, e.target.value)}/>
                          <button className="up-arg-remove" onClick={() => removeEsistenteArg(i, ai)}>✕</button>
                        </div>
                      ))}
                    </div>
                    {add.item_indices?.length > 0 && (
                      <div className="up-prop-files">
                        {add.item_indices.map(idx => items[idx] && (
                          <span key={idx} className="up-prop-file-chip">
                            {items[idx].type === 'text' ? '✏️' : items[idx].type === 'url' ? '🔗' : '📄'} {items[idx].name}
                          </span>
                        ))}
                      </div>
                    )}
                    <button className="up-convert-btn" onClick={() => convertToNuova(i)}>
                      + Crea come nuova materia separata
                    </button>
                  </div>
                )
              })}
            </>}

            {(!proposal.nuove?.length && !proposal.esistenti?.length) && (
              <div className="empty"><span>🤔</span><p>L'AI non ha trovato una struttura chiara. Riprova con più materiali.</p></div>
            )}

            {err && <p className="error-msg">{err}</p>}

            <button className="btn-primary" onClick={confirmSave} disabled={saving} style={{marginTop:8}}>
              {saving ? 'Salvataggio…' : '✓ Conferma e salva'}
            </button>
            <button className="btn-secondary" onClick={() => setStep('upload')} style={{marginTop:0}}>
              ← Modifica materiali
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
