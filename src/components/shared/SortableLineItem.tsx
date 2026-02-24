import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

export interface DragHandleProps {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
}

interface SortableLineItemProps {
  id: string;
  children: ReactNode | ((props: { dragHandleProps: DragHandleProps }) => ReactNode);
  className?: string;
  disabled?: boolean;
  /** If true, the drag handle is rendered inside children via render prop */
  renderDragHandleInside?: boolean;
}

export function SortableLineItem({ 
  id, 
  children, 
  className, 
  disabled,
  renderDragHandleInside = false,
}: SortableLineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.3 : 1,
    pointerEvents: isDragging ? 'none' as const : 'auto' as const,
  };

  const dragHandleProps: DragHandleProps = {
    attributes: attributes as unknown as Record<string, unknown>,
    listeners: listeners as unknown as Record<string, unknown> | undefined,
  };

  // Render prop mode: drag handle inside children
  if (renderDragHandleInside && typeof children === 'function') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative',
          className
        )}
      >
        {children({ dragHandleProps })}
      </div>
    );
  }

  // Default mode: drag handle outside
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
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
              'opacity-0 group-hover:opacity-100 focus:opacity-100',
              'touch-none'
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className={cn('flex-1', !disabled && 'pl-0')}>
          {typeof children === 'function' ? children({ dragHandleProps }) : children}
        </div>
      </div>
    </div>
  );
}
