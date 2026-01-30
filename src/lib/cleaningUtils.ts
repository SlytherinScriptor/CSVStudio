/**
 * Data Cleaning Utilities
 * Functions for handling missing values, text standardization, and deduplication
 */

export type FillStrategy = 'remove' | 'value' | 'average' | 'mode' | 'empty';
export type TextCase = 'trim' | 'lowercase' | 'uppercase' | 'titlecase';
export type ColumnType = 'text' | 'number' | 'email' | 'date' | 'phone' | 'unknown';

/**
 * Detect the likely data type of a column based on its values
 */
export function detectColumnType(rows: Record<string, any>[], column: string): ColumnType {
    const values = rows
        .map(r => String(r[column] ?? '').trim())
        .filter(v => v !== '');

    if (values.length === 0) return 'unknown';

    // Check patterns
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
    const dateRegex = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/;
    const numberRegex = /^-?\d+\.?\d*$/;

    let emailCount = 0, phoneCount = 0, dateCount = 0, numberCount = 0;

    for (const v of values) {
        if (emailRegex.test(v)) emailCount++;
        else if (phoneRegex.test(v)) phoneCount++;
        else if (dateRegex.test(v)) dateCount++;
        else if (numberRegex.test(v)) numberCount++;
    }

    const threshold = values.length * 0.8; // 80% threshold

    if (emailCount >= threshold) return 'email';
    if (phoneCount >= threshold) return 'phone';
    if (dateCount >= threshold) return 'date';
    if (numberCount >= threshold) return 'number';

    return 'text';
}

/**
 * Get column statistics for numeric columns
 */
export function getColumnStats(rows: Record<string, any>[], column: string) {
    const values = rows
        .map(r => parseFloat(String(r[column] ?? '')))
        .filter(v => !isNaN(v));

    if (values.length === 0) {
        return { count: 0, min: 0, max: 0, avg: 0, sum: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { count: values.length, min, max, avg, sum };
}

/**
 * Get the mode (most common value) of a column
 */
export function getColumnMode(rows: Record<string, any>[], column: string): string {
    const counts = new Map<string, number>();

    for (const row of rows) {
        const val = String(row[column] ?? '').trim();
        if (val !== '') {
            counts.set(val, (counts.get(val) || 0) + 1);
        }
    }

    let mode = '';
    let maxCount = 0;

    for (const [val, count] of counts) {
        if (count > maxCount) {
            mode = val;
            maxCount = count;
        }
    }

    return mode;
}

/**
 * Count missing values in a column
 */
export function countMissing(rows: Record<string, any>[], column: string): number {
    return rows.filter(r => {
        const val = String(r[column] ?? '').trim();
        return val === '';
    }).length;
}

/**
 * Handle missing values in a column
 */
export function handleMissingValues(
    rows: Record<string, any>[],
    column: string,
    strategy: FillStrategy,
    fillValue?: string
): { rows: Record<string, any>[]; affected: number } {
    let affected = 0;

    if (strategy === 'remove') {
        const filtered = rows.filter(r => {
            const val = String(r[column] ?? '').trim();
            if (val === '') {
                affected++;
                return false;
            }
            return true;
        });
        return { rows: filtered, affected };
    }

    // Calculate fill value based on strategy
    let computedFillValue = fillValue || '';

    if (strategy === 'average') {
        const stats = getColumnStats(rows, column);
        computedFillValue = stats.count > 0 ? String(Math.round(stats.avg * 100) / 100) : '0';
    } else if (strategy === 'mode') {
        computedFillValue = getColumnMode(rows, column);
    }

    const newRows = rows.map(r => {
        const val = String(r[column] ?? '').trim();
        if (val === '' && strategy !== 'empty') {
            affected++;
            return { ...r, [column]: computedFillValue };
        }
        return r;
    });

    return { rows: newRows, affected };
}

/**
 * Standardize text in a column
 */
export function standardizeText(
    rows: Record<string, any>[],
    column: string,
    mode: TextCase
): { rows: Record<string, any>[]; affected: number } {
    let affected = 0;

    const transform = (val: string): string => {
        switch (mode) {
            case 'trim':
                return val.trim();
            case 'lowercase':
                return val.toLowerCase();
            case 'uppercase':
                return val.toUpperCase();
            case 'titlecase':
                return val.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            default:
                return val;
        }
    };

    const newRows = rows.map(r => {
        const original = String(r[column] ?? '');
        const transformed = transform(original);
        if (original !== transformed) {
            affected++;
            return { ...r, [column]: transformed };
        }
        return r;
    });

    return { rows: newRows, affected };
}

/**
 * Remove duplicate rows based on specified columns
 */
export function removeDuplicates(
    rows: Record<string, any>[],
    keyColumns: string[],
    keepFirst: boolean = true
): { rows: Record<string, any>[]; affected: number } {
    const seen = new Map<string, number>();
    const result: Record<string, any>[] = [];
    let affected = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const key = keyColumns.map(col => String(row[col] ?? '').trim()).join('|');

        if (!seen.has(key)) {
            seen.set(key, i);
            result.push(row);
        } else {
            affected++;
            // If keepFirst is false, replace with later occurrence
            if (!keepFirst) {
                const prevIndex = result.findIndex((_, idx) => {
                    const prevRow = result[idx];
                    const prevKey = keyColumns.map(col => String(prevRow[col] ?? '').trim()).join('|');
                    return prevKey === key;
                });
                if (prevIndex !== -1) {
                    result[prevIndex] = row;
                }
            }
        }
    }

    return { rows: result, affected };
}

/**
 * Trim whitespace from all columns
 */
export function trimAllColumns(
    rows: Record<string, any>[],
    headers: string[]
): { rows: Record<string, any>[]; affected: number } {
    let affected = 0;

    const newRows = rows.map(r => {
        const newRow = { ...r };
        let rowChanged = false;

        for (const h of headers) {
            const original = String(r[h] ?? '');
            const trimmed = original.trim();
            if (original !== trimmed) {
                newRow[h] = trimmed;
                rowChanged = true;
            }
        }

        if (rowChanged) affected++;
        return newRow;
    });

    return { rows: newRows, affected };
}

/**
 * Get summary of data quality issues
 */
export function getDataQualitySummary(
    rows: Record<string, any>[],
    headers: string[]
): {
    totalRows: number;
    missingByColumn: Record<string, number>;
    columnTypes: Record<string, ColumnType>;
    duplicateCount: number;
} {
    const missingByColumn: Record<string, number> = {};
    const columnTypes: Record<string, ColumnType> = {};

    for (const h of headers) {
        missingByColumn[h] = countMissing(rows, h);
        columnTypes[h] = detectColumnType(rows, h);
    }

    // Count duplicates (by all columns)
    const { affected } = removeDuplicates(rows, headers);

    return {
        totalRows: rows.length,
        missingByColumn,
        columnTypes,
        duplicateCount: affected
    };
}

/**
 * Find and replace text in a column
 */
export function findAndReplace(
    rows: Record<string, any>[],
    column: string,
    find: string,
    replace: string,
    useRegex: boolean,
    matchCase: boolean
): { rows: Record<string, any>[]; affected: number } {
    let affected = 0;
    let regex: RegExp | null = null;

    if (useRegex) {
        try {
            regex = new RegExp(find, matchCase ? 'g' : 'gi');
        } catch (e) {
            return { rows, affected: 0 }; // Invalid regex
        }
    }

    const newRows = rows.map(r => {
        const original = String(r[column] ?? '');
        let newVal = original;

        if (useRegex && regex) {
            newVal = original.replace(regex, replace);
        } else {
            if (matchCase) {
                newVal = original.split(find).join(replace);
            } else {
                // Case insensitive string replace
                const lowerOrg = original.toLowerCase();
                const lowerFind = find.toLowerCase();
                let result = '';
                let searchIdx = 0;
                let foundIdx = lowerOrg.indexOf(lowerFind, searchIdx);

                while (foundIdx !== -1) {
                    result += original.slice(searchIdx, foundIdx) + replace;
                    searchIdx = foundIdx + find.length;
                    foundIdx = lowerOrg.indexOf(lowerFind, searchIdx);
                }
                result += original.slice(searchIdx);
                newVal = result;
            }
        }

        if (newVal !== original) {
            affected++;
            return { ...r, [column]: newVal };
        }
        return r;
    });

    return { rows: newRows, affected };
}

/**
 * Split a column into multiple columns by delimiter
 */
export function splitColumn(
    rows: Record<string, any>[],
    headers: string[],
    column: string,
    delimiter: string
): { rows: Record<string, any>[]; headers: string[]; affected: number } {
    let affected = 0;
    let maxParts = 0;

    // First pass to determine max parts
    rows.forEach(r => {
        const val = String(r[column] ?? '');
        if (val.includes(delimiter)) {
            const parts = val.split(delimiter);
            if (parts.length > maxParts) maxParts = parts.length;
        }
    });

    if (maxParts <= 1) return { rows, headers, affected: 0 };

    // Generate new headers
    const newHeaders = [...headers];
    const colIndex = newHeaders.indexOf(column);
    const generatedHeaders: string[] = [];

    for (let i = 1; i <= maxParts; i++) {
        let newName = `${column}_${i}`;
        let counter = 1;
        while (newHeaders.includes(newName) || generatedHeaders.includes(newName)) {
            newName = `${column}_${i}_${counter++}`;
        }
        generatedHeaders.push(newName);
    }

    // Insert new headers after the original column
    newHeaders.splice(colIndex + 1, 0, ...generatedHeaders);

    const newRows = rows.map(r => {
        const val = String(r[column] ?? '');
        if (val.includes(delimiter)) {
            affected++;
            const parts = val.split(delimiter);
            const newRow = { ...r };
            generatedHeaders.forEach((h, idx) => {
                newRow[h] = parts[idx] || '';
            });
            return newRow;
        }
        return r;
    });

    return { rows: newRows, headers: newHeaders, affected };
}

/**
 * Combine multiple columns into one
 */
export function combineColumns(
    rows: Record<string, any>[],
    headers: string[],
    columns: string[],
    separator: string,
    newColumnName: string
): { rows: Record<string, any>[]; headers: string[]; affected: number } {
    if (columns.length < 2 || !newColumnName) return { rows, headers, affected: 0 };

    const newHeaders = [...headers];
    if (!newHeaders.includes(newColumnName)) {
        newHeaders.push(newColumnName);
    }

    const newRows = rows.map(r => {
        const parts = columns.map(c => String(r[c] ?? ''));
        const combined = parts.join(separator);
        return { ...r, [newColumnName]: combined };
    });

    return { rows: newRows, headers: newHeaders, affected: rows.length };
}
