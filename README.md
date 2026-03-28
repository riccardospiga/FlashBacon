# ⚡ FlashBacon

Web app per studiare con l'AI — carica le tue fonti e genera riassunti, quiz, flash card e mappe concettuali.

**Stack:** React 18 + Vite · Supabase · Vercel · AI multi-provider (Claude, GPT-4o, Gemini, Mistral, DeepSeek)

---

## Setup locale

```bash
npm install
cp .env.example .env
# Compila .env con i tuoi valori Supabase e ENCRYPTION_SECRET
npm run dev
```

## Struttura

```
src/
  App.jsx        # Tutta la UI React
  supabase.js    # Client Supabase
  main.jsx       # Entry point
api/
  ai.js                    # Router AI multi-provider
  admin/
    save-key.js            # Cifra e salva chiave API
    set-active.js          # Attiva provider
    delete-provider.js     # Elimina provider
```

## Variabili d'ambiente (Vercel)

| Variabile | Dove trovarla |
|-----------|--------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `ENCRYPTION_SECRET` | Generala con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

## Primo avvio admin

1. Registra il tuo account nell'app
2. Vai su Supabase Dashboard → Table Editor → `profili`
3. Trova la tua riga e imposta `is_admin = true`
4. Ricarica l'app → Profilo → Pannello Admin → aggiungi un provider AI
