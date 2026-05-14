-- =============================================
-- N5 — Garde anti-double-relance sur send-payment-reminders
-- =============================================
-- Ajoute une colonne pour tracer la derniere relance envoyee,
-- permettant a la fonction Edge de ne relancer qu'une fois par
-- periode (7 jours par defaut).

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_last_reminder_sent_at
  ON public.invoices(last_reminder_sent_at);
