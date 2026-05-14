import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  token: string;
  role: 'admin' | 'readonly';
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function useInvitations() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['invitations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!organization?.id,
  });
}

export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: ['invitation-by-token', token],
    queryFn: async () => {
      if (!token) return null;

      // RPC SECURITY DEFINER qui retourne uniquement la ligne correspondant
      // au token (pas d'enumeration possible). Cf. N1.
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { p_token: token });

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

      return {
        id: row.id,
        organization_id: row.organization_id,
        email: row.email,
        token,
        role: row.role,
        invited_by: null,
        expires_at: row.expires_at,
        accepted_at: null,
        created_at: row.expires_at,
        organizations: { name: row.organization_name },
      } as Invitation & { organizations: { name: string } };
    },
    enabled: !!token,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'readonly' }) => {
      if (!organization?.id || !user?.id) {
        throw new Error('Organization or user not found');
      }

      // Check if invitation already exists for this email
      const { data: existing } = await supabase
        .from('invitations')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existing) {
        throw new Error('Une invitation a déjà été envoyée à cette adresse email');
      }

      // Check if user is already in organization
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        throw new Error('Cet utilisateur fait déjà partie de l\'organisation');
      }

      const token = generateToken();

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          organization_id: organization.id,
          email: email.toLowerCase(),
          token,
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation créée avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création de l\'invitation');
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de l\'invitation');
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      // Récupérer l'invitation existante
      const { data: invitation, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !invitation) {
        throw new Error('Invitation non trouvée');
      }

      // Générer un nouveau token et étendre l'expiration
      const newToken = generateToken();
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const { data, error } = await supabase
        .from('invitations')
        .update({
          token: newToken,
          expires_at: newExpiry.toISOString(),
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;
      return data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors du renvoi de l\'invitation');
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      // RPC transactionnelle SECURITY DEFINER : valide le token, met a jour
      // le profil, upsert le role et marque l'invitation acceptee en une
      // seule operation cote serveur. Cf. N1.
      const { data, error } = await supabase
        .rpc('accept_invitation_by_token', { p_token: token });

      if (error) {
        if (error.message?.toLowerCase().includes('invitation')) {
          throw new Error('Invitation invalide ou expirée');
        }
        if (error.message?.toLowerCase().includes('email')) {
          throw new Error('Cette invitation est destinée à une autre adresse email');
        }
        throw new Error(error.message || 'Erreur lors de l\'acceptation');
      }

      return { organization_id: data as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('Vous avez rejoint l\'organisation avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'acceptation de l\'invitation');
    },
  });
}
