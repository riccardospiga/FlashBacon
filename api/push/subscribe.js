// api/push/subscribe.js — save/replace a PushSubscription for a ripasso.
// Body: { ripassoId: string, subscription: PushSubscription }
// Requires table `push_subscriptions` with columns:
//   id uuid pk default gen_random_uuid(),
//   ripasso_id uuid references studio_pianificato(id) on delete cascade,
//   utente_email text,
//   endpoint text unique,
//   p256dh text not null,
//   auth text not null,
//   created_at timestamptz default now()
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { ripassoId, subscription, utenteEmail } = req.body || {}
    if (!ripassoId || !subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'ripassoId + subscription richiesti' })
    }
    const row = {
      ripasso_id: ripassoId,
      utente_email: utenteEmail || null,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }
    // Idempotent: if this device (endpoint) already subscribed, just update the ripasso link.
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', row.endpoint)
      .maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ ripasso_id: row.ripasso_id, utente_email: row.utente_email, p256dh: row.p256dh, auth: row.auth })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('push_subscriptions').insert(row)
      if (error) throw error
    }
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('push/subscribe error:', e)
    return res.status(500).json({ error: e.message || 'server error' })
  }
}
