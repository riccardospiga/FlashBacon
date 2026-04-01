// api/admin/save-key.js — cifra e salva chiave API nel DB
// Vercel Serverless Function (ESM)

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const ALGO   = 'aes-256-gcm'
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET, 'hex')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

function encrypt(text) {
  const iv     = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, SECRET, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return {
    api_key_encrypted: encrypted.toString('base64'),
    iv:       iv.toString('base64'),
    auth_tag: cipher.getAuthTag().toString('base64'),
  }
}

// Validate key by making a minimal test call to each provider
async function validateKey(provider, model, apiKey) {
  const testPrompt = 'Rispondi solo con "ok"'
  try {
    switch (provider) {
      case 'anthropic': {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: testPrompt }] }),
        })
        return r.ok
      }
      case 'openai': {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: testPrompt }], max_tokens: 10 }),
        })
        return r.ok
      }
      case 'google': {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] }),
        })
        return r.ok
      }
      case 'mistral': {
        const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: testPrompt }], max_tokens: 10 }),
        })
        return r.ok
      }
      case 'deepseek': {
        const r = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: testPrompt }], max_tokens: 10 }),
        })
        return r.ok
      }
      default: return false
    }
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { provider, nome_display, modello, api_key } = req.body
    if (!provider || !modello || !api_key) {
      return res.status(400).json({ error: 'Campi mancanti: provider, modello, api_key' })
    }

    // Validate key
    const valid = await validateKey(provider, modello, api_key)
    if (!valid) {
      return res.status(400).json({ error: 'Chiave API non valida o provider non raggiungibile. Controlla la chiave e riprova.' })
    }

    // Encrypt
    const { api_key_encrypted, iv, auth_tag } = encrypt(api_key)

    // Save to DB
    const { data, error } = await supabase.from('ai_providers').insert({
      provider,
      nome_display,
      modello,
      api_key_encrypted,
      iv,
      auth_tag,
      attivo: false,
    }).select('id, provider, nome_display, modello, attivo').single()

    if (error) throw new Error(error.message)

    res.status(200).json({ success: true, provider: data })
  } catch (e) {
    console.error('[save-key.js]', e)
    res.status(500).json({ error: e.message })
  }
}
