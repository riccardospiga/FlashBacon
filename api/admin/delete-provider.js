// api/admin/delete-provider.js — elimina un provider dal DB
// Vercel Serverless Function

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID provider mancante' })

    const { error } = await supabase
      .from('ai_providers')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)

    res.status(200).json({ success: true })
  } catch (e) {
    console.error('[delete-provider.js]', e)
    res.status(500).json({ error: e.message })
  }
}
