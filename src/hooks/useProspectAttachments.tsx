import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { extractStoragePath } from './useSignedUrl';
import { toast } from 'sonner';

export interface ProspectAttachment {
  id: string;
  prospect_id: string;
  organization_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useProspectAttachments(prospectId?: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-attachments', prospectId],
    queryFn: async () => {
      if (!prospectId || !organization?.id) return [];

      const { data, error } = await supabase
        .from('prospect_attachments')
        .select('*')
        .eq('prospect_id', prospectId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching prospect attachments:', error);
        return [];
      }

      return data as ProspectAttachment[];
    },
    enabled: !!prospectId && !!organization?.id,
  });
}

export function useUploadProspectAttachment() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prospectId, file }: { prospectId: string; file: File }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: { user } } = await supabase.auth.getUser();

      // Bucket `documents` prive : on stocke le path interne, pas l'URL.
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const filePath = `${organization.id}/prospects/${prospectId}/${Date.now()}-${crypto.randomUUID()}-${safeOriginalName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('prospect_attachments')
        .insert({
          prospect_id: prospectId,
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
      queryClient.invalidateQueries({ queryKey: ['prospect-attachments', variables.prospectId] });
      toast.success('Pièce jointe ajoutée');
    },
    onError: (error) => {
      console.error('Error uploading prospect attachment:', error);
      toast.error("Erreur lors de l'upload");
    },
  });
}

export function useDeleteProspectAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId, fileUrl }: { id: string; prospectId: string; fileUrl: string }) => {
      const filePath = extractStoragePath('documents', fileUrl);
      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }

      const { error } = await supabase
        .from('prospect_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-attachments', variables.prospectId] });
      toast.success('Pièce jointe supprimée');
    },
    onError: (error) => {
      console.error('Error deleting prospect attachment:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}
