// api/admin/set-active.js (CommonJS)
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID mancante' })

    const { error: e1 } = await supabase.from('ai_providers')
      .update({ attivo: false, updated_at: new Date().toISOString() })
      .neq('id', id)
    if (e1) throw new Error(e1.message)

    const { error: e2 } = await supabase.from('ai_providers')
      .update({ attivo: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (e2) throw new Error(e2.message)

    res.status(200).json({ success: true })
  } catch(e) {
    console.error('[set-active]', e.message)
    res.status(500).json({ error: e.message })
  }
}
