import React, { useState, useRef, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { compressImg, getExt, isImgExt, toast } from '../utils/helpers.js'

/* ── helpers ── */
async function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function ItemChip({ item, onRemove }) {
  const ext = item.type === 'file' ? getExt(item.name) : item.type
  const icon =
    item.type === 'text' ? '✏️'
    : item.type === 'url'  ? '🔗'
    : isImgExt(ext)        ? null
    : ext === 'pdf'        ? '📄'
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
// directUpload mode: skips AI analysis, uploads straight to curArgId/curMateriaId
export default function UploadAIModal({ onClose, materie, utente, onComplete, directUpload = false, curMateriaId, curArgId }) {
  const [items, setItems]           = useState([])
  const [step, setStep]             = useState('upload')   // 'upload' | 'analyzing' | 'confirm'
  const [dragOver, setDragOver]     = useState(false)
  const [showText, setShowText]     = useState(false)
  const [showUrl, setShowUrl]       = useState(false)
  const [textVal, setTextVal]       = useState('')
  const [urlVal, setUrlVal]         = useState('')
  const [proposal, setProposal]     = useState(null)       // editProposal
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')
  const fileRef = useRef()

  /* ── Add items ── */
  async function addFiles(files) {
    const newItems = []
    for (const f of Array.from(files)) {
      const ext = getExt(f.name)
      let preview = null
      if (isImgExt(ext)) preview = URL.createObjectURL(f)
      newItems.push({ type: 'file', file: f, name: f.name, ext, preview })
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
    const name = url.replace(/^https?:\/\//, '').split('/')[0]
    setItems(p => [...p, { type: 'url', url, name }])
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

  /* ── Analyze ── */
  async function analyze() {
    if (!items.length) { setErr('Aggiungi almeno un file o testo'); return }
    setErr(''); setStep('analyzing')

    try {
      const images = [], textSources = [], urlSources = []

      for (const item of items) {
        if (item.type === 'file') {
          const ext = getExt(item.name)
          if (isImgExt(ext) || ext === 'pdf') {
            const dataUrl = await fileToDataUrl(item.file)
            images.push(dataUrl)
          } else {
            urlSources.push('[documento: ' + item.name + ']')
          }
        } else if (item.type === 'text') {
          textSources.push(item.text)
        } else if (item.type === 'url') {
          urlSources.push(item.url)
        }
      }

      const fileList = items.map((it, i) => `[${i}] ${it.name} (${it.type})`).join('\n')
      const existingList = materie.length
        ? materie.map(m => `- "${m.nome}" id:${m.id}`).join('\n')
        : '(nessuna materia esistente)'

      const prompt = `Sei un assistente di studio. Analizza i materiali e proponi una struttura.

Materie già esistenti:
${existingList}

Materiali caricati (indice e nome):
${fileList}

Rispondi SOLO con JSON valido, nessun testo prima o dopo:
{
  "nuove_materie": [
    { "nome": "...", "emoji": "📚", "argomenti": ["...", "..."], "item_indices": [0, 1] }
  ],
  "aggiunte_esistenti": [
    { "materia_id": "...", "materia_nome": "...", "argomenti": ["..."], "item_indices": [2] }
  ]
}

Regole: raggruppa file correlati, usa materie esistenti quando pertinente, ogni materia ≥1 argomento, emoji appropriate, item_indices = indici dei materiali caricati.`

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images, textSources, urlSources, settings: { length: 2 }, systemContext: 'Sei FlashBacon AI. Rispondi SOLO con JSON.', fileNames: fileList })
      })

      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Errore AI') }
      const d = await res.json()

      const match = d.result.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Risposta AI non JSON')
      const parsed = JSON.parse(match[0])

      setProposal({
        nuove: (parsed.nuove_materie || []).map((m, i) => ({ ...m, _id: 'new-' + i })),
        esistenti: parsed.aggiunte_esistenti || [],
      })
      setStep('confirm')
    } catch (e) {
      setErr('Errore: ' + e.message)
      setStep('upload')
    }
  }

  /* ── Save ── */
  async function confirmSave() {
    if (!proposal || saving) return
    setSaving(true)
    try {
      for (const mat of (proposal.nuove || [])) {
        const { data: newMat } = await supabase.from('materie').insert({
          utente_email: utente.email,
          nome: mat.nome,
          emoji: mat.emoji || '📚',
        }).select().single()
        if (!newMat) continue

        let firstArgId = null
        for (const argNome of (mat.argomenti || [])) {
          const { data: newArg } = await supabase.from('argomenti').insert({
            materia_id: newMat.id, nome: argNome,
          }).select().single()
          if (newArg && !firstArgId) firstArgId = newArg.id
        }
        if (firstArgId) {
          for (const idx of (mat.item_indices || [])) {
            if (items[idx]) await uploadItem(items[idx], newMat.id, firstArgId)
          }
        }
      }

      for (const add of (proposal.esistenti || [])) {
        const mat = materie.find(m => m.id === add.materia_id)
        if (!mat) continue
        let firstArgId = null
        for (const argNome of (add.argomenti || [])) {
          const { data: newArg } = await supabase.from('argomenti').insert({
            materia_id: mat.id, nome: argNome,
          }).select().single()
          if (newArg && !firstArgId) firstArgId = newArg.id
        }
        if (firstArgId) {
          for (const idx of (add.item_indices || [])) {
            if (items[idx]) await uploadItem(items[idx], mat.id, firstArgId)
          }
        }
      }

      toast('✓ Salvato!')
      onComplete()
    } catch (e) {
      setErr('Errore salvataggio: ' + e.message)
    }
    setSaving(false)
  }

  async function uploadItem(item, materiaId, argomentoId) {
    if (item.type === 'file') {
      const ext = getExt(item.name)
      const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      let blob = item.file, ct = item.file.type || 'application/octet-stream'
      if (isImgExt(ext)) { blob = await compressImg(item.file); ct = 'image/jpeg' }
      const path = `${utente.id}/${argomentoId}/${Date.now()}_${safeName}`
      const { error: ue } = await supabase.storage.from('fonti').upload(path, blob, { contentType: ct })
      if (ue) return
      const { data: { publicUrl } } = supabase.storage.from('fonti').getPublicUrl(path)
      await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: publicUrl, tipo: 'file',
      })
    } else if (item.type === 'text') {
      await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: '', testo: item.text, tipo: 'text',
      })
    } else if (item.type === 'url') {
      await supabase.from('fonti').insert({
        utente_email: utente.email, materia_id: materiaId, argomento_id: argomentoId,
        nome: item.name, url: item.url, tipo: 'url',
      })
    }
  }

  /* ── Proposal edit helpers ── */
  function updateNuovaNome(i, nome) {
    setProposal(p => ({ ...p, nuove: p.nuove.map((m, j) => j === i ? { ...m, nome } : m) }))
  }
  function updateNuovaArg(i, ai, val) {
    setProposal(p => ({
      ...p,
      nuove: p.nuove.map((m, j) => j !== i ? m : {
        ...m, argomenti: m.argomenti.map((a, k) => k === ai ? val : a)
      })
    }))
  }
  function updateEsistenteArg(i, ai, val) {
    setProposal(p => ({
      ...p,
      esistenti: p.esistenti.map((m, j) => j !== i ? m : {
        ...m, argomenti: m.argomenti.map((a, k) => k === ai ? val : a)
      })
    }))
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
            <button className="btn-sm primary" onClick={analyze}>Analizza →</button>
          )}
          {directUpload && items.length > 0 && (
            <button className="btn-sm primary" onClick={directSave} disabled={saving}>
              {saving ? '…' : 'Aggiungi ✓'}
            </button>
          )}
          {!directUpload && step === 'confirm' && (
            <button className="btn-sm primary" onClick={confirmSave} disabled={saving}>
              {saving ? '…' : 'Salva ✓'}
            </button>
          )}
          {(!directUpload && (step === 'analyzing' || (step === 'upload' && !items.length))) && <div style={{width:70}}/>}
          {(directUpload && !items.length) && <div style={{width:70}}/>}
        </div>

        {/* ─────── STEP: UPLOAD ─────── */}
        {step === 'upload' && (
          <div className="up-body">
            {/* Drag & drop zone */}
            <div
              className={`up-dropzone${dragOver ? ' drag-over' : ''}`}
              onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
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
                <span>Immagini</span><span>PDF</span><span>Word</span><span>PowerPoint</span><span>Excel</span>
              </div>
            </div>

            {/* Extra source buttons */}
            <div className="up-extra-btns">
              <button className={`up-extra-btn${showText ? ' active' : ''}`} onClick={() => { setShowText(p => !p); setShowUrl(false) }}>
                ✏️ Testo
              </button>
              <button className={`up-extra-btn${showUrl ? ' active' : ''}`} onClick={() => { setShowUrl(p => !p); setShowText(false) }}>
                🔗 Link web
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
                <input className="up-url-input" type="url" placeholder="https://…" value={urlVal} onChange={e => setUrlVal(e.target.value) } onKeyDown={e => e.key === 'Enter' && addUrl()}/>
                <button className="btn-sm primary" onClick={addUrl}>+</button>
              </div>
            )}

            {/* Chips of added items */}
            {items.length > 0 && (
              <div className="up-chips">
                {items.map((item, i) => (
                  <ItemChip key={i} item={item} onRemove={() => setItems(p => p.filter((_, j) => j !== i))}/>
                ))}
              </div>
            )}

            {err && <p className="error-msg">{err}</p>}

            {items.length > 0 && (
              <button className="btn-primary" onClick={directUpload ? directSave : analyze} disabled={saving}>
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
            <p style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'1.05rem',color:'var(--ink)'}}>L'AI sta analizzando…</p>
            <p style={{fontSize:'.85rem',color:'var(--muted)',textAlign:'center',maxWidth:260,lineHeight:1.6}}>
              Sto esaminando {items.length} {items.length === 1 ? 'file' : 'file'} e organizzo la struttura di studio
            </p>
          </div>
        )}

        {/* ─────── STEP: CONFIRM ─────── */}
        {step === 'confirm' && proposal && (
          <div className="up-body">
            <p style={{fontSize:'.82rem',color:'var(--muted)',lineHeight:1.6}}>
              Rivedi la struttura proposta dall'AI. Puoi rinominare materie e argomenti prima di salvare.
            </p>

            {/* Nuove materie */}
            {proposal.nuove?.length > 0 && <>
              <div className="up-section-label">📚 Nuove materie da creare</div>
              {proposal.nuove.map((mat, i) => (
                <div key={mat._id} className="up-proposal-card">
                  <div className="up-proposal-header">
                    <span className="up-prop-emoji">{mat.emoji}</span>
                    <input
                      className="up-prop-name-input"
                      value={mat.nome}
                      onChange={e => updateNuovaNome(i, e.target.value)}
                    />
                  </div>
                  <div className="up-prop-args">
                    <span className="up-prop-args-label">Argomenti:</span>
                    {mat.argomenti?.map((arg, ai) => (
                      <input
                        key={ai}
                        className="up-arg-input"
                        value={arg}
                        onChange={e => updateNuovaArg(i, ai, e.target.value)}
                      />
                    ))}
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
                    </div>
                    <div className="up-prop-args">
                      <span className="up-prop-args-label">Nuovi argomenti:</span>
                      {add.argomenti?.map((arg, ai) => (
                        <input
                          key={ai}
                          className="up-arg-input"
                          value={arg}
                          onChange={e => updateEsistenteArg(i, ai, e.target.value)}
                        />
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
