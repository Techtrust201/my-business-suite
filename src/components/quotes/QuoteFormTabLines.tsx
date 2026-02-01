import { useCallback, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortableLineItem } from '@/components/shared/SortableLineItem';
import { QuoteLineCard } from './QuoteLineCard';
import { ArticlePicker } from '@/components/shared/ArticlePicker';
import type { Article } from '@/hooks/useArticles';

interface TaxRate {
  id: string;
  rate: number;
  name?: string | null;
}

interface QuoteFormTabLinesProps {
  articles: Article[] | undefined;
  taxRates: TaxRate[] | undefined;
  defaultTaxRate: number;
  onAddArticle: (articleId: string) => void;
}

export function QuoteFormTabLines({
  articles,
  taxRates,
  defaultTaxRate,
  onAddArticle,
}: QuoteFormTabLinesProps) {
  const form = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'lines',
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      
      if (!over || active.id === over.id) return;

      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        move(oldIndex, newIndex);
      }
    },
    [fields, move]
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      const lineData = form.getValues(`lines.${index}`);
      append({
        ...lineData,
        description: `${lineData.description} (copie)`,
      });
    },
    [form, append]
  );

  const getLineTypeCount = (idx: number, type: string) => {
    const linesBefore = fields.slice(0, idx);
    const sameTypeLines = linesBefore.filter((_, i) => {
      const l = form.watch(`lines.${i}`);
      return (l?.line_type || 'item') === type;
    });
    return sameTypeLines.length + 1;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Lignes du devis
        </span>
        <ArticlePicker
          articles={articles}
          onSelect={onAddArticle}
          buttonLabel="Ajouter un article"
          buttonSize="sm"
          buttonVariant="default"
        />
      </div>

      {/* Lines list with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map((field, index) => {
              const line = form.watch(`lines.${index}`);
              const lineType = line?.line_type || 'item';

              return (
                <SortableLineItem
                  key={field.id}
                  id={field.id}
                  disabled={false}
                  renderDragHandleInside
                >
                  {({ dragHandleProps }) => (
                    <QuoteLineCard
                      index={index}
                      canDelete={fields.length > 1}
                      onDelete={remove}
                      onDuplicate={handleDuplicate}
                      taxRates={taxRates}
                      defaultTaxRate={defaultTaxRate}
                      lineType={lineType}
                      typeCount={getLineTypeCount(index, lineType)}
                      dragHandleProps={dragHandleProps}
                    />
                  )}
                </SortableLineItem>
              );
            })}
          </div>
        </SortableContext>
        
        <DragOverlay 
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1)',
          }}
          style={{ 
            cursor: 'grabbing',
            transform: 'rotate(2deg)',
          }}
        >
          {activeId ? (() => {
            const activeIndex = fields.findIndex((f) => f.id === activeId);
            if (activeIndex === -1) return null;
            const line = form.watch(`lines.${activeIndex}`);
            const lineType = line?.line_type || 'item';
            
            return (
              <div className="w-full shadow-2xl border-2 border-primary/30 bg-background rounded-lg">
                <QuoteLineCard
                  index={activeIndex}
                  canDelete={false}
                  onDelete={() => {}}
                  onDuplicate={() => {}}
                  taxRates={taxRates}
                  defaultTaxRate={defaultTaxRate}
                  lineType={lineType}
                  typeCount={getLineTypeCount(activeIndex, lineType)}
                  dragHandleProps={{ attributes: {}, listeners: undefined }}
                />
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>

      {/* Add line buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs border-dashed"
          onClick={() =>
            append({
              description: '',
              quantity: 1,
              unit_price: 0,
              tax_rate: defaultTaxRate,
              discount_percent: 0,
              purchase_price: null,
              line_type: 'item' as const,
            })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nouvelle ligne
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs border-dashed border"
          onClick={() =>
            append({
              description: '',
              quantity: 0,
              unit_price: 0,
              tax_rate: 0,
              discount_percent: 0,
              purchase_price: null,
              line_type: 'text' as const,
            })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Texte libre
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs border-dashed border"
          onClick={() =>
            append({
              description: '',
              quantity: 0,
              unit_price: 0,
              tax_rate: 0,
              discount_percent: 0,
              purchase_price: null,
              line_type: 'section' as const,
            })
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Section
        </Button>
      </div>
    </div>
  );
}
