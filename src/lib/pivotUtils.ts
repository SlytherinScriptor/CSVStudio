/**
 * Pivot & Aggregation Utilities
 * Tool 6: Data Pivot & Aggregation
 */

export type AggregateOperation = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';

export interface AggregateConfig {
    groupByColumns: string[];
    aggregations: {
        column: string;
        operation: AggregateOperation;
        alias?: string;
    }[];
}

export interface PivotConfig {
    rowKey: string;
    colKey: string;
    valueKey: string;
    operation: AggregateOperation;
}

export interface GroupedData {
    key: string;
    keyValues: Record<string, any>;
    rows: Record<string, any>[];
}

export interface AggregatedRow {
    [key: string]: any;
}

/**
 * Group rows by specified columns
 */
export function groupBy(
    rows: Record<string, any>[],
    groupColumns: string[]
): GroupedData[] {
    const groups = new Map<string, GroupedData>();

    for (const row of rows) {
        const keyValues: Record<string, any> = {};
        const keyParts: string[] = [];

        for (const col of groupColumns) {
            const val = row[col] ?? '';
            keyValues[col] = val;
            keyParts.push(String(val));
        }

        const key = keyParts.join('|||');

        if (!groups.has(key)) {
            groups.set(key, { key, keyValues, rows: [] });
        }
        groups.get(key)!.rows.push(row);
    }

    return Array.from(groups.values());
}

/**
 * Apply aggregation operation to a set of values
 */
function applyOperation(values: any[], operation: AggregateOperation): any {
    const numericValues = values
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v));

    switch (operation) {
        case 'sum':
            return numericValues.reduce((a, b) => a + b, 0);

        case 'avg':
            if (numericValues.length === 0) return 0;
            return numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

        case 'count':
            return values.length;

        case 'min':
            if (numericValues.length === 0) return null;
            return Math.min(...numericValues);

        case 'max':
            if (numericValues.length === 0) return null;
            return Math.max(...numericValues);

        case 'first':
            return values[0] ?? null;

        case 'last':
            return values[values.length - 1] ?? null;

        default:
            return null;
    }
}

/**
 * Aggregate grouped data
 */
export function aggregate(
    rows: Record<string, any>[],
    config: AggregateConfig
): { rows: AggregatedRow[]; headers: string[] } {
    const groups = groupBy(rows, config.groupByColumns);
    const headers = [
        ...config.groupByColumns,
        ...config.aggregations.map(a => a.alias || `${a.operation}(${a.column})`)
    ];

    const aggregatedRows: AggregatedRow[] = groups.map(group => {
        const row: AggregatedRow = { ...group.keyValues };

        for (const agg of config.aggregations) {
            const values = group.rows.map(r => r[agg.column]);
            const result = applyOperation(values, agg.operation);
            const colName = agg.alias || `${agg.operation}(${agg.column})`;
            row[colName] = result;
        }

        return row;
    });

    return { rows: aggregatedRows, headers };
}

/**
 * Create a pivot table
 */
export function pivot(
    rows: Record<string, any>[],
    config: PivotConfig
): { rows: AggregatedRow[]; headers: string[] } {
    const { rowKey, colKey, valueKey, operation } = config;

    // Get unique row and column values
    const rowValues = [...new Set(rows.map(r => String(r[rowKey] ?? '')))].sort();
    const colValues = [...new Set(rows.map(r => String(r[colKey] ?? '')))].sort();

    // Group by row key and column key
    const pivotData = new Map<string, Map<string, any[]>>();

    for (const rowVal of rowValues) {
        pivotData.set(rowVal, new Map());
        for (const colVal of colValues) {
            pivotData.get(rowVal)!.set(colVal, []);
        }
    }

    for (const row of rows) {
        const rv = String(row[rowKey] ?? '');
        const cv = String(row[colKey] ?? '');
        const val = row[valueKey];

        if (pivotData.has(rv) && pivotData.get(rv)!.has(cv)) {
            pivotData.get(rv)!.get(cv)!.push(val);
        }
    }

    // Build pivot table rows
    const headers = [rowKey, ...colValues];
    const pivotRows: AggregatedRow[] = [];

    for (const rowVal of rowValues) {
        const pivotRow: AggregatedRow = { [rowKey]: rowVal };

        for (const colVal of colValues) {
            const values = pivotData.get(rowVal)!.get(colVal)!;
            pivotRow[colVal] = applyOperation(values, operation);
        }

        pivotRows.push(pivotRow);
    }

    return { rows: pivotRows, headers };
}

/**
 * Get available numeric columns for aggregation
 */
export function getNumericColumns(
    rows: Record<string, any>[],
    headers: string[]
): string[] {
    if (rows.length === 0) return [];

    return headers.filter(header => {
        // Check first 10 rows to determine if column is numeric
        const sampleRows = rows.slice(0, 10);
        const numericCount = sampleRows.filter(row => {
            const val = row[header];
            return val !== null && val !== '' && !isNaN(parseFloat(val));
        }).length;

        return numericCount >= sampleRows.length * 0.5; // At least 50% numeric
    });
}

/**
 * Format aggregate result for display
 */
export function formatAggregateValue(value: any, operation: AggregateOperation): string {
    if (value === null || value === undefined) return '-';

    if (operation === 'avg') {
        return typeof value === 'number' ? value.toFixed(2) : String(value);
    }

    if (operation === 'sum' || operation === 'min' || operation === 'max') {
        return typeof value === 'number'
            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : String(value);
    }

    return String(value);
}
