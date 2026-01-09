import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart } from 'lucide-react';

const Achats = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Achats</h1>
            <p className="text-muted-foreground">
              Gérez vos factures fournisseurs
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel achat
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Liste des achats
            </CardTitle>
            <CardDescription>
              Aucun achat pour le moment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Aucun achat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enregistrez votre première facture fournisseur
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un achat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Achats;
