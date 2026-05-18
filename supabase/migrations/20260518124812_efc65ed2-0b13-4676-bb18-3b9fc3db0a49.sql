
-- 1. Restrict invitation SELECT to admins (tokens are sensitive)
DROP POLICY IF EXISTS "Users can view invitations for their organization" ON public.invitations;
CREATE POLICY "Admins can view invitations"
  ON public.invitations FOR SELECT
  USING (
    organization_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 2. Notifications: prevent users from creating notifications for other users
DROP POLICY IF EXISTS "Authenticated users can insert notifications for their org." ON public.notifications;
CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT user_roles.organization_id
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
    )
  );

-- 3. has_role: scope role check to caller's current organization to prevent cross-org elevation
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = _user_id
        WHERE ur.user_id = _user_id
          AND ur.role = _role
          AND ur.organization_id = p.organization_id
    )
$function$;
