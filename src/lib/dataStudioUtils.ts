/**
 * Data Studio Utilities
 * Unified utility library combining cleaning and transformation functions
 */

// Import for internal use
import { getDataQualitySummary as internalGetQualitySummary } from './cleaningUtils';

// Re-export all cleaning utilities
export {
    detectColumnType,
    getColumnStats,
    getColumnMode,
    countMissing,
    handleMissingValues,
    standardizeText,
    removeDuplicates,
    trimAllColumns,
    getDataQualitySummary,
    findAndReplace,
    splitColumn,
    combineColumns,
    type FillStrategy,
    type TextCase,
    type ColumnType
} from './cleaningUtils';

// Re-export all transform utilities
export {
    renameColumn,
    reorderColumns,
    moveColumn,
    addFormulaColumn,
    applyValueMapping,
    deleteColumns,
    duplicateColumn,
    createConditionalColumn,
    getUniqueValues,
    type FormulaOperation,
    type ValueMapping,
    type FormulaConfig
} from './transformUtils';

/**
 * Operation types for unified history tracking
 */
export type OperationType =
    | 'missing'
    | 'text'
    | 'dedupe'
    | 'trimAll'
    | 'findReplace'
    | 'split'
    | 'combine'
    | 'rename'
    | 'reorder'
    | 'formula'
    | 'mapping'
    | 'conditional'
    | 'delete'
    | 'duplicate';

export interface OperationRecord {
    id: string;
    type: OperationType;
    category: 'quality' | 'text' | 'columns' | 'formula' | 'mapping';
    description: string;
    affected: number;
    timestamp: Date;
    canUndo?: boolean;
}

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get category for an operation type
 */
export function getOperationCategory(type: OperationType): OperationRecord['category'] {
    const categoryMap: Record<OperationType, OperationRecord['category']> = {
        missing: 'quality',
        dedupe: 'quality',
        text: 'text',
        trimAll: 'text',
        findReplace: 'text',
        split: 'columns',
        combine: 'columns',
        rename: 'columns',
        reorder: 'columns',
        delete: 'columns',
        duplicate: 'columns',
        formula: 'formula',
        mapping: 'mapping',
        conditional: 'mapping'
    };
    return categoryMap[type];
}

/**
 * Format operation description for display
 */
export function formatOperationDescription(
    type: OperationType,
    details: Record<string, any>
): string {
    switch (type) {
        case 'missing':
            return `${details.strategy} missing values in "${details.column}"`;
        case 'text':
            return `Applied ${details.mode} to "${details.column}"`;
        case 'dedupe':
            return `Removed duplicates by [${details.columns?.join(', ')}]`;
        case 'trimAll':
            return 'Trimmed all whitespace';
        case 'findReplace':
            return `Replaced "${details.find}" with "${details.replace}" in "${details.column}"`;
        case 'split':
            return `Split "${details.column}" by "${details.delimiter}"`;
        case 'combine':
            return `Combined [${details.columns?.join(', ')}] into "${details.newColumn}"`;
        case 'rename':
            return `Renamed "${details.oldName}" → "${details.newName}"`;
        case 'reorder':
            return `Moved "${details.column}" ${details.direction}`;
        case 'delete':
            return `Deleted ${details.count} columns`;
        case 'duplicate':
            return `Duplicated "${details.source}" → "${details.target}"`;
        case 'formula':
            return `Added formula column "${details.columnName}" (${details.operation})`;
        case 'mapping':
            return `Mapped ${details.count} values in "${details.column}"`;
        case 'conditional':
            return `Added conditional column "${details.columnName}"`;
        default:
            return 'Unknown operation';
    }
}

/**
 * Get enhanced data quality metrics
 */
export interface DataQualityMetrics {
    totalRows: number;
    totalColumns: number;
    completenessScore: number; // 0-100
    duplicateCount: number;
    missingValueCount: number;
    columnsWithIssues: string[];
    columnTypes: Record<string, string>;
    suggestions: QualitySuggestion[];
}

export interface QualitySuggestion {
    type: 'warning' | 'info' | 'tip';
    message: string;
    action?: string;
    column?: string;
}

/**
 * Calculate comprehensive data quality metrics
 */
export function calculateQualityMetrics(
    rows: Record<string, any>[],
    headers: string[]
): DataQualityMetrics {
    const summary = internalGetQualitySummary(rows, headers);
    const totalCells = rows.length * headers.length;
    const totalMissing = Object.values(summary.missingByColumn as Record<string, number>)
        .reduce((a: number, b: number) => a + b, 0);

    const completenessScore = totalCells > 0
        ? Math.round(((totalCells - totalMissing) / totalCells) * 100)
        : 100;

    const columnsWithIssues = headers.filter(h =>
        (summary.missingByColumn[h] || 0) > rows.length * 0.1
    );

    // Generate smart suggestions
    const suggestions: QualitySuggestion[] = [];

    if (summary.duplicateCount > 0) {
        suggestions.push({
            type: 'warning',
            message: `Found ${summary.duplicateCount} duplicate rows`,
            action: 'Remove duplicates in Quality tab'
        });
    }

    for (const col of headers) {
        const missing = summary.missingByColumn[col] || 0;
        const missingPct = (missing / rows.length) * 100;

        if (missingPct > 20) {
            suggestions.push({
                type: 'warning',
                message: `"${col}" has ${missing} missing values (${missingPct.toFixed(0)}%)`,
                action: 'Fill or remove in Quality tab',
                column: col
            });
        }
    }

    if (completenessScore === 100 && summary.duplicateCount === 0) {
        suggestions.push({
            type: 'tip',
            message: 'Data looks clean! Ready for transformation.'
        });
    }

    return {
        totalRows: summary.totalRows,
        totalColumns: headers.length,
        completenessScore,
        duplicateCount: summary.duplicateCount,
        missingValueCount: totalMissing,
        columnsWithIssues,
        columnTypes: summary.columnTypes,
        suggestions
    };
}
