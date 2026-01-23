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

      const { data, error } = await supabase
        .from('invitations')
        .select('*, organizations(name)')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      return data as (Invitation & { organizations: { name: string } }) | null;
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
      // First get the invitation details
      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invError || !invitation) {
        throw new Error('Invitation invalide ou expirée');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Vous devez être connecté pour accepter l\'invitation');
      }

      // Update user's profile with organization_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: invitation.organization_id })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Add or update user role (prevent duplicates)
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', invitation.organization_id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: invitation.role })
          .eq('id', existingRole.id);
        if (roleError) throw roleError;
      } else {
        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            organization_id: invitation.organization_id,
            role: invitation.role,
          });
        if (roleError) throw roleError;
      }

      // Mark invitation as accepted
      const { error: acceptError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (acceptError) throw acceptError;

      return invitation;
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
