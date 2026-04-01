// api/admin/set-active.js — attiva un provider e disattiva tutti gli altri
// Vercel Serverless Function (ESM)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID provider mancante' })

    // Disattiva tutti
    const { error: err1 } = await supabase
      .from('ai_providers')
      .update({ attivo: false, updated_at: new Date().toISOString() })
      .neq('id', id)   // tutti tranne quello scelto

    if (err1) throw new Error(err1.message)

    // Attiva quello scelto
    const { error: err2 } = await supabase
      .from('ai_providers')
      .update({ attivo: true, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (err2) throw new Error(err2.message)

    res.status(200).json({ success: true })
  } catch (e) {
    console.error('[set-active.js]', e)
    res.status(500).json({ error: e.message })
  }
}
