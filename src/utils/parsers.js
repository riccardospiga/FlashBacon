export function parseQuiz(text) {
  if (!text) return []

  // Strip markdown fences and leading/trailing whitespace
  const clean = text
    .replace(/```[\s\S]*?```/g, s => s.replace(/```\w*/g, '').replace(/```/g, ''))
    .replace(/\*\*/g, '')
    .trim()

  // Split on separator lines: ---, ———, ─────, numbered separators, blank lines between blocks
  const blocks = clean
    .split(/\n\s*[-─—]{2,}\s*\n|\n\s*\n(?=\s*(?:DOMANDA|QUESTION|\d+[.)]\s))/i)
    .map(b => b.trim())
    .filter(Boolean)

  const questions = []

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    // ── domanda ──
    let dom = ''
    for (const l of lines) {
      // DOMANDA: text  or  1. DOMANDA: text  or  1) text (numbered question without keyword)
      const m = l.match(/^(?:\d+[.)]\s*)?(?:DOMANDA|QUESTION|QUESITO)[:\s]+(.+)/i)
      if (m) { dom = m[1].trim(); break }
    }
    if (!dom) {
      // First line that isn't an option / keyword label
      const first = lines.find(l =>
        !/^[A-Da-d][).\s]|^\(?[A-Da-d]\)|^(CORRETTA|CORR|RISPOSTA|SPIEGAZIONE|SPIEG|EXPL)/i.test(l)
      )
      if (first) dom = first.replace(/^\d+[.)]\s*/, '').trim()
    }

    // ── options A-D ──
    const opts = ['A', 'B', 'C', 'D'].map(letter => {
      for (const l of lines) {
        // A) text  /  A. text  /  A: text  /  (A) text  /  A - text
        if (new RegExp(`^\\(?${letter}[).:\\-]\\s*`, 'i').test(l)) {
          return l.replace(new RegExp(`^\\(?${letter}[).:\\-]\\s*`, 'i'), '').trim()
        }
      }
      return ''
    })

    // ── correct answer ──
    let corLet = ''
    for (const l of lines) {
      // CORRETTA: A  /  CORR: A  /  RISPOSTA CORRETTA: A  /  CORRECT: A  /  CORRETO: A
      const m = l.match(/^(?:CORRETTA|CORR(?:ETTA)?O?|RISPOSTA\s*CORRETTA?|CORRECT(?:A)?|ANSWER)[:\s]+\(?([A-Da-d])[).:\s]*/i)
      if (m) { corLet = m[1].toUpperCase(); break }
      // fallback: line is just "A" or "A)" alone on its own after a correct-label block
      const m2 = l.match(/^(?:CORRETTA|CORR|RISPOSTA)[:\s]*$/i)
      if (m2) {
        // next token might be on the same or next line — handled below
      }
    }
    // fallback: scan for standalone letter answer
    if (!corLet) {
      for (const l of lines) {
        const m = l.match(/^([A-Da-d])\s*$/)
        if (m) { corLet = m[1].toUpperCase(); break }
      }
    }
    const cor = corLet ? Math.max(0, ['A', 'B', 'C', 'D'].indexOf(corLet)) : 0

    // ── spiegazione ──
    let spieg = ''
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (/^(?:SPIEGAZIONE|SPIEG|EXPLANATION|EXPL|NOTA)[:\s]/i.test(l)) {
        // may be multi-line: grab rest of this line + following non-keyword lines
        const firstPart = l.replace(/^[^:]+:\s*/i, '').trim()
        const extra = []
        for (let j = i + 1; j < lines.length; j++) {
          if (/^(?:DOMANDA|CORRETTA|CORR|QUESTION)[:\s]/i.test(lines[j])) break
          extra.push(lines[j])
        }
        spieg = [firstPart, ...extra].filter(Boolean).join(' ')
        break
      }
    }

    // require at least a question and 2 options
    if (dom && opts.filter(Boolean).length >= 2) {
      questions.push({ dom, opts, cor, spieg })
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
