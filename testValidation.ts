
import { validateDataset, ValidationRule } from './src/lib/validationUtils';

const testRows = [
    { id: '1', startDate: '2023-01-01', endDate: '2023-01-02', price: 100, cost: 50 },
    { id: '2', startDate: '2023-01-05', endDate: '2023-01-01', price: 50, cost: 100 }, // Invalid date & price < cost
    { id: '3', startDate: '2023-02-01', endDate: '2023-02-01', price: 100, cost: 100 }  // Valid
];

const rules: ValidationRule[] = [
    {
        id: 'r1',
        column: 'endDate',
        type: 'crossColumn',
        severity: 'error',
        params: { targetColumn: 'startDate', operator: '>=' }
    },
    {
        id: 'r2',
        column: 'price',
        type: 'crossColumn',
        severity: 'warning',
        params: { targetColumn: 'cost', operator: '>=' }
    }
];

console.log('--- Running Manual Validation Test ---');
const result = validateDataset(testRows, rules, 'id');

console.log(`Total Rows: ${result.totalRows}`);
console.log(`Invalid Rows: ${result.invalidRows}`);
console.log('Errors:', JSON.stringify(result.errors, null, 2));

if (result.invalidRows === 1 && result.errors.length === 2) {
    console.log('✅ TEST PASSED');
} else {
    console.error('❌ TEST FAILED');
}
