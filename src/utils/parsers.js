export function parseQuiz(text) {
  return text.split('---').map(b => b.trim()).filter(Boolean).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    const dom = lines.find(l => l.startsWith('DOMANDA:'))?.replace('DOMANDA:', '').trim() || ''
    const opts = ['A','B','C','D'].map(l => lines.find(ln => ln.startsWith(l + ')'))?.replace(l + ')', '').trim() || '')
    const corLet = lines.find(l => l.startsWith('CORRETTA:') || l.startsWith('CORR:'))?.replace(/CORRETTA:|CORR:/, '').trim() || 'A'
    const cor = Math.max(0, ['A','B','C','D'].indexOf(corLet.toUpperCase().charAt(0)))
    const spieg = lines.find(l => l.startsWith('SPIEGAZIONE:') || l.startsWith('SPIEG:'))?.replace(/SPIEGAZIONE:|SPIEG:/, '').trim() || ''
    return { dom, opts, cor, spieg }
  }).filter(q => q.dom && q.opts[0])
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
