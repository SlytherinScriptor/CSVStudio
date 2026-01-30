import { useState, useMemo } from 'react';
import { Sparkles, Eye, Copy, RotateCcw, Trash2, Type, Filter, Search, Split, Merge } from 'lucide-react';
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
    findAndReplace,
    splitColumn,
    combineColumns,
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
    | { type: 'dedupe'; columns: string[] }
    | { type: 'trimAll' }
    | { type: 'findReplace'; column: string; find: string; replace: string }
    | { type: 'split'; column: string; delimiter: string }
    | { type: 'combine'; columns: string[]; newColumn: string };

interface OperationResult {
    operation: CleaningOperation;
    affected: number;
}

export function CleanPanel() {
    const { showToast } = useToast();
    const [csv, setCsv] = useState<ParsedCSV | null>(null);
    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);

    // Cleaning configuration
    const [missingColumn, setMissingColumn] = useState('');
    const [missingStrategy, setMissingStrategy] = useState<FillStrategy>('remove');
    const [fillValue, setFillValue] = useState('');
    const [textColumn, setTextColumn] = useState('');
    const [textMode, setTextMode] = useState<TextCase>('trim');

    const [dedupeColumns, setDedupeColumns] = useState<Set<string>>(new Set());

    // Advanced cleaning config
    const [findColumn, setFindColumn] = useState('');
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [findRegex, setFindRegex] = useState(false);
    const [splitColumnName, setSplitColumnName] = useState('');
    const [splitDelimiter, setSplitDelimiter] = useState(',');
    const [combineColumnsList, setCombineColumnsList] = useState<Set<string>>(new Set());
    const [combineSeparator, setCombineSeparator] = useState(' ');
    const [newCombinedName, setNewCombinedName] = useState('Combined');

    // Preview state
    const [previewRows, setPreviewRows] = useState<Record<string, any>[] | null>(null);
    const [operations, setOperations] = useState<OperationResult[]>([]);
    const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

    const handleFile = async (file: File) => {
        try {
            const parsed = await parseCSVFile(file);
            setCsv(parsed);
            setSelectedCols(new Set(parsed.headers));
            setPreviewHeaders(parsed.headers);
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
        return getDataQualitySummary(previewRows || csv.rows, previewHeaders.length > 0 ? previewHeaders : csv.headers);
    }, [csv, previewRows, previewHeaders]);

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
        showToast(`Trimmed whitespace in ${result.affected} rows`, 'success');
    };

    // Apply Find & Replace
    const applyFindReplace = () => {
        if (!csv || !findColumn || !findText) return;
        const sourceRows = previewRows || csv.rows;
        const result = findAndReplace(sourceRows, findColumn, findText, replaceText, findRegex, false);

        setPreviewRows(result.rows);
        setOperations(prev => [...prev, {
            operation: { type: 'findReplace', column: findColumn, find: findText, replace: replaceText },
            affected: result.affected
        }]);
        showToast(`Replaced ${result.affected} occurrences`, 'success');
    };

    // Apply Split
    const applySplit = () => {
        if (!csv || !splitColumnName || !splitDelimiter) return;
        const sourceRows = previewRows || csv.rows;
        const currentHeaders = previewHeaders.length > 0 ? previewHeaders : csv.headers;

        const result = splitColumn(sourceRows, currentHeaders, splitColumnName, splitDelimiter);

        setPreviewRows(result.rows);
        setPreviewHeaders(result.headers);

        // Add new columns to selection
        const newSelected = new Set(selectedCols);
        result.headers.forEach(h => {
            if (!currentHeaders.includes(h)) newSelected.add(h);
        });
        setSelectedCols(newSelected);

        setOperations(prev => [...prev, {
            operation: { type: 'split', column: splitColumnName, delimiter: splitDelimiter },
            affected: result.affected
        }]);
        showToast(`Split column into new parts`, 'success');
    };

    // Apply Combine
    const applyCombine = () => {
        if (!csv || combineColumnsList.size < 2 || !newCombinedName) return;
        const sourceRows = previewRows || csv.rows;
        const currentHeaders = previewHeaders.length > 0 ? previewHeaders : csv.headers;
        const colsToCombine = Array.from(combineColumnsList);

        const result = combineColumns(sourceRows, currentHeaders, colsToCombine, combineSeparator, newCombinedName);

        setPreviewRows(result.rows);
        setPreviewHeaders(result.headers);

        // Add new column to selection
        const newSelected = new Set(selectedCols);
        if (!selectedCols.has(newCombinedName)) newSelected.add(newCombinedName);
        setSelectedCols(newSelected);

        setOperations(prev => [...prev, {
            operation: { type: 'combine', columns: colsToCombine, newColumn: newCombinedName },
            affected: result.affected
        }]);
        showToast(`Combined ${colsToCombine.length} columns`, 'success');
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
        if (!csv) return null;

        const rows = previewRows || csv.rows;
        const currentHeaders = previewHeaders.length > 0 ? previewHeaders : csv.headers;
        const headers = currentHeaders.filter(h => selectedCols.has(h));
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
        setPreviewHeaders([]);
        setOperations([]);
        setSelectedCols(new Set());
        setChangedKeys(new Set());
    };

    // Current rows to display
    const displayRows = previewRows || csv?.rows || [];
    const currentHeaders = previewHeaders.length > 0 ? previewHeaders : (csv?.headers || []);
    const displayCols = currentHeaders.filter(h => selectedCols.has(h));

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
                                    <span className="stat-value">{currentHeaders.length}</span>
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
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                        {currentHeaders.map(h => (
                                            <span key={h} style={{ fontSize: '0.85rem' }}>
                                                {h}
                                                {qualitySummary && getTypeBadge(qualitySummary.columnTypes[h])}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Main Cleaning Grid */}
                    <div className="cleaning-operations" style={{ marginBottom: '20px' }}>
                        {/* Find & Replace - Full Width/Prominent */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Card>
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                    <Search size={20} />
                                    Find & Replace
                                    <HelpTooltip content="Search for text and replace it with another value. Supports Regex." />
                                </h4>
                                <div className="operation-form" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1', minWidth: '200px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Target Column</label>
                                            <select
                                                value={findColumn}
                                                onChange={e => setFindColumn(e.target.value)}
                                                style={{ width: '100%', padding: '10px' }}
                                            >
                                                <option value="">Select column...</option>
                                                {currentHeaders.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div style={{ flex: '2', minWidth: '300px', display: 'flex', gap: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Find</label>
                                                <input
                                                    type="text"
                                                    placeholder="Text to find..."
                                                    value={findText}
                                                    onChange={e => setFindText(e.target.value)}
                                                    style={{ width: '100%', padding: '10px' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500 }}>Replace</label>
                                                <input
                                                    type="text"
                                                    placeholder="Replacement text..."
                                                    value={replaceText}
                                                    onChange={e => setReplaceText(e.target.value)}
                                                    style={{ width: '100%', padding: '10px' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '62px', paddingBottom: '3px', gap: '12px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', cursor: 'pointer', height: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={findRegex}
                                                    onChange={e => setFindRegex(e.target.checked)}
                                                    style={{ marginRight: '6px', width: '16px', height: '16px' }}
                                                />
                                                Regex
                                            </label>

                                            <Button
                                                variant="secondary"
                                                onClick={applyFindReplace}
                                                disabled={!findColumn || !findText}
                                                style={{ height: '40px', padding: '0 24px' }}
                                            >
                                                Replace Matches
                                            </Button>

                                            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '12px', marginLeft: '0px', height: '40px', display: 'flex', alignItems: 'center' }}>
                                                <Button variant="secondary" onClick={applyTrimAll} style={{ height: '40px' }}>
                                                    Trim All Whitespace
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
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
                                    <option value="">Select column...</option>
                                    {currentHeaders.map(h => (
                                        <option key={h} value={h}>
                                            {h} ({countMissing(displayRows, h)} missing)
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
                                    <option value="">Select column...</option>
                                    {currentHeaders.map(h => (
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
                                {currentHeaders.map(h => (
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



                        {/* Split Column */}
                        <Card>
                            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Split size={16} />
                                Split Column
                                <HelpTooltip content="Split a single column into multiple columns based on a delimiter." />
                            </h4>
                            <div className="operation-form">
                                <select
                                    value={splitColumnName}
                                    onChange={e => setSplitColumnName(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">Select column to split...</option>
                                    {currentHeaders.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Delimiter (e.g. ,)"
                                    value={splitDelimiter}
                                    onChange={e => setSplitDelimiter(e.target.value)}
                                    style={{ width: '120px' }}
                                />
                                <Button
                                    variant="secondary"
                                    onClick={applySplit}
                                    disabled={!splitColumnName || !splitDelimiter}
                                >
                                    Split
                                </Button>
                            </div>
                        </Card>

                        {/* Combine Columns */}
                        <Card>
                            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Merge size={16} />
                                Combine Columns
                                <HelpTooltip content="Merge multiple columns into that one single column." />
                            </h4>
                            <div style={{ marginBottom: '12px' }}>
                                <div className="dedupe-columns" style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '12px' }}>
                                    {currentHeaders.map(h => (
                                        <label key={h} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={combineColumnsList.has(h)}
                                                onChange={e => {
                                                    const newSet = new Set(combineColumnsList);
                                                    if (e.target.checked) newSet.add(h);
                                                    else newSet.delete(h);
                                                    setCombineColumnsList(newSet);
                                                }}
                                            />
                                            {h}
                                        </label>
                                    ))}
                                </div>
                                <div className="operation-form">
                                    <input
                                        type="text"
                                        placeholder="Separator (e.g. space)"
                                        value={combineSeparator}
                                        onChange={e => setCombineSeparator(e.target.value)}
                                        style={{ width: '150px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="New Column Name"
                                        value={newCombinedName}
                                        onChange={e => setNewCombinedName(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        variant="secondary"
                                        onClick={applyCombine}
                                        disabled={combineColumnsList.size < 2 || !newCombinedName}
                                    >
                                        Combine
                                    </Button>
                                </div>
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
                                        {op.operation.type === 'findReplace' &&
                                            `Replace "${op.operation.find}" with "${op.operation.replace}" in ${op.operation.column} (${op.affected} rows)`}
                                        {op.operation.type === 'split' &&
                                            `Split "${op.operation.column}" by "${op.operation.delimiter}"`}
                                        {op.operation.type === 'combine' &&
                                            `Combined [${op.operation.columns.join(', ')}] into "${op.operation.newColumn}"`}
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
