import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EmailIntegration {
  id: string;
  provider: string;
  provider_account_id: string;
  email_address: string;
  display_name: string | null;
  scopes: string[];
  datacenter: string;
  status: 'active' | 'reconnect_required' | 'revoked' | 'error';
  token_expires_at: string;
  connected_at: string;
  refreshed_at: string | null;
  last_error: string | null;
}

export function useZohoIntegration() {
  const [integration, setIntegration] = useState<EmailIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntegration = useCallback(async () => {
    setLoading(true);
    // Fonction SECURITY DEFINER : filtre par auth.uid() côté serveur, JAMAIS les tokens
    const { data, error } = await supabase.rpc('get_my_email_integrations');
    if (error) {
      console.error('get_my_email_integrations error', error);
      setIntegration(null);
    } else {
      const rows = (data as EmailIntegration[] | null) ?? [];
      const zoho = rows.find((r) => r.provider === 'zoho') ?? null;
      setIntegration(zoho);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const connect = useCallback(async () => {
    const returnUrl = `${window.location.origin}/parametres?tab=organization`;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error('Non authentifié');

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth-init?return_url=${encodeURIComponent(returnUrl)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok || !json.url) throw new Error(json.error || 'Erreur init OAuth');
    window.location.href = json.url;
  }, []);

  const disconnect = useCallback(async () => {
    const { error } = await supabase.functions.invoke('zoho-disconnect', { body: {} });
    if (error) throw error;
    await fetchIntegration();
  }, [fetchIntegration]);

  return { integration, loading, connect, disconnect, refresh: fetchIntegration };
}
