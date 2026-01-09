import { useState } from 'react';
import { useTaxRates, useCreateTaxRate, useUpdateTaxRate, useDeleteTaxRate } from '@/hooks/useTaxRates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Percent, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react';

export function TaxRatesManager() {
  const { data: taxRates, isLoading } = useTaxRates();
  const createTaxRate = useCreateTaxRate();
  const updateTaxRate = useUpdateTaxRate();
  const deleteTaxRate = useDeleteTaxRate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<{ id: string; name: string; rate: number; is_default: boolean } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', rate: '', is_default: false });

  const handleOpenCreate = () => {
    setEditingRate(null);
    setFormData({ name: '', rate: '', is_default: false });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rate: { id: string; name: string; rate: number; is_default: boolean | null }) => {
    setEditingRate({ id: rate.id, name: rate.name, rate: rate.rate, is_default: rate.is_default || false });
    setFormData({ name: rate.name, rate: rate.rate.toString(), is_default: rate.is_default || false });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const rateValue = parseFloat(formData.rate);
    if (!formData.name || isNaN(rateValue)) return;

    if (editingRate) {
      updateTaxRate.mutate({
        id: editingRate.id,
        name: formData.name,
        rate: rateValue,
        is_default: formData.is_default,
      }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    } else {
      createTaxRate.mutate({
        name: formData.name,
        rate: rateValue,
        is_default: formData.is_default,
      }, {
        onSuccess: () => setIsDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTaxRate.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateTaxRate.mutate({ id, is_active: !currentActive });
  };

  const handleSetDefault = (id: string) => {
    updateTaxRate.mutate({ id, is_default: true });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Taux de TVA
            </CardTitle>
            <CardDescription>
              Gérez les taux de TVA disponibles pour vos documents
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : taxRates && taxRates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead className="text-center">Défaut</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">
                    {rate.name}
                    {rate.is_default && (
                      <Badge variant="secondary" className="ml-2">
                        <Star className="mr-1 h-3 w-3" />
                        Défaut
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {rate.rate}%
                  </TableCell>
                  <TableCell className="text-center">
                    {!rate.is_default && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSetDefault(rate.id)}
                      >
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rate.is_active}
                      onCheckedChange={() => handleToggleActive(rate.id, rate.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(rate)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(rate.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Percent className="mx-auto h-10 w-10 opacity-50 mb-3" />
            <p>Aucun taux de TVA configuré</p>
            <p className="text-sm">Ajoutez votre premier taux pour commencer</p>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRate ? 'Modifier le taux de TVA' : 'Nouveau taux de TVA'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="TVA normale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Taux (%)</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder="20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Définir comme taux par défaut</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createTaxRate.isPending || updateTaxRate.isPending}
              >
                {(createTaxRate.isPending || updateTaxRate.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRate ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce taux de TVA ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Les documents existants conserveront leur taux actuel.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteTaxRate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
