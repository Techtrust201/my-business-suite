import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminResetPassword } from '@/hooks/useAdminResetPassword';
import { Shield, AlertTriangle, Check, MailCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminPasswordReset() {
  const [targetEmail, setTargetEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const { resetPassword, isLoading } = useAdminResetPassword();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetEmail.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une adresse email',
        variant: 'destructive',
      });
      return;
    }

    const result = await resetPassword(targetEmail.trim());

    if (result.success) {
      setSent(targetEmail.trim());
    }
  };

  const handleReset = () => {
    setTargetEmail('');
    setSent(null);
  };

  return (
    <div className="space-y-6">
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Zone d'administration sensible</AlertTitle>
        <AlertDescription>
          Cette fonctionnalité envoie un lien sécurisé de réinitialisation de mot de passe à
          l'utilisateur cible. L'opération est tracée dans le journal d'audit.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Réinitialisation par lien sécurisé
          </CardTitle>
          <CardDescription>
            Envoie un email contenant un lien de réinitialisation (valable 1 heure) à l'utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetEmail">Email de l'utilisateur à réinitialiser</Label>
                <Input
                  id="targetEmail"
                  type="email"
                  placeholder="utilisateur@example.com"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" disabled={isLoading} variant="destructive">
                {isLoading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <MailCheck className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Email envoyé</AlertTitle>
                <AlertDescription>
                  Un email contenant un lien sécurisé a été envoyé à <strong>{sent}</strong>.
                  L'utilisateur pourra définir un nouveau mot de passe en cliquant dessus
                  (lien valable 1 heure).
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={handleReset} className="w-full">
                <Check className="mr-2 h-4 w-4" />
                Réinitialiser un autre utilisateur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
