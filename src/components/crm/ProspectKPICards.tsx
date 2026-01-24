import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectKpis } from '@/hooks/useProspectKpis';
import { TrendingUp, Users, Target, Percent } from 'lucide-react';

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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

  // Get top sources
  const topSources = kpis.bySource.slice(0, 3);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* Top sources */}
      {topSources.map(source => (
        <Card key={source.source}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {source.label}
              </span>
            </div>
            <div className="text-2xl font-bold">{source.count}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {source.conversionRate}% convertis
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
