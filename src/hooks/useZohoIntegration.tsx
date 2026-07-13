import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export interface ZohoIntegration {
  id: string;
  email: string;
  zoho_account_id: string;
  created_at: string;
  updated_at: string;
}

export function useZohoIntegration() {
  const { organization } = useOrganization();
  const [integration, setIntegration] = useState<ZohoIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntegration = useCallback(async () => {
    if (!organization?.id) {
      setIntegration(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('zoho_integrations')
      .select('id, email, zoho_account_id, created_at, updated_at')
      .eq('organization_id', organization.id)
      .maybeSingle();
    setIntegration((data as ZohoIntegration) ?? null);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const connect = useCallback(async () => {
    const returnUrl = `${window.location.origin}/parametres?tab=organization`;
    const { data, error } = await supabase.functions.invoke('zoho-oauth-init', {
      body: {},
      // return_url must be a query param (init reads it that way)
    });
    // Fallback: call via URL to include return_url as query
    if (error || !data?.url) {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth-init?return_url=${encodeURIComponent(returnUrl)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Erreur init OAuth');
      window.location.href = json.url;
      return;
    }
    window.location.href = data.url;
  }, []);

  const disconnect = useCallback(async () => {
    const { error } = await supabase.functions.invoke('zoho-disconnect', { body: {} });
    if (error) throw error;
    await fetchIntegration();
  }, [fetchIntegration]);

  return { integration, loading, connect, disconnect, refresh: fetchIntegration };
}
