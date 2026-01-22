import { useState } from 'react';
import { Mail, Phone, Smartphone, User, Star, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ProspectContact, useCreateProspectContact } from '@/hooks/useProspects';
import { toast } from 'sonner';

interface ProspectContactsListProps {
  prospectId: string;
  contacts: ProspectContact[];
  isLoading?: boolean;
}

export function ProspectContactsList({ 
  prospectId, 
  contacts, 
  isLoading 
}: ProspectContactsListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const createContact = useCreateProspectContact();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    role: '',
    email: '',
    phone: '',
    mobile: '',
    is_primary: false,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createContact.mutateAsync({
        prospect_id: prospectId,
        ...formData,
      });
      setIsFormOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        role: '',
        email: '',
        phone: '',
        mobile: '',
        is_primary: false,
        notes: '',
      });
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
          <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun contact</p>
          <Button 
            variant="link" 
            size="sm" 
            className="mt-1"
            onClick={() => setIsFormOpen(true)}
          >
            Ajouter un contact
          </Button>
        </div>
      ) : (
        <>
          {contacts.map(contact => (
            <div 
              key={contact.id} 
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Sans nom'}
                  </span>
                  {contact.is_primary && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  )}
                </div>
                
                {contact.role && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {contact.role}
                  </Badge>
                )}
                
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {contact.email && (
                    <a 
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a 
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                  {contact.mobile && (
                    <a 
                      href={`tel:${contact.mobile}`}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Smartphone className="h-3 w-3" />
                      <span>{contact.mobile}</span>
                    </a>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un contact
          </Button>
        </>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un contact</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Fonction</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Ex: Directeur commercial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_primary: !!checked }))}
              />
              <Label htmlFor="is_primary" className="text-sm font-normal">
                Contact principal
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createContact.isPending}>
                {createContact.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
