import Papa from 'papaparse';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  reference?: string;
  importHash: string;
}

interface CSVParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
}

// Génère un hash unique pour détecter les doublons
function generateImportHash(
  date: string,
  description: string,
  amount: number
): string {
  const data = `${date}|${description}|${amount}`;
  // Utiliser un simple hash basé sur la chaîne
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Parse une date depuis différents formats
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Formats courants
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];

  for (const format of formats) {
    const match = dateStr.trim().match(format);
    if (match) {
      let year: string, month: string, day: string;

      if (format === formats[2]) {
        // YYYY-MM-DD
        [, year, month, day] = match;
      } else {
        // DD/MM/YYYY ou similaire
        [, day, month, year] = match;
      }

      // Retourner au format YYYY-MM-DD
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Essayer avec Date.parse en dernier recours
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }

  return null;
}

// Parse un montant depuis différents formats
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Nettoyer le string
  let cleaned = amountStr.trim();

  // Supprimer le symbole monétaire
  cleaned = cleaned.replace(/[€$£]/g, '').trim();

  // Gérer les formats européens (1 234,56 → 1234.56)
  if (cleaned.includes(',') && cleaned.includes(' ')) {
    cleaned = cleaned.replace(/\s/g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // 1234,56 → 1234.56
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1.234,56 → 1234.56 (format européen avec point comme séparateur milliers)
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
  }

  // Supprimer les espaces restants
  cleaned = cleaned.replace(/\s/g, '');

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

// Détecte les colonnes du CSV
function detectColumns(
  headers: string[]
): { dateCol: number; descCol: number; amountCol: number; creditCol?: number; debitCol?: number } | null {
  const headerLower = headers.map((h) => h.toLowerCase().trim());

  // Colonnes de date possibles
  const dateKeywords = ['date', 'date opération', 'date operation', 'date valeur', 'value date'];
  const dateCol = headerLower.findIndex((h) =>
    dateKeywords.some((k) => h.includes(k))
  );

  // Colonnes de description possibles
  const descKeywords = ['libellé', 'libelle', 'description', 'label', 'intitulé', 'designation', 'motif'];
  const descCol = headerLower.findIndex((h) =>
    descKeywords.some((k) => h.includes(k))
  );

  // Colonne montant unique
  const amountKeywords = ['montant', 'amount', 'somme', 'valeur'];
  const amountCol = headerLower.findIndex((h) =>
    amountKeywords.some((k) => h.includes(k)) && !h.includes('crédit') && !h.includes('debit')
  );

  // Colonnes crédit/débit séparées
  const creditKeywords = ['crédit', 'credit', 'encaissement', 'recette'];
  const creditCol = headerLower.findIndex((h) =>
    creditKeywords.some((k) => h.includes(k))
  );

  const debitKeywords = ['débit', 'debit', 'décaissement', 'dépense', 'depense'];
  const debitCol = headerLower.findIndex((h) =>
    debitKeywords.some((k) => h.includes(k))
  );

  if (dateCol === -1 || descCol === -1) {
    return null;
  }

  if (amountCol !== -1) {
    return { dateCol, descCol, amountCol };
  }

  if (creditCol !== -1 || debitCol !== -1) {
    return { dateCol, descCol, amountCol: -1, creditCol, debitCol };
  }

  // Fallback: essayer les colonnes par position
  if (headers.length >= 3) {
    return { dateCol: 0, descCol: 1, amountCol: 2 };
  }

  return null;
}

// Parse un fichier CSV bancaire
export function parseCSVFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const errors: string[] = [];
        const transactions: ParsedTransaction[] = [];

        if (!results.data || results.data.length === 0) {
          resolve({
            success: false,
            transactions: [],
            errors: ['Le fichier est vide ou mal formaté'],
          });
          return;
        }

        const headers = Object.keys(results.data[0] as object);
        const columns = detectColumns(headers);

        if (!columns) {
          resolve({
            success: false,
            transactions: [],
            errors: [
              'Impossible de détecter les colonnes. Assurez-vous que le fichier contient des colonnes Date, Description/Libellé et Montant.',
            ],
          });
          return;
        }

        const { dateCol, descCol, amountCol, creditCol, debitCol } = columns;
        const dateKey = headers[dateCol];
        const descKey = headers[descCol];
        const amountKey = amountCol !== -1 ? headers[amountCol] : null;
        const creditKey = creditCol !== undefined && creditCol !== -1 ? headers[creditCol] : null;
        const debitKey = debitCol !== undefined && debitCol !== -1 ? headers[debitCol] : null;

        (results.data as Record<string, string>[]).forEach((row, index) => {
          try {
            const dateStr = row[dateKey];
            const description = row[descKey];

            if (!dateStr || !description) {
              return; // Skip lignes vides
            }

            const date = parseDate(dateStr);
            if (!date) {
              errors.push(`Ligne ${index + 2}: Date invalide "${dateStr}"`);
              return;
            }

            let amount: number;
            let type: 'credit' | 'debit';

            if (amountKey) {
              // Colonne montant unique
              const parsedAmount = parseAmount(row[amountKey]);
              if (parsedAmount === null) {
                errors.push(`Ligne ${index + 2}: Montant invalide "${row[amountKey]}"`);
                return;
              }
              amount = Math.abs(parsedAmount);
              type = parsedAmount >= 0 ? 'credit' : 'debit';
            } else if (creditKey || debitKey) {
              // Colonnes crédit/débit séparées
              const creditAmount = creditKey ? parseAmount(row[creditKey] || '0') : 0;
              const debitAmount = debitKey ? parseAmount(row[debitKey] || '0') : 0;

              if (creditAmount && creditAmount > 0) {
                amount = creditAmount;
                type = 'credit';
              } else if (debitAmount && debitAmount > 0) {
                amount = debitAmount;
                type = 'debit';
              } else {
                errors.push(`Ligne ${index + 2}: Aucun montant trouvé`);
                return;
              }
            } else {
              errors.push(`Ligne ${index + 2}: Configuration des colonnes incorrecte`);
              return;
            }

            transactions.push({
              date,
              description: description.trim(),
              amount,
              type,
              importHash: generateImportHash(date, description, amount),
            });
          } catch (error) {
            errors.push(`Ligne ${index + 2}: Erreur de parsing`);
          }
        });

        resolve({
          success: transactions.length > 0,
          transactions,
          errors,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          transactions: [],
          errors: [`Erreur de lecture: ${error.message}`],
        });
      },
    });
  });
}

// Parse un fichier OFX (format bancaire standard)
export function parseOFXFile(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const transactions: ParsedTransaction[] = [];
        const errors: string[] = [];

        // Parser OFX simplifié
        // Les transactions sont dans des blocs <STMTTRN>...</STMTTRN>
        const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
        let match;

        while ((match = transactionRegex.exec(content)) !== null) {
          const block = match[1];

          // Extraire les champs
          const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
          const amountMatch = block.match(/<TRNAMT>(-?[\d.]+)/);
          const nameMatch = block.match(/<NAME>([^<\n]+)/);
          const memoMatch = block.match(/<MEMO>([^<\n]+)/);

          if (dateMatch && amountMatch) {
            const dateStr = dateMatch[1];
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const date = `${year}-${month}-${day}`;

            const amount = parseFloat(amountMatch[1]);
            const description = (nameMatch?.[1] || memoMatch?.[1] || 'Transaction').trim();

            transactions.push({
              date,
              description,
              amount: Math.abs(amount),
              type: amount >= 0 ? 'credit' : 'debit',
              importHash: generateImportHash(date, description, Math.abs(amount)),
            });
          }
        }

        if (transactions.length === 0) {
          errors.push('Aucune transaction trouvée dans le fichier OFX');
        }

        resolve({
          success: transactions.length > 0,
          transactions,
          errors,
        });
      } catch (error) {
        resolve({
          success: false,
          transactions: [],
          errors: ['Erreur lors du parsing du fichier OFX'],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        transactions: [],
        errors: ['Erreur de lecture du fichier'],
      });
    };

    reader.readAsText(file);
  });
}

// Parse un fichier (détection automatique du format)
export async function parseBankFile(file: File): Promise<CSVParseResult> {
  const extension = file.name.toLowerCase().split('.').pop();

  if (extension === 'csv' || extension === 'txt') {
    return parseCSVFile(file);
  } else if (extension === 'ofx' || extension === 'qfx') {
    return parseOFXFile(file);
  } else {
    return {
      success: false,
      transactions: [],
      errors: [`Format de fichier non supporté: .${extension}. Utilisez CSV ou OFX.`],
    };
  }
}

