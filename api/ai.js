// api/ai.js — FlashBacon multi-provider AI router (ESM)
// Ottimizzato per Vercel Free (10s timeout):
// - Gemini: URL diretti (fileData) — nessun download lato server
// - Anthropic: base64 solo se necessario, con limite 1 file
// - OpenAI/Mistral: URL diretti per immagini
// - DeepSeek: solo testo

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const ALGO   = 'aes-256-gcm'
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET, 'hex')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

function decrypt(api_key_encrypted, iv, auth_tag) {
  const decipher = crypto.createDecipheriv(ALGO, SECRET, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(auth_tag, 'base64'))
  return decipher.update(api_key_encrypted, 'base64', 'utf8') + decipher.final('utf8')
}

async function getActiveProvider() {
  const { data, error } = await supabase
    .from('ai_providers').select('*').eq('attivo', true).single()
  if (error || !data) throw new Error('Nessun provider AI attivo. Configura un provider nel pannello Admin.')
  return data
}

const isPdf   = url => /\.pdf($|\?)|application%2Fpdf/i.test(url)
const isImage = url => /\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(url)

// Scarica UN solo file come base64 (usato solo da Anthropic come fallback)
async function singleUrlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download fallito: ${res.status}`)
  const buf  = await res.arrayBuffer()
  const b64  = Buffer.from(buf).toString('base64')
  const ct   = res.headers.get('content-type') || 'image/jpeg'
  return { b64, mime: ct.split(';')[0].trim() }
}

// ── GEMINI: usa fileData con URL pubblici — zero download lato server ──
async function callGemini(apiKey, model, prompt, imageUrls) {
  const parts = []

  for (const url of imageUrls) {
    // Gemini fileData accetta URL pubblici direttamente
    const mimeType = isPdf(url) ? 'application/pdf'
      : isImage(url)            ? 'image/jpeg'
      : null
    if (!mimeType) continue
    parts.push({ file_data: { mime_type: mimeType, file_uri: url } })
  }

  parts.push({ text: prompt })

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ── ANTHROPIC: base64 ma solo max 2 file per evitare timeout ──
async function callAnthropic(apiKey, model, prompt, imageUrls) {
  const content = []
  const limited = imageUrls.slice(0, 2) // max 2 file per stare nei 10s

  for (const url of limited) {
    try {
      const { b64, mime } = await singleUrlToBase64(url)
      if (isPdf(url) || mime === 'application/pdf') {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } })
      } else {
        content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })
      }
    } catch(e) { console.warn('File saltato:', e.message) }
  }
  content.push({ type: 'text', text: prompt })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.content?.[0]?.text || ''
}

// ── OPENAI: URL diretti per immagini ──
async function callOpenAI(apiKey, model, prompt, imageUrls) {
  const content = []
  for (const url of imageUrls) {
    if (isImage(url)) content.push({ type: 'image_url', image_url: { url, detail: 'high' } })
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

// ── MISTRAL: URL diretti per immagini ──
async function callMistral(apiKey, model, prompt, imageUrls) {
  const content = []
  for (const url of imageUrls) {
    if (isImage(url)) content.push({ type: 'image_url', image_url: url })
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

// ── DEEPSEEK: solo testo ──
async function callDeepSeek(apiKey, model, prompt) {
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
export default async function handler(req, res) {
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
  } catch(e) {
    console.error('[ai.js]', e.message)
    res.status(500).json({ error: e.message })
  }
}
