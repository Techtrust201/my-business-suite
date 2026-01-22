import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export interface Prospect {
  id: string;
  organization_id: string;
  company_name: string;
  siren: string | null;
  siret: string | null;
  vat_number: string | null;
  legal_form: string | null;
  naf_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  status_id: string | null;
  assigned_to_user_id: string | null;
  source: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  contact_id: string | null;
  converted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectWithStatus extends Prospect {
  status: {
    id: string;
    name: string;
    color: string;
    is_final_positive: boolean;
    is_final_negative: boolean;
  } | null;
}

export interface ProspectContact {
  id: string;
  prospect_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectVisit {
  id: string;
  prospect_id: string;
  organization_id: string;
  visited_by: string;
  visited_at: string;
  duration_minutes: number | null;
  status_before_id: string | null;
  status_after_id: string | null;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  visit_latitude: number | null;
  visit_longitude: number | null;
  created_at: string;
}

export type ProspectInsert = Omit<Prospect, 'id' | 'created_at' | 'updated_at' | 'geocoded_at' | 'converted_at'>;
export type ProspectUpdate = Partial<Omit<Prospect, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;

interface UseProspectsOptions {
  statusId?: string | 'all';
  assignedTo?: string | 'all';
  search?: string;
  source?: string;
  hasCoordinates?: boolean;
}

export function useProspects(options?: UseProspectsOptions) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Realtime subscription
  useRealtimeSubscription({
    tables: ['prospects'],
    queryKeys: [['prospects']],
  });

  return useQuery({
    queryKey: ['prospects', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('prospects')
        .select(`
          *,
          status:prospect_statuses(id, name, color, is_final_positive, is_final_negative)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (options?.statusId && options.statusId !== 'all') {
        query = query.eq('status_id', options.statusId);
      }

      if (options?.assignedTo && options.assignedTo !== 'all') {
        query = query.eq('assigned_to_user_id', options.assignedTo);
      }

      if (options?.source && options.source !== 'all') {
        query = query.eq('source', options.source);
      }

      if (options?.hasCoordinates) {
        query = query.not('latitude', 'is', null).not('longitude', 'is', null);
      }

      if (options?.search) {
        query = query.or(
          `company_name.ilike.%${options.search}%,city.ilike.%${options.search}%,postal_code.ilike.%${options.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProspectWithStatus[];
    },
    enabled: !!organization?.id,
  });
}

export function useProspect(id?: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('prospects')
        .select(`
          *,
          status:prospect_statuses(id, name, color, is_final_positive, is_final_negative)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ProspectWithStatus;
    },
    enabled: !!id && !!organization?.id,
  });
}

export function useProspectContacts(prospectId?: string) {
  return useQuery({
    queryKey: ['prospect-contacts', prospectId],
    queryFn: async () => {
      if (!prospectId) return [];

      const { data, error } = await supabase
        .from('prospect_contacts')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return data as ProspectContact[];
    },
    enabled: !!prospectId,
  });
}

export function useProspectVisits(prospectId?: string) {
  return useQuery({
    queryKey: ['prospect-visits', prospectId],
    queryFn: async () => {
      if (!prospectId) return [];

      const { data, error } = await supabase
        .from('prospect_visits')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('visited_at', { ascending: false });

      if (error) throw error;
      return data as ProspectVisit[];
    },
    enabled: !!prospectId,
  });
}

export function useCreateProspect() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospect: Omit<ProspectInsert, 'organization_id' | 'created_by'>) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('prospects')
        .insert({
          ...prospect,
          organization_id: organization.id,
          created_by: user?.id,
        })
        .select(`
          *,
          status:prospect_statuses(id, name, color, is_final_positive, is_final_negative)
        `)
        .single();

      if (error) throw error;
      return data as ProspectWithStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect créé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du prospect');
      console.error(error);
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProspectUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('prospects')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          status:prospect_statuses(id, name, color, is_final_positive, is_final_negative)
        `)
        .single();

      if (error) throw error;
      return data as ProspectWithStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    },
  });
}

export function useCreateProspectContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<ProspectContact, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('prospect_contacts')
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data as ProspectContact;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-contacts', variables.prospect_id] });
      toast.success('Contact ajouté');
    },
    onError: (error) => {
      toast.error("Erreur lors de l'ajout du contact");
      console.error(error);
    },
  });
}

export function useCreateProspectVisit() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visit: Omit<ProspectVisit, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('prospect_visits')
        .insert({
          ...visit,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProspectVisit;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-visits', variables.prospect_id] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Visite enregistrée');
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement de la visite");
      console.error(error);
    },
  });
}
