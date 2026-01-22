import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectKpis } from '@/hooks/useProspectKpis';
import { TrendingUp, TrendingDown, Users, Target, Euro, Percent } from 'lucide-react';

export function ProspectKPICards() {
  const { data: kpis, isLoading } = useProspectKpis();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k €`;
    }
    return `${value.toFixed(0)} €`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
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

  if (!kpis) return null;

  // Get main status counts
  const mainStatuses = kpis.byStatus.slice(0, 4);

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
          <div className="flex items-center gap-1 text-xs mt-1">
            {kpis.growthRate >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={kpis.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
              {kpis.growthRate >= 0 ? '+' : ''}{kpis.growthRate}%
            </span>
            <span className="text-muted-foreground">ce mois</span>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      {mainStatuses.map(status => (
        <Card key={status.statusId}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: status.statusColor }}
              />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {status.statusName}
              </span>
            </div>
            <div className="text-2xl font-bold">{status.count}</div>
            {status.countThisMonth > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                +{status.countThisMonth} ce mois
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Conversion Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Percent className="h-4 w-4" />
            <span className="text-xs font-medium">Taux conversion</span>
          </div>
          <div className="text-2xl font-bold">{kpis.conversionRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            Prospects → Signés
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
