import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectKpis } from '@/hooks/useProspectKpis';
import { TrendingUp, Users, Target, Percent } from 'lucide-react';

export function ProspectKPICards() {
  const { data: kpis, isLoading } = useProspectKpis();

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

  // Get statuses for display (max 5 for main KPI cards)
  const displayStatuses = kpis.byStatus.slice(0, 5);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {displayStatuses.map(status => (
        <Card key={status.statusId}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: status.statusColor }}
              />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {status.statusName}
              </span>
            </div>
            <div className="text-2xl font-bold">{status.count}</div>
            {status.addedThisMonth > 0 && (
              <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{status.addedThisMonth} ce mois
              </div>
            )}
            {status.addedThisMonth === 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                ce mois
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Overall stats if we have fewer than 5 statuses */}
      {displayStatuses.length < 4 && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">Total</span>
              </div>
              <div className="text-2xl font-bold">{kpis.totalProspects}</div>
              <div className="text-xs text-muted-foreground mt-1">
                prospects
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Percent className="h-4 w-4" />
                <span className="text-xs font-medium">Conversion</span>
              </div>
              <div className="text-2xl font-bold">{kpis.overallConversionRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                {kpis.totalConverted} clients
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
