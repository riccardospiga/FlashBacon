// api/admin/delete-provider.js (CommonJS)
const { createClient } = require('@supabase/supabase-js')
// Server-only route: usa service role key se disponibile (bypassa RLS), altrimenti fallback anon.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID mancante' })

    const { error } = await supabase.from('ai_providers').delete().eq('id', id)
    if (error) throw new Error(error.message)

    res.status(200).json({ success: true })
  } catch(e) {
    console.error('[delete-provider]', e.message)
    res.status(500).json({ error: e.message })
  }
}
