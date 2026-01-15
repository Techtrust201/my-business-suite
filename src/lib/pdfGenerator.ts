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
}

interface DocumentLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent?: number | null;
  line_total: number;
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

  lines.forEach((line) => {
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
  let yPos = 15;
  let logoWidth = 0;

  // Try to add logo (compact size)
  if (organization.logo_url) {
    const logoData = await loadImage(organization.logo_url);
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", 15, yPos, 22, 22);
        logoWidth = 27;
      } catch {
        // Logo failed, continue without it
      }
    }
  }

  // Company name and info (next to logo)
  const companyX = 15 + logoWidth;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(organization.name || "", companyX, yPos + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);

  // Compact address line
  const addressParts: string[] = [];
  if (organization.address_line1) addressParts.push(organization.address_line1);
  if (organization.postal_code || organization.city) {
    addressParts.push(
      `${organization.postal_code || ""} ${organization.city || ""}`.trim()
    );
  }
  if (addressParts.length > 0) {
    doc.text(addressParts.join(", "), companyX, yPos + 10);
  }

  // Contact line
  const contactParts: string[] = [];
  if (organization.phone) contactParts.push(`Tél: ${organization.phone}`);
  if (organization.email) contactParts.push(organization.email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(" • "), companyX, yPos + 14);
  }

  // Document type badge on the right
  const badgeWidth = 55;
  const badgeX = pageWidth - badgeWidth - 15;

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(badgeX, yPos - 2, badgeWidth, 10, 2, 2, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(documentType, badgeX + badgeWidth / 2, yPos + 5, {
    align: "center",
  });

  // Document details
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(documentNumber, pageWidth - 15, yPos + 14, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text(
    `Date: ${format(new Date(documentDate), "dd/MM/yyyy")}`,
    pageWidth - 15,
    yPos + 19,
    { align: "right" }
  );

  if (dueDate) {
    doc.text(
      `Échéance: ${format(new Date(dueDate), "dd/MM/yyyy")}`,
      pageWidth - 15,
      yPos + 24,
      { align: "right" }
    );
  }
  if (validUntil) {
    doc.text(
      `Valide jusqu'au: ${format(new Date(validUntil), "dd/MM/yyyy")}`,
      pageWidth - 15,
      yPos + 24,
      { align: "right" }
    );
  }

  yPos = Math.max(yPos + 28, logoWidth > 0 ? yPos + 26 : yPos + 22);

  // Subject and PO number on same line if present
  if (subject || purchaseOrderNumber) {
    doc.setDrawColor(...COLORS.border);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 5;

    doc.setFontSize(8);
    if (purchaseOrderNumber) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.gray);
      doc.text(`Réf: ${purchaseOrderNumber}`, 15, yPos);
    }

    if (subject) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.dark);
      const subjectX = purchaseOrderNumber ? 60 : 15;
      const maxWidth = pageWidth - subjectX - 15;
      const truncatedSubject =
        subject.length > 80 ? subject.substring(0, 77) + "..." : subject;
      doc.text(`Objet: ${truncatedSubject}`, subjectX, yPos);
    }
    yPos += 5;
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

  yPos += 3;

  // Client box - compact design
  const boxX = pageWidth - 85;
  const boxWidth = 70;

  doc.setFillColor(...COLORS.lightGray);
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(boxX, yPos, boxWidth, 32, 2, 2, "FD");

  // Label
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gray);
  doc.text("FACTURER À", boxX + 4, yPos + 4);

  // Client name
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  const clientName =
    contact.company_name ||
    `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
  const truncatedName =
    clientName.length > 30 ? clientName.substring(0, 27) + "..." : clientName;
  doc.text(truncatedName, boxX + 4, yPos + 9);

  // Client details
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  let clientY = yPos + 13;

  if (contact.billing_address_line1) {
    const truncatedAddr =
      contact.billing_address_line1.length > 35
        ? contact.billing_address_line1.substring(0, 32) + "..."
        : contact.billing_address_line1;
    doc.text(truncatedAddr, boxX + 4, clientY);
    clientY += 3.5;
  }
  if (contact.billing_postal_code || contact.billing_city) {
    doc.text(
      `${contact.billing_postal_code || ""} ${
        contact.billing_city || ""
      }`.trim(),
      boxX + 4,
      clientY
    );
    clientY += 3.5;
  }
  if (contact.email) {
    const truncatedEmail =
      contact.email.length > 30
        ? contact.email.substring(0, 27) + "..."
        : contact.email;
    doc.text(truncatedEmail, boxX + 4, clientY);
    clientY += 3.5;
  }
  if (contact.vat_number) {
    doc.text(`TVA: ${contact.vat_number}`, boxX + 4, clientY);
  }

  return yPos + 36;
};

const addLinesTable = (
  doc: jsPDF,
  lines: DocumentLine[],
  yPos: number
): number => {
  if (!lines || lines.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.gray);
    doc.text("Aucune ligne", 15, yPos + 8);
    doc.setTextColor(0, 0, 0);
    return yPos + 15;
  }

  const showDiscount = hasDiscounts(lines);

  const headers = showDiscount
    ? [["Description", "Qté", "P.U. HT", "TVA", "Rem.", "Total HT"]]
    : [["Description", "Qté", "Prix unitaire HT", "TVA", "Total HT"]];

  const tableData = lines.map((line) => {
    const baseRow = [
      line.description || "",
      String(line.quantity || 0),
      formatPrice(Number(line.unit_price) || 0),
      `${line.tax_rate || 0}%`,
    ];

    if (showDiscount) {
      baseRow.push(line.discount_percent ? `${line.discount_percent}%` : "-");
    }

    baseRow.push(formatPrice(Number(line.line_total) || 0));
    return baseRow;
  });

  // Column styles with overflow handling for long descriptions
  const columnStyles: Record<
    number,
    {
      halign?: "left" | "right" | "center";
      cellWidth?: number | "auto";
      overflow?: "linebreak" | "ellipsize" | "visible" | "hidden";
    }
  > = showDiscount
    ? {
        0: { cellWidth: "auto", overflow: "linebreak" },
        1: { halign: "center", cellWidth: 12 },
        2: { halign: "right", cellWidth: 26 },
        3: { halign: "center", cellWidth: 14 },
        4: { halign: "center", cellWidth: 12 },
        5: { halign: "right", cellWidth: 26 },
      }
    : {
        0: { cellWidth: "auto", overflow: "linebreak" },
        1: { halign: "center", cellWidth: 14 },
        2: { halign: "right", cellWidth: 32 },
        3: { halign: "center", cellWidth: 16 },
        4: { halign: "right", cellWidth: 28 },
      };

  // Store the final Y position after table rendering
  let tableFinalY = yPos + 20;

  autoTable(doc, {
    startY: yPos,
    head: headers,
    body: tableData,
    theme: "plain",
    styles: {
      overflow: "linebreak", // Enable word wrap globally
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      fontSize: 7,
      lineHeight: 1.3,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: COLORS.dark,
      valign: "top", // Align text to top for multi-line cells
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles,
    margin: { left: 15, right: 15, top: 40, bottom: 25 },
    tableLineColor: COLORS.border,
    tableLineWidth: 0.1,
    // Handle page breaks for long tables
    showHead: "everyPage",
    didDrawCell: (data) => {
      // Track the final Y position accurately
      if (data.row.index === tableData.length - 1) {
        tableFinalY = Math.max(tableFinalY, data.cell.y + data.cell.height);
      }
    },
  });

  // Get the actual final Y from the last page
  // @ts-ignore - autoTable adds this property to doc
  const autoTableFinalY = (doc as any).lastAutoTable?.finalY;

  return autoTableFinalY || tableFinalY;
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

  yPos += 5;

  const boxWidth = 75;
  const boxX = pageWidth - boxWidth - 15;

  // Calculate box height based on content
  let rowCount = 2; // Subtotal + Total
  rowCount += vatSummary.length; // VAT lines
  if (amountPaid && amountPaid > 0) rowCount += 2; // Paid + Balance

  const rowHeight = 6;
  const boxHeight = rowCount * rowHeight + 8;

  // Draw background
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, "F");

  let currentY = yPos + 5;

  // Subtotal
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text("Sous-total HT", boxX + 4, currentY);
  doc.setTextColor(...COLORS.dark);
  doc.text(formatPrice(subtotal), boxX + boxWidth - 4, currentY, {
    align: "right",
  });
  currentY += rowHeight;

  // VAT lines
  vatSummary.forEach((v) => {
    doc.setTextColor(...COLORS.gray);
    doc.text(`TVA ${v.rate}%`, boxX + 4, currentY);
    doc.setTextColor(...COLORS.dark);
    doc.text(formatPrice(v.vat), boxX + boxWidth - 4, currentY, {
      align: "right",
    });
    currentY += rowHeight;
  });

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.line(boxX + 4, currentY - 2, boxX + boxWidth - 4, currentY - 2);

  // Total TTC
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("Total TTC", boxX + 4, currentY + 2);
  doc.text(formatPrice(total), boxX + boxWidth - 4, currentY + 2, {
    align: "right",
  });
  currentY += rowHeight + 2;

  // Amount paid and balance
  if (amountPaid && amountPaid > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text("Acompte reçu", boxX + 4, currentY);
    doc.setTextColor(...COLORS.success);
    doc.text(`-${formatPrice(amountPaid)}`, boxX + boxWidth - 4, currentY, {
      align: "right",
    });
    currentY += rowHeight;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.danger);
    doc.text("SOLDE À PAYER", boxX + 4, currentY);
    doc.text(formatPrice(total - amountPaid), boxX + boxWidth - 4, currentY, {
      align: "right",
    });
  }

  doc.setTextColor(0, 0, 0);
  return yPos + boxHeight + 3;
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

  // Position at bottom
  const footerY = Math.max((yPos || 250) + 5, pageHeight - 18);

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.line(15, footerY - 3, pageWidth - 15, footerY - 3);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);

  // Company identifiers
  const identifiers: string[] = [];
  if (organization.siret) identifiers.push(`SIRET: ${organization.siret}`);
  if (organization.vat_number)
    identifiers.push(`TVA Intra.: ${organization.vat_number}`);
  if (organization.website) identifiers.push(organization.website);

  if (identifiers.length > 0) {
    doc.text(identifiers.join(" • "), pageWidth / 2, footerY, {
      align: "center",
    });
  }

  // Legal mentions
  if (organization.legal_mentions) {
    const splitMentions = doc.splitTextToSize(
      organization.legal_mentions,
      pageWidth - 30
    );
    const limitedMentions = splitMentions.slice(0, 2);
    doc.text(limitedMentions, pageWidth / 2, footerY + 4, { align: "center" });
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
