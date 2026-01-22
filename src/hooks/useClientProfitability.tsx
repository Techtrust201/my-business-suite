import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientProfitabilityData {
  client_id: string;
  client_name: string;
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  margin_percent: number;
  invoice_count: number;
}

export function useClientProfitability() {
  return useQuery({
    queryKey: ['client-profitability'],
    queryFn: async () => {
      // Get all paid invoices with their lines
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          contact_id,
          total,
          contact:contacts(id, company_name, first_name, last_name),
          invoice_lines(
            id,
            quantity,
            unit_price,
            purchase_price,
            item_id
          )
        `)
        .eq('status', 'paid');

      if (invoicesError) throw invoicesError;

      // Get articles for purchase prices if not on invoice lines
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, purchase_price');

      if (articlesError) throw articlesError;

      const articlePriceMap = new Map(
        articles?.map(a => [a.id, a.purchase_price]) || []
      );

      // Group by client and calculate profitability
      const clientStats = new Map<string, {
        client_name: string;
        total_revenue: number;
        total_cost: number;
        invoice_count: number;
      }>();

      for (const invoice of invoices || []) {
        if (!invoice.contact_id || !invoice.contact) continue;

        const clientId = invoice.contact_id;
        const clientName = invoice.contact.company_name 
          || `${invoice.contact.first_name || ''} ${invoice.contact.last_name || ''}`.trim()
          || 'Client inconnu';

        if (!clientStats.has(clientId)) {
          clientStats.set(clientId, {
            client_name: clientName,
            total_revenue: 0,
            total_cost: 0,
            invoice_count: 0,
          });
        }

        const stats = clientStats.get(clientId)!;
        stats.total_revenue += Number(invoice.total) || 0;
        stats.invoice_count += 1;

        // Calculate cost from invoice lines
        for (const line of invoice.invoice_lines || []) {
          const quantity = Number(line.quantity) || 0;
          // Use purchase_price from line, or fallback to article, or 0
          let purchasePrice = line.purchase_price;
          if (purchasePrice == null && line.item_id) {
            purchasePrice = articlePriceMap.get(line.item_id) ?? 0;
          }
          stats.total_cost += quantity * (Number(purchasePrice) || 0);
        }
      }

      // Convert to array with calculated margins
      const profitabilityData: ClientProfitabilityData[] = Array.from(clientStats.entries())
        .map(([client_id, stats]) => {
          const gross_margin = stats.total_revenue - stats.total_cost;
          const margin_percent = stats.total_revenue > 0 
            ? (gross_margin / stats.total_revenue) * 100 
            : 0;

          return {
            client_id,
            client_name: stats.client_name,
            total_revenue: stats.total_revenue,
            total_cost: stats.total_cost,
            gross_margin,
            margin_percent,
            invoice_count: stats.invoice_count,
          };
        })
        .sort((a, b) => b.gross_margin - a.gross_margin);

      return profitabilityData;
    },
  });
}

export function useGlobalProfitability() {
  const { data: clients, isLoading, error } = useClientProfitability();

  const totals = clients?.reduce(
    (acc, client) => ({
      total_revenue: acc.total_revenue + client.total_revenue,
      total_cost: acc.total_cost + client.total_cost,
      gross_margin: acc.gross_margin + client.gross_margin,
      invoice_count: acc.invoice_count + client.invoice_count,
    }),
    { total_revenue: 0, total_cost: 0, gross_margin: 0, invoice_count: 0 }
  ) || { total_revenue: 0, total_cost: 0, gross_margin: 0, invoice_count: 0 };

  const margin_percent = totals.total_revenue > 0 
    ? (totals.gross_margin / totals.total_revenue) * 100 
    : 0;

  return {
    ...totals,
    margin_percent,
    client_count: clients?.length || 0,
    isLoading,
    error,
  };
}
