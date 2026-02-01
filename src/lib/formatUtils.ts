/**
 * Format Conversion Utilities
 * Tool 1: Multi-Format Converter
 */

export type FormatType = 'csv' | 'json' | 'xml' | 'tsv';

export interface ConversionOptions {
    prettyPrint?: boolean;
    rootElement?: string; // For XML
    arrayName?: string; // For JSON/XML
    includeHeaders?: boolean;
    delimiter?: string; // For CSV/TSV
}

/**
 * Detect format from content
 */
export function detectFormat(content: string): FormatType {
    const trimmed = content.trim();

    // Check for JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            JSON.parse(trimmed);
            return 'json';
        } catch {
            // Not valid JSON, continue checking
        }
    }

    // Check for XML
    if (trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.includes('</'))) {
        return 'xml';
    }

    // Check for TSV (more tabs than commas in first line)
    const firstLine = trimmed.split('\n')[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;

    if (tabCount > commaCount && tabCount > 0) {
        return 'tsv';
    }

    return 'csv';
}

/**
 * Convert CSV rows to JSON
 */
export function csvToJson(
    rows: Record<string, any>[],
    headers: string[],
    options: ConversionOptions = {}
): string {
    const { prettyPrint = true } = options;

    // Clean rows to only include specified headers
    const cleanedRows = rows.map(row => {
        const cleanRow: Record<string, any> = {};
        for (const h of headers) {
            cleanRow[h] = row[h] ?? null;
        }
        return cleanRow;
    });

    return JSON.stringify(cleanedRows, null, prettyPrint ? 2 : 0);
}

/**
 * Convert CSV rows to XML
 */
export function csvToXml(
    rows: Record<string, any>[],
    headers: string[],
    options: ConversionOptions = {}
): string {
    const {
        prettyPrint = true,
        rootElement = 'data',
        arrayName = 'row'
    } = options;

    const indent = prettyPrint ? '  ' : '';
    const newline = prettyPrint ? '\n' : '';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>${newline}`;
    xml += `<${rootElement}>${newline}`;

    for (const row of rows) {
        xml += `${indent}<${arrayName}>${newline}`;

        for (const h of headers) {
            const value = escapeXml(String(row[h] ?? ''));
            const tagName = sanitizeTagName(h);
            xml += `${indent}${indent}<${tagName}>${value}</${tagName}>${newline}`;
        }

        xml += `${indent}</${arrayName}>${newline}`;
    }

    xml += `</${rootElement}>`;

    return xml;
}

/**
 * Convert CSV rows to TSV
 */
export function csvToTsv(
    rows: Record<string, any>[],
    headers: string[],
    options: ConversionOptions = {}
): string {
    const { includeHeaders = true } = options;

    const lines: string[] = [];

    if (includeHeaders) {
        lines.push(headers.join('\t'));
    }

    for (const row of rows) {
        const values = headers.map(h => {
            const val = row[h] ?? '';
            // Escape tabs and newlines in values
            return String(val).replace(/\t/g, ' ').replace(/\n/g, ' ');
        });
        lines.push(values.join('\t'));
    }

    return lines.join('\n');
}

/**
 * Parse JSON to rows and headers
 */
export function jsonToCsv(
    jsonString: string
): { rows: Record<string, any>[]; headers: string[] } | null {
    try {
        const parsed = JSON.parse(jsonString);

        // Handle array of objects
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
            const headers = Object.keys(parsed[0]);
            return { rows: parsed, headers };
        }

        // Handle single object
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            const headers = Object.keys(parsed);
            return { rows: [parsed], headers };
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Parse XML to rows and headers (simple implementation)
 */
export function xmlToCsv(
    xmlString: string
): { rows: Record<string, any>[]; headers: string[] } | null {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        // Check for parse errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) return null;

        // Get all child elements of root (rows)
        const root = doc.documentElement;
        const rowElements = Array.from(root.children);

        if (rowElements.length === 0) return null;

        // Extract headers from first row
        const firstRow = rowElements[0];
        const headers = Array.from(firstRow.children).map(el => el.tagName);

        // Extract values from all rows
        const rows = rowElements.map(rowEl => {
            const row: Record<string, any> = {};
            for (const child of Array.from(rowEl.children)) {
                row[child.tagName] = child.textContent || '';
            }
            return row;
        });

        return { rows, headers };
    } catch {
        return null;
    }
}

/**
 * Parse TSV to rows and headers
 */
export function tsvToCsv(
    tsvString: string
): { rows: Record<string, any>[]; headers: string[] } | null {
    try {
        const lines = tsvString.trim().split('\n');
        if (lines.length === 0) return null;

        const headers = lines[0].split('\t');
        const rows = lines.slice(1).map(line => {
            const values = line.split('\t');
            const row: Record<string, any> = {};
            headers.forEach((h, i) => {
                row[h] = values[i] || '';
            });
            return row;
        });

        return { rows, headers };
    } catch {
        return null;
    }
}

/**
 * Format CSV output
 */
export function formatCsvOutput(
    rows: Record<string, any>[],
    headers: string[]
): string {
    const lines: string[] = [headers.join(',')];

    for (const row of rows) {
        const values = headers.map(h => {
            const val = row[h] ?? '';
            const str = String(val);
            // Quote values containing comma, quote, or newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        });
        lines.push(values.join(','));
    }

    return lines.join('\n');
}

// Helper functions
function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function sanitizeTagName(name: string): string {
    // XML tag names can't start with numbers and can't contain spaces
    let tagName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (/^[0-9]/.test(tagName)) {
        tagName = '_' + tagName;
    }
    return tagName || 'field';
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: FormatType): string {
    switch (format) {
        case 'json': return '.json';
        case 'xml': return '.xml';
        case 'tsv': return '.tsv';
        default: return '.csv';
    }
}

/**
 * Get MIME type for format
 */
export function getMimeType(format: FormatType): string {
    switch (format) {
        case 'json': return 'application/json';
        case 'xml': return 'application/xml';
        case 'tsv': return 'text/tab-separated-values';
        default: return 'text/csv';
    }
}
