import { useState, useRef, useCallback } from 'react';
import { createWorker, Worker } from 'tesseract.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, Check, X, Scan, Image as ImageIcon } from 'lucide-react';
import { parseReceiptText, ParsedReceiptData, formatVendorName } from '@/lib/ocrParser';

interface ReceiptScannerProps {
  onDataExtracted: (data: ParsedReceiptData, file: File) => void;
  onFileSelected?: (file: File) => void;
}

export function ReceiptScanner({ onDataExtracted, onFileSelected }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ParsedReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 10 Mo');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setExtractedData(null);
    setError(null);
    onFileSelected?.(file);
  }, [onFileSelected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const startScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setProgress(0);
    setError(null);

    try {
      // Create worker for French language
      const worker = await createWorker('fra', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      workerRef.current = worker;

      // Recognize text
      const { data: { text } } = await worker.recognize(selectedFile);

      // Parse extracted text
      const parsedData = parseReceiptText(text);
      
      // Format vendor name if found
      if (parsedData.vendor) {
        parsedData.vendor = formatVendorName(parsedData.vendor);
      }

      setExtractedData(parsedData);

      // Terminate worker
      await worker.terminate();
      workerRef.current = null;

    } catch (err) {
      console.error('OCR error:', err);
      setError('Erreur lors du scan. Veuillez réessayer.');
    } finally {
      setIsScanning(false);
      setProgress(100);
    }
  };

  const useExtractedData = () => {
    if (extractedData && selectedFile) {
      onDataExtracted(extractedData, selectedFile);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
        />

        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-4 text-muted-foreground">
              <Camera className="h-8 w-8" />
              <span className="text-lg">ou</span>
              <Upload className="h-8 w-8" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Prenez une photo ou glissez un ticket de caisse
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              JPG, PNG jusqu'à 10 Mo
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex gap-4">
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Ticket"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  onClick={reset}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} Ko
                </p>

                {!isScanning && !extractedData && (
                  <Button onClick={startScan} size="sm" className="mt-2">
                    <Scan className="h-4 w-4 mr-2" />
                    Scanner le ticket
                  </Button>
                )}
              </div>
            </div>

            {/* Progress */}
            {isScanning && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyse en cours...</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Extracted data */}
            {extractedData && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Données extraites
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Amount */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <div className="flex items-center gap-2">
                      {extractedData.amount ? (
                        <>
                          <span className="font-medium">{extractedData.amount.toFixed(2)} €</span>
                          {extractedData.confidence.amount && (
                            <Badge variant="secondary" className="text-xs">Fiable</Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Non détecté</span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <div className="flex items-center gap-2">
                      {extractedData.date ? (
                        <>
                          <span className="font-medium">{new Date(extractedData.date).toLocaleDateString('fr-FR')}</span>
                          {extractedData.confidence.date && (
                            <Badge variant="secondary" className="text-xs">Fiable</Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Non détectée</span>
                      )}
                    </div>
                  </div>

                  {/* Vendor */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Commerce</p>
                    <div className="flex items-center gap-2">
                      {extractedData.vendor ? (
                        <>
                          <span className="font-medium truncate">{extractedData.vendor}</span>
                          {extractedData.confidence.vendor && (
                            <Badge variant="secondary" className="text-xs">Fiable</Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Non détecté</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={useExtractedData} size="sm">
                    <Check className="h-4 w-4 mr-2" />
                    Utiliser ces valeurs
                  </Button>
                  <Button onClick={startScan} variant="outline" size="sm">
                    Rescanner
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
