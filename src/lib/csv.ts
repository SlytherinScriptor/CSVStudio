import Papa from 'papaparse';

export interface ParsedCSV {
    rows: Record<string, any>[];
    headers: string[];
    name: string;
    rawLines: string[];       // Original raw lines (index 0 = first data row)
    rawHeaderLine: string;    // Original header line
}

/**
 * Parse a CSV file, preserving original raw lines for format-preserving export.
 */
export async function parseCSVFile(file: File): Promise<ParsedCSV> {
    return new Promise((resolve, reject) => {
        // First read raw content to preserve original lines
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawContent = e.target?.result as string;
            // Split by both \r\n and \n to handle different line endings
            const allLines = rawContent.split(/\r?\n/).filter(line => line.trim() !== '');
            const rawHeaderLine = allLines[0] || '';
            const rawDataLines = allLines.slice(1);

            // Now parse with PapaParse for structured data
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (h: string) => String(h || '').trim(),
                complete: (results: Papa.ParseResult<any>) => {
                    const rows = results.data || [];
                    let headers: string[] = [];
                    if (results.meta && results.meta.fields) {
                        headers = results.meta.fields.map((h: string) => String(h || '').trim());
                    } else if (rows.length > 0) {
                        headers = Object.keys(rows[0] as object);
                    }

                    resolve({
                        rows,
                        headers,
                        name: file.name,
                        rawLines: rawDataLines,
                        rawHeaderLine
                    });
                },
                error: (err: Error) => {
                    reject(err);
                }
            });
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Parse a CSV line into individual fields, respecting quotes.
 */
function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (!inQuotes) {
            if (char === '"' || char === "'") {
                inQuotes = true;
                quoteChar = char;
                current += char;
            } else if (char === ',') {
                fields.push(current);
                current = '';
            } else {
                current += char;
            }
        } else {
            current += char;
            if (char === quoteChar) {
                // Check for escaped quote (doubled)
                if (i + 1 < line.length && line[i + 1] === quoteChar) {
                    current += line[i + 1];
                    i++;
                } else {
                    inQuotes = false;
                }
            }
        }
    }
    fields.push(current);
    return fields;
}

/**
 * Detect per-column quote pattern from a raw CSV line.
 * Returns an array of booleans indicating if each column was quoted.
 */
function detectColumnQuotePattern(rawLine: string): boolean[] {
    const fields = parseCSVLine(rawLine);
    return fields.map(field => {
        const trimmed = field.trim();
        return trimmed.startsWith('"') || trimmed.startsWith("'");
    });
}

/**
 * Format a single value to match the original column quoting style.
 * Empty values are never quoted (output as empty between commas).
 */
function formatValueForColumn(value: any, shouldQuote: boolean): string {
    const str = String(value ?? '');

    // Empty values are never quoted - they appear as just empty between commas
    if (str === '') {
        return '';
    }

    // Always quote if value contains comma, newline, or quotes
    const needsQuoting = str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"');

    if (needsQuoting || shouldQuote) {
        // Escape any existing quotes by doubling them
        const escaped = str.replace(/"/g, '""');
        return '"' + escaped + '"';
    }

    return str;
}

/**
 * Build a CSV line from row data using per-column quote pattern.
 */
function buildLineWithPattern(
    row: Record<string, any>,
    headers: string[],
    columnQuotePattern: boolean[]
): string {
    return headers.map((h, i) => {
        const shouldQuote = columnQuotePattern[i] ?? false;
        return formatValueForColumn(row[h], shouldQuote);
    }).join(',');
}

/**
 * Format-preserving CSV export.
 * For unchanged rows, uses the original raw line. For changed rows, rebuilds with the same per-column quote style.
 */
export function formatPreservingExport(
    headers: string[],
    rows: Record<string, any>[],
    originalCSV: ParsedCSV,
    keyColumn: string,
    changedKeys: Set<string>
): string {
    // Detect per-column quote pattern from original file
    const headerQuotePattern = detectColumnQuotePattern(originalCSV.rawHeaderLine);
    const dataQuotePattern = originalCSV.rawLines[0]
        ? detectColumnQuotePattern(originalCSV.rawLines[0])
        : headerQuotePattern;

    // Build header line with original pattern
    const headerLine = headers.map((h, i) => {
        const shouldQuote = headerQuotePattern[i] ?? false;
        return formatValueForColumn(h, shouldQuote);
    }).join(',');

    // Build original row lookup by key
    const originalRawByKey = new Map<string, string>();
    originalCSV.rows.forEach((row, i) => {
        const key = String(row[keyColumn] ?? '').trim();
        if (key && originalCSV.rawLines[i]) {
            originalRawByKey.set(key, originalCSV.rawLines[i]);
        }
    });

    // Check if headers changed (union mode adds columns)
    const headersChanged = headers.length !== originalCSV.headers.length ||
        !headers.every((h, i) => h === originalCSV.headers[i]);

    // Build data lines
    const dataLines = rows.map(row => {
        const key = String(row[keyColumn] ?? '').trim();

        // If this row wasn't changed, headers are same, and we have the original raw line, use it
        if (!changedKeys.has(key) && !headersChanged && originalRawByKey.has(key)) {
            return originalRawByKey.get(key)!;
        }

        // Otherwise, rebuild the line with the detected per-column pattern
        return buildLineWithPattern(row, headers, dataQuotePattern);
    });

    return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Simple CSV export (quotes all fields).
 * Use this for new files or when format preservation isn't needed.
 */
export function exportToCSV(headers: string[], rows: Record<string, any>[]): string {
    return Papa.unparse(
        { fields: headers, data: rows },
        {
            quotes: true,
            quoteChar: '"',
            escapeChar: '"',
            newline: '\r\n'
        }
    );
}



