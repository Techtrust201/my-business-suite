import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, MapPin, Globe, Users, Building, Phone, ShoppingCart, TrendingUp } from 'lucide-react';
import { useRevenueByChannel, type ChannelKPI } from '@/hooks/useProspectKPIs';
import { cn } from '@/lib/utils';

const channelIcons: Record<string, React.ReactNode> = {
  terrain: <MapPin className="h-4 w-4" />,
  web: <Globe className="h-4 w-4" />,
  referral: <Users className="h-4 w-4" />,
  salon: <Building className="h-4 w-4" />,
  phoning: <Phone className="h-4 w-4" />,
  direct: <ShoppingCart className="h-4 w-4" />,
};

const channelColors: Record<string, { bg: string; text: string }> = {
  terrain: { bg: 'bg-blue-100', text: 'text-blue-700' },
  web: { bg: 'bg-purple-100', text: 'text-purple-700' },
  referral: { bg: 'bg-green-100', text: 'text-green-700' },
  salon: { bg: 'bg-orange-100', text: 'text-orange-700' },
  phoning: { bg: 'bg-pink-100', text: 'text-pink-700' },
  direct: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function ChannelCard({ kpi, totalRevenue }: { kpi: ChannelKPI; totalRevenue: number }) {
  const colors = channelColors[kpi.channel] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  const percentage = totalRevenue > 0 ? Math.round((kpi.totalHT / totalRevenue) * 100) : 0;

  return (
    <div className={cn('p-3 rounded-lg', colors.bg)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-md bg-white/60', colors.text)}>
            {channelIcons[kpi.channel] || <DollarSign className="h-4 w-4" />}
          </div>
          <span className={cn('text-sm font-medium', colors.text)}>{kpi.label}</span>
        </div>
        <Badge variant="outline" className={cn('text-xs', colors.text, 'border-current/20')}>
          {percentage}%
        </Badge>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className={cn('text-lg font-bold', colors.text)}>
            {formatCurrency(kpi.totalHT)}
          </p>
          <p className="text-xs text-muted-foreground">
            {kpi.count} facture{kpi.count !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Panier moyen</p>
          <p className={cn('text-sm font-medium', colors.text)}>
            {formatCurrency(kpi.avgValue)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function RevenueByChannelWidget() {
  const { data: channels, isLoading } = useRevenueByChannel();

  const totalRevenue = channels?.reduce((sum, c) => sum + c.totalHT, 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              CA par canal
            </CardTitle>
            <CardDescription>
              Chiffre d'affaires par canal d'acquisition
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Total facturé</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!channels || channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Aucune donnée</p>
            <p className="text-xs text-muted-foreground">
              Les statistiques apparaîtront avec vos premières factures payées
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {channels.map((kpi) => (
              <ChannelCard key={kpi.channel} kpi={kpi} totalRevenue={totalRevenue} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
