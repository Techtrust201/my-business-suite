import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ResetResult {
  success: boolean;
  // L'Edge function ne renvoie plus de mot de passe en clair (N2).
  // Un email de reinitialisation est envoye a l'utilisateur cible.
  sentAt?: string;
  error?: string;
}

export function useAdminResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const resetPassword = async (targetEmail: string): Promise<ResetResult> => {
    setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session?.access_token) {
        throw new Error('Session invalide');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({ targetEmail }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réinitialisation');
      }

      toast({
        title: 'Lien envoyé',
        description: `Un email de réinitialisation a été envoyé à ${targetEmail}.`,
      });

      return {
        success: true,
        sentAt: data.sentAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return { resetPassword, isLoading };
}
