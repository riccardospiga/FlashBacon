// api/transcript.js — YouTube transcript extractor (no API key required for auto-captions)
module.exports = async function handler(req, res) {
  const { v } = req.query
  if (!v) return res.status(400).json({ error: 'videoId mancante' })

  // Try auto-generated captions in order of language preference
  const langs = ['it', 'a.it', 'en', 'a.en']

  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${v}&fmt=json3`
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!r.ok) continue

      const data = await r.json()
      if (!data?.events?.length) continue

      const text = data.events
        .filter(e => e.segs)
        .flatMap(e => e.segs.map(s => s.utf8 || ''))
        .join(' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (text && text.length > 50) {
        return res.status(200).json({ transcript: text, lang })
      }
    } catch { /* try next lang */ }
  }

  // Fallback: try scraping the page to find caption track
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${v}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8' }
    })
    const html = await pageRes.text()

    // Extract caption track URL from page JSON
    const captionMatch = html.match(/"captionTracks":\s*\[.*?"baseUrl":"([^"]+)"/)
    if (captionMatch) {
      const captionUrl = captionMatch[1].replace(/\\u0026/g, '&')
      const capRes = await fetch(captionUrl)
      const capXml = await capRes.text()
      const text = capXml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
      if (text.length > 50) return res.status(200).json({ transcript: text })
    }
  } catch { /* ignore */ }

  return res.status(200).json({ transcript: '[Trascrizione non disponibile per questo video YouTube]' })
}
