/**
 * Multi-Format File Parser
 * Supports CSV, Excel (.xlsx/.xls), and JSON files
 */

export type FileFormat = 'csv' | 'excel' | 'json' | 'tsv' | 'unknown';

export interface ParsedData {
    name: string;
    headers: string[];
    rows: Record<string, any>[];
    format: FileFormat;
    rowCount: number;
    // Optional raw data for CSV format preservation
    rawLines?: string[];
    rawHeaderLine?: string;
}

/**
 * Detect file format from file name/extension
 */
export function detectFileFormat(file: File): FileFormat {
    const name = file.name.toLowerCase();
    const ext = name.split('.').pop() || '';

    switch (ext) {
        case 'csv':
            return 'csv';
        case 'tsv':
            return 'tsv';
        case 'xlsx':
        case 'xls':
            return 'excel';
        case 'json':
            return 'json';
        default:
            return 'unknown';
    }
}

/**
 * Get format display name
 */
export function getFormatDisplayName(format: FileFormat): string {
    switch (format) {
        case 'csv': return 'CSV';
        case 'tsv': return 'TSV';
        case 'excel': return 'Excel';
        case 'json': return 'JSON';
        default: return 'Unknown';
    }
}

/**
 * Get supported output formats for conversion
 */
export function getOutputFormats(inputFormat: FileFormat): FileFormat[] {
    const allFormats: FileFormat[] = ['csv', 'json', 'tsv'];
    return allFormats.filter(f => f !== inputFormat);
}

/**
 * Parse CSV content
 */
function parseCSVContent(content: string, delimiter: string = ','): ParsedData {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
        return { name: '', headers: [], rows: [], format: 'csv', rowCount: 0 };
    }

    // Parse header
    const headers = parseCSVLine(lines[0], delimiter);

    // Parse rows
    const rows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], delimiter);
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] ?? '';
        });
        rows.push(row);
    }

    return {
        name: '',
        headers,
        rows,
        format: delimiter === '\t' ? 'tsv' : 'csv',
        rowCount: rows.length,
        rawHeaderLine: lines[0],
        rawLines: lines.slice(1)
    };
}

/**
 * Parse a single CSV line respecting quotes
 */
function parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

/**
 * Parse JSON content (array of objects)
 */
function parseJSONContent(content: string): ParsedData {
    try {
        const data = JSON.parse(content);

        // Handle array of objects
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            const headers = Object.keys(data[0]);
            const rows = data.map((item: any) => {
                const row: Record<string, any> = {};
                headers.forEach(h => {
                    row[h] = item[h] ?? '';
                });
                return row;
            });
            return { name: '', headers, rows, format: 'json', rowCount: rows.length };
        }

        // Handle object with 'data' array property
        if (data.data && Array.isArray(data.data)) {
            return parseJSONContent(JSON.stringify(data.data));
        }

        throw new Error('JSON must be an array of objects');
    } catch (err) {
        throw new Error('Invalid JSON format');
    }
}

/**
 * Parse Excel file (simplified - reads as CSV if xlsx library not available)
 * For full Excel support, would need xlsx library
 */
async function parseExcelContent(file: File): Promise<ParsedData> {
    // Try to dynamically import xlsx if available, otherwise throw error
    try {
        // @ts-ignore - dynamic import
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
            return { name: '', headers: [], rows: [], format: 'excel', rowCount: 0 };
        }

        const headers = Object.keys(jsonData[0] as object);
        const rows = jsonData as Record<string, any>[];

        return { name: '', headers, rows, format: 'excel', rowCount: rows.length };
    } catch {
        throw new Error('Excel files require the xlsx library. Please install it with: npm install xlsx');
    }
}

/**
 * Main parser function - handles all supported formats
 */
export async function parseTabularFile(file: File): Promise<ParsedData> {
    const format = detectFileFormat(file);

    switch (format) {
        case 'csv': {
            const content = await file.text();
            const result = parseCSVContent(content, ',');
            return { ...result, name: file.name };
        }
        case 'tsv': {
            const content = await file.text();
            const result = parseCSVContent(content, '\t');
            return { ...result, name: file.name };
        }
        case 'json': {
            const content = await file.text();
            const result = parseJSONContent(content);
            return { ...result, name: file.name };
        }
        case 'excel': {
            const result = await parseExcelContent(file);
            return { ...result, name: file.name };
        }
        default:
            throw new Error(`Unsupported file format: ${file.name}`);
    }
}

/**
 * Convert parsed data to different format
 */
export function convertToFormat(data: ParsedData, targetFormat: FileFormat): string {
    switch (targetFormat) {
        case 'csv':
            return convertToCSV(data, ',');
        case 'tsv':
            return convertToCSV(data, '\t');
        case 'json':
            return JSON.stringify(data.rows, null, 2);
        default:
            throw new Error(`Cannot convert to format: ${targetFormat}`);
    }
}

/**
 * Convert to CSV/TSV format
 */
function convertToCSV(data: ParsedData, delimiter: string): string {
    const escapeField = (field: any): string => {
        const str = String(field ?? '');
        if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerLine = data.headers.map(escapeField).join(delimiter);
    const dataLines = data.rows.map(row =>
        data.headers.map(h => escapeField(row[h])).join(delimiter)
    );

    return [headerLine, ...dataLines].join('\n');
}

/**
 * Get accepted file extensions string for input
 */
export const ACCEPTED_TABULAR_FORMATS = '.csv,.tsv,.json,.xlsx,.xls';
export const ACCEPTED_TABULAR_MIME = 'text/csv,text/tab-separated-values,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
