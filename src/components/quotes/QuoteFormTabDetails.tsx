import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, User, Building2, TrendingUp, Info } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { MarginStrip } from '@/components/shared/MarginStrip';
import { cn } from '@/lib/utils';
import type { Contact } from '@/hooks/useClients';

interface MarginData {
  totalCost: number;
  totalSale: number;
  totalMargin: number;
  marginPercent: number;
}

interface QuoteFormTabDetailsProps {
  clients: Contact[] | undefined;
  selectedClient: Contact | null;
  total: number;
  lineCount: number;
  hasGlobalDiscount: boolean;
  margins?: MarginData | null;
}

export function QuoteFormTabDetails({
  clients,
  selectedClient,
  total,
  lineCount,
  hasGlobalDiscount,
  margins,
}: QuoteFormTabDetailsProps) {
  const form = useFormContext();

  return (
    <div className="space-y-6">
      {/* Client Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="w-4 h-4" />
          <span>Client</span>
        </div>
        <FormField
          control={form.control}
          name="contact_id"
          render={({ field }) => (
            <FormItem>
              <Select
                onValueChange={field.onChange}
                value={field.value || 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="— Aucun client —" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">— Aucun client —</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name ||
                        `${client.first_name} ${client.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Client Mini Card */}
        {selectedClient && (
          <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {selectedClient.company_name ||
                  `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim()}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {[
                  selectedClient.billing_address_line1,
                  selectedClient.billing_postal_code,
                  selectedClient.billing_city,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Subject Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="16" y2="15" />
          </svg>
          <span>Sujet du devis</span>
        </div>
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Ex: Développement site web"
                  className="min-h-[60px] resize-y"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Dates Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarIcon className="w-4 h-4" />
          <span>Dates</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-xs">
                  Date du devis <span className="text-destructive">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal text-sm',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy', { locale: fr })
                        ) : (
                          <span>Choisir</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valid_until"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-xs">Valide jusqu'au</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal text-sm',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy', { locale: fr })
                        ) : (
                          <span>Optionnel</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Summary Card */}
      <SummaryCard
        total={total}
        lineCount={lineCount}
        hasGlobalDiscount={hasGlobalDiscount}
        className="mt-4"
      />

      {/* Margin Analysis - Internal only */}
      {margins && (
        <>
          <Separator className="my-4" />
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Analyse de marge</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      La marge est calculée sur les prix d'achat des articles.
                      Cette information est interne et n'apparaît pas sur le devis client.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <MarginStrip
              totalCost={margins.totalCost}
              totalSale={margins.totalSale}
              grossMargin={margins.totalMargin}
              marginPercent={margins.marginPercent}
            />
          </div>
        </>
      )}
    </div>
  );
}
