import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Globe, Users, Building, Phone, HelpCircle, TrendingUp } from 'lucide-react';
import { useProspectSourceKPIs, type SourceKPI } from '@/hooks/useProspectKPIs';
import { cn } from '@/lib/utils';

const sourceIcons: Record<string, React.ReactNode> = {
  terrain: <MapPin className="h-4 w-4" />,
  web: <Globe className="h-4 w-4" />,
  referral: <Users className="h-4 w-4" />,
  salon: <Building className="h-4 w-4" />,
  phoning: <Phone className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
};

const sourceColors: Record<string, string> = {
  terrain: 'bg-blue-500',
  web: 'bg-purple-500',
  referral: 'bg-green-500',
  salon: 'bg-orange-500',
  phoning: 'bg-pink-500',
  other: 'bg-gray-500',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function SourceRow({ kpi, maxCount }: { kpi: SourceKPI; maxCount: number }) {
  const progressValue = maxCount > 0 ? (kpi.count / maxCount) * 100 : 0;
  const color = sourceColors[kpi.source] || 'bg-gray-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg text-white', color)}>
            {sourceIcons[kpi.source] || <HelpCircle className="h-4 w-4" />}
          </div>
          <div>
            <span className="text-sm font-medium">{kpi.label}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {kpi.count} prospect{kpi.count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-right">
          <Badge
            variant="outline"
            className={cn(
              kpi.conversionRate >= 30
                ? 'border-green-500 text-green-600'
                : kpi.conversionRate >= 15
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-gray-300'
            )}
          >
            {kpi.conversionRate}% conv.
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={progressValue} className="flex-1 h-2" />
        {kpi.revenue > 0 && (
          <span className="text-xs font-medium text-muted-foreground min-w-[80px] text-right">
            {formatCurrency(kpi.revenue)}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProspectSourceWidget() {
  const { data: kpis, isLoading } = useProspectSourceKPIs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...(kpis?.bySource.map((k) => k.count) || [1]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              KPIs par source
            </CardTitle>
            <CardDescription>
              Performance de prospection par canal d'acquisition
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{kpis?.overallConversionRate || 0}%</p>
            <p className="text-xs text-muted-foreground">Taux global</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!kpis?.bySource || kpis.bySource.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Aucune donnée</p>
            <p className="text-xs text-muted-foreground">
              Les statistiques apparaîtront avec vos premiers prospects
            </p>
          </div>
        ) : (
          kpis.bySource.map((kpi) => (
            <SourceRow key={kpi.source} kpi={kpi} maxCount={maxCount} />
          ))
        )}

        {kpis && kpis.totalProspects > 0 && (
          <div className="pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{kpis.totalProspects} prospects total</span>
            <span>{kpis.totalConverted} convertis</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
