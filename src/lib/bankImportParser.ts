// Parser pour fichiers bancaires OFX uniquement
// Le FITID (Financial Institution Transaction ID) est utilisé comme identifiant unique

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  reference?: string;
  importHash: string;
}

export interface OFXParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
}

/**
 * Génère un hash unique pour détecter les doublons
 * Utilise le FITID (référence bancaire) si disponible, sinon fallback sur les données
 */
function generateImportHash(
  reference?: string,
  date?: string,
  description?: string,
  amount?: number,
  type?: string
): string {
  // Si on a une référence bancaire (FITID), l'utiliser directement
  if (reference) {
    return `fitid_${reference}`;
  }
  
  // Fallback pour les très rares cas sans FITID
  const data = `${date}|${description}|${amount}|${type}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fallback_${Math.abs(hash).toString(36)}`;
}

/**
 * Parse un fichier OFX (format bancaire standard)
 * Extrait le FITID pour une détection parfaite des doublons
 */
export function parseOFXFile(file: File): Promise<OFXParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const transactions: ParsedTransaction[] = [];
        const errors: string[] = [];

        // Parser OFX - Les transactions sont dans des blocs <STMTTRN>...</STMTTRN>
        const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
        let match;

        while ((match = transactionRegex.exec(content)) !== null) {
          const block = match[1];

          // Extraire les champs
          const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
          const amountMatch = block.match(/<TRNAMT>(-?[\d.]+)/);
          const nameMatch = block.match(/<NAME>([^<\n]+)/);
          const memoMatch = block.match(/<MEMO>([^<\n]+)/);
          const fitidMatch = block.match(/<FITID>([^<\n]+)/);

          if (dateMatch && amountMatch) {
            const dateStr = dateMatch[1];
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const date = `${year}-${month}-${day}`;

            const amount = parseFloat(amountMatch[1]);
            const description = (nameMatch?.[1] || memoMatch?.[1] || 'Transaction').trim();
            const reference = fitidMatch?.[1]?.trim();
            const type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';

            transactions.push({
              date,
              description,
              amount: Math.abs(amount),
              type,
              reference,
              importHash: generateImportHash(reference, date, description, Math.abs(amount), type),
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

/**
 * Parse un fichier bancaire (OFX uniquement)
 */
export async function parseBankFile(file: File): Promise<OFXParseResult> {
  const extension = file.name.toLowerCase().split('.').pop();

  if (extension === 'ofx' || extension === 'qfx') {
    return parseOFXFile(file);
  } else {
    return {
      success: false,
      transactions: [],
      errors: [
        `Format de fichier non supporté: .${extension}. Utilisez uniquement des fichiers OFX ou QFX (téléchargeables depuis votre banque).`,
      ],
    };
  }
}
