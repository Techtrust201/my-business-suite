import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, X, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';

interface PdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfDoc: jsPDF | null;
  fileName: string;
  title: string;
  isGenerating?: boolean;
}

export const PdfPreviewModal = ({
  open,
  onOpenChange,
  pdfDoc,
  fileName,
  title,
  isGenerating = false,
}: PdfPreviewModalProps) => {
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfDoc && open) {
      // Use data URL instead of blob URL to avoid Chrome blocking
      const dataUrl = pdfDoc.output('dataurlstring');
      setPdfDataUrl(dataUrl);

      return () => {
        setPdfDataUrl(null);
      };
    }
  }, [pdfDoc, open]);

  const handleDownload = () => {
    if (pdfDoc) {
      pdfDoc.save(fileName);
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfDoc) {
      const blob = pdfDoc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Génération du PDF...</p>
              </div>
            </div>
          ) : pdfDataUrl ? (
            <object
              data={pdfDataUrl}
              type="application/pdf"
              className="w-full h-full"
            >
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-muted-foreground">
                  Votre navigateur ne peut pas afficher l'aperçu PDF.
                </p>
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ouvrir dans un nouvel onglet
                </Button>
              </div>
            </object>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Aucun PDF à afficher</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Fermer
          </Button>
          <Button variant="outline" onClick={handleOpenInNewTab} disabled={!pdfDoc || isGenerating}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Nouvel onglet
          </Button>
          <Button onClick={handleDownload} disabled={!pdfDoc || isGenerating}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
