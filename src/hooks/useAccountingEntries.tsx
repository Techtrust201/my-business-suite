import { supabase } from '@/integrations/supabase/client';

// Types pour la génération automatique d'écritures
export interface AccountingEntryConfig {
  organizationId: string;
  date: string;
  description: string;
  referenceType: 'invoice' | 'bill' | 'payment' | 'bill_payment' | 'expense';
  referenceId: string;
  journalType: 'sales' | 'purchases' | 'bank';
}

export interface AccountingLine {
  accountNumber: string;
  description: string;
  debit: number;
  credit: number;
}

// Récupérer les comptes comptables par numéro
async function getAccountsByNumbers(organizationId: string, accountNumbers: string[]) {
  const { data: accounts, error } = await supabase
    .from('chart_of_accounts')
    .select('id, account_number')
    .eq('organization_id', organizationId)
    .in('account_number', accountNumbers);

  if (error) {
    console.error('Erreur récupération comptes:', error);
    return new Map<string, string>();
  }

  return new Map(accounts?.map(a => [a.account_number, a.id]) || []);
}

// Obtenir le prochain numéro d'écriture
async function getNextEntryNumber(organizationId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('get_next_journal_entry_number', { _org_id: organizationId });

  if (error) {
    console.error('Erreur numéro écriture:', error);
    return `EC-${Date.now()}`;
  }

  return data;
}

// Créer une écriture comptable
async function createJournalEntry(
  config: AccountingEntryConfig,
  lines: AccountingLine[]
): Promise<boolean> {
  try {
    // Vérifier que les montants sont équilibrés
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Écriture non équilibrée:', { totalDebit, totalCredit });
      return false;
    }

    // Récupérer les IDs des comptes
    const accountNumbers = lines.map(l => l.accountNumber);
    const accountMap = await getAccountsByNumbers(config.organizationId, accountNumbers);

    if (accountMap.size === 0) {
      console.log('Plan comptable non initialisé, écriture ignorée');
      return false;
    }

    // Vérifier que tous les comptes existent
    const missingAccounts = accountNumbers.filter(n => !accountMap.has(n));
    if (missingAccounts.length > 0) {
      console.warn('Comptes manquants:', missingAccounts);
      return false;
    }

    // Obtenir le numéro d'écriture
    const entryNumber = await getNextEntryNumber(config.organizationId);

    // Créer l'écriture
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: config.organizationId,
        entry_number: entryNumber,
        date: config.date,
        description: config.description,
        reference_type: config.referenceType,
        reference_id: config.referenceId,
        journal_type: config.journalType,
        status: 'posted',
        is_balanced: true,
      })
      .select()
      .single();

    if (entryError) {
      console.error('Erreur création écriture:', entryError);
      return false;
    }

    // Créer les lignes d'écriture
    const entryLines = lines.map((line, index) => ({
      journal_entry_id: entry.id,
      account_id: accountMap.get(line.accountNumber)!,
      description: line.description,
      debit: line.debit,
      credit: line.credit,
      position: index + 1,
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(entryLines);

    if (linesError) {
      console.error('Erreur création lignes:', linesError);
      // Nettoyer l'écriture si les lignes échouent
      await supabase.from('journal_entries').delete().eq('id', entry.id);
      return false;
    }

    console.log(`✅ Écriture comptable ${entryNumber} créée avec succès`);
    return true;
  } catch (error) {
    console.error('Erreur génération écriture:', error);
    return false;
  }
}

/**
 * Génère l'écriture comptable pour une facture client envoyée
 * 
 * Débit  411000 Clients        : TTC
 * Crédit 707000 Ventes         : HT
 * Crédit 445710 TVA collectée  : TVA
 */
export async function generateInvoiceEntry(
  organizationId: string,
  invoiceId: string,
  invoiceNumber: string,
  date: string,
  subtotal: number,
  taxAmount: number,
  total: number,
  clientName?: string
): Promise<boolean> {
  const description = `Facture ${invoiceNumber}${clientName ? ` - ${clientName}` : ''}`;

  const lines: AccountingLine[] = [
    {
      accountNumber: '411000',
      description: `Client - ${invoiceNumber}`,
      debit: total,
      credit: 0,
    },
    {
      accountNumber: '707000',
      description: `Ventes - ${invoiceNumber}`,
      debit: 0,
      credit: subtotal,
    },
  ];

  // Ajouter la TVA si applicable
  if (taxAmount > 0) {
    lines.push({
      accountNumber: '445710',
      description: `TVA collectée - ${invoiceNumber}`,
      debit: 0,
      credit: taxAmount,
    });
  }

  return createJournalEntry(
    {
      organizationId,
      date,
      description,
      referenceType: 'invoice',
      referenceId: invoiceId,
      journalType: 'sales',
    },
    lines
  );
}

/**
 * Génère l'écriture comptable pour un paiement client reçu
 * 
 * Débit  512000 Banque   : Montant
 * Crédit 411000 Clients  : Montant
 */
export async function generatePaymentReceivedEntry(
  organizationId: string,
  paymentId: string,
  invoiceNumber: string,
  date: string,
  amount: number,
  clientName?: string
): Promise<boolean> {
  const description = `Paiement reçu - Facture ${invoiceNumber}${clientName ? ` - ${clientName}` : ''}`;

  const lines: AccountingLine[] = [
    {
      accountNumber: '512000',
      description: `Encaissement - ${invoiceNumber}`,
      debit: amount,
      credit: 0,
    },
    {
      accountNumber: '411000',
      description: `Règlement client - ${invoiceNumber}`,
      debit: 0,
      credit: amount,
    },
  ];

  return createJournalEntry(
    {
      organizationId,
      date,
      description,
      referenceType: 'payment',
      referenceId: paymentId,
      journalType: 'bank',
    },
    lines
  );
}

/**
 * Génère l'écriture comptable pour une facture fournisseur (achat)
 * 
 * Débit  607000 Achats           : HT
 * Débit  445660 TVA déductible   : TVA
 * Crédit 401000 Fournisseurs     : TTC
 */
export async function generateBillEntry(
  organizationId: string,
  billId: string,
  billNumber: string | null,
  date: string,
  subtotal: number,
  taxAmount: number,
  total: number,
  vendorName?: string
): Promise<boolean> {
  const ref = billNumber || billId.substring(0, 8);
  const description = `Achat ${ref}${vendorName ? ` - ${vendorName}` : ''}`;

  const lines: AccountingLine[] = [
    {
      accountNumber: '607000',
      description: `Achats - ${ref}`,
      debit: subtotal,
      credit: 0,
    },
  ];

  // Ajouter la TVA si applicable
  if (taxAmount > 0) {
    lines.push({
      accountNumber: '445660',
      description: `TVA déductible - ${ref}`,
      debit: taxAmount,
      credit: 0,
    });
  }

  lines.push({
    accountNumber: '401000',
    description: `Fournisseur - ${ref}`,
    debit: 0,
    credit: total,
  });

  return createJournalEntry(
    {
      organizationId,
      date,
      description,
      referenceType: 'bill',
      referenceId: billId,
      journalType: 'purchases',
    },
    lines
  );
}

/**
 * Génère l'écriture comptable pour un paiement fournisseur
 * 
 * Débit  401000 Fournisseurs : Montant
 * Crédit 512000 Banque       : Montant
 */
export async function generateBillPaymentEntry(
  organizationId: string,
  paymentId: string,
  billNumber: string | null,
  date: string,
  amount: number,
  vendorName?: string
): Promise<boolean> {
  const ref = billNumber || 'Fournisseur';
  const description = `Paiement fournisseur - ${ref}${vendorName ? ` - ${vendorName}` : ''}`;

  const lines: AccountingLine[] = [
    {
      accountNumber: '401000',
      description: `Règlement - ${ref}`,
      debit: amount,
      credit: 0,
    },
    {
      accountNumber: '512000',
      description: `Décaissement - ${ref}`,
      debit: 0,
      credit: amount,
    },
  ];

  return createJournalEntry(
    {
      organizationId,
      date,
      description,
      referenceType: 'bill_payment',
      referenceId: paymentId,
      journalType: 'bank',
    },
    lines
  );
}

/**
 * Supprime les écritures liées à une référence (facture, paiement, etc.)
 * Utile en cas d'annulation
 */
export async function deleteEntriesByReference(
  referenceType: string,
  referenceId: string
): Promise<boolean> {
  try {
    // Trouver les écritures liées
    const { data: entries, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('reference_type', referenceType)
      .eq('reference_id', referenceId);

    if (fetchError || !entries?.length) {
      return true; // Rien à supprimer
    }

    // Supprimer les lignes puis les écritures
    for (const entry of entries) {
      await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', entry.id);
      await supabase.from('journal_entries').delete().eq('id', entry.id);
    }

    console.log(`🗑️ Écritures supprimées pour ${referenceType}:${referenceId}`);
    return true;
  } catch (error) {
    console.error('Erreur suppression écritures:', error);
    return false;
  }
}

// Mapping des catégories de dépenses vers les comptes comptables
const EXPENSE_CATEGORY_ACCOUNTS: Record<string, string> = {
  restauration: '625000',    // Déplacements, missions et réceptions
  transport: '625000',       // Déplacements, missions et réceptions
  fournitures: '606000',     // Achats non stockés
  telecom: '626000',         // Frais postaux et télécommunications
  abonnements: '613000',     // Locations
  frais_bancaires: '627000', // Services bancaires
  hebergement: '625000',     // Déplacements, missions et réceptions
  marketing: '623000',       // Publicité, publications
  formation: '618000',       // Divers (à créer si besoin)
  autre: '618000',           // Divers
};

/**
 * Génère l'écriture comptable pour une dépense
 * 
 * Débit  6XXXXX (selon catégorie) : Montant
 * Crédit 512000 Banque            : Montant (si paiement carte/virement)
 * Crédit 531000 Caisse            : Montant (si paiement espèces)
 */
export async function generateExpenseEntry(
  organizationId: string,
  expenseId: string,
  date: string,
  amount: number,
  category: string,
  paymentMethod: string,
  vendorName?: string,
  description?: string
): Promise<boolean> {
  const accountNumber = EXPENSE_CATEGORY_ACCOUNTS[category] || '618000';
  const creditAccount = paymentMethod === 'cash' ? '531000' : '512000';
  const ref = vendorName || description || 'Dépense';
  const entryDescription = `Dépense - ${ref}`;

  const lines: AccountingLine[] = [
    {
      accountNumber,
      description: `Charge - ${ref}`,
      debit: amount,
      credit: 0,
    },
    {
      accountNumber: creditAccount,
      description: `Règlement - ${ref}`,
      debit: 0,
      credit: amount,
    },
  ];

  return createJournalEntry(
    {
      organizationId,
      date,
      description: entryDescription,
      referenceType: 'expense',
      referenceId: expenseId,
      journalType: 'bank',
    },
    lines
  );
}
