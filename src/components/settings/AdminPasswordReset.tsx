import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminResetPassword } from '@/hooks/useAdminResetPassword';
import { Shield, AlertTriangle, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminPasswordReset() {
  const [targetEmail, setTargetEmail] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
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
    
    if (result.success && result.tempPassword) {
      setTempPassword(result.tempPassword);
      setShowPassword(true);
    }
  };

  const handleCopy = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast({
        title: 'Copié !',
        description: 'Le mot de passe a été copié dans le presse-papiers',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setTargetEmail('');
    setTempPassword(null);
    setShowPassword(false);
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Zone d'administration sensible</AlertTitle>
        <AlertDescription>
          Cette fonctionnalité permet de réinitialiser manuellement les mots de passe des utilisateurs.
          Utilisez-la uniquement en cas d'urgence et communiquez le mot de passe temporaire de manière sécurisée.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Réinitialisation manuelle de mot de passe
          </CardTitle>
          <CardDescription>
            Génère un mot de passe temporaire pour un utilisateur sans passer par l'email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tempPassword ? (
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
                {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Mot de passe réinitialisé</AlertTitle>
                <AlertDescription>
                  Le mot de passe de <strong>{targetEmail}</strong> a été réinitialisé avec succès.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Nouveau mot de passe temporaire</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={tempPassword}
                      readOnly
                      className="pr-10 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Communiquez ce mot de passe à l'utilisateur par téléphone ou messagerie sécurisée.
                  Il devra le changer après sa première connexion.
                </p>
              </div>

              <Button variant="outline" onClick={handleReset} className="w-full">
                Réinitialiser un autre utilisateur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
