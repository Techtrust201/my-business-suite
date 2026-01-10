import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FecExportProps {
  startDate: string;
  endDate: string;
}

export function FecExport({ startDate, endDate }: FecExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { organization } = useOrganization();
  const { data: entries, isLoading: entriesLoading } = useJournalEntries({
    startDate,
    endDate,
    status: 'posted',
  });
  const { data: accounts } = useChartOfAccounts();
  const { toast } = useToast();

  const generateFEC = async () => {
    if (!organization || !entries || entries.length === 0) return;

    setIsExporting(true);
    try {
      // Fetch all entry lines with account info
      const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          account:chart_of_accounts(account_number, name),
          journal_entry:journal_entries!inner(
            entry_number, date, description, journal_type, organization_id
          )
        `)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted')
        .gte('journal_entry.date', startDate)
        .lte('journal_entry.date', endDate)
        .order('journal_entry(date)', { ascending: true });

      if (error) throw error;

      // FEC format specification
      // JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise
      const headers = [
        'JournalCode',
        'JournalLib',
        'EcritureNum',
        'EcritureDate',
        'CompteNum',
        'CompteLib',
        'CompAuxNum',
        'CompAuxLib',
        'PieceRef',
        'PieceDate',
        'EcritureLib',
        'Debit',
        'Credit',
        'EcritureLet',
        'DateLet',
        'ValidDate',
        'Montantdevise',
        'Idevise',
      ].join('|');

      const journalLabels: Record<string, string> = {
        sales: 'Journal des ventes',
        purchases: 'Journal des achats',
        bank: 'Journal de banque',
        general: 'Journal des OD',
      };

      const journalCodes: Record<string, string> = {
        sales: 'VE',
        purchases: 'AC',
        bank: 'BQ',
        general: 'OD',
      };

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0].replace(/-/g, '');
      };

      const formatAmount = (amount: number) => {
        return amount.toFixed(2).replace('.', ',');
      };

      const rows = (lines || []).map((line: any) => {
        const je = line.journal_entry;
        return [
          journalCodes[je.journal_type] || 'OD',
          journalLabels[je.journal_type] || 'Opérations diverses',
          je.entry_number,
          formatDate(je.date),
          line.account.account_number,
          line.account.name.replace(/\|/g, ' '),
          '', // CompAuxNum
          '', // CompAuxLib
          je.entry_number, // PieceRef
          formatDate(je.date), // PieceDate
          (line.description || je.description).replace(/\|/g, ' '),
          formatAmount(line.debit || 0),
          formatAmount(line.credit || 0),
          '', // EcritureLet
          '', // DateLet
          formatDate(je.date), // ValidDate
          '', // Montantdevise
          'EUR', // Idevise
        ].join('|');
      });

      const fecContent = [headers, ...rows].join('\r\n');

      // Generate filename
      const siren = organization.siret?.substring(0, 9) || '000000000';
      const year = startDate.substring(0, 4);
      const filename = `${siren}FEC${year}1231.txt`;

      // Download file
      const blob = new Blob([fecContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export réussi',
        description: `Le fichier ${filename} a été téléchargé.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur d\'export',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const entriesCount = entries?.length || 0;
  const hasEntries = entriesCount > 0;

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fichier des Écritures Comptables (FEC)
          </CardTitle>
          <CardDescription>
            Export au format réglementaire pour l'administration fiscale française
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-medium">Qu'est-ce que le FEC ?</h4>
            <p className="text-sm text-muted-foreground">
              Le Fichier des Écritures Comptables (FEC) est un document obligatoire que toute entreprise 
              soumise à un contrôle fiscal doit pouvoir produire. Il contient l'ensemble des écritures 
              comptables de l'exercice dans un format standardisé.
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Format texte avec séparateur pipe (|)</li>
              <li>Encodage UTF-8</li>
              <li>18 colonnes obligatoires</li>
              <li>Nommage : [SIREN]FEC[AAAAMMJJ].txt</li>
            </ul>
          </div>

          {/* Export status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {hasEntries ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <p className="font-medium">
                  {hasEntries 
                    ? `${entriesCount} écriture${entriesCount > 1 ? 's' : ''} à exporter` 
                    : 'Aucune écriture à exporter'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Période : du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <Badge variant={hasEntries ? 'default' : 'secondary'}>
              {hasEntries ? 'Prêt' : 'Vide'}
            </Badge>
          </div>

          {/* Export button */}
          <Button 
            onClick={generateFEC} 
            disabled={!hasEntries || isExporting || entriesLoading}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? 'Génération en cours...' : 'Télécharger le FEC'}
          </Button>
        </CardContent>
      </Card>

      {/* Compliance notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conformité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Format conforme à l'article A.47 A-1 du LPF</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>18 colonnes réglementaires incluses</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Séparateur pipe (|) conforme</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Encodage UTF-8</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
