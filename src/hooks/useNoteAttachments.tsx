import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { extractStoragePath } from './useSignedUrl';
import { toast } from 'sonner';

export interface NoteAttachment {
  id: string;
  note_id: string;
  organization_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useNoteAttachments(noteId?: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['note-attachments', noteId],
    queryFn: async () => {
      if (!noteId || !organization?.id) return [];

      const { data, error } = await supabase
        .from('note_attachments')
        .select('*')
        .eq('note_id', noteId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching attachments:', error);
        return [];
      }

      return data as NoteAttachment[];
    },
    enabled: !!noteId && !!organization?.id,
  });
}

export function useUploadNoteAttachment() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, file }: { noteId: string; file: File }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: { user } } = await supabase.auth.getUser();

      // Bucket `documents` desormais prive : on stocke un path, pas une URL.
      // Le nom de fichier d'origine est sanitise pour eviter les caracteres
      // problematiques dans les chemins storage.
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const filePath = `${organization.id}/${noteId}/${Date.now()}-${crypto.randomUUID()}-${safeOriginalName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('note_attachments')
        .insert({
          note_id: noteId,
          organization_id: organization.id,
          file_name: file.name,
          file_url: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note-attachments', variables.noteId] });
      toast.success('Pièce jointe ajoutée');
    },
    onError: (error) => {
      console.error('Error uploading attachment:', error);
      toast.error('Erreur lors de l\'upload');
    },
  });
}

export function useDeleteNoteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, noteId, fileUrl }: { id: string; noteId: string; fileUrl: string }) => {
      const filePath = extractStoragePath('documents', fileUrl);
      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }

      const { error } = await supabase
        .from('note_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note-attachments', variables.noteId] });
      toast.success('Pièce jointe supprimée');
    },
    onError: (error) => {
      console.error('Error deleting attachment:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}
