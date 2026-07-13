const CHARACTER_REPLACEMENTS: Record<string, string> = {
  '\u00A0': ' ',
  '\u1680': ' ',
  '\u2000': ' ',
  '\u2001': ' ',
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2004': ' ',
  '\u2005': ' ',
  '\u2006': ' ',
  '\u2007': ' ',
  '\u2008': ' ',
  '\u2009': ' ',
  '\u200A': ' ',
  '\u202F': ' ',
  '\u205F': ' ',
  '\u3000': ' ',
  '\u2018': "'",
  '\u2019': "'",
  '\u201A': "'",
  '\u201B': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u201E': '"',
  '\u201F': '"',
  '\u2010': '-',
  '\u2011': '-',
  '\u2012': '-',
  '\u2013': '-',
  '\u2014': '-',
  '\u2015': '-',
  '\u2212': '-',
  '\u2026': '...',
  '\u2022': '-',
  '\u25CF': '-',
  '\u25E6': '-',
  '\u2043': '-',
  '\u00AD': '',
  '\u2192': '->',
  '\u2190': '<-',
  '\u21D2': '=>',
  '\u2713': 'OK',
  '\u2714': 'OK',
  '\u2717': 'X',
  '\u2718': 'X',
};

const UNSUPPORTED_PDF_CHARS = /[^\t\n\r\x20-\x7E\u00A0-\u00FF\u0152\u0153\u0178\u20AC]/g;
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const CONTROL_CHARS_EXCEPT_LINE_BREAKS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
const SURROGATE_PAIRS = /[\uD800-\uDFFF]/g;

export function normalizeDocumentText(text: string | null | undefined): string {
  if (!text) return '';

  let normalized = text.normalize('NFKC').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  normalized = normalized.replace(
    /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\u2018-\u201F\u2212\u2026\u2022\u25CF\u25E6\u2043\u00AD\u2190\u2192\u21D2\u2713\u2714\u2717\u2718]/g,
    (char) => CHARACTER_REPLACEMENTS[char] ?? ''
  );

  return normalized
    .replace(INVISIBLE_CHARS, '')
    .replace(CONTROL_CHARS_EXCEPT_LINE_BREAKS, '')
    .replace(SURROGATE_PAIRS, '')
    .replace(/\t/g, '  ')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n[ ]+/g, '\n')
    .replace(/[ ]{3,}/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeDocumentTextForPdf(text: string | null | undefined): string {
  return normalizeDocumentText(text)
    .replace(UNSUPPORTED_PDF_CHARS, '')
    .split('\n')
    .map((line) => line.replace(/([^\s]{34})(?=[^\s])/g, '$1 '))
    .join('\n');
}

export function normalizeDocumentTextForEditing(text: string | null | undefined): string {
  return normalizeDocumentText(text)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}