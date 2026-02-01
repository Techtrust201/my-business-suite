import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectKpis } from '@/hooks/useProspectKpis';
import { ProspectStatusFunnel } from './ProspectStatusFunnel';
import { TrendingUp } from 'lucide-react';

export function ProspectFunnel() {
  const { data: kpis, isLoading } = useProspectKpis();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!kpis || kpis.bySource.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Funnel par source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune donnée disponible. Ajoutez des prospects pour voir le funnel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalProspects = kpis.totalProspects;

  return (
    <div className="space-y-4">
      {/* Funnel par source */}
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Funnel par source
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {kpis.bySource.map((source) => {
          const widthPercent = totalProspects > 0 
            ? Math.max((source.count / totalProspects) * 100, 5) 
            : 5;
          
          return (
            <div key={source.source} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{source.label}</span>
                  <span className="text-muted-foreground">({source.count})</span>
                </div>
                <span className="text-muted-foreground font-medium">
                  {source.conversionRate}%
                </span>
              </div>
              <div className="h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2 bg-primary/80"
                  style={{ width: `${widthPercent}%` }}
                >
                  {source.count > 0 && widthPercent > 15 && (
                    <span className="text-xs font-medium text-primary-foreground">
                      {source.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Total : {kpis.totalProspects} prospects • {kpis.totalConverted} convertis ({kpis.overallConversionRate}%)
          </div>
        </div>
      </CardContent>
    </Card>

      {/* Funnel de conversion par statut */}
      <ProspectStatusFunnel />
    </div>
  );
}
