import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
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

const calculateVatSummary = (lines: DocumentLine[]): { rate: number; base: number; vat: number }[] => {
  const summary: Record<number, { base: number; vat: number }> = {};
  
  lines.forEach(line => {
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

const addHeader = async (
  doc: jsPDF,
  organization: Organization,
  documentType: 'FACTURE' | 'DEVIS',
  documentNumber: string,
  documentDate: string,
  dueDate?: string | null,
  validUntil?: string | null
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Try to add logo
  if (organization.logo_url) {
    const logoData = await loadImage(organization.logo_url);
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', 15, yPos, 40, 40);
        yPos = 65;
      } catch {
        // Logo failed, continue without it
      }
    }
  }

  // Company info on the left
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(organization.name || '', 15, yPos);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let infoY = yPos + 6;
  
  if (organization.legal_name && organization.legal_name !== organization.name) {
    doc.text(organization.legal_name, 15, infoY);
    infoY += 4;
  }
  if (organization.address_line1) {
    doc.text(organization.address_line1, 15, infoY);
    infoY += 4;
  }
  if (organization.address_line2) {
    doc.text(organization.address_line2, 15, infoY);
    infoY += 4;
  }
  if (organization.postal_code || organization.city) {
    doc.text(`${organization.postal_code || ''} ${organization.city || ''}`.trim(), 15, infoY);
    infoY += 4;
  }
  if (organization.country) {
    doc.text(organization.country, 15, infoY);
    infoY += 4;
  }
  infoY += 2;
  if (organization.phone) {
    doc.text(`Tél: ${organization.phone}`, 15, infoY);
    infoY += 4;
  }
  if (organization.email) {
    doc.text(`Email: ${organization.email}`, 15, infoY);
    infoY += 4;
  }
  if (organization.website) {
    doc.text(organization.website, 15, infoY);
    infoY += 4;
  }
  infoY += 2;
  if (organization.siret) {
    doc.text(`SIRET: ${organization.siret}`, 15, infoY);
    infoY += 4;
  }
  if (organization.vat_number) {
    doc.text(`N° TVA: ${organization.vat_number}`, 15, infoY);
    infoY += 4;
  }

  // Document info on the right
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(documentType, pageWidth - 15, yPos, { align: 'right' });
  
  doc.setFontSize(12);
  doc.text(documentNumber, pageWidth - 15, yPos + 8, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${format(new Date(documentDate), 'dd/MM/yyyy')}`, pageWidth - 15, yPos + 16, { align: 'right' });
  
  if (dueDate) {
    doc.text(`Échéance: ${format(new Date(dueDate), 'dd/MM/yyyy')}`, pageWidth - 15, yPos + 22, { align: 'right' });
  }
  if (validUntil) {
    doc.text(`Valide jusqu'au: ${format(new Date(validUntil), 'dd/MM/yyyy')}`, pageWidth - 15, yPos + 22, { align: 'right' });
  }

  return Math.max(infoY, yPos + 30);
};

const addClientInfo = (doc: jsPDF, contact: Contact | null | undefined, yPos: number): number => {
  if (!contact) return yPos;

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Draw a light gray box for client info
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(pageWidth - 95, yPos, 80, 40, 2, 2, 'FD');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  doc.text('FACTURER À', pageWidth - 90, yPos + 6);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  const clientName = contact.company_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  doc.text(clientName, pageWidth - 90, yPos + 12);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let clientY = yPos + 17;
  
  if (contact.billing_address_line1) {
    doc.text(contact.billing_address_line1, pageWidth - 90, clientY);
    clientY += 4;
  }
  if (contact.billing_address_line2) {
    doc.text(contact.billing_address_line2, pageWidth - 90, clientY);
    clientY += 4;
  }
  if (contact.billing_postal_code || contact.billing_city) {
    doc.text(`${contact.billing_postal_code || ''} ${contact.billing_city || ''}`.trim(), pageWidth - 90, clientY);
    clientY += 4;
  }
  if (contact.email) {
    doc.text(contact.email, pageWidth - 90, clientY);
    clientY += 4;
  }
  if (contact.vat_number) {
    doc.text(`TVA: ${contact.vat_number}`, pageWidth - 90, clientY);
  }

  return yPos + 45;
};

const addLinesTable = (doc: jsPDF, lines: DocumentLine[], yPos: number): number => {
  if (!lines || lines.length === 0) {
    // No lines, just add a message
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(107, 114, 128);
    doc.text('Aucune ligne', 15, yPos + 10);
    doc.setTextColor(0, 0, 0);
    return yPos + 20;
  }

  const tableData = lines.map(line => [
    line.description || '',
    String(line.quantity || 0),
    formatPrice(Number(line.unit_price) || 0),
    `${line.tax_rate || 0}%`,
    line.discount_percent ? `${line.discount_percent}%` : '-',
    formatPrice(Number(line.line_total) || 0),
  ]);

  const result = autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qté', 'Prix unit. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 15 },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: 15, right: 15 },
  }) as unknown as AutoTableResult;

  return result?.finalY || yPos + 20;
};

const addVatSummary = (doc: jsPDF, lines: DocumentLine[], yPos: number): number => {
  const vatSummary = calculateVatSummary(lines);
  if (vatSummary.length === 0) return yPos;

  const pageWidth = doc.internal.pageSize.getWidth();
  
  yPos += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif TVA', pageWidth - 95, yPos);
  
  const vatData = vatSummary.map(v => [
    `TVA ${v.rate}%`,
    formatPrice(v.base),
    formatPrice(v.vat),
  ]);

  const result = autoTable(doc, {
    startY: yPos + 3,
    head: [['Taux', 'Base HT', 'Montant TVA']],
    body: vatData,
    theme: 'grid',
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
    margin: { left: pageWidth - 95 },
    tableWidth: 80,
  }) as unknown as AutoTableResult;

  return result?.finalY || yPos + 30;
};

const addTotals = (
  doc: jsPDF,
  subtotal: number,
  taxAmount: number,
  total: number,
  yPos: number,
  amountPaid?: number | null
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  yPos += 10;
  
  // Draw totals box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(pageWidth - 95, yPos, 80, amountPaid && amountPaid > 0 ? 45 : 30, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  let totalsY = yPos + 8;
  doc.text('Total HT', pageWidth - 90, totalsY);
  doc.text(formatPrice(subtotal), pageWidth - 20, totalsY, { align: 'right' });
  
  totalsY += 7;
  doc.text('Total TVA', pageWidth - 90, totalsY);
  doc.text(formatPrice(taxAmount), pageWidth - 20, totalsY, { align: 'right' });
  
  totalsY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total TTC', pageWidth - 90, totalsY);
  doc.text(formatPrice(total), pageWidth - 20, totalsY, { align: 'right' });
  
  if (amountPaid && amountPaid > 0) {
    totalsY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Acompte reçu', pageWidth - 90, totalsY);
    doc.text(`-${formatPrice(amountPaid)}`, pageWidth - 20, totalsY, { align: 'right' });
    
    totalsY += 7;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Solde à payer', pageWidth - 90, totalsY);
    doc.text(formatPrice(total - amountPaid), pageWidth - 20, totalsY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  return totalsY + 10;
};

const addBankInfo = (doc: jsPDF, organization: Organization, yPos: number): number => {
  if (!organization.bank_details && !organization.rib && !organization.bic) return yPos;

  const pageWidth = doc.internal.pageSize.getWidth();
  
  yPos += 10;
  
  // Draw bank info box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'FD');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('INFORMATIONS BANCAIRES', 20, yPos + 6);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  let bankY = yPos + 12;
  if (organization.bank_details) {
    doc.text(organization.bank_details, 20, bankY);
    bankY += 5;
  }
  if (organization.rib) {
    doc.text(`RIB/IBAN: ${organization.rib}`, 20, bankY);
    bankY += 5;
  }
  if (organization.bic) {
    doc.text(`BIC: ${organization.bic}`, 20, bankY);
  }

  return yPos + 30;
};

const addTermsAndNotes = (doc: jsPDF, terms?: string | null, notes?: string | null, yPos?: number): number => {
  if (!terms && !notes) return yPos || 0;

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = (yPos || 150) + 10;

  if (terms) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, currentY, pageWidth - 30, 20, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS DE PAIEMENT', 20, currentY + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitTerms = doc.splitTextToSize(terms, pageWidth - 40);
    doc.text(splitTerms, 20, currentY + 11);
    
    currentY += 25;
  }

  if (notes) {
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(15, currentY, pageWidth - 30, 20, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 20, currentY + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(notes, pageWidth - 40);
    doc.text(splitNotes, 20, currentY + 11);
    
    currentY += 25;
  }

  return currentY;
};

const addLegalMentions = (doc: jsPDF, legalMentions?: string | null, yPos?: number): void => {
  if (!legalMentions) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currentY = Math.max((yPos || 250) + 10, pageHeight - 30);

  doc.setDrawColor(229, 231, 235);
  doc.line(15, currentY - 5, pageWidth - 15, currentY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  
  const splitMentions = doc.splitTextToSize(legalMentions, pageWidth - 30);
  doc.text(splitMentions, pageWidth / 2, currentY, { align: 'center' });
};

export const generateInvoicePDF = async (invoice: Invoice, organization: Organization): Promise<jsPDF> => {
  const doc = new jsPDF();
  
  // Add header with logo
  let yPos = await addHeader(
    doc,
    organization,
    'FACTURE',
    invoice.number || 'N/A',
    invoice.date || new Date().toISOString(),
    invoice.due_date
  );

  // Add client info
  yPos = addClientInfo(doc, invoice.contact, yPos);

  // Add purchase order number if present
  if (invoice.purchase_order_number) {
    yPos += 5;
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(15, yPos, 100, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Réf. commande: ${invoice.purchase_order_number}`, 20, yPos + 5);
    yPos += 12;
  }

  // Add subject if present
  if (invoice.subject) {
    yPos += 3;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Objet:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.subject, 32, yPos);
    yPos += 8;
  }

  // Add lines table
  const lines = invoice.invoice_lines || [];
  yPos = addLinesTable(doc, lines, yPos);

  // Add VAT summary
  const vatY = addVatSummary(doc, lines, yPos);

  // Add totals
  const subtotal = Number(invoice.subtotal) || 0;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const total = Number(invoice.total) || 0;
  const amountPaid = invoice.amount_paid ? Number(invoice.amount_paid) : null;
  yPos = addTotals(doc, subtotal, taxAmount, total, vatY, amountPaid);

  // Add bank info
  yPos = addBankInfo(doc, organization, yPos);

  // Add terms and notes
  yPos = addTermsAndNotes(doc, invoice.terms, invoice.notes, yPos);

  // Add legal mentions at bottom
  addLegalMentions(doc, organization.legal_mentions, yPos);

  return doc;
};

export const generateQuotePDF = async (quote: Quote, organization: Organization): Promise<jsPDF> => {
  const doc = new jsPDF();
  
  // Add header with logo
  let yPos = await addHeader(
    doc,
    organization,
    'DEVIS',
    quote.number || 'N/A',
    quote.date || new Date().toISOString(),
    null,
    quote.valid_until
  );

  // Add client info
  yPos = addClientInfo(doc, quote.contact, yPos);

  // Add subject if present
  if (quote.subject) {
    yPos += 3;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Objet:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.subject, 32, yPos);
    yPos += 8;
  }

  // Add lines table
  const lines = quote.quote_lines || [];
  yPos = addLinesTable(doc, lines, yPos);

  // Add VAT summary
  const vatY = addVatSummary(doc, lines, yPos);

  // Add totals
  const subtotal = Number(quote.subtotal) || 0;
  const taxAmount = Number(quote.tax_amount) || 0;
  const total = Number(quote.total) || 0;
  yPos = addTotals(doc, subtotal, taxAmount, total, vatY);

  // Add terms and notes
  yPos = addTermsAndNotes(doc, quote.terms, quote.notes, yPos);

  // Add legal mentions at bottom
  addLegalMentions(doc, organization.legal_mentions, yPos);

  return doc;
};
