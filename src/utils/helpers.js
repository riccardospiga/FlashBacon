let _toastTimer = null

export function toast(msg) {
  const existing = document.querySelector('.fb-toast')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.className = 'fb-toast'
  el.textContent = msg
  document.body.appendChild(el)
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => el.remove(), 2500)
}

export function showAIDone(msg = '✅ AI ha finito!') {
  const existing = document.querySelector('.ai-done-popup')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.className = 'ai-done-popup'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3100)
}

export function fmtDate(iso) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  )
}

export async function compressImg(file) {
  return new Promise(res => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const M = 1024
      let { width: w, height: h } = img
      if (w > M || h > M) { const r = Math.min(M / w, M / h); w = Math.round(w * r); h = Math.round(h * r) }
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      c.toBlob(b => res(b), 'image/jpeg', 0.75)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export function getExt(name) {
  return (name || '').split('.').pop()?.toLowerCase() || ''
}

export function isImgExt(ext) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

export function cleanText(t) {
  return (t || '').replace(/\*\*/g, '').replace(/^\*+|\*+$/gm, '').replace(/^#+\s*/gm, '').trim()
}
