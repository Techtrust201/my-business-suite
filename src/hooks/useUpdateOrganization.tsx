import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from './useOrganization';

interface OrganizationUpdate {
  name?: string;
  legal_name?: string;
  siret?: string;
  vat_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
}

interface BankingUpdate {
  rib?: string;
  bic?: string;
  bank_details?: string;
}

interface BillingSettingsUpdate {
  currency?: string;
  invoice_prefix?: string;
  quote_prefix?: string;
  default_payment_terms?: number;
  legal_mentions?: string;
}

interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { organization, refetch } = useOrganization();

  return useMutation({
    mutationFn: async (data: OrganizationUpdate) => {
      if (!organization?.id) {
        throw new Error('Aucune organisation trouvée');
      }

      const { data: result, error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organization.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: 'Organisation mise à jour',
        description: 'Les informations ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBanking() {
  const { toast } = useToast();
  const { organization, refetch } = useOrganization();

  return useMutation({
    mutationFn: async (data: BankingUpdate) => {
      if (!organization?.id) {
        throw new Error('Aucune organisation trouvée');
      }

      const { data: result, error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organization.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: 'Coordonnées bancaires mises à jour',
        description: 'Les informations ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBillingSettings() {
  const { toast } = useToast();
  const { organization, refetch } = useOrganization();

  return useMutation({
    mutationFn: async (data: BillingSettingsUpdate) => {
      if (!organization?.id) {
        throw new Error('Aucune organisation trouvée');
      }

      const { data: result, error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organization.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: 'Paramètres de facturation mis à jour',
        description: 'Les informations ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProfile() {
  const { toast } = useToast();
  const { profile, refetch } = useOrganization();

  return useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      if (!profile?.id) {
        throw new Error('Aucun profil trouvé');
      }

      const { data: result, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de mettre à jour: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
