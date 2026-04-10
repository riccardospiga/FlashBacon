// api/ai.js — FlashBacon v5 streaming (CommonJS)
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const ALGO   = 'aes-256-gcm'
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET, 'hex')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const TOKEN_LIMITS = { owner: 150000, beta: 10000 }

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

const isPdf     = u => /\.pdf($|\?)|application%2Fpdf/i.test(u) || u.startsWith('data:application/pdf')
const isImage   = u => /\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(u) || /^data:image\//i.test(u)
const isDataUrl = u => typeof u === 'string' && u.startsWith('data:')

function parseDataUrl(dataUrl) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  return m ? { mime: m[1], b64: m[2] } : null
}

async function fetchBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download fallito: ${res.status}`)
  const buf = await res.arrayBuffer()
  const b64 = Buffer.from(buf).toString('base64')
  const ct  = res.headers.get('content-type') || 'image/jpeg'
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
  return (['breve e concisa', 'di media lunghezza', 'lunga e dettagliata'])[(length || 2) - 1]
}

// ─── SSE helper ───────────────────────────────────────────────────────────────
function sseChunk(res, text) {
  res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`)
}

// ─── Read an SSE / NDJSON stream from a provider and forward chunks ──────────
async function readOpenAIStream(response, res) {
  const reader   = response.body.getReader()
  const decoder  = new TextDecoder()
  let buf = '', fullText = '', tokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const line of lines) {
      if (line.trim() === 'data: [DONE]') continue
      if (!line.startsWith('data: ')) continue
      try {
        const d = JSON.parse(line.slice(6))
        const text = d.choices?.[0]?.delta?.content || ''
        if (text) { fullText += text; sseChunk(res, text) }
        if (d.usage?.total_tokens) tokens = d.usage.total_tokens
      } catch {}
    }
  }
  return { text: fullText, tokens }
}

// ─── Provider streaming functions ────────────────────────────────────────────
async function streamAnthropic(apiKey, model, prompt, imageUrls, systemPrompt, maxTokens, res) {
  const content = []
  for (const url of imageUrls) {
    try {
      let b64, mime
      if (isDataUrl(url)) { const p = parseDataUrl(url); if (!p) continue; b64 = p.b64; mime = p.mime }
      else { const f = await fetchBase64(url); b64 = f.b64; mime = f.mime }
      const mt = mime === 'application/pdf' ? 'application/pdf' : mime
      content.push({ type: mt === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: mt, data: b64 } })
    } catch(e) { console.warn('Skipped:', e.message) }
  }
  content.push({ type: 'text', text: prompt })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content }], stream: true })
  })
  if (!response.ok) { const d = await response.json(); throw new Error(d.error?.message || 'Anthropic error') }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', fullText = '', inputTok = 0, outputTok = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const d = JSON.parse(line.slice(6))
        if (d.type === 'content_block_delta' && d.delta?.text) {
          fullText += d.delta.text; sseChunk(res, d.delta.text)
        }
        if (d.type === 'message_start' && d.message?.usage) inputTok = d.message.usage.input_tokens || 0
        if (d.type === 'message_delta' && d.usage)          outputTok = d.usage.output_tokens || 0
      } catch {}
    }
  }
  return { text: fullText, tokens: inputTok + outputTok }
}

async function streamOpenAI(apiKey, model, prompt, imageUrls, systemPrompt, maxTokens, res) {
  const content = []
  for (const url of imageUrls) {
    if (isImage(url)) content.push({ type: 'image_url', image_url: { url, detail: 'high' } })
  }
  content.push({ type: 'text', text: prompt })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }], stream: true, stream_options: { include_usage: true } })
  })
  if (!response.ok) { const d = await response.json(); throw new Error(d.error?.message || 'OpenAI error') }
  return readOpenAIStream(response, res)
}

async function streamGemini(apiKey, model, prompt, imageUrls, systemPrompt, maxTokens, res) {
  const parts = []
  for (const url of imageUrls) {
    if (isDataUrl(url)) {
      const parsed = parseDataUrl(url)
      if (parsed) parts.push({ inline_data: { mime_type: parsed.mime, data: parsed.b64 } })
    } else if (isPdf(url)) {
      parts.push({ file_data: { mime_type: 'application/pdf', file_uri: url } })
    } else if (isImage(url)) {
      parts.push({ file_data: { mime_type: 'image/jpeg', file_uri: url } })
    }
  }
  parts.push({ text: systemPrompt + '\n\n' + prompt })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens } }) }
  )
  if (!response.ok) { const d = await response.json(); throw new Error(d.error?.message || 'Gemini error') }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', fullText = '', tokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const d = JSON.parse(line.slice(6))
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text) { fullText += text; sseChunk(res, text) }
        if (d.usageMetadata) tokens = (d.usageMetadata.promptTokenCount || 0) + (d.usageMetadata.candidatesTokenCount || 0)
      } catch {}
    }
  }
  return { text: fullText, tokens }
}

async function streamMistral(apiKey, model, prompt, imageUrls, systemPrompt, maxTokens, res) {
  // Build content array: immagini prima, poi testo — formato Mistral vision (Pixtral)
  const content = []
  for (const url of imageUrls) {
    if (isImage(url)) content.push({ type: 'image_url', image_url: { url } })
  }
  // System context embedded nel text: Mistral vision non processa il role 'system'
  // separatamente quando il content è un array multimodale
  const fullText = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
  content.push({ type: 'text', text: fullText })

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content }], stream: true })
  })
  if (!response.ok) { const d = await response.json(); throw new Error(d.error?.message || 'Mistral error') }
  return readOpenAIStream(response, res)
}

async function streamDeepSeek(apiKey, model, prompt, systemPrompt, maxTokens, res) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], stream: true })
  })
  if (!response.ok) { const d = await response.json(); throw new Error(d.error?.message || 'DeepSeek error') }
  return readOpenAIStream(response, res)
}

// ─── Token helpers ────────────────────────────────────────────────────────────
async function getTokenProfile(userEmail) {
  const { data, error } = await supabase.from('profili').select('id, token_usati, token_reset_date, ruolo').eq('email', userEmail).single()
  if (error || !data) return null
  return data
}

async function checkAndUpdateTokens(userEmail, tokensUsed) {
  if (!userEmail) return { allowed: true, tokensUsed: 0, limit: 0, resetDate: null }
  const profile = await getTokenProfile(userEmail)
  if (!profile) return { allowed: true, tokensUsed: 0, limit: 0, resetDate: null }

  const role  = profile.ruolo || 'beta'
  const limit = TOKEN_LIMITS[role] ?? TOKEN_LIMITS.beta
  const resetDate  = profile.token_reset_date ? new Date(profile.token_reset_date) : new Date()
  const now        = new Date()
  const daysSince  = Math.floor((now - resetDate) / (1000 * 60 * 60 * 24))
  let   currentUsed = profile.token_usati || 0

  if (daysSince >= 30) {
    currentUsed = 0
    await supabase.from('profili').update({ token_usati: 0, token_reset_date: now.toISOString().split('T')[0] }).eq('id', profile.id)
  }

  if (currentUsed >= limit) {
    const nextReset = new Date(resetDate); nextReset.setDate(nextReset.getDate() + 30)
    return { allowed: false, tokensUsed: currentUsed, limit, resetDate: nextReset.toISOString().split('T')[0] }
  }

  if (tokensUsed > 0) {
    await supabase.from('profili').update({ token_usati: currentUsed + tokensUsed }).eq('id', profile.id)
  }

  const nextReset = new Date(daysSince >= 30 ? now : resetDate); nextReset.setDate(nextReset.getDate() + 30)
  return { allowed: true, tokensUsed: currentUsed + tokensUsed, limit, resetDate: nextReset.toISOString().split('T')[0] }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { prompt, images = [], textSources = [], urlSources = [], settings = {}, systemContext = '', fileNames = '', userEmail = '' } = req.body

    // Debug: log received images
    console.log('[ai.js] immagini ricevute:', images.length)
    images.forEach((img, i) => {
      const preview = typeof img === 'string' ? img.slice(0, 100) : String(img)
      console.log(`  img[${i}]: ${preview}…`)
    })

    if (!prompt) return res.status(400).json({ error: 'Prompt mancante' })
    const maxTokens = Math.min(settings.maxTokens || 4096, 4096)

    // Pre-call token check — returns JSON error (before SSE headers set)
    if (userEmail) {
      const pre = await checkAndUpdateTokens(userEmail, 0)
      if (!pre.allowed) {
        return res.status(429).json({
          error: `Limite token raggiunto (${pre.tokensUsed.toLocaleString('it')} / ${pre.limit.toLocaleString('it')}). Reset il ${pre.resetDate}.`,
          tokenLimitReached: true, tokensUsed: pre.tokensUsed, tokenLimit: pre.limit, tokenResetDate: pre.resetDate
        })
      }
    }

    // Fetch URL sources as text
    const urlTexts  = await Promise.all(urlSources.map(fetchUrlText))
    const extraText = [...textSources, ...urlTexts].filter(Boolean).join('\n\n---\n\n')

    // Build system prompt
    const lengthDesc = buildLengthDesc(settings.length)
    let sysPrompt = systemContext || 'Sei FlashBacon AI, un assistente di studio. Rispondi in italiano.'
    sysPrompt += ` La risposta deve essere ${lengthDesc}.`
    if (fileNames)  sysPrompt += ` Le fonti disponibili sono: ${fileNames}.`
    if (extraText)  sysPrompt += `\n\nContenuto testuale delle fonti:\n${extraText}`

    const prov   = await getActiveProvider()
    const apiKey = decrypt(prov.api_key_encrypted, prov.iv, prov.auth_tag)

    // ── Set SSE headers before first write ───────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.setHeader('Connection', 'keep-alive')

    let resp = { text: '', tokens: 0 }
    switch (prov.provider) {
      case 'anthropic': resp = await streamAnthropic(apiKey, prov.modello, prompt, images, sysPrompt, maxTokens, res); break
      case 'openai':    resp = await streamOpenAI(apiKey, prov.modello, prompt, images, sysPrompt, maxTokens, res);    break
      case 'google':    resp = await streamGemini(apiKey, prov.modello, prompt, images, sysPrompt, maxTokens, res);    break
      case 'mistral':   resp = await streamMistral(apiKey, prov.modello, prompt, images, sysPrompt, maxTokens, res);   break
      case 'deepseek':  resp = await streamDeepSeek(apiKey, prov.modello, prompt, sysPrompt, maxTokens, res);          break
      default: throw new Error(`Provider sconosciuto: ${prov.provider}`)
    }

    // Post-call token update
    let tokenInfo = { tokensUsed: 0, tokenLimit: 0, tokenResetDate: null }
    if (userEmail && resp.tokens > 0) {
      const post = await checkAndUpdateTokens(userEmail, resp.tokens)
      tokenInfo = { tokensUsed: post.tokensUsed, tokenLimit: post.limit, tokenResetDate: post.resetDate }
    }

    // Final done event — includes full text for non-streaming consumers
    res.write(`data: ${JSON.stringify({ done: true, result: resp.text, ...tokenInfo })}\n\n`)
    res.end()

  } catch(e) {
    console.error('[ai.js]', e.message)
    if (res.headersSent) {
      try { res.write(`data: ${JSON.stringify({ error: e.message, done: true })}\n\n`); res.end() } catch {}
    } else {
      res.status(500).json({ error: e.message })
    }
  }
}

// Increase body-parser limit so large base64 image payloads are not rejected
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}
