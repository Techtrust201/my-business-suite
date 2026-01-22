import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export interface ProspectActivityItem {
  id: string;
  type: 'visit' | 'email' | 'created' | 'status_change';
  prospectId: string;
  prospectName: string;
  description: string;
  timestamp: string;
  metadata?: {
    statusName?: string;
    statusColor?: string;
    emailSubject?: string;
    visitNotes?: string;
  };
}

export function useProspectActivity(limit: number = 10) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-activity', organization?.id, limit],
    queryFn: async (): Promise<ProspectActivityItem[]> => {
      if (!organization?.id) return [];

      const activities: ProspectActivityItem[] = [];

      // Fetch recent visits
      const { data: visits } = await supabase
        .from('prospect_visits')
        .select(`
          id,
          visited_at,
          notes,
          prospect:prospects(id, company_name),
          status_after:prospect_statuses!prospect_visits_status_after_id_fkey(name, color)
        `)
        .eq('organization_id', organization.id)
        .order('visited_at', { ascending: false })
        .limit(limit);

      visits?.forEach(visit => {
        const prospect = visit.prospect as any;
        const statusAfter = visit.status_after as any;
        
        activities.push({
          id: `visit-${visit.id}`,
          type: 'visit',
          prospectId: prospect?.id || '',
          prospectName: prospect?.company_name || 'Inconnu',
          description: `Visite terrain`,
          timestamp: visit.visited_at,
          metadata: {
            statusName: statusAfter?.name,
            statusColor: statusAfter?.color,
            visitNotes: visit.notes || undefined,
          },
        });
      });

      // Fetch recent emails
      const { data: emails } = await supabase
        .from('prospect_emails')
        .select(`
          id,
          sent_at,
          subject,
          prospect:prospects(id, company_name)
        `)
        .eq('organization_id', organization.id)
        .order('sent_at', { ascending: false })
        .limit(limit);

      emails?.forEach(email => {
        const prospect = email.prospect as any;
        
        activities.push({
          id: `email-${email.id}`,
          type: 'email',
          prospectId: prospect?.id || '',
          prospectName: prospect?.company_name || 'Inconnu',
          description: `Email envoyé`,
          timestamp: email.sent_at,
          metadata: {
            emailSubject: email.subject,
          },
        });
      });

      // Fetch recently created prospects
      const { data: recentProspects } = await supabase
        .from('prospects')
        .select(`
          id,
          company_name,
          created_at,
          source,
          status:prospect_statuses(name, color)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      recentProspects?.forEach(prospect => {
        const status = prospect.status as any;
        
        activities.push({
          id: `created-${prospect.id}`,
          type: 'created',
          prospectId: prospect.id,
          prospectName: prospect.company_name,
          description: `Nouveau prospect${prospect.source ? ` (${prospect.source})` : ''}`,
          timestamp: prospect.created_at,
          metadata: {
            statusName: status?.name,
            statusColor: status?.color,
          },
        });
      });

      // Sort all activities by timestamp and take top N
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    },
    enabled: !!organization?.id,
  });
}
