import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useClients, Contact, ContactType } from '@/hooks/useClients';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientDetails } from '@/components/clients/ClientDetails';
import { useDeferredValue } from 'react';

const Clients = () => {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ContactType | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const deferredSearch = useDeferredValue(search);

  const { data: contacts = [], isLoading } = useClients({
    type,
    search: deferredSearch,
    isActive: true,
  });

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsOpen(false);
    setFormOpen(true);
  };

  const handleView = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsOpen(true);
  };

  const handleNew = () => {
    setSelectedContact(null);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setSelectedContact(null);
    }
  };

  const handleDetailsClose = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedContact(null);
    }
  };

  const hasContacts = contacts.length > 0 || isLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients & Fournisseurs</h1>
            <p className="text-muted-foreground">
              Gérez votre carnet d'adresses
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau contact
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Liste des contacts
            </CardTitle>
            {hasContacts && (
              <CardDescription>
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} trouvé{contacts.length !== 1 ? 's' : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {hasContacts ? (
              <>
                <ClientFilters
                  search={search}
                  onSearchChange={setSearch}
                  type={type}
                  onTypeChange={setType}
                />
                <ClientsTable
                  contacts={contacts}
                  isLoading={isLoading}
                  onEdit={handleEdit}
                  onView={handleView}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Aucun contact</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Commencez par ajouter votre premier client ou fournisseur
                </p>
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un contact
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientForm
        open={formOpen}
        onOpenChange={handleFormClose}
        contact={selectedContact}
      />

      <ClientDetails
        open={detailsOpen}
        onOpenChange={handleDetailsClose}
        contact={selectedContact}
        onEdit={handleEdit}
      />
    </AppLayout>
  );
};

export default Clients;
