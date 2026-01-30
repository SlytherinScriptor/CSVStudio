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
 * Detect quote pattern from a raw CSV line.
 * Returns an object indicating if values are quoted and the quote char used.
 */
function detectQuotePattern(rawLine: string): { quoted: boolean; quoteChar: string } {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('"') || trimmed.includes(',"')) {
        return { quoted: true, quoteChar: '"' };
    }
    if (trimmed.startsWith("'") || trimmed.includes(",'")) {
        return { quoted: true, quoteChar: "'" };
    }
    return { quoted: false, quoteChar: '"' };
}

/**
 * Format a single value to match the original quoting style.
 * Only quote if the original pattern used quotes, or if value contains special chars.
 */
function formatValue(value: any, quoted: boolean, quoteChar: string): string {
    const str = String(value ?? '');

    // Always quote if value contains comma, newline, or the quote char itself
    const needsQuoting = str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes(quoteChar);

    if (needsQuoting || quoted) {
        // Escape any existing quote chars by doubling them
        const escaped = str.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar);
        return quoteChar + escaped + quoteChar;
    }

    return str;
}

/**
 * Build a CSV line from row data using detected quote pattern.
 */
function buildLine(row: Record<string, any>, headers: string[], quoted: boolean, quoteChar: string): string {
    return headers.map(h => formatValue(row[h], quoted, quoteChar)).join(',');
}

/**
 * Format-preserving CSV export.
 * For unchanged rows, uses the original raw line. For changed rows, rebuilds with the same quote style.
 * 
 * @param headers - Output headers
 * @param rows - Output row data
 * @param originalCSV - Original parsed CSV (for format detection and raw lines)
 * @param keyColumn - Column to use for matching rows
 * @param changedKeys - Set of key values that were modified (these rows will be rebuilt)
 */
export function formatPreservingExport(
    headers: string[],
    rows: Record<string, any>[],
    originalCSV: ParsedCSV,
    keyColumn: string,
    changedKeys: Set<string>
): string {
    // Detect quote pattern from original file
    const headerPattern = detectQuotePattern(originalCSV.rawHeaderLine);
    const dataPattern = originalCSV.rawLines[0]
        ? detectQuotePattern(originalCSV.rawLines[0])
        : headerPattern;

    // Build header line
    const headerLine = buildLine(
        Object.fromEntries(headers.map(h => [h, h])),
        headers,
        headerPattern.quoted,
        headerPattern.quoteChar
    );

    // Build original row lookup by key
    const originalRawByKey = new Map<string, string>();
    originalCSV.rows.forEach((row, i) => {
        const key = String(row[keyColumn] ?? '').trim();
        if (key && originalCSV.rawLines[i]) {
            originalRawByKey.set(key, originalCSV.rawLines[i]);
        }
    });

    // Build data lines
    const dataLines = rows.map(row => {
        const key = String(row[keyColumn] ?? '').trim();

        // If this row wasn't changed and we have the original raw line, use it
        if (!changedKeys.has(key) && originalRawByKey.has(key)) {
            return originalRawByKey.get(key)!;
        }

        // Otherwise, rebuild the line with the detected pattern
        return buildLine(row, headers, dataPattern.quoted, dataPattern.quoteChar);
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


