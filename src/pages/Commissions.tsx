import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Users,
  FileText,
  Download,
  Filter,
} from 'lucide-react';
import {
  useCommissions,
  useMyCommissions,
  useCommissionStats,
  useUpdateCommissionStatus,
  type Commission,
  type CommissionStatus,
} from '@/hooks/useCommissions';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const months = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const statusConfig: Record<CommissionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" /> },
  approved: { label: 'Approuvée', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-4 w-4" /> },
  paid: { label: 'Payée', color: 'bg-green-100 text-green-800', icon: <DollarSign className="h-4 w-4" /> },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs mt-1',
            trend.value >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            <TrendingUp className={cn('h-3 w-3', trend.value < 0 && 'rotate-180')} />
            <span>{trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommissionsTable({
  commissions,
  isLoading,
  isAdmin,
  onStatusChange,
}: {
  commissions: Commission[];
  isLoading: boolean;
  isAdmin: boolean;
  onStatusChange: (id: string, status: CommissionStatus) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Aucune commission</h3>
        <p className="text-sm text-muted-foreground">
          Les commissions apparaîtront ici une fois calculées
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          {isAdmin && <TableHead>Commercial</TableHead>}
          <TableHead>Facture</TableHead>
          <TableHead>Client</TableHead>
          <TableHead className="text-right">Montant facture</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {commissions.map((commission) => {
          const status = statusConfig[commission.status];
          const clientName = commission.invoice?.contact
            ? commission.invoice.contact.company_name ||
              `${commission.invoice.contact.first_name} ${commission.invoice.contact.last_name}`
            : '-';

          return (
            <TableRow key={commission.id}>
              <TableCell className="font-medium">
                {format(new Date(commission.created_at), 'dd/MM/yyyy', { locale: fr })}
              </TableCell>
              {isAdmin && (
                <TableCell>
                  {commission.user?.first_name} {commission.user?.last_name}
                </TableCell>
              )}
              <TableCell>
                <span className="font-mono text-sm">
                  {commission.invoice?.number || '-'}
                </span>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{clientName}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(commission.invoice_amount)}
              </TableCell>
              <TableCell className="text-right font-medium">
                <div>
                  {formatCurrency(commission.total_amount)}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({commission.commission_percentage}%)
                  </span>
                </div>
                {commission.bonus_amount > 0 && (
                  <div className="text-xs text-green-600">
                    +{formatCurrency(commission.bonus_amount)} bonus
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge className={cn('flex items-center gap-1 w-fit', status.color)}>
                  {status.icon}
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>
                {isAdmin && commission.status !== 'paid' && commission.status !== 'cancelled' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {commission.status === 'pending' && (
                        <DropdownMenuItem onClick={() => onStatusChange(commission.id, 'approved')}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approuver
                        </DropdownMenuItem>
                      )}
                      {commission.status === 'approved' && (
                        <DropdownMenuItem onClick={() => onStatusChange(commission.id, 'paid')}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Marquer payée
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onStatusChange(commission.id, 'cancelled')}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Annuler
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function Commissions() {
  const { isAdmin } = useCurrentUserPermissions();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('all');

  const { data: users } = useOrganizationUsers();
  const updateStatus = useUpdateCommissionStatus();

  // Fetch commissions based on filters
  const { data: commissions, isLoading } = useCommissions({
    userId: isAdmin ? selectedUserId : user?.id,
    periodMonth: selectedMonth ? parseInt(selectedMonth) : undefined,
    periodYear: selectedYear ? parseInt(selectedYear) : undefined,
    status: activeTab !== 'all' ? (activeTab as CommissionStatus) : undefined,
  });

  // Stats for the current user or all (for admin)
  const { data: stats } = useCommissionStats(isAdmin ? selectedUserId : user?.id);

  const handleStatusChange = (id: string, status: CommissionStatus) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {isAdmin ? 'Commissions' : 'Mes Commissions'}
            </h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Gérez les commissions de votre équipe commerciale'
                : 'Suivez vos commissions et votre performance'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Ce mois"
            value={formatCurrency(stats?.totalThisMonth || 0)}
            description={`${months[currentMonth - 1]?.label} ${currentYear}`}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          />
          <StatsCard
            title="Cette année"
            value={formatCurrency(stats?.totalThisYear || 0)}
            description={`Cumul ${currentYear}`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
          <StatsCard
            title="En attente"
            value={formatCurrency(stats?.totalPending || 0)}
            description="À approuver/payer"
            icon={<Clock className="h-4 w-4 text-yellow-500" />}
          />
          <StatsCard
            title="Total payé"
            value={formatCurrency(stats?.totalPaid || 0)}
            description={`${stats?.commissionCount || 0} commissions`}
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Période:</span>
                <Select value={selectedMonth || 'all'} onValueChange={(v) => setSelectedMonth(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les mois</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Commercial:</span>
                  <Select
                    value={selectedUserId || 'all'}
                    onValueChange={(v) => setSelectedUserId(v === 'all' ? undefined : v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Tous les commerciaux" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les commerciaux</SelectItem>
                      {users?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.first_name} {u.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Commissions List */}
        <Card>
          <CardHeader className="pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="pending">En attente</TabsTrigger>
                <TabsTrigger value="approved">Approuvées</TabsTrigger>
                <TabsTrigger value="paid">Payées</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <CommissionsTable
              commissions={commissions || []}
              isLoading={isLoading}
              isAdmin={isAdmin}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
