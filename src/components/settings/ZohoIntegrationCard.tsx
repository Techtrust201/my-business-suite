import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle2, Unplug, AlertTriangle, RefreshCw } from 'lucide-react';
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

  const needsReconnect = integration?.status === 'reconnect_required' || integration?.status === 'error';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Ma messagerie Zoho Mail
        </CardTitle>
        <CardDescription>
          Connectez <strong>votre propre</strong> compte Zoho pour envoyer vos factures et devis depuis
          votre adresse, avec le PDF joint automatiquement. Chaque utilisateur connecte son propre compte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : integration ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {needsReconnect ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <p className="font-medium">
                    {needsReconnect ? 'Reconnexion nécessaire' : 'Connecté'}
                  </p>
                  <p className="text-sm text-muted-foreground">{integration.email_address}</p>
                  {integration.last_error && (
                    <p className="text-xs text-destructive mt-1">{integration.last_error}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {needsReconnect && (
                  <Button variant="default" onClick={handleConnect} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Reconnecter mon compte
                  </Button>
                )}
                <Button variant="outline" onClick={handleDisconnect} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
                  Déconnecter mon compte
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucun compte Zoho connecté. Une fois connecté, le bouton « Envoyer via Zoho » enverra
              automatiquement l'email depuis <strong>votre</strong> adresse Zoho avec le PDF en pièce jointe.
            </p>
            <Button onClick={handleConnect} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Connecter mon compte Zoho Mail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
