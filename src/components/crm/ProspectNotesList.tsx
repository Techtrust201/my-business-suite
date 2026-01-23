import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Send, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useProspectNotes, useCreateProspectNote, useDeleteProspectNote, type ProspectNote } from '@/hooks/useProspectNotes';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProspectNotesListProps {
  prospectId: string;
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
}

function getAuthorName(author?: ProspectNote['author']): string {
  if (!author) return 'Utilisateur inconnu';
  if (author.first_name && author.last_name) {
    return `${author.first_name} ${author.last_name}`;
  }
  return author.email;
}

export function ProspectNotesList({ prospectId }: ProspectNotesListProps) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
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

  return (
    <div className="space-y-4">
      {/* New note form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Ajouter une note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!newNote.trim() || createNote.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </form>

      {/* Notes list */}
      {notes && notes.length > 0 ? (
        <div className="space-y-4 pt-4 border-t">
          {notes.map((note) => {
            const isAuthor = user?.id === note.created_by;
            
            return (
              <div key={note.id} className="flex gap-3 group">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(note.author?.first_name, note.author?.last_name, note.author?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {getAuthorName(note.author)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                    {isAuthor && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteNote.mutate({ noteId: note.id, prospectId })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                    {note.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune note pour ce prospect</p>
          <p className="text-xs">Ajoutez une note pour garder une trace de vos échanges</p>
        </div>
      )}
    </div>
  );
}
