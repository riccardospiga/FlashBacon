import React, { useState, useRef, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { compressImg, getExt, isImgExt, toast } from '../utils/helpers.js'

const AUDIO_EXTS = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'weba']
const VISION_PROVIDERS = ['anthropic', 'openai', 'google']

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
  uploading:    '📤 Caricamento file...',
  transcribing: '🎤 Trascrizione audio...',
  analyzing:    '🔍 Analisi in corso...',
  finishing:    '✅ Unificazione risultati...',
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
  return new Promise(res => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const M = 1024
      let { width: w, height: h } = img
      if (w > M || h > M) { const r = Math.min(M / w, M / h); w = Math.round(w * r); h = Math.round(h * r) }
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      c.toBlob(b => {
        const reader = new FileReader()
        reader.onload = e2 => { res(e2.target.result); URL.revokeObjectURL(objectUrl) }
        reader.readAsDataURL(b)
      }, 'image/jpeg', 0.6)
    }
    img.src = objectUrl
  })
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
        if (isImgExt(ext)) preview = URL.createObjectURL(f)
        newItems.push({ type: 'file', file: f, name: f.name, ext, preview })
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

  /* ── Provider-aware AI analysis ── */
  async function analyze() {
    if (!items.length) { setErr('Aggiungi almeno un file o testo'); return }
    setErr(''); setStep('analyzing'); setAnalyzeStatus('uploading')

    try {
      // 1. Detect active provider
      const { data: provData } = await supabase
        .from('ai_providers').select('provider').eq('attivo', true).single()
      const providerName = provData?.provider || 'anthropic'
      const supportsImages = VISION_PROVIDERS.includes(providerName)

      // Working copy of items (may be augmented with preUploadedUrl)
      const workItems = items.map(i => ({ ...i }))

      const images = []        // base64 data URLs (vision providers)
      const promptLines = []   // inline content per source, embedded in user prompt
      const urlSources = []    // external URLs for server-side extraction only
      const audioErrors = []
      let lineIdx = 0

      // 2. Process each item
      for (let idx = 0; idx < workItems.length; idx++) {
        const item = workItems[idx]
        lineIdx++

        if (item.type === 'audio') {
          setAnalyzeStatus('transcribing')
          try {
            const fd = new FormData()
            fd.append('file', item.file)
            const tr = await fetch('/api/transcribe', { method: 'POST', body: fd })
            const td = await tr.json()
            if (td.transcript) {
              promptLines.push(`Audio ${lineIdx} — ${item.name}:\n${td.transcript}`)
            } else {
              audioErrors.push(item.name)
              promptLines.push(`Audio ${lineIdx} — ${item.name}: [trascrizione non disponibile]`)
            }
          } catch {
            audioErrors.push(item.name)
            promptLines.push(`Audio ${lineIdx} — ${item.name}: [errore trascrizione]`)
          }

        } else if (item.type === 'file') {
          const ext = getExt(item.name)
          if (isImgExt(ext)) {
            if (supportsImages) {
              setAnalyzeStatus('uploading')
              const dataUrl = await compressImgToDataUrl(item.file)
              images.push(dataUrl)
              promptLines.push(`Immagine ${lineIdx} — ${item.name}: [vedi allegato immagine ${images.length}]`)
            } else {
              // Text-only provider: upload to Supabase Storage, pass URL for server extraction
              setAnalyzeStatus('uploading')
              try {
                const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, '_')
                const path = `${utente.id}/upload/${Date.now()}_${safeName}`
                let blob = item.file, ct = item.file.type || 'image/jpeg'
                try { blob = await compressImg(item.file); ct = 'image/jpeg' } catch {}
                const { error: ue } = await supabase.storage.from('fonti').upload(path, blob, { contentType: ct })
                if (!ue) {
                  const { data: { publicUrl } } = supabase.storage.from('fonti').getPublicUrl(path)
                  item.preUploadedUrl = publicUrl
                  urlSources.push(publicUrl)
                  promptLines.push(`Immagine ${lineIdx} — ${item.name}: [URL: ${publicUrl}]`)
                } else {
                  promptLines.push(`Immagine ${lineIdx} — ${item.name}: [upload fallito]`)
                }
              } catch {
                promptLines.push(`Immagine ${lineIdx} — ${item.name}: [errore upload]`)
              }
            }
          } else if (ext === 'pdf') {
            if (supportsImages) {
              const dataUrl = await fileToDataUrl(item.file)
              images.push(dataUrl)
              promptLines.push(`PDF ${lineIdx} — ${item.name}: [vedi allegato PDF ${images.length}]`)
            } else {
              promptLines.push(`PDF ${lineIdx} — ${item.name}: [documento PDF allegato]`)
            }
          } else {
            promptLines.push(`Documento ${lineIdx} — ${item.name}: [documento allegato]`)
          }

        } else if (item.type === 'text') {
          promptLines.push(`Testo ${lineIdx} — Appunti:\n${item.text}`)
        } else if (item.type === 'url') {
          urlSources.push(item.url)
          promptLines.push(`URL ${lineIdx} — ${item.url}: [testo estratto dal server]`)
        } else if (item.type === 'youtube' && item.videoId) {
          try {
            const tr = await fetch(`/api/transcript?v=${item.videoId}`)
            const td = await tr.json()
            if (td.transcript) {
              promptLines.push(`YouTube ${lineIdx} — ${item.url}:\n${td.transcript}`)
            } else {
              urlSources.push(item.url)
              promptLines.push(`YouTube ${lineIdx} — ${item.url}: [trascrizione non disponibile]`)
            }
          } catch {
            urlSources.push(item.url)
            promptLines.push(`YouTube ${lineIdx} — ${item.url}: [errore trascrizione]`)
          }
        }
      }

      // Notify user about audio errors
      if (audioErrors.length > 0) {
        toast(`⚠️ Trascrizione fallita per: ${audioErrors.join(', ')}. Procedo comunque.`)
      }

      // 3. Build analysis prompt
      const fileList = workItems.map((it, i) => `[${i}] ${it.name} (${it.type})`).join('\n')
      const existingList = materie.length
        ? materie.map(m => `- "${m.nome}" id:${m.id}`).join('\n')
        : '(nessuna materia esistente)'

      const systemContext = `You are an expert academic content analyzer for FlashBacon, a global study app used by students at every level.

Your primary task is to read EVERY provided source in its entirety — images, text, transcriptions, URLs — and extract a coherent, accurate academic structure from them.

READING RULES:
- Read every source completely before drawing any conclusion
- For images: read all visible text, titles, headings, diagrams, symbols, formulas, and labels
- For text and documents: read the entire content, never truncate or skim
- For audio transcriptions: treat them as full documents
- For URLs: use the full extracted text provided
- Cross-reference all sources before deciding subject and topics
- The title or heading found in the content is always the most reliable signal for classification

CLASSIFICATION RULES:
- Derive the subject name directly from what you read — never invent or guess
- Match to a standard academic subject when possible (e.g. Biology, History, Mathematics, Physics, Latin)
- Maximum 1 subject per upload unless materials are clearly from completely different academic disciplines
- Maximum 3-4 topics per subject, broad and academically meaningful
- Topic names must reflect actual chapters, themes or concepts found in the content
- Never use generic names like "Document 1", "Notes", "Material", "Appunti"
- Prefer adding to an existing subject over creating a new one if content matches
- Subject and topic names must be in the same language as the source material

NAMING RULES:
- Subject name: broad academic discipline derived from content (e.g. "Biologia", "Storia Romana", "Matematica")
- Topic names: specific concepts or chapters found in the actual text (e.g. "Alberi Genealogici", "Il Principato di Augusto", "Derivate e Integrali")
- If the source contains a clear title or heading, use it directly as the topic name
- Never truncate or abbreviate topic names

OUTPUT: Reply ONLY with valid JSON. No markdown, no explanations, no asterisks, no preamble.

{
  "nuove_materie": [
    { "nome": "...", "emoji": "📚", "argomenti": ["...", "..."], "item_indices": [0, 2] }
  ],
  "aggiunte_esistenti": [
    { "materia_id": "...", "materia_nome": "...", "argomenti": ["..."], "item_indices": [1] }
  ]
}`

      const prompt = `Analizza in dettaglio TUTTI i seguenti materiali prima di rispondere. Leggi ogni fonte interamente senza saltare nulla.

Materiali forniti:
${promptLines.join('\n\n')}

Materie già esistenti dell'utente:
${existingList}

Rispondi SOLO con il JSON richiesto.`

      // 4. Process images in batches of 8
      const BATCH = 8
      const doAICall = async (p, imgs, extraText = [], sysCtx = systemContext) => {
        // Debug: log images being sent to /api/ai
        console.log('[analyze] → /api/ai  immagini:', imgs.length)
        imgs.forEach((img, i) => {
          const isDataUrl = typeof img === 'string' && img.startsWith('data:')
          console.log(`  img[${i}]: ${isDataUrl ? img.slice(0, 100) + '…' : String(img).slice(0, 100)}`)
        })
        const payloadKB = Math.round(
          new TextEncoder().encode(JSON.stringify({ prompt: p, images: imgs })).length / 1024
        )
        console.log(`  payload stimato: ~${payloadKB} KB`)

        const res = await fetch('/api/ai', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: p, images: imgs,
            textSources: extraText,
            urlSources, settings: { length: 2 }, systemContext: sysCtx, fileNames: fileList,
            userEmail: utente?.email || ''
          })
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Errore AI') }
        return readSSE(res)
      }

      let result
      setAnalyzeStatus('analyzing')

      if (images.length <= BATCH) {
        result = await doAICall(prompt, images)

      } else {
        // Batched: each batch gets the full prompt + its images + partial results from previous batches
        const batches = []
        for (let i = 0; i < images.length; i += BATCH) batches.push(images.slice(i, i + BATCH))

        const partials = []
        for (let i = 0; i < batches.length; i++) {
          setAnalyzeStatus(`Analisi batch ${i + 1}/${batches.length}…`)
          const ctx = partials.length > 0
            ? [`Risultati JSON parziali dai batch precedenti:\n${partials.join('\n\n')}`]
            : []
          partials.push(await doAICall(prompt, batches[i], ctx))
        }

        // Final merge: combine all partial JSON results into one coherent structure
        setAnalyzeStatus('finishing')
        const mergeSys = systemContext + '\nCombina i risultati JSON parziali in un unico JSON coerente, unendo nuove_materie e aggiunte_esistenti. Rimuovi duplicati. Restituisci SOLO JSON valido.'
        const mergePrompt = `Unifica questi ${batches.length} risultati parziali JSON in un'unica struttura coerente:\n\n${partials.map((r, i) => `[Batch ${i + 1}]:\n${r}`).join('\n\n---\n\n')}\n\nMaterie già esistenti dell'utente:\n${existingList}`
        result = await doAICall(mergePrompt, [], [], mergeSys)
      }

      setAnalyzeStatus('finishing')
      const match = result.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Risposta AI non JSON')
      const parsed = JSON.parse(match[0])

      const newProposal = {
        nuove: (parsed.nuove_materie || []).map((m, i) => ({ ...m, _id: 'new-' + i })),
        esistenti: parsed.aggiunte_esistenti || [],
      }

      setItems(workItems)  // save pre-uploaded URLs back to items state
      setProposal(newProposal)
      setOriginalProposal(JSON.parse(JSON.stringify(newProposal)))
      setProposalDiverged(false)
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
          utente_email: utente.email, nome: mat.nome, emoji: mat.emoji || '📚',
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
        nome: item.name, url: urlData.publicUrl, tipo: item.type === 'audio' ? 'audio' : 'file',
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
      })
      if (error) console.error('[uploadItem] url insert:', error.message)

    } else if (item.type === 'youtube') {
      const { error } = await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: item.url, tipo: 'youtube',
      })
      if (error) console.error('[uploadItem] youtube insert:', error.message)
    }
  }

  /* ── Proposal edit helpers ── */
  function updateNuovaNome(i, nome) {
    setProposal(p => ({ ...p, nuove: p.nuove.map((m, j) => j === i ? { ...m, nome } : m) }))
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
                {items.map((item, i) => (
                  <ItemChip key={i} item={item} onRemove={() => setItems(p => p.filter((_, j) => j !== i))}/>
                ))}
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
              {['uploading','transcribing','analyzing','finishing'].map((s, i) => {
                const steps = ['uploading','transcribing','analyzing','finishing']
                // treat any dynamic batch status as 'analyzing'
                const normalizedStatus = STATUS_MSGS[analyzeStatus] ? analyzeStatus : 'analyzing'
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
                    <span className="up-prop-emoji">{mat.emoji}</span>
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
