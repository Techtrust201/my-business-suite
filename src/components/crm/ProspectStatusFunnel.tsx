import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectStatusKPIs } from '@/hooks/useProspectKpis';
import { TrendingUp } from 'lucide-react';

export function ProspectStatusFunnel() {
  const { data: statusKPIs, isLoading } = useProspectStatusKPIs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!statusKPIs || statusKPIs.byStatus.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Funnel de conversion
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

  const totalProspects = statusKPIs.totalProspects;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Funnel de conversion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusKPIs.byStatus.map((status) => {
          const widthPercent = totalProspects > 0 
            ? Math.max((status.count / totalProspects) * 100, 5) 
            : 5;
          
          return (
            <div key={status.statusId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full shrink-0" 
                    style={{ backgroundColor: status.statusColor }}
                  />
                  <span className="font-medium">{status.statusName}</span>
                  <span className="text-muted-foreground">({status.count})</span>
                </div>
                <span className="text-muted-foreground font-medium">
                  {status.percentage}%
                </span>
              </div>
              <div className="h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ 
                    width: `${widthPercent}%`,
                    backgroundColor: status.statusColor,
                  }}
                >
                  {status.count > 0 && widthPercent > 15 && (
                    <span className="text-xs font-medium text-white">
                      {status.count}
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
            Total : {statusKPIs.totalProspects} prospects • {statusKPIs.totalConverted} convertis ({statusKPIs.overallConversionRate}%)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
