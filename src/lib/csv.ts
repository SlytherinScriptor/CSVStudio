import Papa from 'papaparse';

export interface ParsedCSV {
    rows: any[];
    headers: string[];
    name: string;
}

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h: string) => String(h || '').trim(),
            complete: (results: Papa.ParseResult<any>) => {
                const rows = results.data || [];
                // If meta.fields is populated, usage it. Otherwise try to grab keys from first row.
                let headers: string[] = [];
                if (results.meta && results.meta.fields) {
                    headers = results.meta.fields.map((h: string) => String(h || '').trim());
                } else if (rows.length > 0) {
                    headers = Object.keys(rows[0] as object);
                }

                resolve({
                    rows,
                    headers,
                    name: file.name
                });
            },
            error: (err: Error) => {
                reject(err);
            }
        });
    });
}

/**
 * Export data to CSV string with proper quoting.
 * All string values are quoted to preserve original formatting.
 */
export function exportToCSV(headers: string[], rows: Record<string, any>[]): string {
    return Papa.unparse(
        { fields: headers, data: rows },
        {
            quotes: true,       // Quote all fields (preserves original formatting)
            quoteChar: '"',
            escapeChar: '"',
            newline: '\r\n'
        }
    );
}

