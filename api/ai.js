// api/ai.js — FlashBacon v5 (CommonJS)
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

async function getActiveProvider() {
  const { data, error } = await supabase.from('ai_providers').select('*').eq('attivo', true).single()
  if (error || !data) throw new Error('Nessun provider AI attivo. Configura un provider nel pannello Admin.')
  return data
}

const isPdf   = u => /\.pdf($|\?)|application%2Fpdf/i.test(u)
const isImage = u => /\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(u)

async function fetchBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download fallito: ${res.status}`)
  const buf  = await res.arrayBuffer()
  const b64  = Buffer.from(buf).toString('base64')
  const ct   = res.headers.get('content-type') || 'image/jpeg'
  return { b64, mime: ct.split(';')[0].trim() }
}

async function fetchUrlText(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return `[URL non raggiungibile: ${url}]`
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text')) return `[Contenuto non testuale: ${url}]`
    const text = await res.text()
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
  } catch(e) {
    return `[Errore lettura URL: ${url}]`
  }
}

function buildLengthDesc(length) {
  return (['breve e concisa', 'di media lunghezza', 'lunga e dettagliata'])[( length || 2) - 1]
}

async function callGemini(apiKey, model, prompt, imageUrls, systemPrompt) {
  const parts = []
  for (const url of imageUrls) {
    if (isPdf(url))        parts.push({ file_data: { mime_type: 'application/pdf', file_uri: url } })
    else if (isImage(url)) parts.push({ file_data: { mime_type: 'image/jpeg',      file_uri: url } })
  }
  parts.push({ text: systemPrompt + '\n\n' + prompt })
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }] }) }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callAnthropic(apiKey, model, prompt, imageUrls, systemPrompt) {
  const content = []
  for (const url of imageUrls.slice(0, 2)) {
    try {
      const { b64, mime } = await fetchBase64(url)
      const mt = (isPdf(url) || mime === 'application/pdf') ? 'application/pdf' : mime
      content.push({ type: mt === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: mt, data: b64 } })
    } catch(e) { console.warn('Skipped:', e.message) }
  }
  content.push({ type: 'text', text: prompt })
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content }] })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.content?.[0]?.text || ''
}

async function callOpenAI(apiKey, model, prompt, imageUrls, systemPrompt) {
  const content = []
  for (const url of imageUrls) {
    if (isImage(url)) content.push({ type: 'image_url', image_url: { url, detail: 'high' } })
  }
  content.push({ type: 'text', text: prompt })
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }] })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

async function callMistral(apiKey, model, prompt, imageUrls, systemPrompt) {
  const content = []
  for (const url of imageUrls) {
    if (isImage(url)) content.push({ type: 'image_url', image_url: url })
  }
  content.push({ type: 'text', text: prompt })
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }] })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

async function callDeepSeek(apiKey, model, prompt, systemPrompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data))
  return data.choices?.[0]?.message?.content || ''
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { prompt, images = [], textSources = [], urlSources = [], settings = {}, systemContext = '', fileNames = '' } = req.body
    if (!prompt) return res.status(400).json({ error: 'Prompt mancante' })

    // Fetch URL sources as text
    const urlTexts = await Promise.all(urlSources.map(fetchUrlText))
    const extraText = [...textSources, ...urlTexts].filter(Boolean).join('\n\n---\n\n')

    // Build system prompt
    const lengthDesc = buildLengthDesc(settings.length)
    let sysPrompt = systemContext || 'Sei FlashBacon AI, un assistente di studio. Rispondi in italiano.'
    sysPrompt += ` La risposta deve essere ${lengthDesc}.`
    if (fileNames) sysPrompt += ` Le fonti disponibili sono: ${fileNames}.`
    if (extraText) sysPrompt += `\n\nContenuto testuale delle fonti:\n${extraText}`

    const prov   = await getActiveProvider()
    const apiKey = decrypt(prov.api_key_encrypted, prov.iv, prov.auth_tag)

    let result = ''
    switch (prov.provider) {
      case 'anthropic': result = await callAnthropic(apiKey, prov.modello, prompt, images, sysPrompt); break
      case 'openai':    result = await callOpenAI(apiKey, prov.modello, prompt, images, sysPrompt);    break
      case 'google':    result = await callGemini(apiKey, prov.modello, prompt, images, sysPrompt);    break
      case 'mistral':   result = await callMistral(apiKey, prov.modello, prompt, images, sysPrompt);   break
      case 'deepseek':  result = await callDeepSeek(apiKey, prov.modello, prompt, sysPrompt);          break
      default: throw new Error(`Provider sconosciuto: ${prov.provider}`)
    }

    res.status(200).json({ result })
  } catch(e) {
    console.error('[ai.js]', e.message)
    res.status(500).json({ error: e.message })
  }
}
