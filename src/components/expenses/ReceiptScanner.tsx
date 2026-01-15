import { useState, useRef, useCallback } from "react";
import { createWorker, Worker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  Loader2,
  Check,
  X,
  Scan,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  parseReceiptText,
  ParsedReceiptData,
  formatVendorName,
} from "@/lib/ocrParser";
import {
  extractTextFromPdf,
  convertPdfToImage,
  isPdfFile,
} from "@/lib/pdfParser";

interface ReceiptScannerProps {
  onDataExtracted: (data: ParsedReceiptData, file: File) => void;
  onFileSelected?: (file: File) => void;
}

type ScanStatus =
  | "idle"
  | "extracting_text"
  | "converting_pdf"
  | "ocr_scanning"
  | "done";

export function ReceiptScanner({
  onDataExtracted,
  onFileSelected,
}: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ParsedReceiptData | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [scanMethod, setScanMethod] = useState<"native" | "ocr" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const ACCEPTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];

  const isImageFile = (file: File) => file.type.startsWith("image/");
  const canScan = (file: File) => isImageFile(file) || isPdfFile(file);

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return FileText;
    if (
      file.type.includes("csv") ||
      file.type.includes("excel") ||
      file.type.includes("spreadsheet")
    )
      return FileSpreadsheet;
    return ImageIcon;
  };

  const getStatusMessage = (status: ScanStatus): string => {
    switch (status) {
      case "extracting_text":
        return "Extraction du texte PDF...";
      case "converting_pdf":
        return "Conversion du PDF en image...";
      case "ocr_scanning":
        return "Analyse OCR en cours...";
      default:
        return "Analyse en cours...";
    }
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file type
      const isValidType = ACCEPTED_TYPES.some(
        (type) => file.type === type || file.type.startsWith("image/")
      );

      if (!isValidType) {
        setError("Format non supporté. Utilisez JPG, PNG ou PDF.");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Le fichier ne doit pas dépasser 10 Mo");
        return;
      }

      setSelectedFile(file);
      // Only create preview URL for images
      if (isImageFile(file)) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      setExtractedData(null);
      setError(null);
      setScanMethod(null);
      onFileSelected?.(file);
    },
    [onFileSelected]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /**
   * Run OCR with Tesseract.js on an image file or blob
   */
  const runOcr = async (imageSource: File | Blob): Promise<string> => {
    const worker = await createWorker("fra", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(Math.round(m.progress * 100));
        }
      },
    });
    workerRef.current = worker;

    const {
      data: { text },
    } = await worker.recognize(imageSource);

    await worker.terminate();
    workerRef.current = null;

    return text;
  };

  /**
   * Main scan function - handles both images and PDFs with hybrid approach
   */
  const startScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setProgress(0);
    setError(null);
    setScanMethod(null);

    try {
      let extractedText = "";

      if (isPdfFile(selectedFile)) {
        // HYBRID APPROACH FOR PDF

        // Step 1: Try native text extraction first
        setScanStatus("extracting_text");
        setProgress(20);

        const pdfResult = await extractTextFromPdf(selectedFile);

        if (pdfResult.hasText) {
          // PDF has native text - use it directly (best quality)
          extractedText = pdfResult.text;
          setScanMethod("native");
          setProgress(100);
        } else {
          // PDF is scanned/image-based - fallback to OCR
          setScanStatus("converting_pdf");
          setProgress(30);

          // Convert PDF to image
          const imageBlob = await convertPdfToImage(selectedFile, 2);

          // Run OCR on the image
          setScanStatus("ocr_scanning");
          setProgress(40);

          extractedText = await runOcr(imageBlob);
          setScanMethod("ocr");
        }
      } else if (isImageFile(selectedFile)) {
        // IMAGE - Direct OCR
        setScanStatus("ocr_scanning");
        extractedText = await runOcr(selectedFile);
        setScanMethod("ocr");
      }

      // Parse extracted text
      const parsedData = parseReceiptText(extractedText);

      // Format vendor name if found
      if (parsedData.vendor) {
        parsedData.vendor = formatVendorName(parsedData.vendor);
      }

      setExtractedData(parsedData);
      setScanStatus("done");
    } catch (err) {
      console.error("Scan error:", err);
      setError("Erreur lors du scan. Veuillez réessayer.");
    } finally {
      setIsScanning(false);
      setProgress(100);
      setScanStatus("idle");
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
    setScanMethod(null);
    setScanStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
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
              Prenez une photo ou glissez un justificatif
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              JPG, PNG, PDF jusqu'à 10 Mo
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex gap-4">
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-muted flex-shrink-0 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Ticket"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (() => {
                    const FileIcon = getFileIcon(selectedFile);
                    return (
                      <FileIcon className="h-10 w-10 text-muted-foreground" />
                    );
                  })()
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
                  {(() => {
                    const FileIcon = getFileIcon(selectedFile);
                    return (
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                    );
                  })()}
                  <span className="text-sm font-medium truncate">
                    {selectedFile.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} Ko
                </p>

                {!isScanning && !extractedData && canScan(selectedFile) && (
                  <Button onClick={startScan} size="sm" className="mt-2">
                    <Scan className="h-4 w-4 mr-2" />
                    {isPdfFile(selectedFile)
                      ? "Analyser le PDF"
                      : "Scanner le ticket"}
                  </Button>
                )}
                {!canScan(selectedFile) && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    L'analyse n'est disponible que pour les images et PDF
                  </p>
                )}
              </div>
            </div>

            {/* Progress */}
            {isScanning && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {getStatusMessage(scanStatus)}
                  </span>
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
                  {scanMethod && (
                    <Badge variant="outline" className="text-xs ml-2">
                      {scanMethod === "native" ? "Texte PDF" : "OCR"}
                    </Badge>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Amount */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <div className="flex items-center gap-2">
                      {extractedData.amount ? (
                        <>
                          <span className="font-medium">
                            {extractedData.amount.toFixed(2)} €
                          </span>
                          {extractedData.confidence.amount && (
                            <Badge variant="secondary" className="text-xs">
                              Fiable
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Non détecté
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <div className="flex items-center gap-2">
                      {extractedData.date ? (
                        <>
                          <span className="font-medium">
                            {new Date(extractedData.date).toLocaleDateString(
                              "fr-FR"
                            )}
                          </span>
                          {extractedData.confidence.date && (
                            <Badge variant="secondary" className="text-xs">
                              Fiable
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Non détectée
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vendor */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Commerce</p>
                    <div className="flex items-center gap-2">
                      {extractedData.vendor ? (
                        <>
                          <span className="font-medium truncate">
                            {extractedData.vendor}
                          </span>
                          {extractedData.confidence.vendor && (
                            <Badge variant="secondary" className="text-xs">
                              Fiable
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Non détecté
                        </span>
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
