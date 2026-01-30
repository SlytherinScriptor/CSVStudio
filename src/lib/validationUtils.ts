export type RuleType =
    | 'required'
    | 'email'
    | 'url'
    | 'number'
    | 'range'
    | 'regex'
    | 'enum'
    | 'enum'
    | 'date'
    | 'crossColumn';

export type CrossColumnOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

export interface ValidationRule {
    id: string;
    column: string;
    type: RuleType;
    params?: {
        min?: number;
        max?: number;
        pattern?: string; // for regex
        options?: string[]; // for enum
        format?: string; // for date (optional future use)
        targetColumn?: string; // for crossColumn
        operator?: CrossColumnOperator; // for crossColumn
    };
    severity: 'error' | 'warning';
}

export interface ValidationError {
    rowId: string; // The ID of the row (or index if no ID column)
    column: string;
    value: any;
    message: string;
    severity: 'error' | 'warning';
    ruleId: string;
}

export interface ValidationResult {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: ValidationError[];
    rowsWithErrors: Set<string>; // Set of rowIds that have errors
}

// Helper patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

export function validateValue(value: any, rule: ValidationRule, row?: any): string | null {
    const val = value === undefined || value === null ? '' : String(value).trim();

    switch (rule.type) {
        case 'required':
            if (!val) return 'Value is required';
            break;

        case 'email':
            if (val && !EMAIL_REGEX.test(val)) return 'Invalid email format';
            break;

        case 'url':
            if (val && !URL_REGEX.test(val)) return 'Invalid URL format';
            break;

        case 'number':
            if (val && isNaN(Number(val))) return 'Value must be a number';
            break;

        case 'range':
            if (val) {
                const num = Number(val);
                if (isNaN(num)) return 'Value must be a number';
                if (rule.params?.min !== undefined && num < rule.params.min) return `Value must be >= ${rule.params.min}`;
                if (rule.params?.max !== undefined && num > rule.params.max) return `Value must be <= ${rule.params.max}`;
            }
            break;

        case 'regex':
            if (val && rule.params?.pattern) {
                try {
                    const regex = new RegExp(rule.params.pattern);
                    if (!regex.test(val)) return 'Value does not match pattern';
                } catch (e) {
                    return 'Invalid regex pattern in rule';
                }
            }
            break;

        case 'enum':
            if (val && rule.params?.options && !rule.params.options.includes(val)) {
                return `Value must be one of: ${rule.params.options.join(', ')}`;
            }
            break;

        case 'date':
            if (val && isNaN(Date.parse(val))) return 'Invalid date format';
            break;


        case 'crossColumn':
            if (row && rule.params?.targetColumn && rule.params?.operator) {
                const targetVal = row[rule.params.targetColumn];
                if (targetVal === undefined) return null; // Skip if target column missing

                const v1 = val;
                const v2 = String(targetVal).trim();

                // Try numeric comparison if both are numbers
                const n1 = Number(v1);
                const n2 = Number(v2);
                const isNum = !isNaN(n1) && !isNaN(n2) && v1 !== '' && v2 !== '';

                const compare = (a: any, b: any, op: CrossColumnOperator) => {
                    switch (op) {
                        case '==': return a == b;
                        case '!=': return a != b;
                        case '>': return a > b;
                        case '<': return a < b;
                        case '>=': return a >= b;
                        case '<=': return a <= b;
                        default: return true;
                    }
                };

                const valid = isNum
                    ? compare(n1, n2, rule.params.operator)
                    : compare(v1, v2, rule.params.operator);

                if (!valid) {
                    return `Value must be ${rule.params.operator} ${rule.params.targetColumn} (${v2})`;
                }
            }
            break;
    }
    return null;
}

export function validateDataset(
    rows: any[],
    rules: ValidationRule[],
    keyColumn?: string
): ValidationResult {
    const errors: ValidationError[] = [];
    const rowsWithErrors = new Set<string>();

    rows.forEach((row, index) => {
        let rowHasError = false;
        // Use provided key column or fallback to row index (1-based for readability)
        const rowId = keyColumn ? String(row[keyColumn] ?? '') : `Row ${index + 1}`;

        for (const rule of rules) {
            const errorMsg = validateValue(row[rule.column], rule, row);
            if (errorMsg) {
                errors.push({
                    rowId,
                    column: rule.column,
                    value: row[rule.column],
                    message: errorMsg,
                    severity: rule.severity,
                    ruleId: rule.id
                });

                if (rule.severity === 'error') {
                    rowHasError = true;
                }
            }
        }

        if (rowHasError) {
            rowsWithErrors.add(rowId);
        }
    });

    return {
        totalRows: rows.length,
        validRows: rows.length - rowsWithErrors.size,
        invalidRows: rowsWithErrors.size,
        errors,
        rowsWithErrors
    };
}
