import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Eye, Pencil, Phone, Mail, Building2, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ProspectWithStatus } from '@/hooks/useProspects';

function getUserInitials(user: ProspectWithStatus['creator'] | ProspectWithStatus['assigned_to']): string {
  if (!user) return '?';
  const first = user.first_name?.[0] || '';
  const last = user.last_name?.[0] || '';
  if (first || last) return (first + last).toUpperCase();
  return user.email?.[0]?.toUpperCase() || '?';
}

function getUserDisplayName(user: ProspectWithStatus['creator'] | ProspectWithStatus['assigned_to']): string {
  if (!user) return 'Non attribué';
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email || 'Inconnu';
}

interface ProspectsTableProps {
  prospects: ProspectWithStatus[];
  isLoading?: boolean;
  onView?: (prospect: ProspectWithStatus) => void;
  onEdit?: (prospect: ProspectWithStatus) => void;
  selectedId?: string | null;
  onSelect?: (prospect: ProspectWithStatus) => void;
}

export function ProspectsTable({
  prospects,
  isLoading,
  onView,
  onEdit,
  selectedId,
  onSelect,
}: ProspectsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Aucun prospect</p>
        <p className="text-sm">Commencez par ajouter votre premier prospect</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Entreprise</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Localisation</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Attribué à</TableHead>
          <TableHead>Créé par</TableHead>
          <TableHead>Créé le</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prospects.map((prospect) => (
          <TableRow
            key={prospect.id}
            className={`cursor-pointer transition-colors ${
              selectedId === prospect.id ? 'bg-accent' : 'hover:bg-muted/50'
            }`}
            onClick={() => onSelect?.(prospect)}
          >
            <TableCell>
              <div className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: prospect.status?.color || '#6B7280' }}
                />
                <div>
                  <div className="font-medium">{prospect.company_name}</div>
                  {prospect.siret && (
                    <div className="text-xs text-muted-foreground">
                      SIRET: {prospect.siret}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              {prospect.status ? (
                <Badge
                  style={{
                    backgroundColor: prospect.status.color,
                    color: 'white',
                  }}
                >
                  {prospect.status.name}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                {prospect.latitude && prospect.longitude ? (
                  <MapPin className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {prospect.postal_code} {prospect.city || '—'}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {prospect.phone && (
                  <a
                    href={`tel:${prospect.phone}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {prospect.email && (
                  <a
                    href={`mailto:${prospect.email}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {!prospect.phone && !prospect.email && (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </TableCell>
            {/* Assigned to */}
            <TableCell>
              {prospect.assigned_to ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                            {getUserInitials(prospect.assigned_to)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[80px]">
                          {prospect.assigned_to.first_name || prospect.assigned_to.email?.split('@')[0]}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getUserDisplayName(prospect.assigned_to)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </TableCell>
            {/* Created by */}
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getUserInitials(prospect.creator)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate max-w-[80px]">
                        {prospect.creator?.first_name || prospect.creator?.email?.split('@')[0] || '—'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getUserDisplayName(prospect.creator)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(prospect.created_at), 'dd MMM yyyy', { locale: fr })}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView?.(prospect);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(prospect);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
