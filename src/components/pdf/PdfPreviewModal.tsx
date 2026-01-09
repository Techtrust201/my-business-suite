import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, X } from 'lucide-react';
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfDoc && open) {
      const blob = pdfDoc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    }
  }, [pdfDoc, open]);

  const handleDownload = () => {
    if (pdfDoc) {
      pdfDoc.save(fileName);
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
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Aperçu PDF"
            />
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
          <Button onClick={handleDownload} disabled={!pdfDoc || isGenerating}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
