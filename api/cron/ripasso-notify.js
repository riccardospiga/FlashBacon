// api/cron/ripasso-notify.js — Vercel Cron entrypoint (runs every minute).
// Finds ripassi whose `orario` matches HH:MM in Europe/Rome and whose frequency
// matches today, then fans out a Web Push to every subscription registered
// for each ripasso. Stale subscriptions (404/410) are removed.
const { createClient } = require('@supabase/supabase-js')
const webpush = require('web-push')

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@flashbacon.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Europe/Rome HH:MM + day-of-week ('lun'|'mar'|...|'dom') + day-of-month.
function currentRomeContext() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit', minute: '2-digit', weekday: 'short', day: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const o = Object.fromEntries(parts.map(p => [p.type, p.value]))
  const DOW_MAP = { lun: 'lun', mar: 'mar', mer: 'mer', gio: 'gio', ven: 'ven', sab: 'sab', dom: 'dom' }
  const wk = (o.weekday || '').toLowerCase().slice(0, 3)
  return {
    hhmm: `${o.hour}:${o.minute}`,
    dow: DOW_MAP[wk] || wk,
    dom: Number(o.day || 0),
  }
}

function freqMatches(freq, ctx) {
  if (!freq) return false
  if (freq === 'giornaliero') return true
  if (freq === 'settimanale') return ctx.dow === 'lun'
  if (['lun','mar','mer','gio','ven','sab','dom'].includes(freq)) return ctx.dow === freq
  if (freq.startsWith('mensile-')) return Number(freq.slice(8)) === ctx.dom
  if (freq.startsWith('custom:')) return freq.slice(7).split(',').filter(Boolean).includes(ctx.dow)
  return false
}

async function authorize(req) {
  // Vercel Cron adds Authorization: Bearer <CRON_SECRET> when configured.
  // Also allow calls without secret if CRON_SECRET is not set (dev convenience).
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const got = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '')
  return got === expected
}

module.exports = async function handler(req, res) {
  if (!(await authorize(req))) return res.status(401).json({ error: 'unauthorized' })
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID keys not configured' })
  }

  const ctx = currentRomeContext()

  const { data: ripassi, error } = await supabase
    .from('studio_pianificato')
    .select('id, nome, materia_id, argomento_id, orario, frequenza, utente_email')
    .eq('orario', ctx.hhmm)
  if (error) return res.status(500).json({ error: error.message })

  const due = (ripassi || []).filter(r => freqMatches(r.frequenza, ctx))
  if (!due.length) return res.status(200).json({ ok: true, time: ctx.hhmm, matched: 0 })

  const ids = due.map(r => r.id)
  const { data: subs, error: sErr } = await supabase
    .from('push_subscriptions')
    .select('id, ripasso_id, endpoint, p256dh, auth')
    .in('ripasso_id', ids)
  if (sErr) return res.status(500).json({ error: sErr.message })

  const byRipasso = {}
  for (const s of subs || []) {
    byRipasso[s.ripasso_id] = byRipasso[s.ripasso_id] || []
    byRipasso[s.ripasso_id].push(s)
  }

  // Optional: look up materia name for nicer notification copy.
  const matIds = [...new Set(due.map(r => r.materia_id).filter(Boolean))]
  let materieMap = {}
  if (matIds.length) {
    const { data: materie } = await supabase.from('materie').select('id, nome').in('id', matIds)
    materieMap = Object.fromEntries((materie || []).map(m => [m.id, m.nome]))
  }

  const toDelete = []
  let sent = 0, failed = 0

  for (const r of due) {
    const subsForR = byRipasso[r.id] || []
    if (!subsForR.length) continue
    const materiaNome = materieMap[r.materia_id] || 'Ripasso'
    const payload = JSON.stringify({
      title: r.nome || `Ripasso — ${materiaNome}`,
      body: `È ora del tuo ripasso di ${materiaNome}. Tocca per iniziare.`,
      ripassoId: r.id,
      url: `/?screen=ripasso&ripasso=${encodeURIComponent(r.id)}`,
      tag: `ripasso-${r.id}`,
    })

    await Promise.all(subsForR.map(async s => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 300 }
        )
        sent++
      } catch (e) {
        failed++
        const code = e.statusCode || 0
        if (code === 404 || code === 410) toDelete.push(s.id)
        else console.warn('webpush error', code, e.body || e.message)
      }
    }))
  }

  if (toDelete.length) {
    await supabase.from('push_subscriptions').delete().in('id', toDelete)
  }

  return res.status(200).json({
    ok: true,
    time: ctx.hhmm,
    dow: ctx.dow,
    matched: due.length,
    sent,
    failed,
    pruned: toDelete.length,
  })
}
