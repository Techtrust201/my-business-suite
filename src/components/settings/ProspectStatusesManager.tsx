import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, GripVertical, Star, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import {
  useProspectStatuses,
  useCreateProspectStatus,
  useUpdateProspectStatus,
  useDeleteProspectStatus,
  useSetDefaultProspectStatus,
  useInitProspectStatuses,
  type ProspectStatus,
} from '@/hooks/useProspectStatuses';

const COLOR_PRESETS = [
  { name: 'Gris', value: '#6B7280' },
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Vert', value: '#10B981' },
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
];

interface StatusFormData {
  name: string;
  color: string;
  icon: string | null;
  position: number;
  is_default: boolean;
  is_final_positive: boolean;
  is_final_negative: boolean;
  is_active: boolean;
}

const defaultFormData: StatusFormData = {
  name: '',
  color: '#3B82F6',
  icon: null,
  position: 0,
  is_default: false,
  is_final_positive: false,
  is_final_negative: false,
  is_active: true,
};

export function ProspectStatusesManager() {
  const { data: statuses, isLoading } = useProspectStatuses();
  const createStatus = useCreateProspectStatus();
  const updateStatus = useUpdateProspectStatus();
  const deleteStatus = useDeleteProspectStatus();
  const setDefaultStatus = useSetDefaultProspectStatus();
  const initStatuses = useInitProspectStatuses();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProspectStatus | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StatusFormData>(defaultFormData);

  useEffect(() => {
    if (editingStatus) {
      setFormData({
        name: editingStatus.name,
        color: editingStatus.color,
        icon: editingStatus.icon,
        position: editingStatus.position,
        is_default: editingStatus.is_default,
        is_final_positive: editingStatus.is_final_positive,
        is_final_negative: editingStatus.is_final_negative,
        is_active: editingStatus.is_active,
      });
    } else {
      setFormData({
        ...defaultFormData,
        position: (statuses?.length ?? 0) + 1,
      });
    }
  }, [editingStatus, statuses?.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStatus) {
      await updateStatus.mutateAsync({ id: editingStatus.id, ...formData });
    } else {
      await createStatus.mutateAsync(formData);
    }
    
    setIsDialogOpen(false);
    setEditingStatus(null);
  };

  const handleEdit = (status: ProspectStatus) => {
    setEditingStatus(status);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteStatus.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleInitialize = async () => {
    await initStatuses.mutateAsync();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasNoStatuses = !statuses || statuses.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Statuts de prospection</CardTitle>
            <CardDescription>
              Configurez les statuts commerciaux pour vos prospects (couleurs visibles sur la carte)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasNoStatuses && (
              <Button
                variant="outline"
                onClick={handleInitialize}
                disabled={initStatuses.isPending}
              >
                {initStatuses.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Initialiser les statuts par défaut
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingStatus(null);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau statut
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingStatus ? 'Modifier le statut' : 'Nouveau statut'}
                    </DialogTitle>
                    <DialogDescription>
                      Définissez un statut commercial avec sa couleur pour la carte
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du statut</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Intéressé"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Couleur</Label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              formData.color === preset.value
                                ? 'border-foreground scale-110'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: preset.value }}
                            onClick={() => setFormData({ ...formData, color: preset.value })}
                            title={preset.name}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Label htmlFor="customColor" className="text-xs text-muted-foreground">
                          Ou couleur personnalisée:
                        </Label>
                        <Input
                          id="customColor"
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Position (ordre d'affichage)</Label>
                      <Input
                        id="position"
                        type="number"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_final_positive">Statut de conversion</Label>
                          <p className="text-xs text-muted-foreground">
                            Le prospect devient client
                          </p>
                        </div>
                        <Switch
                          id="is_final_positive"
                          checked={formData.is_final_positive}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              is_final_positive: checked,
                              is_final_negative: checked ? false : formData.is_final_negative,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_final_negative">Statut de refus</Label>
                          <p className="text-xs text-muted-foreground">
                            Le prospect n'est pas intéressé
                          </p>
                        </div>
                        <Switch
                          id="is_final_negative"
                          checked={formData.is_final_negative}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              is_final_negative: checked,
                              is_final_positive: checked ? false : formData.is_final_positive,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_active">Actif</Label>
                          <p className="text-xs text-muted-foreground">
                            Visible dans les listes de sélection
                          </p>
                        </div>
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_active: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingStatus(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={createStatus.isPending || updateStatus.isPending}
                    >
                      {(createStatus.isPending || updateStatus.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editingStatus ? 'Enregistrer' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasNoStatuses ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucun statut configuré.</p>
            <p className="text-sm mt-1">
              Cliquez sur "Initialiser les statuts par défaut" pour commencer.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Couleur</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">Par défaut</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses?.map((status) => (
                <TableRow key={status.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell className="font-medium">{status.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs text-muted-foreground font-mono">
                        {status.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {status.is_final_positive && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Conversion
                      </Badge>
                    )}
                    {status.is_final_negative && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Refus
                      </Badge>
                    )}
                    {!status.is_final_positive && !status.is_final_negative && (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {status.is_default ? (
                      <Star className="h-4 w-4 text-yellow-500 mx-auto fill-yellow-500" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultStatus.mutate(status.id)}
                        disabled={setDefaultStatus.isPending}
                      >
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={status.is_active}
                      onCheckedChange={(checked) =>
                        updateStatus.mutate({ id: status.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(status)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(status.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce statut ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Les prospects utilisant ce statut seront mis à jour.
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
      </CardContent>
    </Card>
  );
}
