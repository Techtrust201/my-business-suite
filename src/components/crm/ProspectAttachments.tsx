import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Paperclip, 
  FileText, 
  Image, 
  File, 
  X, 
  Loader2,
  ExternalLink 
} from 'lucide-react';
import { 
  useProspectAttachments, 
  useUploadProspectAttachment, 
  useDeleteProspectAttachment,
  type ProspectAttachment 
} from '@/hooks/useProspectAttachments';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProspectAttachmentsProps {
  prospectId?: string;
  canEdit?: boolean;
  // For new prospects, we need to handle pending files
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProspectAttachments({ 
  prospectId, 
  canEdit = true,
  pendingFiles = [],
  onPendingFilesChange 
}: ProspectAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<ProspectAttachment | null>(null);
  
  const { data: attachments, isLoading } = useProspectAttachments(prospectId);
  const uploadAttachment = useUploadProspectAttachment();
  const deleteAttachment = useDeleteProspectAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024);

    if (prospectId) {
      // If we have a prospect ID, upload immediately
      for (const file of validFiles) {
        await uploadAttachment.mutateAsync({ prospectId, file });
      }
    } else if (onPendingFilesChange) {
      // For new prospects, add to pending files
      onPendingFilesChange([...pendingFiles, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePendingFile = (index: number) => {
    if (onPendingFilesChange) {
      onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
    }
  };

  const handleDelete = async () => {
    if (attachmentToDelete && prospectId) {
      await deleteAttachment.mutateAsync({
        id: attachmentToDelete.id,
        prospectId,
        fileUrl: attachmentToDelete.file_url,
      });
      setAttachmentToDelete(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing attachments (for editing) */}
      {prospectId && attachments && attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Pièces jointes existantes</p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const IconComponent = getFileIcon(attachment.file_type);
              return (
                <div
                  key={attachment.id}
                  className="group flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-sm border"
                >
                  <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate max-w-[150px] hover:underline"
                    title={attachment.file_name}
                  >
                    {attachment.file_name}
                  </a>
                  {attachment.file_size && (
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(attachment.file_size)})
                    </span>
                  )}
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </a>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setAttachmentToDelete(attachment)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-destructive hover:text-destructive/80" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending files (for new prospects) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Fichiers à joindre</p>
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => {
              const IconComponent = file.type.startsWith('image/') 
                ? Image 
                : file.type.includes('pdf') 
                  ? FileText 
                  : File;
              return (
                <div
                  key={index}
                  className="group flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-sm border"
                >
                  <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate max-w-[150px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(file.size)})
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemovePendingFile(index)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload button */}
      {canEdit && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAttachment.isPending}
          >
            {uploadAttachment.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4 mr-2" />
            )}
            Joindre des fichiers
          </Button>
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!attachmentToDelete} onOpenChange={(open) => !open && setAttachmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la pièce jointe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le fichier "{attachmentToDelete?.file_name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
