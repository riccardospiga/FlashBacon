module.exports = async function handler(req, res) {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'Missing url' })

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlashBacon/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return res.status(502).json({ error: `HTTP ${response.status}` })

    const html = await response.text()

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000)

    res.json({ text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
