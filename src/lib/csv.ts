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
