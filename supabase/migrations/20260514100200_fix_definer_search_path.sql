-- =============================================
-- N7 — Fonctions SECURITY DEFINER : search_path + REVOKE + IDOR fix
-- =============================================
-- Pourquoi :
--   - Plusieurs fonctions DEFINER n'ont pas SET search_path → vecteur
--     d'abus classique (search_path injection).
--   - get_due_reminders(_user_id) acceptait un parametre user arbitraire
--     → IDOR direct (lecture des rappels d'un autre user).
--   - create_notification n'avait aucun check : forgery cross-org possible.
--   - process_auto_reminders / calculate_invoice_commission ne sont pas
--     appelees par le client : on les reserve au service_role.
-- =============================================

-- Fige search_path sur les fonctions existantes.
ALTER FUNCTION public.process_auto_reminders()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.calculate_invoice_commission(uuid, uuid)
  SET search_path = public, pg_temp;

-- Trigger function (pas de parametres typed)
ALTER FUNCTION public.update_bank_account_balance()
  SET search_path = public, pg_temp;

-- Mark_*_read et update_reminder_timestamp egalement pour completude.
ALTER FUNCTION public.mark_notifications_read(uuid[])
  SET search_path = public, pg_temp;

ALTER FUNCTION public.mark_all_notifications_read()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_reminder_timestamp()
  SET search_path = public, pg_temp;

-- =============================================
-- IDOR fix : get_due_reminders n'accepte plus de parametre user.
-- =============================================
DROP FUNCTION IF EXISTS public.get_due_reminders(uuid);

CREATE OR REPLACE FUNCTION public.get_due_reminders()
RETURNS SETOF public.reminders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM public.reminders
  WHERE user_id = auth.uid()
    AND is_completed = FALSE
    AND remind_at <= now() + interval '1 hour'
  ORDER BY remind_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_due_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_due_reminders() TO authenticated;

-- =============================================
-- create_notification : DEFINER avec check d'autorisation interne.
-- L'appelant doit appartenir a l'organisation _organization_id, et
-- le destinataire _user_id doit aussi en etre membre.
-- =============================================
CREATE OR REPLACE FUNCTION public.create_notification(
    _organization_id uuid,
    _user_id uuid,
    _type text,
    _title text,
    _message text DEFAULT NULL,
    _link text DEFAULT NULL,
    _data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    notification_id uuid;
    v_caller uuid := auth.uid();
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Caller doit etre membre de l'org cible.
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_caller AND organization_id = _organization_id
    ) THEN
        RAISE EXCEPTION 'Forbidden: caller is not a member of the target organization'
            USING ERRCODE = '42501';
    END IF;

    -- Destinataire doit aussi etre membre de la meme org.
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND organization_id = _organization_id
    ) THEN
        RAISE EXCEPTION 'Forbidden: target user is not a member of the organization'
            USING ERRCODE = '42501';
    END IF;

    -- Validation defensive des champs texte pour eviter une explosion en taille.
    IF length(coalesce(_title, '')) > 200 THEN
        RAISE EXCEPTION 'Title too long' USING ERRCODE = '22023';
    END IF;
    IF length(coalesce(_message, '')) > 2000 THEN
        RAISE EXCEPTION 'Message too long' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.notifications (organization_id, user_id, type, title, message, link, data)
    VALUES (_organization_id, _user_id, _type, _title, _message, _link, _data)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, jsonb) TO authenticated;

-- =============================================
-- Reserve les fonctions ops au service role / postgres (pas appelees client).
-- =============================================
REVOKE EXECUTE ON FUNCTION public.process_auto_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_auto_reminders() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_invoice_commission(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_invoice_commission(uuid, uuid) FROM anon, authenticated;
