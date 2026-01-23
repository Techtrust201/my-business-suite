import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';
import {
  useExportProspectsCSV,
  useImportProspectsCSV,
  downloadTemplateCSV,
  type ImportResult,
} from '@/hooks/useProspectCSV';
import type { ProspectWithStatus } from '@/hooks/useProspects';

interface ProspectCSVActionsProps {
  prospects: ProspectWithStatus[];
  filteredCount?: number;
}

export function ProspectCSVActions({ prospects, filteredCount }: ProspectCSVActionsProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const exportCSV = useExportProspectsCSV();
  const importCSV = useImportProspectsCSV();

  const handleExportAll = () => {
    exportCSV(prospects, `prospects_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult(null);
    setIsImportDialogOpen(true);

    const result = await importCSV.mutateAsync(file);
    setImportResult(result);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseDialog = () => {
    setIsImportDialogOpen(false);
    setImportResult(null);
    setShowResultDetails(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import / Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            Exporter tout ({prospects.length})
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importer un CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTemplateCSV}>
            <FileDown className="h-4 w-4 mr-2" />
            Télécharger le template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import de prospects</DialogTitle>
            <DialogDescription>
              {importCSV.isPending
                ? 'Import en cours...'
                : importResult
                ? 'Import terminé'
                : 'Chargement du fichier...'}
            </DialogDescription>
          </DialogHeader>

          {importCSV.isPending && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Analyse et import des données...
              </p>
            </div>
          )}

          {importResult && (
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-xs text-green-700">Importés</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-amber-600" />
                  <p className="text-2xl font-bold text-amber-600">{importResult.duplicates}</p>
                  <p className="text-xs text-amber-700">Doublons</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <XCircle className="h-6 w-6 mx-auto mb-1 text-red-600" />
                  <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                  <p className="text-xs text-red-700">Erreurs</p>
                </div>
              </div>

              {/* Details toggle */}
              {importResult.details.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResultDetails(!showResultDetails)}
                    className="w-full"
                  >
                    {showResultDetails ? 'Masquer les détails' : 'Voir les détails'}
                  </Button>
                  
                  {showResultDetails && (
                    <ScrollArea className="h-40 mt-2 border rounded-md p-2">
                      <div className="space-y-1">
                        {importResult.details.map((detail, index) => (
                          <p key={index} className="text-xs text-muted-foreground">
                            {detail}
                          </p>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {importResult.success > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {importResult.success} prospect(s) ajouté(s) avec succès à votre base.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleCloseDialog}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
