import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export interface ProspectNote {
  id: string;
  prospect_id: string;
  content: string;
  created_by: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

export function useProspectNotes(prospectId?: string) {
  return useQuery({
    queryKey: ['prospect-notes', prospectId],
    queryFn: async () => {
      if (!prospectId) return [];

      // Use raw query since table is newly created and types not yet synced
      const { data, error } = await supabase
        .from('prospect_notes' as any)
        .select(`
          id,
          prospect_id,
          content,
          created_by,
          organization_id,
          created_at,
          updated_at
        `)
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch author info separately to avoid relationship issues
      const notes = (data || []) as unknown as ProspectNote[];
      
      if (notes.length > 0) {
        const authorIds = [...new Set(notes.filter(n => n.created_by).map(n => n.created_by!))];
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', authorIds);
          
          const profileMap = new Map((profiles || []).map(p => [p.id, p]));
          notes.forEach(note => {
            if (note.created_by && profileMap.has(note.created_by)) {
              note.author = profileMap.get(note.created_by);
            }
          });
        }
      }
      
      return notes;
    },
    enabled: !!prospectId,
  });
}

export function useCreateProspectNote() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, content }: { prospectId: string; content: string }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('prospect_notes' as any)
        .insert({
          prospect_id: prospectId,
          content,
          organization_id: organization.id,
          created_by: user?.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as ProspectNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', variables.prospectId] });
      toast.success('Note ajoutée');
    },
    onError: (error) => {
      toast.error("Erreur lors de l'ajout de la note");
      console.error(error);
    },
  });
}

export function useDeleteProspectNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, prospectId }: { noteId: string; prospectId: string }) => {
      const { error } = await supabase
        .from('prospect_notes' as any)
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-notes', data.prospectId] });
      toast.success('Note supprimée');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de la note');
      console.error(error);
    },
  });
}
