import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MapPin, 
  Mail, 
  FileText, 
  Clock, 
  ArrowRight,
  CalendarDays,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProspectVisit } from '@/hooks/useProspects';
import { ProspectEmail } from '@/hooks/useProspectEmails';
import { ProspectQuote } from '@/hooks/useProspectQuotes';
import { useProspectStatuses } from '@/hooks/useProspectStatuses';

interface TimelineItem {
  id: string;
  type: 'visit' | 'email' | 'quote';
  date: Date;
  data: ProspectVisit | ProspectEmail | ProspectQuote;
}

interface ProspectTimelineProps {
  visits: ProspectVisit[];
  emails: ProspectEmail[];
  quotes: ProspectQuote[];
  isLoading?: boolean;
}

export function ProspectTimeline({ 
  visits, 
  emails, 
  quotes, 
  isLoading 
}: ProspectTimelineProps) {
  const { data: statuses } = useProspectStatuses();

  // Merge and sort all items chronologically
  const timelineItems: TimelineItem[] = [
    ...visits.map(v => ({ 
      id: v.id, 
      type: 'visit' as const, 
      date: new Date(v.visited_at), 
      data: v 
    })),
    ...emails.map(e => ({ 
      id: e.id, 
      type: 'email' as const, 
      date: new Date(e.sent_at), 
      data: e 
    })),
    ...quotes.map(q => ({ 
      id: q.id, 
      type: 'quote' as const, 
      date: new Date(q.created_at), 
      data: q 
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const getStatusName = (statusId: string | null) => {
    if (!statusId || !statuses) return null;
    const status = statuses.find(s => s.id === statusId);
    return status?.name || null;
  };

  const getStatusColor = (statusId: string | null) => {
    if (!statusId || !statuses) return '#6B7280';
    const status = statuses.find(s => s.id === statusId);
    return status?.color || '#6B7280';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucune activité pour ce prospect</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      
      <div className="space-y-4">
        {timelineItems.map((item) => (
          <div key={item.id} className="relative flex gap-3 pl-2">
            {/* Icon circle */}
            <div className={`
              relative z-10 flex h-8 w-8 items-center justify-center rounded-full 
              ${item.type === 'visit' ? 'bg-blue-100 text-blue-600' : ''}
              ${item.type === 'email' ? 'bg-green-100 text-green-600' : ''}
              ${item.type === 'quote' ? 'bg-amber-100 text-amber-600' : ''}
            `}>
              {item.type === 'visit' && <MapPin className="h-4 w-4" />}
              {item.type === 'email' && <Mail className="h-4 w-4" />}
              {item.type === 'quote' && <FileText className="h-4 w-4" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {item.type === 'visit' && 'Visite terrain'}
                  {item.type === 'email' && 'Email envoyé'}
                  {item.type === 'quote' && 'Devis créé'}
                </span>
                <span className="text-muted-foreground">
                  {format(item.date, "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
              </div>

              {/* Visit details */}
              {item.type === 'visit' && (
                <div className="mt-2 space-y-1 text-sm">
                  {(item.data as ProspectVisit).status_before_id || (item.data as ProspectVisit).status_after_id ? (
                    <div className="flex items-center gap-2">
                      <span 
                        className="inline-block px-2 py-0.5 rounded text-xs text-white"
                        style={{ backgroundColor: getStatusColor((item.data as ProspectVisit).status_before_id) }}
                      >
                        {getStatusName((item.data as ProspectVisit).status_before_id) || 'Aucun'}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span 
                        className="inline-block px-2 py-0.5 rounded text-xs text-white"
                        style={{ backgroundColor: getStatusColor((item.data as ProspectVisit).status_after_id) }}
                      >
                        {getStatusName((item.data as ProspectVisit).status_after_id) || 'Aucun'}
                      </span>
                    </div>
                  ) : null}
                  {(item.data as ProspectVisit).duration_minutes && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{(item.data as ProspectVisit).duration_minutes} min</span>
                    </div>
                  )}
                  {(item.data as ProspectVisit).notes && (
                    <p className="text-muted-foreground mt-1">
                      {(item.data as ProspectVisit).notes}
                    </p>
                  )}
                  {(item.data as ProspectVisit).next_action && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded text-xs">
                      <CalendarDays className="h-3 w-3" />
                      <span className="font-medium">Prochaine action:</span>
                      <span>{(item.data as ProspectVisit).next_action}</span>
                      {(item.data as ProspectVisit).next_action_date && (
                        <span className="text-muted-foreground">
                          ({format(new Date((item.data as ProspectVisit).next_action_date!), 'd MMM', { locale: fr })})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Email details */}
              {item.type === 'email' && (
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      À: {(item.data as ProspectEmail).to_email}
                    </span>
                  </div>
                  <p className="font-medium">{(item.data as ProspectEmail).subject}</p>
                </div>
              )}

              {/* Quote details */}
              {item.type === 'quote' && (
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{(item.data as ProspectQuote).number}</span>
                    <Badge variant="outline" className="text-xs">
                      {(item.data as ProspectQuote).status}
                    </Badge>
                  </div>
                  {(item.data as ProspectQuote).subject && (
                    <p className="text-muted-foreground">
                      {(item.data as ProspectQuote).subject}
                    </p>
                  )}
                  {(item.data as ProspectQuote).total && (
                    <p className="font-medium">
                      {new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR' 
                      }).format((item.data as ProspectQuote).total!)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
