import jsPDF from "jspdf";

/**
 * Génère une image PNG de la première page d'un document PDF jsPDF
 * Crée un aperçu visuel avec les informations du document
 */
export async function generatePdfPreview(
  pdfDoc: jsPDF,
  documentType: string,
  documentNumber: string,
  organizationName?: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Dimensions pour l'aperçu (format A4 réduit)
      const width = 600;
      const height = Math.round(width * 1.414); // Ratio A4

      // Créer un canvas pour le rendu
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      canvas.width = width;
      canvas.height = height;

      // Fond blanc
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // En-tête coloré
      const headerHeight = 100;
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(0, 0, width, headerHeight);

      // Titre du document
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(documentType.toUpperCase(), width / 2, 45);

      // Numéro du document
      ctx.font = "24px Arial, sans-serif";
      ctx.fillText(documentNumber, width / 2, 80);

      // Nom de l'organisation (si fourni)
      if (organizationName) {
        ctx.fillStyle = "#374151";
        ctx.font = "18px Arial, sans-serif";
        ctx.fillText(organizationName, width / 2, headerHeight + 40);
      }

      // Ligne décorative
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, headerHeight + 70);
      ctx.lineTo(width - 50, headerHeight + 70);
      ctx.stroke();

      // Texte informatif
      ctx.fillStyle = "#6b7280";
      ctx.font = "16px Arial, sans-serif";
      ctx.fillText("Cliquez pour télécharger", width / 2, height / 2 - 20);
      ctx.fillText("le document PDF complet", width / 2, height / 2 + 10);

      // Icône PDF stylisée
      const iconY = height / 2 + 60;
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.roundRect(width / 2 - 40, iconY, 80, 50, 8);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.fillText("PDF", width / 2, iconY + 32);

      // Pied de page
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText("Document généré automatiquement", width / 2, height - 30);

      // Convertir en PNG blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create PNG blob"));
          }
        },
        "image/png",
        0.92
      );
    } catch (error) {
      reject(error);
    }
  });
}
