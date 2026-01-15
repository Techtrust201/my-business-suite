/**
 * Calculate French VAT intra-community number from SIREN
 * Formula: FR + key + SIREN
 * Key = (12 + 3 * (SIREN % 97)) % 97
 */
export function calculateFrenchVAT(siren: string): string {
  if (!siren || siren.length !== 9 || !/^\d{9}$/.test(siren)) {
    return '';
  }

  const sirenNum = parseInt(siren, 10);
  const key = (12 + 3 * (sirenNum % 97)) % 97;
  const keyStr = key.toString().padStart(2, '0');

  return `FR${keyStr}${siren}`;
}

/**
 * Extract SIREN from SIRET (first 9 digits)
 */
export function extractSirenFromSiret(siret: string): string {
  if (!siret || siret.length !== 14 || !/^\d{14}$/.test(siret)) {
    return '';
  }
  return siret.substring(0, 9);
}

/**
 * Validate SIREN format (9 digits)
 */
export function isValidSiren(siren: string): boolean {
  return /^\d{9}$/.test(siren);
}

/**
 * Validate SIRET format (14 digits)
 */
export function isValidSiret(siret: string): boolean {
  return /^\d{14}$/.test(siret);
}
