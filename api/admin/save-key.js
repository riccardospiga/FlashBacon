// api/admin/save-key.js (CommonJS)
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const ALGO   = 'aes-256-gcm'
const SECRET = Buffer.from(process.env.ENCRYPTION_SECRET, 'hex')
// Server-only route: usa service role key se disponibile (bypassa RLS), altrimenti fallback anon.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

function encrypt(text) {
  const iv     = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, SECRET, iv)
  const enc    = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return { api_key_encrypted: enc.toString('base64'), iv: iv.toString('base64'), auth_tag: cipher.getAuthTag().toString('base64') }
}

async function validateKey(provider, model, apiKey) {
  const test = 'Rispondi solo con "ok"'
  try {
    let res
    switch (provider) {
      case 'anthropic':
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: test }] })
        })
        break
      case 'openai':
        res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: test }], max_tokens: 10 })
        })
        break
      case 'google':
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: test }] }] })
        })
        break
      case 'mistral':
        res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: test }], max_tokens: 10 })
        })
        break
      case 'deepseek':
        res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: test }], max_tokens: 10 })
        })
        break
      default: return false
    }
    return res.ok
  } catch { return false }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { provider, nome_display, modello, api_key } = req.body
    if (!provider || !modello || !api_key) return res.status(400).json({ error: 'Campi mancanti' })

    const valid = await validateKey(provider, modello, api_key)
    if (!valid) return res.status(400).json({ error: 'Chiave API non valida. Controlla la chiave e riprova.' })

    const { api_key_encrypted, iv, auth_tag } = encrypt(api_key)
    const { data, error } = await supabase.from('ai_providers').insert({
      provider, nome_display, modello, api_key_encrypted, iv, auth_tag, attivo: false
    }).select('id,provider,nome_display,modello,attivo').single()

    if (error) throw new Error(error.message)

    // Imposta il nuovo provider come attivo e disattiva tutti gli altri.
    // Prima disattivo gli altri, poi attivo quello appena creato (stessa logica di set-active.js).
    const { error: deactErr } = await supabase.from('ai_providers')
      .update({ attivo: false, updated_at: new Date().toISOString() })
      .neq('id', data.id)
    if (deactErr) console.warn('[save-key] deactivate others:', deactErr.message)

    const { data: activated, error: actErr } = await supabase.from('ai_providers')
      .update({ attivo: true, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .select('id,provider,nome_display,modello,attivo')
      .single()
    if (actErr) {
      console.error('[save-key] activate new:', actErr.message)
      // Non bloccare: il provider è stato comunque salvato
      return res.status(200).json({ success: true, provider: data, activation_error: actErr.message })
    }

    res.status(200).json({ success: true, provider: activated })
  } catch(e) {
    console.error('[save-key]', e.message)
    res.status(500).json({ error: e.message })
  }
}
