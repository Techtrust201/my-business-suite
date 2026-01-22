import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectKpis } from '@/hooks/useProspectKpis';
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

  if (!kpis || kpis.byStatus.length === 0) {
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
            Aucun statut configuré. Configurez vos statuts dans les paramètres.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalProspects = kpis.totalProspects;
  
  // Calculate cumulative funnel (prospects at each stage and beyond)
  const funnelData = kpis.byStatus
    .filter(s => !s.isFinalNegative) // Exclude rejected statuses from funnel
    .map((status, index, arr) => {
      // For funnel, we want to show how many reached this stage
      // This is cumulative from the end (signed + in progress + interested, etc.)
      const reachedThisStage = arr
        .slice(index)
        .reduce((sum, s) => sum + s.count, 0);
      
      const percentage = totalProspects > 0 
        ? Math.round((reachedThisStage / totalProspects) * 100) 
        : 0;
      
      return {
        ...status,
        reachedCount: status.count, // Actual count at this stage
        percentage: totalProspects > 0 
          ? Math.round((status.count / totalProspects) * 100)
          : 0,
      };
    });

  // Use total prospects as 100% baseline
  const maxCount = totalProspects;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Funnel de conversion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {funnelData.map((stage, index) => {
          const widthPercent = maxCount > 0 
            ? Math.max((stage.reachedCount / maxCount) * 100, 5) // Min 5% for visibility
            : 5;
          
          return (
            <div key={stage.statusId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: stage.statusColor }}
                  />
                  <span className="font-medium">{stage.statusName}</span>
                  <span className="text-muted-foreground">({stage.reachedCount})</span>
                </div>
                <span className="text-muted-foreground font-medium">
                  {stage.percentage}%
                </span>
              </div>
              <div className="h-6 bg-muted rounded-md overflow-hidden">
                <div 
                  className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ 
                    width: `${widthPercent}%`,
                    backgroundColor: stage.statusColor,
                    opacity: 0.8,
                  }}
                >
                  {stage.reachedCount > 0 && widthPercent > 15 && (
                    <span className="text-xs font-medium text-white">
                      {stage.reachedCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Refused count if any */}
        {kpis.byStatus.some(s => s.isFinalNegative && s.count > 0) && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Refusés : {kpis.byStatus.filter(s => s.isFinalNegative).reduce((sum, s) => sum + s.count, 0)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
