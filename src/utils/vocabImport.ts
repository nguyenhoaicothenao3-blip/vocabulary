import * as XLSX from 'xlsx';

export interface ParsedVocabEntry {
  english: string;
  vietnamese: string;
}

export interface VocabParseResult {
  entries: ParsedVocabEntry[];
  invalidLineNumbers: number[];
}

const HEADER_KEYWORDS = new Set([
  'english',
  'en',
  'word',
  'vocab',
  'vocabulary',
  'tu tieng anh',
  'tieng anh',
  'vietnamese',
  'vi',
  'vn',
  'meaning',
  'nghia',
  'nghia tieng viet',
  'tieng viet',
  'stt',
  'no',
  '#',
]);

function normalizeHeaderToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

function isHeaderPair(colA: string, colB: string): boolean {
  const a = normalizeHeaderToken(colA);
  const b = normalizeHeaderToken(colB);
  return HEADER_KEYWORDS.has(a) && HEADER_KEYWORDS.has(b);
}

function cleanCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim().replace(/\s+/g, ' ');
}

function splitFirst(line: string, separator: string): [string, string] | null {
  const idx = line.indexOf(separator);
  if (idx <= 0) return null;
  const left = line.slice(0, idx).trim();
  const right = line.slice(idx + separator.length).trim();
  if (!left || !right) return null;
  return [left, right];
}

export function parseVocabLine(rawLine: string): ParsedVocabEntry | null {
  let line = rawLine.trim();
  if (!line || line.startsWith('#') || line.startsWith('//')) return null;

  // Strip optional leading list numbering like "1. " or "1) " or "• "
  line = line.replace(/^(?:\d+[.)]\s+|•\s+)/, '').trim();
  if (!line) return null;

  let pair: [string, string] | null = null;

  // 1. Tab (Excel / Google Sheets copy-paste)
  if (line.includes('\t')) {
    const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      // Handle optional leading STT column (e.g. "1\tnotebook\tquyển vở")
      if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
        pair = [parts[1], parts[2]];
      } else {
        pair = [parts[0], parts[1]];
      }
    }
  }

  // 2. Pipe / Arrow / Spaced dash / Colon / Equals / Semicolon / Comma
  if (!pair) pair = splitFirst(line, '|');
  if (!pair) pair = splitFirst(line, '->');
  if (!pair) pair = splitFirst(line, '→');
  if (!pair) pair = splitFirst(line, ' - ');
  if (!pair) pair = splitFirst(line, ' – ');
  if (!pair) pair = splitFirst(line, ' — ');
  if (!pair) pair = splitFirst(line, ':');
  if (!pair) pair = splitFirst(line, '=');
  if (!pair) pair = splitFirst(line, ';');
  if (!pair) pair = splitFirst(line, ',');

  // 3. Fallback compact hyphen (e.g., "notebook-quyển vở")
  if (!pair) pair = splitFirst(line, '-');

  if (!pair) return null;

  const english = cleanCell(pair[0]);
  const vietnamese = cleanCell(pair[1]);
  if (!english || !vietnamese) return null;
  if (isHeaderPair(english, vietnamese)) return null;

  return { english, vietnamese };
}

export function parseBulkVocabText(text: string): VocabParseResult {
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);
  const entries: ParsedVocabEntry[] = [];
  const invalidLineNumbers: number[] = [];

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      return;
    }

    const parsed = parseVocabLine(trimmed);
    if (parsed) {
      entries.push(parsed);
    } else {
      // Don't flag obvious single header words
      if (!HEADER_KEYWORDS.has(normalizeHeaderToken(trimmed))) {
        invalidLineNumbers.push(index + 1);
      }
    }
  });

  return { entries, invalidLineNumbers };
}

export async function parseVocabFile(file: File): Promise<VocabParseResult> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.txt')) {
    const text = await file.text();
    return parseBulkVocabText(text);
  }

  // Excel (.xlsx, .xls) or CSV (.csv) via SheetJS
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { entries: [], invalidLineNumbers: [] };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) {
    return { entries: [], invalidLineNumbers: [] };
  }

  let startRow = 0;
  let enCol = 0;
  let viCol = 1;

  // Detect optional header row in first non-empty row
  const headerCells = rows[0].map((c) => normalizeHeaderToken(cleanCell(c)));
  const foundEnIdx = headerCells.findIndex((h) =>
    ['english', 'en', 'word', 'vocab', 'vocabulary', 'tu tieng anh', 'tieng anh'].includes(h)
  );
  const foundViIdx = headerCells.findIndex((h) =>
    ['vietnamese', 'vi', 'vn', 'meaning', 'nghia', 'nghia tieng viet', 'tieng viet'].includes(h)
  );

  if (foundEnIdx !== -1 && foundViIdx !== -1) {
    enCol = foundEnIdx;
    viCol = foundViIdx;
    startRow = 1;
  } else if (
    headerCells.length >= 2 &&
    isHeaderPair(cleanCell(rows[0][0]), cleanCell(rows[0][1]))
  ) {
    startRow = 1;
  }

  const entries: ParsedVocabEntry[] = [];
  const invalidLineNumbers: number[] = [];

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    const nonEmptyCount = row.filter((c) => cleanCell(c) !== '').length;
    if (nonEmptyCount === 0) continue;

    // Auto-skip leading STT column if no header was specified and col 0 is numeric
    let cEn = enCol;
    let cVi = viCol;
    if (
      startRow === 0 &&
      row.length >= 3 &&
      /^\d+$/.test(cleanCell(row[0])) &&
      cleanCell(row[1]) !== '' &&
      cleanCell(row[2]) !== ''
    ) {
      cEn = 1;
      cVi = 2;
    }

    const enVal = cleanCell(row[cEn]);
    const viVal = cleanCell(row[cVi]);

    if (enVal && viVal) {
      if (!isHeaderPair(enVal, viVal)) {
        entries.push({ english: enVal, vietnamese: viVal });
      }
    } else if (enVal && !viVal) {
      // Fallback: maybe user put "notebook - quyển vở" inside a single column
      const fallback = parseVocabLine(enVal);
      if (fallback) {
        entries.push(fallback);
      } else {
        invalidLineNumbers.push(r + 1);
      }
    } else {
      invalidLineNumbers.push(r + 1);
    }
  }

  return { entries, invalidLineNumbers };
}

export function downloadSampleTemplate(format: 'txt' | 'xlsx') {
  const sampleRows = [
    { english: 'notebook', vietnamese: 'quyển vở' },
    { english: 'spaceship', vietnamese: 'tàu vũ trụ' },
    { english: 'pencil', vietnamese: 'bút chì' },
    { english: 'adventure', vietnamese: 'cuộc phiêu lưu' },
  ];

  if (format === 'txt') {
    const content = [
      '# Định dạng: Từ tiếng Anh - Nghĩa tiếng Việt (mỗi từ 1 dòng)',
      ...sampleRows.map((r) => `${r.english} - ${r.vietnamese}`),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_tu_vung.txt';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const sheetData = [
    ['English', 'Vietnamese'],
    ...sampleRows.map((r) => [r.english, r.vietnamese]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'TuVung');
  XLSX.writeFile(workbook, 'mau_tu_vung.xlsx');
}
