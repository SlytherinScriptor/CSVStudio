import { useState, useMemo } from 'react';
import { Sparkles, Eye, Copy, RotateCcw, Trash2, Type, Filter } from 'lucide-react';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Button } from './ui/Button';
import { ColumnPicker } from './ui/ColumnPicker';
import { Table } from './ui/Table';
import { HelpTooltip } from './ui/HelpTooltip';
import { useToast } from './ui/Toast';
import { parseCSVFile, formatPreservingExport } from '../lib/csv';
import {
    handleMissingValues,
    standardizeText,
    removeDuplicates,
    trimAllColumns,
    getDataQualitySummary,
    countMissing,
    type FillStrategy,
    type TextCase,
    type ColumnType
} from '../lib/cleaningUtils';
import type { ParsedCSV } from '../lib/csv';

type CleaningOperation =
    | { type: 'missing'; column: string; strategy: FillStrategy; fillValue?: string }
    | { type: 'text'; column: string; mode: TextCase }
    | { type: 'dedupe'; columns: string[] }
    | { type: 'trimAll' };

interface OperationResult {
    operation: CleaningOperation;
    affected: number;
}

export function CleanPanel() {
    const { showToast } = useToast();
    const [csv, setCsv] = useState<ParsedCSV | null>(null);
    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());

    // Cleaning configuration
    const [missingColumn, setMissingColumn] = useState('');
    const [missingStrategy, setMissingStrategy] = useState<FillStrategy>('remove');
    const [fillValue, setFillValue] = useState('');
    const [textColumn, setTextColumn] = useState('');
    const [textMode, setTextMode] = useState<TextCase>('trim');
    const [dedupeColumns, setDedupeColumns] = useState<Set<string>>(new Set());

    // Preview state
    const [previewRows, setPreviewRows] = useState<Record<string, any>[] | null>(null);
    const [operations, setOperations] = useState<OperationResult[]>([]);
    const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

    const handleFile = async (file: File) => {
        try {
            const parsed = await parseCSVFile(file);
            setCsv(parsed);
            setSelectedCols(new Set(parsed.headers));
            setPreviewRows(null);
            setOperations([]);
            setChangedKeys(new Set());

            // Reset form
            setMissingColumn('');
            setTextColumn('');
            setDedupeColumns(new Set());
        } catch (err) {
            showToast('Failed to parse CSV file', 'error');
        }
    };

    // Data quality summary
    const qualitySummary = useMemo(() => {
        if (!csv) return null;
        return getDataQualitySummary(csv.rows, csv.headers);
    }, [csv]);

    // Column type badges
    const getTypeBadge = (type: ColumnType) => {
        const colors: Record<ColumnType, string> = {
            text: '#6b7280',
            number: '#3b82f6',
            email: '#10b981',
            date: '#f59e0b',
            phone: '#8b5cf6',
            unknown: '#9ca3af'
        };
        return (
            <span
                style={{
                    backgroundColor: colors[type],
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    marginLeft: '6px'
                }}
            >
                {type}
            </span>
        );
    };

    // Apply missing value operation
    const applyMissingOperation = () => {
        if (!csv || !missingColumn) return;

        const sourceRows = previewRows || csv.rows;
        const result = handleMissingValues(sourceRows, missingColumn, missingStrategy, fillValue);

        setPreviewRows(result.rows);
        setOperations(prev => [...prev, {
            operation: { type: 'missing', column: missingColumn, strategy: missingStrategy, fillValue },
            affected: result.affected
        }]);

        // Mark all rows as changed for this operation
        if (result.affected > 0) {
            const newChangedKeys = new Set(changedKeys);
            sourceRows.forEach(row => {
                const key = csv.headers[0] ? String(row[csv.headers[0]] ?? '').trim() : '';
                if (key) newChangedKeys.add(key);
            });
            setChangedKeys(newChangedKeys);
        }

        showToast(`Processed ${result.affected} rows`, 'success');
    };

    // Apply text standardization
    const applyTextOperation = () => {
        if (!csv || !textColumn) return;

        const sourceRows = previewRows || csv.rows;
        const result = standardizeText(sourceRows, textColumn, textMode);

        setPreviewRows(result.rows);
        setOperations(prev => [...prev, {
            operation: { type: 'text', column: textColumn, mode: textMode },
            affected: result.affected
        }]);

        if (result.affected > 0) {
            const newChangedKeys = new Set(changedKeys);
            sourceRows.forEach(row => {
                const key = csv.headers[0] ? String(row[csv.headers[0]] ?? '').trim() : '';
                if (key) newChangedKeys.add(key);
            });
            setChangedKeys(newChangedKeys);
        }

        showToast(`Standardized ${result.affected} values`, 'success');
    };

    // Apply deduplication
    const applyDedupeOperation = () => {
        if (!csv || dedupeColumns.size === 0) return;

        const sourceRows = previewRows || csv.rows;
        const cols = Array.from(dedupeColumns);
        const result = removeDuplicates(sourceRows, cols);

        setPreviewRows(result.rows);
        setOperations(prev => [...prev, {
            operation: { type: 'dedupe', columns: cols },
            affected: result.affected
        }]);

        showToast(`Removed ${result.affected} duplicate rows`, 'success');
    };

    // Apply trim all
    const applyTrimAll = () => {
        if (!csv) return;

        const sourceRows = previewRows || csv.rows;
        const result = trimAllColumns(sourceRows, csv.headers);

        setPreviewRows(result.rows);
        setOperations(prev => [...prev, {
            operation: { type: 'trimAll' },
            affected: result.affected
        }]);

        if (result.affected > 0) {
            const newChangedKeys = new Set(changedKeys);
            sourceRows.forEach(row => {
                const key = csv.headers[0] ? String(row[csv.headers[0]] ?? '').trim() : '';
                if (key) newChangedKeys.add(key);
            });
            setChangedKeys(newChangedKeys);
        }

        showToast(`Trimmed whitespace in ${result.affected} rows`, 'success');
    };

    // Reset to original
    const handleReset = () => {
        setPreviewRows(null);
        setOperations([]);
        setChangedKeys(new Set());
        showToast('Reset to original data', 'info');
    };

    // Export
    const handleExport = () => {
        if (!csv) return;

        const rows = previewRows || csv.rows;
        const headers = csv.headers.filter(h => selectedCols.has(h));
        const keyColumn = headers[0] || '';

        const csvString = formatPreservingExport(headers, rows, csv, keyColumn, changedKeys);

        navigator.clipboard.writeText(csvString).then(() => {
            showToast(`Copied ${rows.length} rows to clipboard`, 'success');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    };

    // Start fresh
    const handleClear = () => {
        setCsv(null);
        setPreviewRows(null);
        setOperations([]);
        setSelectedCols(new Set());
        setChangedKeys(new Set());
    };

    // Current rows to display
    const displayRows = previewRows || csv?.rows || [];
    const displayCols = csv?.headers.filter(h => selectedCols.has(h)) || [];

    return (
        <div className="clean-panel">
            {!csv ? (
                <DropZone
                    label="Upload CSV to Clean"
                    onFile={handleFile}
                />
            ) : (
                <div className="clean-content">
                    {/* Data Quality Summary */}
                    <Card>
                        <div className="quality-summary">
                            <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={18} />
                                Data Quality Summary
                            </h3>
                            <div className="quality-stats">
                                <div className="stat">
                                    <span className="stat-value">{csv.rows.length}</span>
                                    <span className="stat-label">Total Rows</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{csv.headers.length}</span>
                                    <span className="stat-label">Columns</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{qualitySummary?.duplicateCount || 0}</span>
                                    <span className="stat-label">Duplicates</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">
                                        {Object.values(qualitySummary?.missingByColumn || {}).reduce((a, b) => a + b, 0)}
                                    </span>
                                    <span className="stat-label">Missing Values</span>
                                </div>
                            </div>

                            {/* Column Types */}
                            <div style={{ marginTop: '16px' }}>
                                <strong>Column Types:</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                    {csv.headers.map(h => (
                                        <span key={h} style={{ fontSize: '0.85rem' }}>
                                            {h}
                                            {qualitySummary && getTypeBadge(qualitySummary.columnTypes[h])}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Cleaning Operations */}
                    <div className="cleaning-operations">
                        {/* Missing Values */}
                        <Card>
                            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} />
                                Handle Missing Values
                                <HelpTooltip content="Remove rows with empty values or fill them with a value, average, or most common value" />
                            </h4>

                            <div className="operation-form">
                                <select
                                    value={missingColumn}
                                    onChange={e => setMissingColumn(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">Select column...</option>
                                    {csv.headers.map(h => (
                                        <option key={h} value={h}>
                                            {h} ({countMissing(csv.rows, h)} missing)
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={missingStrategy}
                                    onChange={e => setMissingStrategy(e.target.value as FillStrategy)}
                                >
                                    <option value="remove">Remove rows</option>
                                    <option value="value">Fill with value</option>
                                    <option value="average">Fill with average</option>
                                    <option value="mode">Fill with most common</option>
                                </select>

                                {missingStrategy === 'value' && (
                                    <input
                                        type="text"
                                        placeholder="Fill value..."
                                        value={fillValue}
                                        onChange={e => setFillValue(e.target.value)}
                                    />
                                )}

                                <Button
                                    variant="secondary"
                                    onClick={applyMissingOperation}
                                    disabled={!missingColumn}
                                >
                                    Apply
                                </Button>
                            </div>
                        </Card>

                        {/* Text Standardization */}
                        <Card>
                            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Type size={16} />
                                Text Standardization
                                <HelpTooltip content="Convert text to lowercase, uppercase, title case, or trim whitespace" />
                            </h4>

                            <div className="operation-form">
                                <select
                                    value={textColumn}
                                    onChange={e => setTextColumn(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">Select column...</option>
                                    {csv.headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>

                                <select
                                    value={textMode}
                                    onChange={e => setTextMode(e.target.value as TextCase)}
                                >
                                    <option value="trim">Trim whitespace</option>
                                    <option value="lowercase">lowercase</option>
                                    <option value="uppercase">UPPERCASE</option>
                                    <option value="titlecase">Title Case</option>
                                </select>

                                <Button
                                    variant="secondary"
                                    onClick={applyTextOperation}
                                    disabled={!textColumn}
                                >
                                    Apply
                                </Button>
                            </div>
                        </Card>

                        {/* Deduplication */}
                        <Card>
                            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Trash2 size={16} />
                                Remove Duplicates
                                <HelpTooltip content="Remove duplicate rows based on selected columns. First occurrence is kept." />
                            </h4>

                            <div className="dedupe-columns">
                                {csv.headers.map(h => (
                                    <label key={h} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={dedupeColumns.has(h)}
                                            onChange={e => {
                                                const newSet = new Set(dedupeColumns);
                                                if (e.target.checked) newSet.add(h);
                                                else newSet.delete(h);
                                                setDedupeColumns(newSet);
                                            }}
                                        />
                                        {h}
                                    </label>
                                ))}
                            </div>

                            <Button
                                variant="secondary"
                                onClick={applyDedupeOperation}
                                disabled={dedupeColumns.size === 0}
                                style={{ marginTop: '12px' }}
                            >
                                Remove Duplicates
                            </Button>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <h4 style={{ margin: '0 0 12px' }}>Quick Actions</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Button variant="secondary" onClick={applyTrimAll}>
                                    Trim All Whitespace
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Operations Applied */}
                    {operations.length > 0 && (
                        <Card>
                            <h4 style={{ margin: '0 0 12px' }}>Operations Applied ({operations.length})</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {operations.map((op, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        {op.operation.type === 'missing' &&
                                            `Missing values in "${op.operation.column}": ${op.operation.strategy} (${op.affected} rows)`}
                                        {op.operation.type === 'text' &&
                                            `Text "${op.operation.column}": ${op.operation.mode} (${op.affected} values)`}
                                        {op.operation.type === 'dedupe' &&
                                            `Dedupe by [${op.operation.columns.join(', ')}] (${op.affected} removed)`}
                                        {op.operation.type === 'trimAll' &&
                                            `Trim all whitespace (${op.affected} rows)`}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Column Picker */}
                    <ColumnPicker
                        allHeaders={csv.headers}
                        selected={selectedCols}
                        onChange={setSelectedCols}
                    />

                    {/* Preview Table */}
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0 }}>
                                <Eye size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Preview ({displayRows.length} rows)
                            </h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" onClick={handleReset} disabled={!previewRows}>
                                    <RotateCcw size={14} />
                                    Reset
                                </Button>
                                <Button variant="ok" onClick={handleExport}>
                                    <Copy size={14} />
                                    Copy to Clipboard
                                </Button>
                            </div>
                        </div>

                        <Table
                            headers={displayCols}
                            rows={displayRows.slice(0, 50)}
                            title="Data Preview"
                        />

                        {displayRows.length > 50 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '12px' }}>
                                Showing first 50 rows of {displayRows.length}
                            </p>
                        )}
                    </Card>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={handleClear}>
                            Start Over
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
