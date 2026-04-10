export function parseQuiz(text) {
  if (!text) return []

  // Strip markdown fences, bold markers
  const clean = text
    .replace(/```[\s\S]*?```/g, s => s.replace(/```\w*/g, '').replace(/```/g, ''))
    .replace(/\*\*/g, '')
    .trim()

  // ── Split into per-question blocks on DOMANDA: boundaries ──
  // Also handles numbered prefixes like "1. DOMANDA:" or "1) DOMANDA:"
  const domRe = /(?:^|\n)[ \t]*(?:\d+[.)]\s*)?DOMANDA\s*:/gi
  const starts = []
  let m
  while ((m = domRe.exec(clean)) !== null) starts.push(m.index)

  // If no DOMANDA: markers found, fall back to --- splitting
  let blocks
  if (starts.length === 0) {
    blocks = clean.split(/\n\s*-{3,}\s*\n/).map(b => b.trim()).filter(Boolean)
  } else {
    blocks = starts.map((s, i) => clean.slice(s, starts[i + 1] ?? clean.length).trim())
  }

  const questions = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    let dom = '', opts = ['', '', '', ''], cor = 0, spieg = ''

    let i = 0
    while (i < lines.length) {
      const l = lines[i]

      // ── DOMANDA ──
      const domM = l.match(/^(?:\d+[.)]\s*)?DOMANDA\s*:\s*(.*)/i)
      if (domM) {
        dom = domM[1].trim()
        // If question text is on next line (DOMANDA:\n testo)
        if (!dom && i + 1 < lines.length && !/^[A-D][).:\-\s]|^(?:CORRETTA|CORRECTA|CORR|RISPOSTA|SPIEGAZIONE|---)/i.test(lines[i + 1])) {
          i++; dom = lines[i].trim()
        }
        i++; continue
      }

      // ── OPTIONS A–D ──
      const optM = l.match(/^\(?([A-Da-d])[).\-:\s]\s*(.+)/i)
      if (optM) {
        const idx = 'ABCD'.indexOf(optM[1].toUpperCase())
        if (idx >= 0) { opts[idx] = optM[2].trim(); i++; continue }
      }

      // ── CORRECT ANSWER ──
      const corM = l.match(/^(?:CORRETTA|CORRECTA|CORR(?:ETTA)?O?|RISPOSTA\s*CORRETTA?|CORRECT(?:A)?|ANSWER)\s*:\s*\(?([A-Da-d])/i)
      if (corM) {
        const idx = 'ABCD'.indexOf(corM[1].toUpperCase())
        if (idx >= 0) cor = idx
        i++; continue
      }
      // Standalone letter on its own line (fallback for CORRETTA:\nB)
      if (/^[A-Da-d]\s*$/.test(l) && cor === 0) {
        const idx = 'ABCD'.indexOf(l.trim().toUpperCase())
        if (idx >= 0) cor = idx
        i++; continue
      }

      // ── SPIEGAZIONE ──
      const spiegM = l.match(/^(?:SPIEGAZIONE|SPIEG|EXPLANATION|EXPL|NOTA)\s*:\s*(.*)/i)
      if (spiegM) {
        spieg = spiegM[1].trim()
        // Multi-line explanation
        while (i + 1 < lines.length) {
          const next = lines[i + 1]
          if (/^(?:DOMANDA|[A-D][).\-]|CORRETTA|CORRECTA|CORR|RISPOSTA|SPIEGAZIONE|---|\d+[.)]\s*DOMANDA)/i.test(next)) break
          spieg += ' ' + next
          i++
        }
        i++; continue
      }

      i++
    }

    if (dom && opts.filter(Boolean).length >= 2) {
      questions.push({ dom, opts, cor, spieg: spieg.trim() })
    }
  }

  return questions
}

export function parseFC(text) {
  return text.split('---').map(b => b.trim()).filter(Boolean).map(b => ({
    front: b.match(/FRONTE:\s*(.+?)(?:\n|$)/)?.[1]?.trim() || '',
    back:  b.match(/RETRO:\s*([\s\S]+?)(?:---|$)/)?.[1]?.replace(/---$/, '').trim() || '',
  })).filter(c => c.front && c.back)
}

export function parseMappa(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const res = { title: '', branches: [] }
  let cur = null
  for (const line of lines) {
    const clean = line.replace(/^[#│├└─\s]+/, '').replace(/\*\*/g, '').trim()
    if (!clean) continue
    if (line.match(/^##\s/) && !line.match(/^###/)) { res.title = clean }
    else if (line.match(/^###\s/) || line.match(/^[├└]/)) { cur = { title: clean, children: [] }; res.branches.push(cur) }
    else if (cur && (line.match(/^[-•*]\s/) || line.match(/^\s{2,}/))) { cur.children.push(clean) }
  }
  if (!res.title && lines.length) res.title = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
  return res
}

export function parseRiassunto(text) {
  const secs = []; let cur = null
  for (const line of text.split('\n')) {
    const t = line.trim().replace(/\*\*/g, '').replace(/^\*+|\*+$/g, '')
    if (t.startsWith('## '))       { if (cur) secs.push(cur); cur = { title: t.replace('## ', ''), items: [] } }
    else if (t.startsWith('### ') && cur) { cur.items.push({ type: 'h3', text: t.replace('### ', '') }) }
    else if ((t.startsWith('- ') || t.startsWith('• ')) && cur) { cur.items.push({ type: 'li', text: t.replace(/^[-•]\s/, '') }) }
    else if (t && cur) { cur.items.push({ type: 'p', text: t }) }
  }
  if (cur) secs.push(cur)
  return secs.length ? secs : [{ title: 'Output', items: [{ type: 'p', text: text.replace(/\*\*/g, '').replace(/^\*+|\*+$/gm, '') }] }]
}

export function parseOpenQuiz(result) {
  return result.split('---').map(b => b.trim()).filter(Boolean).map(b => ({
    dom:  b.match(/DOMANDA:\s*(.+?)(?:\n|$)/)?.[1]?.trim() || '',
    risp: b.match(/RISPOSTA:\s*([\s\S]+?)(?:---|$)/)?.[1]?.replace(/---$/, '').trim() || '',
  })).filter(q => q.dom)
}
