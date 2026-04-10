// ── letter index helper ─────────────────────────────────────────────────────
function letterIdx(s) {
  if (!s) return -1
  const u = s.trim().toUpperCase().replace(/[^A-D]/g, '')[0]
  return u ? 'ABCD'.indexOf(u) : -1
}

// ── Format 4: JSON array ─────────────────────────────────────────────────────
function tryParseJSON(text) {
  // Find outermost JSON array (skip any preamble text)
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) return null
  try {
    const arr = JSON.parse(m[0])
    if (!Array.isArray(arr) || !arr.length) return null
    return arr.map(q => {
      const rawOpts = Array.isArray(q.opzioni) ? q.opzioni
                    : Array.isArray(q.options)  ? q.options
                    : Array.isArray(q.opts)     ? q.opts
                    : []
      // Strip leading "A) " / "a) " / "A. " letter prefix if model ignored instructions
      const opts = rawOpts.map(o => String(o || '').replace(/^\s*[A-Da-d][).:\-]\s*/, '').trim())
      const corRaw = q.corretta ?? q.correct ?? q.risposta ?? q.answer ?? ''
      const cor = letterIdx(String(corRaw)) >= 0
        ? letterIdx(String(corRaw))
        : typeof corRaw === 'number' ? Math.min(corRaw, 3) : 0
      return {
        dom:  String(q.domanda || q.question || q.dom || '').trim(),
        opts: [...opts, '', '', '', ''].slice(0, 4),
        cor,
        spieg: String(q.spiegazione || q.explanation || q.spieg || '').trim(),
      }
    }).filter(q => q.dom && q.opts.filter(Boolean).length >= 2)
  } catch { return null }
}

// ── Detect which question-boundary marker to split on ───────────────────────
function splitBlocks(clean) {
  const anchors = [
    /(?:^|\n)[ \t]*(?:\d+[.)]\s*)?DOMANDA\s*:/gi,
    /(?:^|\n)[ \t]*[Dd]omanda\s*\d*\s*[:.]/g,
    /(?:^|\n)[ \t]*\d+[.)]\s+(?=[A-Z\u00C0-\u024F])/g,
  ]
  for (const re of anchors) {
    re.lastIndex = 0
    const starts = []
    let m
    while ((m = re.exec(clean)) !== null) starts.push(m.index)
    if (starts.length >= 2) {
      return starts.map((s, i) => clean.slice(s, starts[i + 1] ?? clean.length).trim())
    }
  }
  const byDash = clean.split(/\n\s*-{3,}\s*\n/).map(b => b.trim()).filter(Boolean)
  if (byDash.length >= 2) return byDash
  return [clean.trim()].filter(Boolean)
}

// ── Parse one block into {dom, opts, cor, spieg} ─────────────────────────────
function parseBlock(block) {
  const lines = block
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  if (!lines.length) return null

  let dom = '', opts = ['', '', '', ''], cor = 0, spieg = ''

  let i = 0
  while (i < lines.length) {
    const l = lines[i]

    // ── Question text ──
    const domM = l.match(/^(?:\d+[.)]\s*)?(?:DOMANDA|[Dd]omanda)\s*\d*\s*[:.]\s*(.*)/i)
      || l.match(/^\d+[.)]\s+(.+)/)
    if (domM) {
      dom = domM[1].trim()
      if (!dom && i + 1 < lines.length && !/^[A-Da-d\-*•(]/.test(lines[i + 1])) {
        i++; dom = lines[i].trim()
      }
      i++; continue
    }

    // ── Options: "A) ..." / "a) ..." / "- A: ..." / "(A) ..." ──
    const optM = l.match(/^[-*•]?\s*\(?([A-Da-d])[).\-:\s]\s*(.+)/i)
    if (optM) {
      const idx = letterIdx(optM[1])
      if (idx >= 0) { opts[idx] = optM[2].trim(); i++; continue }
    }

    // ── Correct answer ──
    const corM = l.match(/^(?:CORRETTA|CORRECTA|CORR(?:ETTA)?O?|RISPOSTA(?:\s+CORRETTA?)?|CORRECT(?:A)?|ANSWER)\s*[:.]\s*\(?([A-Da-d])/i)
    if (corM) {
      const idx = letterIdx(corM[1])
      if (idx >= 0) cor = idx
      i++; continue
    }
    if (/^[A-Da-d][).]?\s*$/.test(l)) {
      const idx = letterIdx(l)
      if (idx >= 0) cor = idx
      i++; continue
    }

    // ── Spiegazione ──
    const spiegM = l.match(/^(?:SPIEGAZIONE|SPIEG|EXPLANATION|EXPL|NOTA)\s*[:.]\s*(.*)/i)
    if (spiegM) {
      spieg = spiegM[1].trim()
      while (i + 1 < lines.length) {
        const next = lines[i + 1]
        if (/^(?:DOMANDA|[Dd]omanda|[A-Da-d][).\-\s]|CORRETTA|CORRECTA|RISPOSTA|SPIEGAZIONE|---)/i.test(next)) break
        spieg += ' ' + next; i++
      }
      i++; continue
    }

    if (!dom) { dom = l.replace(/^\d+[.)]\s*/, '').trim(); i++; continue }

    i++
  }

  if (!dom || opts.filter(Boolean).length < 2) return null
  return { dom, opts, cor, spieg: spieg.trim() }
}

export function parseQuiz(text) {
  if (!text) return []

  const stripped = text
    .replace(/```[\s\S]*?```/g, s => s.replace(/```\w*/g, '').replace(/```/g, ''))
    .trim()

  // ── JSON format (new prompt) ──
  const fromJSON = tryParseJSON(stripped)
  if (fromJSON && fromJSON.length) return fromJSON

  // Strip all markdown bold/italic before text parsing
  const clean = stripped.replace(/\*\*/g, '').replace(/\*/g, '')

  // ── "Domanda:" keyword splitting (Mistral markdown + DOMANDA: formats) ──
  // Handles preambles: only keep parts that actually contain a Domanda: line
  const domLineRe = /(?:^|\n)[ \t]*(?:\d+[.)]\s*)?(?:DOMANDA|[Dd]omanda)\s*\d*\s*[:.]/i
  if (domLineRe.test(clean)) {
    // Split at every line that starts a new question
    const splitRe = /\n(?=[ \t]*(?:\d+[.)]\s*)?(?:DOMANDA|[Dd]omanda)\s*\d*\s*[:.]\s)/gi
    const parts = ('\n' + clean).split(splitRe)
      .map(p => p.trim())
      .filter(p => domLineRe.test(p))
    if (parts.length > 0) {
      const parsed = parts.map(parseBlock).filter(Boolean)
      if (parsed.length > 0) return parsed
    }
  }

  const blocks = splitBlocks(clean)
  return blocks.map(parseBlock).filter(Boolean)
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
