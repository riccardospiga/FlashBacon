// api/transcribe.js — Audio transcription via OpenAI Whisper
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const ALGO   = 'aes-256-gcm'
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET, 'hex')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

function decrypt(enc, iv, tag) {
  const d = crypto.createDecipheriv(ALGO, SECRET, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return d.update(enc, 'base64', 'utf8') + d.final('utf8')
}

// Parse multipart form data manually (Vercel edge doesn't have multer by default)
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      const ct = req.headers['content-type'] || ''
      const boundaryMatch = ct.match(/boundary=(.+)/)
      if (!boundaryMatch) return reject(new Error('No boundary'))

      const boundary = '--' + boundaryMatch[1]
      const parts = body.toString('binary').split(boundary)
      const files = {}

      for (const part of parts) {
        if (!part.includes('Content-Disposition')) continue
        const headerEnd = part.indexOf('\r\n\r\n')
        if (headerEnd === -1) continue
        const headers = part.slice(0, headerEnd)
        const nameMatch = headers.match(/name="([^"]+)"/)
        const filenameMatch = headers.match(/filename="([^"]+)"/)
        const ctMatch = headers.match(/Content-Type:\s*([^\r\n]+)/)
        if (!nameMatch || !filenameMatch) continue

        const content = part.slice(headerEnd + 4, part.length - 2)
        const buf = Buffer.from(content, 'binary')
        files[nameMatch[1]] = {
          buffer: buf,
          filename: filenameMatch[1],
          contentType: ctMatch ? ctMatch[1].trim() : 'audio/mpeg'
        }
      }
      resolve(files)
    })
    req.on('error', reject)
  })
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Get OpenAI provider key
    const { data: prov } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('provider', 'openai')
      .order('created_at')
      .limit(1)
      .single()

    if (!prov) return res.status(400).json({ error: 'Provider OpenAI non configurato. La trascrizione audio richiede OpenAI.' })

    const apiKey = decrypt(prov.api_key_encrypted, prov.iv, prov.auth_tag)

    const files = await parseMultipart(req)
    const audioFile = files['file']
    if (!audioFile) return res.status(400).json({ error: 'File audio mancante' })

    // Call OpenAI Whisper
    const form = new FormData()
    form.append('file', new Blob([audioFile.buffer], { type: audioFile.contentType }), audioFile.filename)
    form.append('model', 'whisper-1')
    form.append('language', 'it')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: form
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.json().catch(() => ({}))
      throw new Error(err.error?.message || `Whisper error ${whisperRes.status}`)
    }

    const data = await whisperRes.json()
    res.status(200).json({ transcript: data.text || '' })
  } catch (e) {
    console.error('[transcribe.js]', e.message)
    res.status(500).json({ error: e.message })
  }
}
