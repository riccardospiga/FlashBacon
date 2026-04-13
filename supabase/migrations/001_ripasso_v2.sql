-- Migration: Ripasso V2
-- Eseguire nel SQL Editor di Supabase

-- 1. Aggiungi colonne a studio_pianificato
ALTER TABLE studio_pianificato
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS prompt_personalizzato text;

-- 2. Crea tabella ripassi_quiz
CREATE TABLE IF NOT EXISTS ripassi_quiz (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ripasso_id  uuid NOT NULL REFERENCES studio_pianificato(id) ON DELETE CASCADE,
  domande     jsonb NOT NULL DEFAULT '[]',
  modalita    text DEFAULT 'multipla',
  created_at  timestamptz DEFAULT now()
);

-- 3. RLS
ALTER TABLE ripassi_quiz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente gestisce i propri ripassi_quiz" ON ripassi_quiz
  USING (
    EXISTS (
      SELECT 1 FROM studio_pianificato sp
      WHERE sp.id = ripassi_quiz.ripasso_id
        AND sp.utente_email = (auth.jwt() ->> 'email')
    )
  );

-- 4. Aggiungi cover_image a materie
ALTER TABLE materie
  ADD COLUMN IF NOT EXISTS cover_image text;
