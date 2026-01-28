import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Type for autoTable
type AutoTableResult = {
  finalY: number;
};

interface Organization {
  id: string;
  name: string | null;
  legal_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  siret?: string | null;
  vat_number?: string | null;
  logo_url?: string | null;
  bank_details?: string | null;
  rib?: string | null;
  bic?: string | null;
  legal_mentions?: string | null;
  default_payment_terms?: string | null;
  default_invoice_footer?: string | null;
}

interface Contact {
  id: string;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_postal_code?: string | null;
  billing_city?: string | null;
  billing_country?: string | null;
  vat_number?: string | null;
  siret?: string | null;
}

interface DocumentLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent?: number | null;
  line_total: number;
  line_type?: 'item' | 'text' | 'section';
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  due_date?: string | null;
  subject?: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid?: number | null;
  status: string;
  terms?: string | null;
  notes?: string | null;
  purchase_order_number?: string | null;
  contact?: Contact | null;
  invoice_lines?: DocumentLine[];
}

interface Quote {
  id: string;
  number: string;
  date: string;
  valid_until?: string | null;
  subject?: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: string;
  terms?: string | null;
  notes?: string | null;
  contact?: Contact | null;
  quote_lines?: DocumentLine[];
}

// Colors
const COLORS = {
  primary: [37, 99, 235] as [number, number, number], // Blue
  primaryLight: [239, 246, 255] as [number, number, number], // Light blue
  dark: [17, 24, 39] as [number, number, number], // Almost black
  gray: [107, 114, 128] as [number, number, number], // Gray text
  lightGray: [249, 250, 251] as [number, number, number], // Background
  border: [229, 231, 235] as [number, number, number], // Border
  success: [22, 163, 74] as [number, number, number], // Green
  danger: [220, 38, 38] as [number, number, number], // Red
};

const formatPrice = (price: number): string => {
  // Replace non-breaking spaces (U+00A0 and U+202F) with regular space for PDF compatibility
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  })
    .format(price)
    .replace(/[\u00A0\u202F]/g, " ");
};

const loadImage = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const calculateVatSummary = (
  lines: DocumentLine[]
): { rate: number; base: number; vat: number }[] => {
  const summary: Record<number, { base: number; vat: number }> = {};

  // Only include item lines in VAT calculation (exclude sections and text lines)
  const itemLines = lines.filter(l => !l.line_type || l.line_type === 'item');

  itemLines.forEach((line) => {
    const rate = line.tax_rate || 0;
    const lineTotal = Number(line.line_total) || 0;
    const vatAmount = lineTotal * (rate / 100);

    if (!summary[rate]) {
      summary[rate] = { base: 0, vat: 0 };
    }
    summary[rate].base += lineTotal;
    summary[rate].vat += vatAmount;
  });

  return Object.entries(summary)
    .map(([rate, values]) => ({
      rate: Number(rate),
      base: values.base,
      vat: values.vat,
    }))
    .sort((a, b) => a.rate - b.rate);
};

// Check if any line has discount
const hasDiscounts = (lines: DocumentLine[]): boolean => {
  return lines.some(
    (line) => line.discount_percent && line.discount_percent > 0
  );
};

const addHeader = async (
  doc: jsPDF,
  organization: Organization,
  documentType: "FACTURE" | "DEVIS",
  documentNumber: string,
  documentDate: string,
  dueDate?: string | null,
  validUntil?: string | null,
  subject?: string | null,
  purchaseOrderNumber?: string | null
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 18;
  let logoEndX = 15;

  // Try to add logo (larger size for better visibility)
  if (organization.logo_url) {
    const logoData = await loadImage(organization.logo_url);
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 15, yPos - 3, 28, 28);
        logoEndX = 48;
      } catch {
        // Logo failed, continue without it
      }
    }
  }

  // Company name - larger and more prominent
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(organization.name || "", logoEndX, yPos + 2);

  // Company details on separate lines for clarity
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);

  let infoY = yPos + 7;
  
  // Address line
  const addressParts: string[] = [];
  if (organization.address_line1) addressParts.push(organization.address_line1);
  if (organization.postal_code || organization.city) {
    addressParts.push(
      `${organization.postal_code || ""} ${organization.city || ""}`.trim()
    );
  }
  if (organization.country) addressParts.push(organization.country);
  if (addressParts.length > 0) {
    doc.text(addressParts.join(", "), logoEndX, infoY);
    infoY += 4;
  }

  // Contact line
  const contactParts: string[] = [];
  if (organization.phone) contactParts.push(`Tél: ${organization.phone}`);
  if (organization.email) contactParts.push(organization.email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join("  •  "), logoEndX, infoY);
  }

  // Document type badge - more prominent
  const badgeWidth = 60;
  const badgeHeight = 12;
  const badgeX = pageWidth - badgeWidth - 15;

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(badgeX, yPos - 5, badgeWidth, badgeHeight, 2, 2, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(documentType, badgeX + badgeWidth / 2, yPos + 3, {
    align: "center",
  });

  // Document number - prominent
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(documentNumber, pageWidth - 15, yPos + 12, { align: "right" });

  // Document dates
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  
  let dateY = yPos + 17;
  doc.text(
    `Date d'émission: ${format(new Date(documentDate), "dd MMMM yyyy", { locale: fr })}`,
    pageWidth - 15,
    dateY,
    { align: "right" }
  );

  if (dueDate) {
    dateY += 4;
    doc.text(
      `Échéance: ${format(new Date(dueDate), "dd MMMM yyyy", { locale: fr })}`,
      pageWidth - 15,
      dateY,
      { align: "right" }
    );
  }
  if (validUntil) {
    dateY += 4;
    doc.text(
      `Valide jusqu'au: ${format(new Date(validUntil), "dd MMMM yyyy", { locale: fr })}`,
      pageWidth - 15,
      dateY,
      { align: "right" }
    );
  }

  // Calculate yPos based on content
  yPos = Math.max(yPos + 30, logoEndX > 15 ? yPos + 28 : yPos + 24);

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 6;

  // Subject and PO number
  if (subject || purchaseOrderNumber) {
    doc.setFontSize(9);
    
    if (purchaseOrderNumber) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.gray);
      doc.text(`Réf. commande: ${purchaseOrderNumber}`, 15, yPos);
      yPos += 5;
    }

    if (subject) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.dark);
      doc.text("Objet:", 15, yPos);
      doc.setFont("helvetica", "normal");
      const maxWidth = pageWidth - 40;
      const truncatedSubject =
        subject.length > 100 ? subject.substring(0, 97) + "..." : subject;
      doc.text(truncatedSubject, 32, yPos);
      yPos += 6;
    }
  }

  return yPos;
};

const addClientInfo = (
  doc: jsPDF,
  contact: Contact | null | undefined,
  yPos: number
): number => {
  if (!contact) return yPos + 5;

  const pageWidth = doc.internal.pageSize.getWidth();

  yPos += 2;

  // Client box - more elegant design
  const boxX = pageWidth - 90;
  const boxWidth = 75;
  const boxMinHeight = 36;

  // Calculate dynamic height based on content
  let contentHeight = 16; // Base height for label + name
  if (contact.billing_address_line1) contentHeight += 4;
  if (contact.billing_postal_code || contact.billing_city) contentHeight += 4;
  if (contact.billing_country) contentHeight += 4;
  if (contact.email) contentHeight += 4;
  if (contact.siret) contentHeight += 4;
  if (contact.vat_number) contentHeight += 4;
  const boxHeight = Math.max(boxMinHeight, contentHeight + 6);

  // Draw box with subtle gradient effect
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 3, 3, "FD");

  // Label with colored accent
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(boxX, yPos, boxWidth, 6, 3, 3, "F");
  doc.setFillColor(248, 250, 252);
  doc.rect(boxX, yPos + 3, boxWidth, 3, "F");
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("FACTURER À", boxX + 5, yPos + 4);

  // Client name
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  const clientName =
    contact.company_name ||
    `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
  const truncatedName =
    clientName.length > 32 ? clientName.substring(0, 29) + "..." : clientName;
  doc.text(truncatedName, boxX + 5, yPos + 12);

  // Client details
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  let clientY = yPos + 17;

  if (contact.billing_address_line1) {
    const truncatedAddr =
      contact.billing_address_line1.length > 38
        ? contact.billing_address_line1.substring(0, 35) + "..."
        : contact.billing_address_line1;
    doc.text(truncatedAddr, boxX + 5, clientY);
    clientY += 4;
  }
  if (contact.billing_postal_code || contact.billing_city) {
    doc.text(
      `${contact.billing_postal_code || ""} ${
        contact.billing_city || ""
      }`.trim(),
      boxX + 5,
      clientY
    );
    clientY += 4;
  }
  if (contact.billing_country) {
    doc.text(contact.billing_country, boxX + 5, clientY);
    clientY += 4;
  }
  if (contact.email) {
    doc.setTextColor(...COLORS.primary);
    const truncatedEmail =
      contact.email.length > 35
        ? contact.email.substring(0, 32) + "..."
        : contact.email;
    doc.text(truncatedEmail, boxX + 5, clientY);
    clientY += 4;
  }
  
  // SIRET and VAT on same line if both present
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(7);
  const taxInfo: string[] = [];
  if (contact.siret) taxInfo.push(`SIRET: ${contact.siret}`);
  if (contact.vat_number) taxInfo.push(`TVA: ${contact.vat_number}`);
  if (taxInfo.length > 0) {
    doc.text(taxInfo.join("  •  "), boxX + 5, clientY);
    clientY += 4;
  }
  
  // Warning if client is a company without SIRET
  if (contact.company_name && !contact.siret) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.danger);
    doc.text("⚠ SIRET non renseigné", boxX + 5, clientY);
  }

  return yPos + boxHeight + 4;
};

const addLinesTable = (
  doc: jsPDF,
  lines: DocumentLine[],
  yPos: number
): number => {
  if (!lines || lines.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.gray);
    doc.text("Aucune ligne", 15, yPos + 10);
    doc.setTextColor(0, 0, 0);
    return yPos + 20;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margins = { left: 15, right: 15 };
  const contentWidth = pageWidth - margins.left - margins.right;
  
  // Only check discounts on item lines
  const itemLines = lines.filter(l => !l.line_type || l.line_type === 'item');
  const showDiscount = hasDiscounts(itemLines);

  // Clean text helper
  const cleanText = (text: string): string => {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\u202F/g, ' ')
      .trim();
  };

  // Group lines by sections - each section contains items until the next section
  interface LineGroup {
    type: 'section' | 'text' | 'items';
    sectionTitle?: string;
    textContent?: string;
    items?: DocumentLine[];
  }

  const groups: LineGroup[] = [];
  let currentItems: DocumentLine[] = [];

  lines.forEach((line) => {
    const lineType = line.line_type || 'item';
    
    if (lineType === 'section') {
      // Flush current items if any
      if (currentItems.length > 0) {
        groups.push({ type: 'items', items: [...currentItems] });
        currentItems = [];
      }
      groups.push({ type: 'section', sectionTitle: cleanText(line.description || '') });
    } else if (lineType === 'text') {
      // Flush current items if any
      if (currentItems.length > 0) {
        groups.push({ type: 'items', items: [...currentItems] });
        currentItems = [];
      }
      groups.push({ type: 'text', textContent: cleanText(line.description || '') });
    } else {
      currentItems.push(line);
    }
  });

  // Flush remaining items
  if (currentItems.length > 0) {
    groups.push({ type: 'items', items: [...currentItems] });
  }

  let currentY = yPos;

  // Draw each group
  groups.forEach((group, groupIndex) => {
    if (group.type === 'section') {
      // Section header - elegant band with colored background
      currentY += groupIndex === 0 ? 0 : 6;
      
      const sectionHeight = 8;
      doc.setFillColor(241, 245, 249); // Light slate background
      doc.setDrawColor(...COLORS.primary);
      doc.roundedRect(margins.left, currentY, contentWidth, sectionHeight, 1, 1, 'FD');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text(group.sectionTitle || '', margins.left + 4, currentY + 5.5);
      
      currentY += sectionHeight + 4;
    } else if (group.type === 'text') {
      // Free text - displayed as a note with icon
      currentY += 4;
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...COLORS.gray);
      
      // Add a subtle left border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margins.left + 2, currentY - 1, margins.left + 2, currentY + 5);
      
      const maxWidth = contentWidth - 10;
      const splitText = doc.splitTextToSize(group.textContent || '', maxWidth);
      const limitedText = splitText.slice(0, 3); // Max 3 lines
      doc.text(limitedText, margins.left + 6, currentY + 3);
      
      currentY += limitedText.length * 4 + 4;
    } else if (group.type === 'items' && group.items && group.items.length > 0) {
      // Items table
      const headers = showDiscount
        ? [["Désignation", "Qté", "Prix unit. HT", "TVA", "Remise", "Total HT"]]
        : [["Désignation", "Qté", "Prix unit. HT", "TVA", "Total HT"]];

      const tableData = group.items.map((line) => {
        const baseRow = [
          cleanText(line.description || ""),
          line.quantity.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
          formatPrice(Number(line.unit_price) || 0),
          `${line.tax_rate || 0}%`,
        ];

        if (showDiscount) {
          baseRow.push(line.discount_percent ? `${line.discount_percent}%` : "-");
        }

        baseRow.push(formatPrice(Number(line.line_total) || 0));
        return baseRow;
      });

      // Calculate column widths
      const fixedColWidths = showDiscount
        ? { qty: 18, price: 30, tva: 18, discount: 18, total: 32 }
        : { qty: 20, price: 34, tva: 22, total: 36 };
      
      const fixedTotal = showDiscount
        ? fixedColWidths.qty + fixedColWidths.price + fixedColWidths.tva + fixedColWidths.discount + fixedColWidths.total
        : fixedColWidths.qty + fixedColWidths.price + fixedColWidths.tva + fixedColWidths.total;
      
      const descWidth = contentWidth - fixedTotal;

      const columnStyles = showDiscount
        ? {
            0: { cellWidth: descWidth, overflow: "linebreak" as const, halign: "left" as const },
            1: { cellWidth: fixedColWidths.qty, halign: "center" as const },
            2: { cellWidth: fixedColWidths.price, halign: "right" as const },
            3: { cellWidth: fixedColWidths.tva, halign: "center" as const },
            4: { cellWidth: fixedColWidths.discount, halign: "center" as const },
            5: { cellWidth: fixedColWidths.total, halign: "right" as const, fontStyle: "bold" as const },
          }
        : {
            0: { cellWidth: descWidth, overflow: "linebreak" as const, halign: "left" as const },
            1: { cellWidth: fixedColWidths.qty, halign: "center" as const },
            2: { cellWidth: fixedColWidths.price, halign: "right" as const },
            3: { cellWidth: fixedColWidths.tva, halign: "center" as const },
            4: { cellWidth: fixedColWidths.total, halign: "right" as const, fontStyle: "bold" as const },
          };

      autoTable(doc, {
        startY: currentY,
        head: headers,
        body: tableData,
        theme: "plain",
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
          overflow: "linebreak",
          valign: "middle",
          halign: "left",
          textColor: [50, 50, 50],
          lineColor: [230, 230, 230],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: COLORS.primary,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: { top: 5, right: 3, bottom: 5, left: 3 },
          halign: "left",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [60, 60, 60],
          fillColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: [250, 250, 252],
        },
        columnStyles,
        margin: margins,
        tableLineColor: [220, 220, 220],
        tableLineWidth: 0.1,
        showHead: groupIndex === 0 || groups.slice(0, groupIndex).every(g => g.type !== 'items') ? "firstPage" : "never",
      });

      // @ts-ignore
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 20;
    }
  });

  return currentY + 2;
};

const addTotalsWithVat = (
  doc: jsPDF,
  lines: DocumentLine[],
  subtotal: number,
  taxAmount: number,
  total: number,
  yPos: number,
  amountPaid?: number | null
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const vatSummary = calculateVatSummary(lines);

  yPos += 8;

  const boxWidth = 85;
  const boxX = pageWidth - boxWidth - 15;

  // Calculate box height based on content
  let rowCount = 2; // Subtotal + Total
  rowCount += vatSummary.length; // VAT lines
  if (amountPaid && amountPaid > 0) rowCount += 2; // Paid + Balance

  const rowHeight = 7;
  const totalRowHeight = 10;
  const boxHeight = (rowCount - 1) * rowHeight + totalRowHeight + 12;

  // Draw background with subtle shadow effect
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 3, 3, "FD");

  let currentY = yPos + 8;

  // Subtotal HT
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text("Sous-total HT", boxX + 6, currentY);
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "normal");
  doc.text(formatPrice(subtotal), boxX + boxWidth - 6, currentY, {
    align: "right",
  });
  currentY += rowHeight;

  // VAT lines
  vatSummary.forEach((v) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(`TVA ${v.rate}%`, boxX + 6, currentY);
    doc.setTextColor(...COLORS.dark);
    doc.text(formatPrice(v.vat), boxX + boxWidth - 6, currentY, {
      align: "right",
    });
    currentY += rowHeight;
  });

  // Separator line before total
  currentY += 2;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(boxX + 6, currentY - 3, boxX + boxWidth - 6, currentY - 3);

  // Total TTC - highlighted
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(boxX + 4, currentY - 1, boxWidth - 8, totalRowHeight, 2, 2, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Total TTC", boxX + 8, currentY + 6);
  doc.text(formatPrice(total), boxX + boxWidth - 8, currentY + 6, {
    align: "right",
  });
  currentY += totalRowHeight + 4;

  // Amount paid and balance
  if (amountPaid && amountPaid > 0) {
    currentY += 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text("Acompte reçu", boxX + 6, currentY);
    doc.setTextColor(...COLORS.success);
    doc.setFont("helvetica", "bold");
    doc.text(`- ${formatPrice(amountPaid)}`, boxX + boxWidth - 6, currentY, {
      align: "right",
    });
    currentY += rowHeight;

    // Balance due - highlighted in red
    doc.setFillColor(...COLORS.danger);
    doc.roundedRect(boxX + 4, currentY - 2, boxWidth - 8, 8, 2, 2, "F");
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("SOLDE À PAYER", boxX + 8, currentY + 4);
    doc.text(formatPrice(total - amountPaid), boxX + boxWidth - 8, currentY + 4, {
      align: "right",
    });
    currentY += 10;
  }

  doc.setTextColor(0, 0, 0);
  return yPos + boxHeight + 5;
};

const addBankInfo = (
  doc: jsPDF,
  organization: Organization,
  yPos: number
): number => {
  if (!organization.bank_details && !organization.rib && !organization.bic)
    return yPos;

  yPos += 3;

  // Multi-line format for bank details
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("RÈGLEMENT:", 15, yPos);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.dark);

  let bankY = yPos;
  if (organization.bank_details) {
    doc.text(organization.bank_details, 38, bankY);
    bankY += 3.5;
  }
  if (organization.rib) {
    doc.text(`IBAN: ${organization.rib}`, 38, bankY);
    bankY += 3.5;
  }
  if (organization.bic) {
    doc.text(`BIC: ${organization.bic}`, 38, bankY);
    bankY += 3.5;
  }

  return bankY + 2;
};

const addTermsAndNotes = (
  doc: jsPDF,
  terms?: string | null,
  notes?: string | null,
  yPos?: number
): number => {
  if (!terms && !notes) return yPos || 0;

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = (yPos || 150) + 3;

  doc.setFontSize(7);

  if (terms) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.gray);
    doc.text("Conditions:", 15, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    // Max ~120 characters per line (approx 140mm width)
    const maxWidth = 140;
    const splitTerms = doc.splitTextToSize(terms, maxWidth);
    // Display up to 4 lines
    const limitedTerms = splitTerms.slice(0, 4);
    doc.text(limitedTerms, 38, currentY);

    currentY += limitedTerms.length * 3.5 + 2;
  }

  if (notes) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.gray);
    doc.text("Notes:", 15, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    const maxWidth = 140;
    const splitNotes = doc.splitTextToSize(notes, maxWidth);
    // Display up to 4 lines
    const limitedNotes = splitNotes.slice(0, 4);
    doc.text(limitedNotes, 30, currentY);

    currentY += limitedNotes.length * 3.5 + 2;
  }

  return currentY;
};

const addLegalMentions = (
  doc: jsPDF,
  organization: Organization,
  yPos?: number
): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Position at bottom with minimum spacing
  const footerY = Math.max((yPos || 250) + 8, pageHeight - 22);

  // Footer background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, footerY - 6, pageWidth, 30, "F");

  // Separator line with gradient effect
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);

  // Company identifiers
  const identifiers: string[] = [];
  if (organization.name) identifiers.push(organization.name);
  if (organization.siret) identifiers.push(`SIRET: ${organization.siret}`);
  if (organization.vat_number)
    identifiers.push(`TVA Intra.: ${organization.vat_number}`);

  if (identifiers.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text(identifiers.join("  •  "), pageWidth / 2, footerY, {
      align: "center",
    });
  }

  // Website if available
  if (organization.website) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.primary);
    doc.text(organization.website, pageWidth / 2, footerY + 4, {
      align: "center",
    });
  }

  // Legal mentions
  if (organization.legal_mentions) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(6);
    const splitMentions = doc.splitTextToSize(
      organization.legal_mentions,
      pageWidth - 30
    );
    const limitedMentions = splitMentions.slice(0, 2);
    doc.text(limitedMentions, pageWidth / 2, footerY + 9, { align: "center" });
  }
};

export const generateInvoicePDF = async (
  invoice: Invoice,
  organization: Organization
): Promise<jsPDF> => {
  const doc = new jsPDF();

  // Add header with logo
  let yPos = await addHeader(
    doc,
    organization,
    "FACTURE",
    invoice.number || "N/A",
    invoice.date || new Date().toISOString(),
    invoice.due_date,
    null,
    invoice.subject,
    invoice.purchase_order_number
  );

  // Add client info
  yPos = addClientInfo(doc, invoice.contact, yPos);

  // Add lines table
  const lines = invoice.invoice_lines || [];
  yPos = addLinesTable(doc, lines, yPos);

  // Add totals with VAT integrated
  const subtotal = Number(invoice.subtotal) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const total = Number(invoice.total) || 0;
  const amountPaid = invoice.amount_paid ? Number(invoice.amount_paid) : null;
  yPos = addTotalsWithVat(
    doc,
    lines,
    subtotal,
    taxAmount,
    total,
    yPos,
    amountPaid
  );

  // Add bank info (inline)
  yPos = addBankInfo(doc, organization, yPos);

  // Add terms and notes (compact)
  yPos = addTermsAndNotes(doc, invoice.terms, invoice.notes, yPos);

  // Add legal mentions at bottom (includes SIRET/TVA)
  addLegalMentions(doc, organization, yPos);

  return doc;
};

export const generateQuotePDF = async (
  quote: Quote,
  organization: Organization
): Promise<jsPDF> => {
  const doc = new jsPDF();

  // Add header with logo
  let yPos = await addHeader(
    doc,
    organization,
    "DEVIS",
    quote.number || "N/A",
    quote.date || new Date().toISOString(),
    null,
    quote.valid_until,
    quote.subject
  );

  // Add client info
  yPos = addClientInfo(doc, quote.contact, yPos);

  // Add lines table
  const lines = quote.quote_lines || [];
  yPos = addLinesTable(doc, lines, yPos);

  // Add totals with VAT integrated
  const subtotal = Number(quote.subtotal) || 0;
  const taxAmount = Number(quote.tax_amount) || 0;
  const total = Number(quote.total) || 0;
  yPos = addTotalsWithVat(doc, lines, subtotal, taxAmount, total, yPos);

  // Add terms and notes (compact)
  yPos = addTermsAndNotes(doc, quote.terms, quote.notes, yPos);

  // Add legal mentions at bottom (includes SIRET/TVA)
  addLegalMentions(doc, organization, yPos);

  return doc;
};
