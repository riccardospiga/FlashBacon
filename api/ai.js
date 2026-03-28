// api/ai.js — FlashBacon multi-provider AI router
// Vercel Serverless Function

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const ALGO   = 'aes-256-gcm'
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET, 'hex')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

function decrypt(api_key_encrypted, iv, auth_tag) {
  const decipher = crypto.createDecipheriv(ALGO, SECRET, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(auth_tag, 'base64'))
  return decipher.update(api_key_encrypted, 'base64', 'utf8') + decipher.final('utf8')
}

async function getActiveProvider() {
  const { data, error } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('attivo', true)
    .single()
  if (error || !data) throw new Error('Nessun provider AI attivo. Configura un provider nel pannello Admin.')
  return data
}

// ── IMAGE FETCH: URL → base64 ──
async function urlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Impossibile scaricare immagine: ${url}`)
  const buf  = await res.arrayBuffer()
  const b64  = Buffer.from(buf).toString('base64')
  const mime = res.headers.get('content-type') || 'image/jpeg'
  return { b64, mime }
}

// ── PROVIDER CALLS ──
async function callAnthropic(apiKey, model, prompt, images) {
  const content = []
  for (const imgUrl of images) {
    try {
      const { b64, mime } = await urlToBase64(imgUrl)
      content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })
    } catch (e) { console.warn('Immagine saltata:', e.message) }
  }
  content.push({ type: 'text', text: prompt })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.content?.[0]?.text || ''
}

async function callOpenAI(apiKey, model, prompt, images) {
  const content = []
  for (const imgUrl of images) {
    content.push({ type: 'image_url', image_url: { url: imgUrl, detail: 'high' } })
  }
  content.push({ type: 'text', text: prompt })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: 4096 }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

async function callGemini(apiKey, model, prompt, images) {
  const parts = []
  for (const imgUrl of images) {
    try {
      const { b64, mime } = await urlToBase64(imgUrl)
      parts.push({ inline_data: { mime_type: mime, data: b64 } })
    } catch (e) { console.warn('Immagine saltata:', e.message) }
  }
  parts.push({ text: prompt })

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callMistral(apiKey, model, prompt, images) {
  const content = []
  for (const imgUrl of images) {
    content.push({ type: 'image_url', image_url: imgUrl })
  }
  content.push({ type: 'text', text: prompt })

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: 4096 }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

async function callDeepSeek(apiKey, model, prompt) {
  // DeepSeek: testo only
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

// ── MAIN HANDLER ──
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { prompt, images = [] } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt mancante' })

    const prov   = await getActiveProvider()
    const apiKey = decrypt(prov.api_key_encrypted, prov.iv, prov.auth_tag)

    let result = ''
    switch (prov.provider) {
      case 'anthropic': result = await callAnthropic(apiKey, prov.modello, prompt, images); break
      case 'openai':    result = await callOpenAI(apiKey, prov.modello, prompt, images);    break
      case 'google':    result = await callGemini(apiKey, prov.modello, prompt, images);    break
      case 'mistral':   result = await callMistral(apiKey, prov.modello, prompt, images);   break
      case 'deepseek':  result = await callDeepSeek(apiKey, prov.modello, prompt);          break
      default: throw new Error(`Provider sconosciuto: ${prov.provider}`)
    }

    res.status(200).json({ result })
  } catch (e) {
    console.error('[ai.js]', e)
    res.status(500).json({ error: e.message })
  }
}
