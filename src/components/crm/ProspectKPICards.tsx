import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectKpis, useProspectStatusKPIs } from '@/hooks/useProspectKpis';
import { Users, Percent } from 'lucide-react';

export function ProspectKPICards() {
  const { data: kpis, isLoading } = useProspectKpis();
  const { data: statusKPIs, isLoading: isLoadingStatusKPIs } = useProspectStatusKPIs();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k €`;
    }
    return `${value.toFixed(0)} €`;
  };

  if (isLoading || isLoadingStatusKPIs) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis || !statusKPIs) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total Prospects */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Total Prospects</span>
          </div>
          <div className="text-2xl font-bold">{kpis.totalProspects}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {kpis.totalConverted} convertis
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="h-4 w-4" />
            <span className="text-xs font-medium">Taux conversion</span>
          </div>
          <div className="text-2xl font-bold">{kpis.overallConversionRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            Prospects → Clients
          </div>
        </CardContent>
      </Card>

      {/* Status KPIs */}
      {statusKPIs.byStatus.map(status => (
        <Card key={status.statusId}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="h-3 w-3 rounded-full shrink-0" 
                style={{ backgroundColor: status.statusColor }}
              />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {status.statusName}
              </span>
            </div>
            <div className="text-2xl font-bold">{status.count}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {status.percentage}%
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
