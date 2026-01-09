import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, Pencil, Trash2, Eye, Building2, User } from 'lucide-react';
import { Contact, useDeleteClient } from '@/hooks/useClients';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientsTableProps {
  contacts: Contact[];
  isLoading: boolean;
  onEdit: (contact: Contact) => void;
  onView: (contact: Contact) => void;
}

function getContactDisplayName(contact: Contact): string {
  if (contact.company_name) {
    return contact.company_name;
  }
  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  return parts.join(' ') || 'Sans nom';
}

function getContactTypeLabel(type: string): string {
  switch (type) {
    case 'client':
      return 'Client';
    case 'supplier':
      return 'Fournisseur';
    case 'both':
      return 'Client & Fournisseur';
    default:
      return type;
  }
}

function getContactTypeVariant(type: string): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'client':
      return 'default';
    case 'supplier':
      return 'secondary';
    case 'both':
      return 'outline';
    default:
      return 'default';
  }
}

export function ClientsTable({ contacts, isLoading, onEdit, onView }: ClientsTableProps) {
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const deleteClient = useDeleteClient();

  const handleDelete = async () => {
    if (deleteContact) {
      await deleteClient.mutateAsync(deleteContact.id);
      setDeleteContact(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {contact.company_name ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">{getContactDisplayName(contact)}</div>
                      {contact.company_name && (contact.first_name || contact.last_name) && (
                        <div className="text-sm text-muted-foreground">
                          {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{contact.email || '-'}</TableCell>
                <TableCell>{contact.phone || contact.mobile || '-'}</TableCell>
                <TableCell>
                  <Badge variant={getContactTypeVariant(contact.type)}>
                    {getContactTypeLabel(contact.type)}
                  </Badge>
                </TableCell>
                <TableCell>{contact.billing_city || '-'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(contact)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(contact)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteContact(contact)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteContact} onOpenChange={() => setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contact</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong>{deleteContact && getContactDisplayName(deleteContact)}</strong> ?
              Cette action est irréversible.
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
    </>
  );
}
