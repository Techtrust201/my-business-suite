import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProspectActivity } from '@/hooks/useProspectActivity';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Mail, UserPlus, Activity } from 'lucide-react';

interface ProspectActivityFeedProps {
  limit?: number;
  compact?: boolean;
  onProspectClick?: (prospectId: string) => void;
}

export function ProspectActivityFeed({ 
  limit = 10, 
  compact = false,
  onProspectClick 
}: ProspectActivityFeedProps) {
  const { data: activities, isLoading } = useProspectActivity(limit);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-green-500" />;
      case 'created':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune activité récente. Commencez par créer des prospects !
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div 
              key={activity.id} 
              className={`flex items-start gap-3 ${onProspectClick ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors' : ''}`}
              onClick={() => onProspectClick?.(activity.prospectId)}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {activity.prospectName}
                  </span>
                  {activity.metadata?.statusName && (
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: activity.metadata.statusColor }}
                    >
                      {activity.metadata.statusName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
                  {activity.metadata?.emailSubject && (
                    <span className="italic"> - {activity.metadata.emailSubject}</span>
                  )}
                </p>
                {!compact && activity.metadata?.visitNotes && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {activity.metadata.visitNotes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.timestamp), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
