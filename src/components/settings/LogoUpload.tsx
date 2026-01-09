import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-react';

export const LogoUpload = () => {
  const { organization, refetch } = useOrganization();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization?.id) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PNG, JPG ou WebP.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux. Maximum 2 Mo.');
      return;
    }

    setIsUploading(true);

    try {
      // Create file path with organization ID
      const fileExt = file.name.split('.').pop();
      const filePath = `${organization.id}/logo.${fileExt}`;

      // Delete existing logo if any
      if (organization.logo_url) {
        const oldPath = organization.logo_url.split('/logos/')[1];
        if (oldPath) {
          await supabase.storage.from('logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // Update organization with new logo URL
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      await refetch();
      toast.success('Logo téléchargé avec succès');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Erreur lors du téléchargement du logo');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!organization?.id || !organization.logo_url) return;

    setIsDeleting(true);

    try {
      // Extract file path from URL
      const urlParts = organization.logo_url.split('/logos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('logos').remove([filePath]);
      }

      // Update organization to remove logo URL
      const { error } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organization.id);

      if (error) throw error;

      await refetch();
      toast.success('Logo supprimé');
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      toast.error(error.message || 'Erreur lors de la suppression du logo');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Logo de l'entreprise
        </CardTitle>
        <CardDescription>
          Ce logo apparaîtra sur vos factures et devis au format PDF
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {organization?.logo_url ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border">
              <img
                src={organization.logo_url}
                alt="Logo de l'entreprise"
                className="max-h-24 max-w-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Changer le logo
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Supprimer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Cliquez pour télécharger votre logo
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                PNG, JPG ou WebP • Max 2 Mo
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Télécharger un logo
            </Button>
          </div>
        )}
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};
