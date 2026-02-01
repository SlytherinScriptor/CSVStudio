/**
 * Column Transformation & Mapping Utilities
 * Functions for renaming, reordering, formulas, and value mapping
 */

export type FormulaOperation = 'concat' | 'add' | 'subtract' | 'multiply' | 'divide' | 'uppercase' | 'lowercase' | 'trim' | 'prefix' | 'suffix';

export interface ValueMapping {
    from: string;
    to: string;
}

export interface FormulaConfig {
    operation: FormulaOperation;
    columns: string[];
    separator?: string;  // For concat
    prefix?: string;     // For prefix operation
    suffix?: string;     // For suffix operation
}

/**
 * Rename a column header
 */
export function renameColumn(
    rows: Record<string, any>[],
    headers: string[],
    oldName: string,
    newName: string
): { rows: Record<string, any>[]; headers: string[]; success: boolean } {
    if (!oldName || !newName || oldName === newName) {
        return { rows, headers, success: false };
    }

    if (headers.includes(newName)) {
        return { rows, headers, success: false }; // New name already exists
    }

    const colIndex = headers.indexOf(oldName);
    if (colIndex === -1) {
        return { rows, headers, success: false };
    }

    const newHeaders = [...headers];
    newHeaders[colIndex] = newName;

    const newRows = rows.map(row => {
        const newRow = { ...row };
        newRow[newName] = newRow[oldName];
        delete newRow[oldName];
        return newRow;
    });

    return { rows: newRows, headers: newHeaders, success: true };
}

/**
 * Reorder columns to a new arrangement
 */
export function reorderColumns(
    headers: string[],
    newOrder: string[]
): string[] {
    // Validate all columns are present
    const headerSet = new Set(headers);
    const orderSet = new Set(newOrder);

    if (headerSet.size !== orderSet.size) {
        return headers;
    }

    for (const h of headers) {
        if (!orderSet.has(h)) return headers;
    }

    return newOrder;
}

/**
 * Move a column up or down in the order
 */
export function moveColumn(
    headers: string[],
    column: string,
    direction: 'up' | 'down'
): string[] {
    const index = headers.indexOf(column);
    if (index === -1) return headers;

    const newHeaders = [...headers];

    if (direction === 'up' && index > 0) {
        [newHeaders[index - 1], newHeaders[index]] = [newHeaders[index], newHeaders[index - 1]];
    } else if (direction === 'down' && index < headers.length - 1) {
        [newHeaders[index], newHeaders[index + 1]] = [newHeaders[index + 1], newHeaders[index]];
    }

    return newHeaders;
}

/**
 * Add a formula-based column
 */
export function addFormulaColumn(
    rows: Record<string, any>[],
    headers: string[],
    newColumnName: string,
    formula: FormulaConfig
): { rows: Record<string, any>[]; headers: string[]; affected: number } {
    if (!newColumnName || headers.includes(newColumnName)) {
        return { rows, headers, affected: 0 };
    }

    let affected = 0;
    const newHeaders = [...headers, newColumnName];

    const newRows = rows.map(row => {
        const newRow = { ...row };
        let result: string | number = '';

        try {
            switch (formula.operation) {
                case 'concat':
                    result = formula.columns
                        .map(col => String(row[col] ?? ''))
                        .join(formula.separator || '');
                    break;

                case 'add':
                    result = formula.columns.reduce((sum, col) => {
                        const val = parseFloat(String(row[col] ?? '0'));
                        return sum + (isNaN(val) ? 0 : val);
                    }, 0);
                    break;

                case 'subtract':
                    if (formula.columns.length >= 2) {
                        const first = parseFloat(String(row[formula.columns[0]] ?? '0'));
                        const second = parseFloat(String(row[formula.columns[1]] ?? '0'));
                        result = (isNaN(first) ? 0 : first) - (isNaN(second) ? 0 : second);
                    }
                    break;

                case 'multiply':
                    result = formula.columns.reduce((product, col) => {
                        const val = parseFloat(String(row[col] ?? '1'));
                        return product * (isNaN(val) ? 1 : val);
                    }, 1);
                    break;

                case 'divide':
                    if (formula.columns.length >= 2) {
                        const numerator = parseFloat(String(row[formula.columns[0]] ?? '0'));
                        const denominator = parseFloat(String(row[formula.columns[1]] ?? '1'));
                        if (denominator !== 0) {
                            result = (isNaN(numerator) ? 0 : numerator) / (isNaN(denominator) ? 1 : denominator);
                            result = Math.round(result * 100) / 100; // Round to 2 decimal places
                        } else {
                            result = 'DIV/0';
                        }
                    }
                    break;

                case 'uppercase':
                    if (formula.columns.length > 0) {
                        result = String(row[formula.columns[0]] ?? '').toUpperCase();
                    }
                    break;

                case 'lowercase':
                    if (formula.columns.length > 0) {
                        result = String(row[formula.columns[0]] ?? '').toLowerCase();
                    }
                    break;

                case 'trim':
                    if (formula.columns.length > 0) {
                        result = String(row[formula.columns[0]] ?? '').trim();
                    }
                    break;

                case 'prefix':
                    if (formula.columns.length > 0) {
                        result = (formula.prefix || '') + String(row[formula.columns[0]] ?? '');
                    }
                    break;

                case 'suffix':
                    if (formula.columns.length > 0) {
                        result = String(row[formula.columns[0]] ?? '') + (formula.suffix || '');
                    }
                    break;
            }

            affected++;
        } catch {
            result = '';
        }

        newRow[newColumnName] = result;
        return newRow;
    });

    return { rows: newRows, headers: newHeaders, affected };
}

/**
 * Apply value mapping to a column
 */
export function applyValueMapping(
    rows: Record<string, any>[],
    column: string,
    mappings: ValueMapping[],
    caseSensitive: boolean = false
): { rows: Record<string, any>[]; affected: number } {
    if (!column || mappings.length === 0) {
        return { rows, affected: 0 };
    }

    let affected = 0;
    const mappingLookup = new Map<string, string>();

    for (const m of mappings) {
        const key = caseSensitive ? m.from : m.from.toLowerCase();
        mappingLookup.set(key, m.to);
    }

    const newRows = rows.map(row => {
        const originalValue = String(row[column] ?? '');
        const lookupKey = caseSensitive ? originalValue : originalValue.toLowerCase();

        if (mappingLookup.has(lookupKey)) {
            affected++;
            return { ...row, [column]: mappingLookup.get(lookupKey) };
        }
        return row;
    });

    return { rows: newRows, affected };
}

/**
 * Delete columns from data
 */
export function deleteColumns(
    rows: Record<string, any>[],
    headers: string[],
    columnsToDelete: string[]
): { rows: Record<string, any>[]; headers: string[] } {
    const deleteSet = new Set(columnsToDelete);
    const newHeaders = headers.filter(h => !deleteSet.has(h));

    const newRows = rows.map(row => {
        const newRow = { ...row };
        for (const col of columnsToDelete) {
            delete newRow[col];
        }
        return newRow;
    });

    return { rows: newRows, headers: newHeaders };
}

/**
 * Duplicate a column with a new name
 */
export function duplicateColumn(
    rows: Record<string, any>[],
    headers: string[],
    sourceColumn: string,
    newColumnName: string
): { rows: Record<string, any>[]; headers: string[]; success: boolean } {
    if (!sourceColumn || !newColumnName || headers.includes(newColumnName)) {
        return { rows, headers, success: false };
    }

    const colIndex = headers.indexOf(sourceColumn);
    if (colIndex === -1) {
        return { rows, headers, success: false };
    }

    const newHeaders = [...headers];
    newHeaders.splice(colIndex + 1, 0, newColumnName);

    const newRows = rows.map(row => ({
        ...row,
        [newColumnName]: row[sourceColumn]
    }));

    return { rows: newRows, headers: newHeaders, success: true };
}

/**
 * Create a conditional column (IF/THEN/ELSE)
 */
export function createConditionalColumn(
    rows: Record<string, any>[],
    headers: string[],
    newColumnName: string,
    sourceColumn: string,
    condition: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan',
    conditionValue: string,
    thenValue: string,
    elseValue: string
): { rows: Record<string, any>[]; headers: string[]; affected: number } {
    if (!newColumnName || headers.includes(newColumnName) || !sourceColumn) {
        return { rows, headers, affected: 0 };
    }

    let affected = 0;
    const newHeaders = [...headers, newColumnName];

    const newRows = rows.map(row => {
        const newRow = { ...row };
        const cellValue = String(row[sourceColumn] ?? '');
        let matches = false;

        switch (condition) {
            case 'equals':
                matches = cellValue === conditionValue;
                break;
            case 'contains':
                matches = cellValue.includes(conditionValue);
                break;
            case 'startsWith':
                matches = cellValue.startsWith(conditionValue);
                break;
            case 'endsWith':
                matches = cellValue.endsWith(conditionValue);
                break;
            case 'isEmpty':
                matches = cellValue.trim() === '';
                break;
            case 'isNotEmpty':
                matches = cellValue.trim() !== '';
                break;
            case 'greaterThan':
                const numVal = parseFloat(cellValue);
                const condNum = parseFloat(conditionValue);
                matches = !isNaN(numVal) && !isNaN(condNum) && numVal > condNum;
                break;
            case 'lessThan':
                const numVal2 = parseFloat(cellValue);
                const condNum2 = parseFloat(conditionValue);
                matches = !isNaN(numVal2) && !isNaN(condNum2) && numVal2 < condNum2;
                break;
        }

        newRow[newColumnName] = matches ? thenValue : elseValue;
        if (matches) affected++;
        return newRow;
    });

    return { rows: newRows, headers: newHeaders, affected };
}

/**
 * Get unique values from a column (for mapping suggestions)
 */
export function getUniqueValues(
    rows: Record<string, any>[],
    column: string,
    limit: number = 100
): string[] {
    const seen = new Set<string>();
    const values: string[] = [];

    for (const row of rows) {
        const val = String(row[column] ?? '').trim();
        if (val && !seen.has(val)) {
            seen.add(val);
            values.push(val);
            if (values.length >= limit) break;
        }
    }

    return values.sort();
}
