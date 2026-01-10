/**
 * OCR Parser - Extract structured data from receipt text
 * Uses regex patterns optimized for French receipts
 */

export interface ParsedReceiptData {
  amount?: number;
  date?: string;
  vendor?: string;
  confidence: {
    amount: boolean;
    date: boolean;
    vendor: boolean;
  };
}

// Amount patterns - look for total, TTC, à payer, etc.
const AMOUNT_PATTERNS = [
  /(?:total|ttc|a\s*payer|montant|somme)[:\s]*(\d+[.,]\d{2})\s*(?:€|eur|euros?)?/i,
  /(?:total|ttc|a\s*payer|montant|somme)[:\s]*(?:€|eur|euros?)\s*(\d+[.,]\d{2})/i,
  /(\d+[.,]\d{2})\s*(?:€|eur|euros?)\s*(?:total|ttc)/i,
  /€\s*(\d+[.,]\d{2})/g,
  /(\d+[.,]\d{2})\s*€/g,
];

// Date patterns - DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
const DATE_PATTERNS = [
  /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/,
  /(\d{2})[\/\-.](\d{2})[\/\-.](\d{2})/,
];

/**
 * Extract amount from OCR text
 */
function extractAmount(text: string): { value?: number; confident: boolean } {
  // First try patterns with context (total, ttc, etc.) - more confident
  for (const pattern of AMOUNT_PATTERNS.slice(0, 3)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(value) && value > 0 && value < 100000) {
        return { value, confident: true };
      }
    }
  }

  // Fallback: find all amounts and pick the largest (likely total)
  const allAmounts: number[] = [];
  const euroPattern = /(\d+[.,]\d{2})\s*(?:€|eur)/gi;
  let match;
  while ((match = euroPattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(value) && value > 0 && value < 100000) {
      allAmounts.push(value);
    }
  }

  if (allAmounts.length > 0) {
    // Pick the largest amount (usually the total)
    const maxAmount = Math.max(...allAmounts);
    return { value: maxAmount, confident: false };
  }

  return { value: undefined, confident: false };
}

/**
 * Extract date from OCR text
 */
function extractDate(text: string): { value?: string; confident: boolean } {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      let day = match[1];
      let month = match[2];
      let year = match[3];

      // Handle 2-digit year
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      }

      // Validate date components
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2000 && yearNum <= 2100) {
        return { 
          value: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          confident: true 
        };
      }
    }
  }

  return { value: undefined, confident: false };
}

/**
 * Extract vendor name from OCR text
 * Usually the first line in uppercase or with specific patterns
 */
function extractVendor(text: string): { value?: string; confident: boolean } {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  
  // Look for known patterns
  const skipPatterns = [
    /^date/i,
    /^heure/i,
    /^\d+[\/\-.]/,
    /^ticket/i,
    /^caisse/i,
    /^recu/i,
    /^facture/i,
    /^merci/i,
    /^total/i,
    /^\d+[.,]\d{2}/,
  ];

  for (const line of lines.slice(0, 5)) { // Check first 5 lines
    // Skip if matches skip patterns
    if (skipPatterns.some(p => p.test(line))) continue;

    // Check if line is mostly uppercase (likely store name)
    const uppercaseRatio = (line.match(/[A-Z]/g) || []).length / line.length;
    if (uppercaseRatio > 0.5 && line.length >= 3 && line.length <= 50) {
      return { value: line, confident: true };
    }

    // Check if it looks like a business name
    if (/^[A-Z][a-zA-Z\s&'-]+$/.test(line) && line.length >= 3 && line.length <= 50) {
      return { value: line, confident: false };
    }
  }

  // Fallback: just use the first non-empty line
  const firstLine = lines[0];
  if (firstLine && firstLine.length >= 3 && firstLine.length <= 50) {
    return { value: firstLine, confident: false };
  }

  return { value: undefined, confident: false };
}

/**
 * Parse receipt text and extract structured data
 */
export function parseReceiptText(text: string): ParsedReceiptData {
  const normalizedText = text
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"');

  const amount = extractAmount(normalizedText);
  const date = extractDate(text); // Use original text for date (line-based)
  const vendor = extractVendor(text); // Use original text for vendor (line-based)

  return {
    amount: amount.value,
    date: date.value,
    vendor: vendor.value,
    confidence: {
      amount: amount.confident,
      date: date.confident,
      vendor: vendor.confident,
    },
  };
}

/**
 * Clean and format extracted vendor name
 */
export function formatVendorName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}
