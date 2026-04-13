// Proxy Unsplash image search — requires UNSPLASH_ACCESS_KEY env variable
// Set it in Vercel dashboard → Settings → Environment Variables
export default async function handler(req, res) {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'query mancante' })
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return res.status(500).json({ error: 'UNSPLASH_ACCESS_KEY non configurata' })
  try {
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=9&client_id=${key}&orientation=squarish`
    )
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      return res.status(r.status).json({ error: e.errors?.[0] || 'Errore Unsplash' })
    }
    const data = await r.json()
    const results = (data.results || []).map(p => ({
      id: p.id,
      urls: { thumb: p.urls.thumb, small: p.urls.small },
      alt: p.alt_description || p.description || ''
    }))
    res.json({ results })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
