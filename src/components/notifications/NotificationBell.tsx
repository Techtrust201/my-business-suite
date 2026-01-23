import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  User,
  FileText,
  Receipt,
  Clock,
  AtSign,
  UserPlus,
  TrendingUp,
  Info,
} from 'lucide-react';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type Notification,
  type NotificationType,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const notificationIcons: Record<NotificationType, React.ElementType> = {
  prospect_assigned: UserPlus,
  quote_status: FileText,
  invoice_paid: Receipt,
  reminder: Clock,
  mention: AtSign,
  new_prospect: User,
  prospect_status: TrendingUp,
  system: Info,
};

const notificationColors: Record<NotificationType, string> = {
  prospect_assigned: 'text-blue-500 bg-blue-50',
  quote_status: 'text-purple-500 bg-purple-50',
  invoice_paid: 'text-green-500 bg-green-50',
  reminder: 'text-amber-500 bg-amber-50',
  mention: 'text-pink-500 bg-pink-50',
  new_prospect: 'text-cyan-500 bg-cyan-50',
  prospect_status: 'text-indigo-500 bg-indigo-50',
  system: 'text-gray-500 bg-gray-50',
};

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
  onNavigate: () => void;
}

function NotificationItem({ notification, onRead, onDelete, onNavigate }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || Info;
  const colorClass = notificationColors[notification.type] || 'text-gray-500 bg-gray-50';

  const handleClick = () => {
    if (!notification.is_read) {
      onRead();
    }
    if (notification.link) {
      onNavigate();
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        notification.is_read 
          ? 'bg-background hover:bg-muted/50' 
          : 'bg-accent/50 hover:bg-accent/70'
      )}
      onClick={handleClick}
    >
      <div className={cn('p-2 rounded-full shrink-0', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn('text-sm font-medium line-clamp-1', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
            title="Marquer comme lu"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  
  const { data: notifications, isLoading } = useNotifications({ limit: 20 });
  const { data: unreadCount } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const handleNavigate = (link: string) => {
    setOpen(false);
    // Handle relative links
    if (link.startsWith('/')) {
      navigate(link);
    } else {
      window.location.href = link;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>
        
        <Separator />
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markRead.mutate(notification.id)}
                  onDelete={() => deleteNotification.mutate(notification.id)}
                  onNavigate={() => notification.link && handleNavigate(notification.link)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Aucune notification</p>
              <p className="text-xs text-muted-foreground">
                Vous serez notifié des événements importants
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
