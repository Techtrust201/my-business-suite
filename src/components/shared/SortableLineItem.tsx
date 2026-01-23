import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableLineItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SortableLineItem({ id, children, className, disabled }: SortableLineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'z-50 opacity-90 shadow-lg',
        className
      )}
    >
      <div className="flex items-start gap-2">
        {!disabled && (
          <button
            type="button"
            className={cn(
              'flex-shrink-0 p-2 mt-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing',
              'text-muted-foreground hover:text-foreground transition-colors',
              'opacity-0 group-hover:opacity-100 focus:opacity-100'
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className={cn('flex-1', !disabled && 'pl-0')}>
          {children}
        </div>
      </div>
    </div>
  );
}
