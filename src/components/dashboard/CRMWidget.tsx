import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectKpis } from '@/hooks/useProspectKpis';
import { useProspectActivity } from '@/hooks/useProspectActivity';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Users, Target, ArrowRight, TrendingUp } from 'lucide-react';

export function CRMWidget() {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useProspectKpis();
  const { data: activities, isLoading: activitiesLoading } = useProspectActivity(3);

  const isLoading = kpisLoading || activitiesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Get key metrics from the new structure
  const totalProspects = kpis?.totalProspects || 0;
  const totalConverted = kpis?.totalConverted || 0;
  const conversionRate = kpis?.overallConversionRate || 0;

  // Calculate total revenue from converted prospects
  const totalRevenue = kpis?.bySource.reduce((sum, s) => sum + s.revenue, 0) || 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M €`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k €`;
    return `${value.toFixed(0)} €`;
  };

  const lastActivity = activities?.[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Prospection
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => navigate('/crm')}
          >
            Voir CRM
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalProspects}</span>
            </div>
            <p className="text-xs text-muted-foreground">Prospects</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{totalConverted}</span>
            </div>
            <p className="text-xs text-muted-foreground">Convertis</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{conversionRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </div>
        </div>

        {/* Revenue info */}
        {totalRevenue > 0 && (
          <div className="flex items-center justify-center text-sm border-t pt-3">
            <div>
              <span className="text-muted-foreground">CA généré : </span>
              <span className="font-medium text-green-600">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>
        )}

        {/* Last activity */}
        {lastActivity && (
          <div className="text-sm border-t pt-3">
            <p className="text-muted-foreground text-xs mb-1">Dernière activité</p>
            <p className="truncate">
              <span className="font-medium">{lastActivity.prospectName}</span>
              <span className="text-muted-foreground"> - {lastActivity.description}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(lastActivity.timestamp), { 
                addSuffix: true, 
                locale: fr 
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
