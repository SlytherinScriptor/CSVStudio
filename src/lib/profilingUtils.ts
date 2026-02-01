/**
 * Data Profiling Utilities
 * Tool 8: Data Profiling & Analytics
 */

export interface ColumnStats {
    column: string;
    type: 'numeric' | 'text' | 'date' | 'boolean' | 'mixed';
    totalCount: number;
    nullCount: number;
    uniqueCount: number;
    fillRate: number; // Percentage of non-null values

    // Numeric stats
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;

    // Text stats
    minLength?: number;
    maxLength?: number;
    avgLength?: number;

    // Top values
    topValues: { value: string; count: number; percentage: number }[];
}

export interface DataProfile {
    rowCount: number;
    columnCount: number;
    columns: ColumnStats[];
    duplicateRows: number;
    completeness: number; // Overall fill rate
}

/**
 * Detect column data type from values
 */
export function detectColumnType(values: any[]): 'numeric' | 'text' | 'date' | 'boolean' | 'mixed' {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return 'text';

    let numericCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    for (const val of nonNullValues) {
        const str = String(val).trim().toLowerCase();

        // Check boolean
        if (str === 'true' || str === 'false' || str === 'yes' || str === 'no' || str === '1' || str === '0') {
            booleanCount++;
        }

        // Check numeric
        if (!isNaN(parseFloat(str)) && isFinite(Number(str))) {
            numericCount++;
        }

        // Check date (simple check for common formats)
        if (/^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{2}\/\d{2}\/\d{4}/.test(str)) {
            dateCount++;
        }
    }

    const threshold = nonNullValues.length * 0.8; // 80% threshold

    if (booleanCount >= threshold) return 'boolean';
    if (numericCount >= threshold) return 'numeric';
    if (dateCount >= threshold) return 'date';
    if (numericCount > 0 && numericCount < threshold) return 'mixed';

    return 'text';
}

/**
 * Calculate statistics for a single column
 */
export function getColumnStats(
    rows: Record<string, any>[],
    column: string
): ColumnStats {
    const values = rows.map(r => r[column]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const type = detectColumnType(values);

    // Count unique values
    const valueCounts = new Map<string, number>();
    for (const val of values) {
        const key = String(val ?? '');
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    }

    const uniqueCount = valueCounts.size;
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const fillRate = ((values.length - nullCount) / values.length) * 100;

    // Top values
    const sortedValues = Array.from(valueCounts.entries())
        .filter(([key]) => key !== '')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const topValues = sortedValues.map(([value, count]) => ({
        value,
        count,
        percentage: (count / values.length) * 100
    }));

    const stats: ColumnStats = {
        column,
        type,
        totalCount: values.length,
        nullCount,
        uniqueCount,
        fillRate,
        topValues
    };

    // Numeric-specific stats
    if (type === 'numeric' || type === 'mixed') {
        const numericValues = nonNullValues
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v))
            .sort((a, b) => a - b);

        if (numericValues.length > 0) {
            stats.min = Math.min(...numericValues);
            stats.max = Math.max(...numericValues);
            stats.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

            // Median
            const mid = Math.floor(numericValues.length / 2);
            stats.median = numericValues.length % 2 !== 0
                ? numericValues[mid]
                : (numericValues[mid - 1] + numericValues[mid]) / 2;

            // Standard deviation
            const squaredDiffs = numericValues.map(v => Math.pow(v - stats.mean!, 2));
            stats.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length);
        }
    }

    // Text-specific stats
    if (type === 'text') {
        const lengths = nonNullValues.map(v => String(v).length);
        if (lengths.length > 0) {
            stats.minLength = Math.min(...lengths);
            stats.maxLength = Math.max(...lengths);
            stats.avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        }
    }

    return stats;
}

/**
 * Get full data profile for a dataset
 */
export function getDataProfile(
    rows: Record<string, any>[],
    headers: string[]
): DataProfile {
    const columns = headers.map(h => getColumnStats(rows, h));

    // Count duplicate rows
    const rowSignatures = new Set<string>();
    let duplicateRows = 0;
    for (const row of rows) {
        const signature = headers.map(h => String(row[h] ?? '')).join('|||');
        if (rowSignatures.has(signature)) {
            duplicateRows++;
        } else {
            rowSignatures.add(signature);
        }
    }

    // Overall completeness
    const totalCells = rows.length * headers.length;
    const nullCells = columns.reduce((sum, col) => sum + col.nullCount, 0);
    const completeness = ((totalCells - nullCells) / totalCells) * 100;

    return {
        rowCount: rows.length,
        columnCount: headers.length,
        columns,
        duplicateRows,
        completeness
    };
}

/**
 * Calculate Pearson correlation coefficient between two numeric columns
 */
export function getCorrelation(
    rows: Record<string, any>[],
    col1: string,
    col2: string
): number | null {
    const pairs: [number, number][] = [];

    for (const row of rows) {
        const v1 = parseFloat(row[col1]);
        const v2 = parseFloat(row[col2]);

        if (!isNaN(v1) && !isNaN(v2)) {
            pairs.push([v1, v2]);
        }
    }

    if (pairs.length < 2) return null;

    const n = pairs.length;
    const sum1 = pairs.reduce((s, p) => s + p[0], 0);
    const sum2 = pairs.reduce((s, p) => s + p[1], 0);
    const sum1Sq = pairs.reduce((s, p) => s + p[0] * p[0], 0);
    const sum2Sq = pairs.reduce((s, p) => s + p[1] * p[1], 0);
    const pSum = pairs.reduce((s, p) => s + p[0] * p[1], 0);

    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

    if (den === 0) return null;

    return num / den;
}

/**
 * Get correlation matrix for numeric columns
 */
export function getCorrelationMatrix(
    rows: Record<string, any>[],
    numericColumns: string[]
): { columns: string[]; matrix: (number | null)[][] } {
    const matrix: (number | null)[][] = [];

    for (const col1 of numericColumns) {
        const row: (number | null)[] = [];
        for (const col2 of numericColumns) {
            if (col1 === col2) {
                row.push(1);
            } else {
                row.push(getCorrelation(rows, col1, col2));
            }
        }
        matrix.push(row);
    }

    return { columns: numericColumns, matrix };
}

/**
 * Calculate data quality score (0-100)
 */
export function getDataQualityScore(profile: DataProfile): number {
    let score = 100;

    // Penalize for missing values
    const missingPenalty = (100 - profile.completeness) * 0.5;
    score -= missingPenalty;

    // Penalize for duplicates
    const duplicateRate = (profile.duplicateRows / profile.rowCount) * 100;
    score -= duplicateRate * 0.3;

    // Penalize for low unique value ratio in non-ID columns
    const avgUniqueRatio = profile.columns.reduce((sum, col) => {
        return sum + (col.uniqueCount / col.totalCount);
    }, 0) / profile.columns.length;

    if (avgUniqueRatio < 0.01) {
        score -= 10; // Very low variety
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}
