import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { ProspectWithStatus } from './useProspects';

// CSV column mapping
const CSV_COLUMNS = [
  { key: 'company_name', label: 'Nom entreprise' },
  { key: 'siret', label: 'SIRET' },
  { key: 'siren', label: 'SIREN' },
  { key: 'vat_number', label: 'N° TVA' },
  { key: 'legal_form', label: 'Forme juridique' },
  { key: 'naf_code', label: 'Code NAF' },
  { key: 'address_line1', label: 'Adresse' },
  { key: 'address_line2', label: 'Complément adresse' },
  { key: 'postal_code', label: 'Code postal' },
  { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Site web' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'status_name', label: 'Statut' },
  { key: 'created_at', label: 'Date création' },
];

// Export prospects to CSV
export function useExportProspectsCSV() {
  return (prospects: ProspectWithStatus[], filename?: string) => {
    if (!prospects || prospects.length === 0) {
      toast.error('Aucun prospect à exporter');
      return;
    }

    // Create CSV header
    const header = CSV_COLUMNS.map(col => col.label).join(';');

    // Create CSV rows
    const rows = prospects.map(prospect => {
      return CSV_COLUMNS.map(col => {
        let value = '';
        
        if (col.key === 'status_name') {
          value = prospect.status?.name || '';
        } else if (col.key === 'created_at') {
          value = new Date(prospect.created_at).toLocaleDateString('fr-FR');
        } else {
          value = (prospect as any)[col.key] || '';
        }
        
        // Escape special characters for CSV
        if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(';');
    });

    // Combine header and rows
    const csv = [header, ...rows].join('\n');

    // Create BOM for Excel compatibility with accents
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `prospects_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${prospects.length} prospects exportés`);
  };
}

// Parse CSV file
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Map labels to keys
  const headerToKey: Record<string, string> = {};
  CSV_COLUMNS.forEach(col => {
    headerToKey[col.label.toLowerCase()] = col.key;
  });

  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      const key = headerToKey[header.toLowerCase()] || header.toLowerCase().replace(/\s+/g, '_');
      row[key] = values[index] || '';
    });
    
    if (row.company_name || row['nom entreprise'] || row['nom_entreprise']) {
      rows.push(row);
    }
  }

  return rows;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

export interface ImportResult {
  success: number;
  errors: number;
  duplicates: number;
  details: string[];
}

export function useImportProspectsCSV() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      if (!organization?.id || !user?.id) {
        throw new Error('Organisation non trouvée');
      }

      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('Aucune donnée valide trouvée dans le fichier');
      }

      // Get existing SIRETs to check for duplicates
      const { data: existingProspects } = await supabase
        .from('prospects')
        .select('siret, company_name')
        .eq('organization_id', organization.id);

      const existingSirets = new Set(
        existingProspects?.filter(p => p.siret).map(p => p.siret!.replace(/\s/g, '')) || []
      );
      const existingNames = new Set(
        existingProspects?.map(p => p.company_name.toLowerCase()) || []
      );

      // Get default status
      const { data: defaultStatus } = await supabase
        .from('prospect_statuses')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_default', true)
        .single();

      const result: ImportResult = {
        success: 0,
        errors: 0,
        duplicates: 0,
        details: [],
      };

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 for header and 0-index

        try {
          // Normalize company name
          const companyName = row.company_name || row['nom entreprise'] || row['nom_entreprise'];
          if (!companyName) {
            result.errors++;
            result.details.push(`Ligne ${rowNum}: Nom d'entreprise manquant`);
            continue;
          }

          // Check for duplicates
          const siret = (row.siret || '').replace(/\s/g, '');
          if (siret && existingSirets.has(siret)) {
            result.duplicates++;
            result.details.push(`Ligne ${rowNum}: SIRET ${siret} déjà existant`);
            continue;
          }

          if (existingNames.has(companyName.toLowerCase())) {
            result.duplicates++;
            result.details.push(`Ligne ${rowNum}: "${companyName}" déjà existant`);
            continue;
          }

          // Insert prospect
          const { error } = await supabase.from('prospects').insert({
            organization_id: organization.id,
            created_by: user.id,
            company_name: companyName,
            siret: siret || null,
            siren: row.siren || null,
            vat_number: row.vat_number || row['n° tva'] || null,
            legal_form: row.legal_form || row['forme juridique'] || null,
            naf_code: row.naf_code || row['code naf'] || null,
            address_line1: row.address_line1 || row.adresse || null,
            address_line2: row.address_line2 || row['complément adresse'] || null,
            postal_code: row.postal_code || row['code postal'] || null,
            city: row.city || row.ville || null,
            country: row.country || row.pays || 'FR',
            phone: row.phone || row['téléphone'] || null,
            email: row.email || null,
            website: row.website || row['site web'] || null,
            source: row.source || 'import',
            notes: row.notes || null,
            status_id: defaultStatus?.id || null,
          });

          if (error) {
            result.errors++;
            result.details.push(`Ligne ${rowNum}: ${error.message}`);
          } else {
            result.success++;
            // Add to existing sets to prevent duplicates in same import
            if (siret) existingSirets.add(siret);
            existingNames.add(companyName.toLowerCase());
          }
        } catch (err: any) {
          result.errors++;
          result.details.push(`Ligne ${rowNum}: ${err.message}`);
        }
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      
      if (result.success > 0) {
        toast.success(`${result.success} prospect(s) importé(s)`);
      }
      if (result.duplicates > 0) {
        toast.warning(`${result.duplicates} doublon(s) ignoré(s)`);
      }
      if (result.errors > 0) {
        toast.error(`${result.errors} erreur(s) lors de l'import`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'import');
    },
  });
}

// Download template CSV
export function downloadTemplateCSV() {
  const headers = CSV_COLUMNS.map(col => col.label).join(';');
  const exampleRow = [
    'Ma Société SAS',    // Nom entreprise
    '12345678900001',    // SIRET
    '123456789',         // SIREN
    'FR12345678901',     // N° TVA
    'SAS',               // Forme juridique
    '62.01Z',            // Code NAF
    '123 rue Example',   // Adresse
    'Bâtiment A',        // Complément
    '75001',             // Code postal
    'Paris',             // Ville
    'FR',                // Pays
    '+33123456789',      // Téléphone
    'contact@example.com', // Email
    'www.example.com',   // Site web
    'import',            // Source
    'Notes sur le prospect', // Notes
    '',                  // Statut (ignoré à l'import)
    '',                  // Date création (ignoré à l'import)
  ].join(';');

  const csv = `${headers}\n${exampleRow}`;
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template_import_prospects.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success('Template téléchargé');
}
