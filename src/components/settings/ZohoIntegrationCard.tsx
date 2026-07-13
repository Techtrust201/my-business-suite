import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import { useZohoIntegration } from '@/hooks/useZohoIntegration';

export const ZohoIntegrationCard = () => {
  const { integration, loading, connect, disconnect } = useZohoIntegration();
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await connect();
    } catch (e: any) {
      toast.error(e.message || 'Erreur connexion Zoho');
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnect();
      toast.success('Compte Zoho déconnecté');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Zoho Mail
        </CardTitle>
        <CardDescription>
          Envoyez vos factures et devis directement depuis votre boîte Zoho, avec le PDF joint automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : integration ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Connecté</p>
                <p className="text-sm text-muted-foreground">{integration.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDisconnect} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
              Déconnecter
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucun compte Zoho connecté. Une fois connecté, le bouton « Envoyer via Zoho » enverra automatiquement l'email depuis votre adresse Zoho avec le PDF en pièce jointe.
            </p>
            <Button onClick={handleConnect} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Connecter mon compte Zoho
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
