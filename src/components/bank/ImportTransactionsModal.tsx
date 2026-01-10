import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
} from 'lucide-react';
import { parseBankFile, type ParsedTransaction } from '@/lib/bankImportParser';
import { useBankTransactions } from '@/hooks/useBankTransactions';

interface ImportTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccountId: string;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function ImportTransactionsModal({
  open,
  onOpenChange,
  bankAccountId,
}: ImportTransactionsModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  const { createManyTransactions } = useBankTransactions();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setErrors([]);

      const result = await parseBankFile(selectedFile);

      if (result.success) {
        setTransactions(result.transactions);
        setErrors(result.errors);
        setStep('preview');
      } else {
        setErrors(result.errors);
        setTransactions([]);
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      if (!droppedFile) return;

      setFile(droppedFile);
      setErrors([]);

      const result = await parseBankFile(droppedFile);

      if (result.success) {
        setTransactions(result.transactions);
        setErrors(result.errors);
        setStep('preview');
      } else {
        setErrors(result.errors);
        setTransactions([]);
      }
    },
    []
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    setStep('importing');

    try {
      const transactionsToImport = transactions.map((t) => ({
        bank_account_id: bankAccountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        reference: t.reference || null,
        import_hash: t.importHash,
      }));

      await createManyTransactions.mutateAsync(transactionsToImport);
      setImportedCount(transactions.length);
      setStep('done');
    } catch (error) {
      console.error('Import error:', error);
      setErrors(['Erreur lors de l\'import. Certaines transactions existent peut-être déjà.']);
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setTransactions([]);
    setErrors([]);
    setImportedCount(0);
    onOpenChange(false);
  };

  const removeTransaction = (index: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Importer des transactions'}
            {step === 'preview' && 'Aperçu des transactions'}
            {step === 'importing' && 'Import en cours...'}
            {step === 'done' && 'Import terminé'}
          </DialogTitle>
          {step === 'upload' && (
            <DialogDescription>
              Importez vos relevés bancaires au format CSV ou OFX
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  Glissez-déposez votre fichier ici
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Formats supportés : CSV, OFX
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.ofx,.qfx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <Badge variant="secondary">{transactions.length} transactions</Badge>
                </div>
              )}

              {errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Avertissements</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {errors.length > 5 && (
                        <li>... et {errors.length - 5} autres erreurs</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="max-h-[300px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">
                          {formatDate(t.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {t.type === 'credit' ? (
                              <ArrowDownCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <ArrowUpCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className="truncate max-w-[300px]">
                              {t.description}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              t.type === 'credit'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {t.type === 'credit' ? '+' : '-'}
                            {formatPrice(t.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTransaction(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Total entrées :{' '}
                  <span className="text-green-600 font-medium">
                    +{formatPrice(
                      transactions
                        .filter((t) => t.type === 'credit')
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </span>
                </span>
                <span>
                  Total sorties :{' '}
                  <span className="text-red-600 font-medium">
                    -{formatPrice(
                      transactions
                        .filter((t) => t.type === 'debit')
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Import en cours...</p>
              <p className="text-sm text-muted-foreground">
                {transactions.length} transactions à importer
              </p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">Import terminé !</p>
              <p className="text-sm text-muted-foreground">
                {importedCount} transactions importées avec succès
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Retour
              </Button>
              <Button
                onClick={handleImport}
                disabled={transactions.length === 0}
              >
                Importer {transactions.length} transactions
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button onClick={handleClose}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

