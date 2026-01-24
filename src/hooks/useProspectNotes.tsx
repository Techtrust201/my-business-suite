import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export interface ProspectNote {
  id: string;
  organization_id: string;
  prospect_id: string;
  content: string;
  created_by: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
}

export function useProspectNotes(prospectId?: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-notes', prospectId],
    queryFn: async () => {
      if (!prospectId || !organization?.id) return [];

      // Fetch notes with author info
      const { data: notes, error } = await supabase
        .from('prospect_notes')
        .select('*')
        .eq('prospect_id', prospectId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        return [];
      }

      // Fetch user info for each unique created_by using profiles table
      const createdByIds = [...new Set(notes.map(n => n.created_by).filter(Boolean))] as string[];
      
      let usersMap: Record<string, { id: string; email: string; full_name?: string }> = {};
      
      if (createdByIds.length > 0) {
        // Use profiles table instead of trying to join with auth.users
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', createdByIds);

        if (profiles) {
          profiles.forEach((profile) => {
            const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
            usersMap[profile.id] = {
              id: profile.id,
              email: profile.email || '',
              full_name: fullName || undefined,
            };
          });
        }
      }

      // Combine notes with author info
      return notes.map(note => ({
        ...note,
        author: note.created_by ? usersMap[note.created_by] || null : null,
      })) as ProspectNote[];
    },
    enabled: !!prospectId && !!organization?.id,
  });
}

export function useCreateProspectNote() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, content, parentId }: { 
      prospectId: string; 
      content: string;
      parentId?: string;
    }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('prospect_notes')
        .insert({
          organization_id: organization.id,
          prospect_id: prospectId,
          content,
          created_by: user?.id,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', variables.prospectId] });
      toast.success('Note ajoutée');
    },
    onError: (error) => {
      console.error('Error creating note:', error);
      toast.error('Erreur lors de l\'ajout de la note');
    },
  });
}

export function useUpdateProspectNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content, prospectId }: { 
      id: string; 
      content: string;
      prospectId: string;
    }) => {
      const { data, error } = await supabase
        .from('prospect_notes')
        .update({ content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', variables.prospectId] });
      toast.success('Note modifiée');
    },
    onError: (error) => {
      console.error('Error updating note:', error);
      toast.error('Erreur lors de la modification');
    },
  });
}

export function useDeleteProspectNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId }: { id: string; prospectId: string }) => {
      const { error } = await supabase
        .from('prospect_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', variables.prospectId] });
      toast.success('Note supprimée');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}
