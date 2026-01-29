import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Paperclip, 
  FileText, 
  Image, 
  File, 
  X, 
  Loader2,
  Download,
  ExternalLink 
} from 'lucide-react';
import { 
  useNoteAttachments, 
  useUploadNoteAttachment, 
  useDeleteNoteAttachment,
  type NoteAttachment 
} from '@/hooks/useNoteAttachments';
import { cn } from '@/lib/utils';
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

interface NoteAttachmentsProps {
  noteId: string;
  canEdit?: boolean;
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

export function NoteAttachments({ noteId, canEdit = true }: NoteAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<NoteAttachment | null>(null);
  
  const { data: attachments, isLoading } = useNoteAttachments(noteId);
  const uploadAttachment = useUploadNoteAttachment();
  const deleteAttachment = useDeleteNoteAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        continue; // Skip large files
      }
      await uploadAttachment.mutateAsync({ noteId, file });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (attachmentToDelete) {
      await deleteAttachment.mutateAsync({
        id: attachmentToDelete.id,
        noteId,
        fileUrl: attachmentToDelete.file_url,
      });
      setAttachmentToDelete(null);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Attachments list */}
      {attachments && attachments.length > 0 && (
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
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAttachment.isPending}
            className="h-7 text-xs"
          >
            {uploadAttachment.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Paperclip className="h-3 w-3 mr-1" />
            )}
            Joindre un fichier
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

// Compact version for note input area
interface AttachmentUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
}

export function AttachmentUploadButton({ onFilesSelected, isUploading }: AttachmentUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const validFiles = Array.from(files).filter(f => f.size <= 10 * 1024 * 1024);
    onFilesSelected(validFiles);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
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
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="h-8 w-8"
        title="Joindre des fichiers"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
