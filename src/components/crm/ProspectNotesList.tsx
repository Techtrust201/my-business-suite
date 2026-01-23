import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  User,
  Clock,
  Calendar
} from 'lucide-react';
import { 
  useProspectNotes, 
  useCreateProspectNote, 
  useDeleteProspectNote,
  type ProspectNote 
} from '@/hooks/useProspectNotes';
import { useAuth } from '@/hooks/useAuth';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProspectNotesListProps {
  prospectId: string;
  legacyNotes?: string | null;
}

export function ProspectNotesList({ prospectId, legacyNotes }: ProspectNotesListProps) {
  const [newNote, setNewNote] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { data: notes, isLoading } = useProspectNotes(prospectId);
  const createNote = useCreateProspectNote();
  const deleteNote = useDeleteProspectNote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    await createNote.mutateAsync({
      prospectId,
      content: newNote.trim(),
    });
    setNewNote('');
  };

  const handleDelete = async () => {
    if (noteToDelete) {
      await deleteNote.mutateAsync({ id: noteToDelete, prospectId });
      setNoteToDelete(null);
    }
  };

  const getInitials = (note: ProspectNote) => {
    if (note.author?.full_name) {
      return note.author.full_name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    if (note.author?.email) {
      return note.author.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  const getAuthorName = (note: ProspectNote) => {
    return note.author?.full_name || note.author?.email || 'Utilisateur inconnu';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasNotes = (notes && notes.length > 0) || legacyNotes;

  return (
    <div className="space-y-4">
      {/* New Note Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Ajouter une note..."
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newNote.trim() || createNote.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {createNote.isPending ? 'Envoi...' : 'Ajouter'}
          </Button>
        </div>
      </form>

      {/* Notes List */}
      {hasNotes ? (
        <div className="space-y-4">
          {/* New notes from table */}
          {notes?.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isOwn={note.created_by === user?.id}
              onDelete={() => setNoteToDelete(note.id)}
              getInitials={getInitials}
              getAuthorName={getAuthorName}
            />
          ))}

          {/* Legacy notes from prospect.notes field */}
          {legacyNotes && (!notes || notes.length === 0) && (
            <div className="p-4 bg-muted rounded-lg border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <MessageSquare className="h-3 w-3" />
                <span>Note initiale</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{legacyNotes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune note pour ce prospect</p>
          <p className="text-xs mt-1">Ajoutez des notes pour suivre vos interactions</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la note ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La note sera définitivement supprimée.
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

interface NoteItemProps {
  note: ProspectNote;
  isOwn: boolean;
  onDelete: () => void;
  getInitials: (note: ProspectNote) => string;
  getAuthorName: (note: ProspectNote) => string;
}

function NoteItem({ note, isOwn, onDelete, getInitials, getAuthorName }: NoteItemProps) {
  const createdDate = new Date(note.created_at);
  const absoluteDate = format(createdDate, "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  const relativeDate = formatDistanceToNow(createdDate, { addSuffix: true, locale: fr });

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(note)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header with author and date */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {getAuthorName(note)}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                  <Clock className="h-3 w-3" />
                  {relativeDate}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {absoluteDate}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Delete button for own notes */}
          {isOwn && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>

        {/* Note content */}
        <div className="p-3 bg-muted/50 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        </div>

        {/* Absolute date on a separate line for clarity */}
        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {absoluteDate}
        </div>
      </div>
    </div>
  );
}
