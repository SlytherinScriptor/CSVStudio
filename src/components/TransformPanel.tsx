import { useState, useMemo } from 'react';
import { Columns, Eye, Copy, RotateCcw, ArrowUp, ArrowDown, Plus, Trash2, Edit3, Replace, Zap } from 'lucide-react';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Button } from './ui/Button';
import { ColumnPicker } from './ui/ColumnPicker';
import { Table } from './ui/Table';
import { HelpTooltip } from './ui/HelpTooltip';
import { useToast } from './ui/Toast';
import { parseCSVFile, formatPreservingExport } from '../lib/csv';
import {
    renameColumn,
    moveColumn,
    addFormulaColumn,
    applyValueMapping,
    deleteColumns,
    duplicateColumn,
    createConditionalColumn,
    getUniqueValues,
    type FormulaOperation,
    type ValueMapping
} from '../lib/transformUtils';
import type { ParsedCSV } from '../lib/csv';

type TransformTab = 'rename' | 'reorder' | 'formula' | 'mapping' | 'conditional';

interface TransformOperation {
    type: string;
    description: string;
    affected: number;
}

export function TransformPanel() {
    const { showToast } = useToast();
    const [csv, setCsv] = useState<ParsedCSV | null>(null);
    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<Record<string, any>[] | null>(null);
    const [operations, setOperations] = useState<TransformOperation[]>([]);
    const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

    // Tab state
    const [activeTab, setActiveTab] = useState<TransformTab>('rename');

    // Rename state
    const [renameSource, setRenameSource] = useState('');
    const [renameTarget, setRenameTarget] = useState('');

    // Reorder state
    const [reorderColumn, setReorderColumn] = useState('');

    // Formula state
    const [formulaName, setFormulaName] = useState('');
    const [formulaOperation, setFormulaOperation] = useState<FormulaOperation>('concat');
    const [formulaColumns, setFormulaColumns] = useState<Set<string>>(new Set());
    const [formulaSeparator, setFormulaSeparator] = useState(' ');
    const [formulaPrefix, setFormulaPrefix] = useState('');
    const [formulaSuffix, setFormulaSuffix] = useState('');

    // Mapping state
    const [mappingColumn, setMappingColumn] = useState('');
    const [mappings, setMappings] = useState<ValueMapping[]>([{ from: '', to: '' }]);
    const [mappingCaseSensitive, setMappingCaseSensitive] = useState(false);

    // Conditional state
    const [condColName, setCondColName] = useState('');
    const [condSourceCol, setCondSourceCol] = useState('');
    const [condType, setCondType] = useState<'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan'>('equals');
    const [condValue, setCondValue] = useState('');
    const [condThen, setCondThen] = useState('');
    const [condElse, setCondElse] = useState('');

    const handleFile = async (file: File) => {
        try {
            const parsed = await parseCSVFile(file);
            setCsv(parsed);
            setSelectedCols(new Set(parsed.headers));
            setPreviewHeaders(parsed.headers);
            setPreviewRows(null);
            setOperations([]);
            setChangedKeys(new Set());
            resetForms();
        } catch (err) {
            showToast('Failed to parse CSV file', 'error');
        }
    };

    const resetForms = () => {
        setRenameSource('');
        setRenameTarget('');
        setReorderColumn('');
        setFormulaName('');
        setFormulaColumns(new Set());
        setMappingColumn('');
        setMappings([{ from: '', to: '' }]);
        setCondColName('');
        setCondSourceCol('');
        setCondValue('');
        setCondThen('');
        setCondElse('');
    };

    const currentHeaders = previewHeaders.length > 0 ? previewHeaders : (csv?.headers || []);
    const currentRows = previewRows || csv?.rows || [];

    // Unique values for mapping suggestions
    const uniqueValues = useMemo(() => {
        if (!mappingColumn || !csv) return [];
        return getUniqueValues(currentRows, mappingColumn, 50);
    }, [mappingColumn, currentRows, csv]);

    // Apply rename
    const applyRename = () => {
        if (!csv || !renameSource || !renameTarget) return;

        const result = renameColumn(currentRows, currentHeaders, renameSource, renameTarget);
        if (result.success) {
            setPreviewRows(result.rows);
            setPreviewHeaders(result.headers);

            // Update selected columns
            const newSelected = new Set(selectedCols);
            newSelected.delete(renameSource);
            newSelected.add(renameTarget);
            setSelectedCols(newSelected);

            setOperations(prev => [...prev, {
                type: 'Rename',
                description: `"${renameSource}" → "${renameTarget}"`,
                affected: result.rows.length
            }]);
            showToast(`Renamed column to "${renameTarget}"`, 'success');
            setRenameSource('');
            setRenameTarget('');
        } else {
            showToast('Failed to rename column. Name may already exist.', 'error');
        }
    };

    // Apply move
    const applyMove = (direction: 'up' | 'down') => {
        if (!reorderColumn) return;

        const newHeaders = moveColumn(currentHeaders, reorderColumn, direction);
        setPreviewHeaders(newHeaders);
        setOperations(prev => [...prev, {
            type: 'Reorder',
            description: `Moved "${reorderColumn}" ${direction}`,
            affected: 1
        }]);
        showToast(`Moved column ${direction}`, 'success');
    };

    // Apply formula
    const applyFormula = () => {
        if (!csv || !formulaName || formulaColumns.size === 0) return;

        const result = addFormulaColumn(currentRows, currentHeaders, formulaName, {
            operation: formulaOperation,
            columns: Array.from(formulaColumns),
            separator: formulaSeparator,
            prefix: formulaPrefix,
            suffix: formulaSuffix
        });

        if (result.affected > 0) {
            setPreviewRows(result.rows);
            setPreviewHeaders(result.headers);

            const newSelected = new Set(selectedCols);
            newSelected.add(formulaName);
            setSelectedCols(newSelected);

            setOperations(prev => [...prev, {
                type: 'Formula',
                description: `Added "${formulaName}" (${formulaOperation})`,
                affected: result.affected
            }]);
            showToast(`Added formula column "${formulaName}"`, 'success');
            setFormulaName('');
            setFormulaColumns(new Set());
        }
    };

    // Apply mapping
    const applyMapping = () => {
        if (!csv || !mappingColumn) return;

        const validMappings = mappings.filter(m => m.from.trim() !== '');
        if (validMappings.length === 0) {
            showToast('Add at least one mapping', 'warning');
            return;
        }

        const result = applyValueMapping(currentRows, mappingColumn, validMappings, mappingCaseSensitive);

        setPreviewRows(result.rows);
        setOperations(prev => [...prev, {
            type: 'Mapping',
            description: `Mapped ${validMappings.length} values in "${mappingColumn}"`,
            affected: result.affected
        }]);
        showToast(`Applied ${result.affected} value mappings`, 'success');
    };

    // Apply conditional
    const applyConditional = () => {
        if (!csv || !condColName || !condSourceCol) return;

        const result = createConditionalColumn(
            currentRows,
            currentHeaders,
            condColName,
            condSourceCol,
            condType,
            condValue,
            condThen,
            condElse
        );

        if (result.headers.length > currentHeaders.length) {
            setPreviewRows(result.rows);
            setPreviewHeaders(result.headers);

            const newSelected = new Set(selectedCols);
            newSelected.add(condColName);
            setSelectedCols(newSelected);

            setOperations(prev => [...prev, {
                type: 'Conditional',
                description: `Added "${condColName}" (IF ${condSourceCol} ${condType})`,
                affected: result.affected
            }]);
            showToast(`Added conditional column "${condColName}"`, 'success');
            setCondColName('');
        }
    };

    // Delete selected columns
    const handleDeleteColumns = () => {
        if (!csv || selectedCols.size === currentHeaders.length) {
            showToast('Cannot delete all columns', 'warning');
            return;
        }

        const colsToDelete = currentHeaders.filter(h => !selectedCols.has(h));
        if (colsToDelete.length === 0) return;

        const result = deleteColumns(currentRows, currentHeaders, colsToDelete);
        setPreviewRows(result.rows);
        setPreviewHeaders(result.headers);
        setOperations(prev => [...prev, {
            type: 'Delete',
            description: `Removed ${colsToDelete.length} columns`,
            affected: colsToDelete.length
        }]);
        showToast(`Deleted ${colsToDelete.length} columns`, 'success');
    };

    // Duplicate column
    const handleDuplicate = () => {
        if (!csv || !reorderColumn) return;

        const newName = `${reorderColumn}_copy`;
        const result = duplicateColumn(currentRows, currentHeaders, reorderColumn, newName);

        if (result.success) {
            setPreviewRows(result.rows);
            setPreviewHeaders(result.headers);

            const newSelected = new Set(selectedCols);
            newSelected.add(newName);
            setSelectedCols(newSelected);

            setOperations(prev => [...prev, {
                type: 'Duplicate',
                description: `Copied "${reorderColumn}" → "${newName}"`,
                affected: result.rows.length
            }]);
            showToast(`Duplicated column as "${newName}"`, 'success');
        }
    };

    // Reset to original
    const handleReset = () => {
        if (!csv) return;
        setPreviewRows(null);
        setPreviewHeaders(csv.headers);
        setSelectedCols(new Set(csv.headers));
        setOperations([]);
        setChangedKeys(new Set());
        resetForms();
        showToast('Reset to original data', 'info');
    };

    // Export
    const handleExport = () => {
        if (!csv) return;

        const rows = currentRows;
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
        resetForms();
    };

    // Add mapping row
    const addMappingRow = () => {
        setMappings(prev => [...prev, { from: '', to: '' }]);
    };

    // Update mapping row
    const updateMapping = (index: number, field: 'from' | 'to', value: string) => {
        setMappings(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Remove mapping row
    const removeMapping = (index: number) => {
        setMappings(prev => prev.filter((_, i) => i !== index));
    };

    const displayCols = currentHeaders.filter(h => selectedCols.has(h));

    const tabs: { id: TransformTab; label: string; icon: React.ReactNode }[] = [
        { id: 'rename', label: 'Rename', icon: <Edit3 size={16} /> },
        { id: 'reorder', label: 'Reorder', icon: <ArrowUp size={16} /> },
        { id: 'formula', label: 'Formula', icon: <Zap size={16} /> },
        { id: 'mapping', label: 'Mapping', icon: <Replace size={16} /> },
        { id: 'conditional', label: 'Conditional', icon: <Plus size={16} /> },
    ];

    return (
        <div className="transform-panel">
            {!csv ? (
                <DropZone
                    label="Upload CSV to Transform"
                    onFile={handleFile}
                />
            ) : (
                <div className="transform-content">
                    {/* Stats Overview */}
                    <Card>
                        <div className="quality-summary">
                            <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Columns size={18} />
                                Column Overview
                            </h3>
                            <div className="quality-stats">
                                <div className="stat">
                                    <span className="stat-value">{currentHeaders.length}</span>
                                    <span className="stat-label">Columns</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{currentRows.length}</span>
                                    <span className="stat-label">Rows</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{operations.length}</span>
                                    <span className="stat-label">Operations</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{selectedCols.size}</span>
                                    <span className="stat-label">Selected</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Transformation Tabs */}
                    <Card>
                        <div className="transform-tabs">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`transform-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Rename Tab */}
                        {activeTab === 'rename' && (
                            <div className="transform-section">
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Edit3 size={16} />
                                    Rename Column
                                    <HelpTooltip content="Change a column header name" />
                                </h4>
                                <div className="operation-form">
                                    <select
                                        value={renameSource}
                                        onChange={e => setRenameSource(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Select column...</option>
                                        {currentHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                                    <input
                                        type="text"
                                        placeholder="New name..."
                                        value={renameTarget}
                                        onChange={e => setRenameTarget(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        variant="secondary"
                                        onClick={applyRename}
                                        disabled={!renameSource || !renameTarget}
                                    >
                                        Rename
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Reorder Tab */}
                        {activeTab === 'reorder' && (
                            <div className="transform-section">
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ArrowUp size={16} />
                                    Reorder & Manage Columns
                                    <HelpTooltip content="Move columns up/down, duplicate, or delete" />
                                </h4>
                                <div className="operation-form">
                                    <select
                                        value={reorderColumn}
                                        onChange={e => setReorderColumn(e.target.value)}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Select column...</option>
                                        {currentHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                    <Button
                                        variant="secondary"
                                        onClick={() => applyMove('up')}
                                        disabled={!reorderColumn}
                                    >
                                        <ArrowUp size={14} /> Up
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => applyMove('down')}
                                        disabled={!reorderColumn}
                                    >
                                        <ArrowDown size={14} /> Down
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={handleDuplicate}
                                        disabled={!reorderColumn}
                                    >
                                        <Copy size={14} /> Duplicate
                                    </Button>
                                </div>
                                <div style={{ marginTop: '16px' }}>
                                    <Button
                                        variant="danger"
                                        onClick={handleDeleteColumns}
                                        disabled={selectedCols.size === currentHeaders.length}
                                    >
                                        <Trash2 size={14} /> Delete Unselected Columns ({currentHeaders.length - selectedCols.size})
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Formula Tab */}
                        {activeTab === 'formula' && (
                            <div className="transform-section">
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Zap size={16} />
                                    Add Formula Column
                                    <HelpTooltip content="Create a new column using calculations or text operations" />
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="operation-form">
                                        <input
                                            type="text"
                                            placeholder="New column name..."
                                            value={formulaName}
                                            onChange={e => setFormulaName(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <select
                                            value={formulaOperation}
                                            onChange={e => setFormulaOperation(e.target.value as FormulaOperation)}
                                        >
                                            <option value="concat">Concatenate</option>
                                            <option value="add">Add (+)</option>
                                            <option value="subtract">Subtract (−)</option>
                                            <option value="multiply">Multiply (×)</option>
                                            <option value="divide">Divide (÷)</option>
                                            <option value="uppercase">UPPERCASE</option>
                                            <option value="lowercase">lowercase</option>
                                            <option value="trim">Trim</option>
                                            <option value="prefix">Add Prefix</option>
                                            <option value="suffix">Add Suffix</option>
                                        </select>
                                    </div>

                                    {(formulaOperation === 'concat') && (
                                        <input
                                            type="text"
                                            placeholder="Separator (e.g., space, comma)"
                                            value={formulaSeparator}
                                            onChange={e => setFormulaSeparator(e.target.value)}
                                        />
                                    )}

                                    {formulaOperation === 'prefix' && (
                                        <input
                                            type="text"
                                            placeholder="Prefix text..."
                                            value={formulaPrefix}
                                            onChange={e => setFormulaPrefix(e.target.value)}
                                        />
                                    )}

                                    {formulaOperation === 'suffix' && (
                                        <input
                                            type="text"
                                            placeholder="Suffix text..."
                                            value={formulaSuffix}
                                            onChange={e => setFormulaSuffix(e.target.value)}
                                        />
                                    )}

                                    <div className="dedupe-columns">
                                        {currentHeaders.map(h => (
                                            <label key={h} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formulaColumns.has(h)}
                                                    onChange={e => {
                                                        const newSet = new Set(formulaColumns);
                                                        if (e.target.checked) newSet.add(h);
                                                        else newSet.delete(h);
                                                        setFormulaColumns(newSet);
                                                    }}
                                                />
                                                {h}
                                            </label>
                                        ))}
                                    </div>

                                    <Button
                                        variant="secondary"
                                        onClick={applyFormula}
                                        disabled={!formulaName || formulaColumns.size === 0}
                                    >
                                        <Plus size={14} /> Add Column
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Mapping Tab */}
                        {activeTab === 'mapping' && (
                            <div className="transform-section">
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Replace size={16} />
                                    Value Mapping
                                    <HelpTooltip content="Replace values in a column using a lookup table" />
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="operation-form">
                                        <select
                                            value={mappingColumn}
                                            onChange={e => setMappingColumn(e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">Select column...</option>
                                            {currentHeaders.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={mappingCaseSensitive}
                                                onChange={e => setMappingCaseSensitive(e.target.checked)}
                                            />
                                            Case sensitive
                                        </label>
                                    </div>

                                    {uniqueValues.length > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Unique values: {uniqueValues.slice(0, 5).join(', ')}
                                            {uniqueValues.length > 5 && ` +${uniqueValues.length - 5} more`}
                                        </div>
                                    )}

                                    <div className="mapping-table">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>From</span>
                                            <span></span>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>To</span>
                                            <span></span>

                                            {mappings.map((m, i) => (
                                                <>
                                                    <input
                                                        key={`from-${i}`}
                                                        type="text"
                                                        placeholder="Original value..."
                                                        value={m.from}
                                                        onChange={e => updateMapping(i, 'from', e.target.value)}
                                                        list={`unique-${i}`}
                                                    />
                                                    <datalist id={`unique-${i}`}>
                                                        {uniqueValues.map(v => (
                                                            <option key={v} value={v} />
                                                        ))}
                                                    </datalist>
                                                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                    <input
                                                        key={`to-${i}`}
                                                        type="text"
                                                        placeholder="New value..."
                                                        value={m.to}
                                                        onChange={e => updateMapping(i, 'to', e.target.value)}
                                                    />
                                                    <button
                                                        key={`del-${i}`}
                                                        onClick={() => removeMapping(i)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                                        disabled={mappings.length === 1}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button variant="ghost" onClick={addMappingRow}>
                                            <Plus size={14} /> Add Row
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={applyMapping}
                                            disabled={!mappingColumn}
                                        >
                                            Apply Mapping
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conditional Tab */}
                        {activeTab === 'conditional' && (
                            <div className="transform-section">
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={16} />
                                    Conditional Column (IF/THEN/ELSE)
                                    <HelpTooltip content="Create a column based on conditions" />
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="New column name..."
                                        value={condColName}
                                        onChange={e => setCondColName(e.target.value)}
                                    />
                                    <div className="operation-form">
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>IF</span>
                                        <select
                                            value={condSourceCol}
                                            onChange={e => setCondSourceCol(e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="">Select column...</option>
                                            {currentHeaders.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={condType}
                                            onChange={e => setCondType(e.target.value as any)}
                                        >
                                            <option value="equals">equals</option>
                                            <option value="contains">contains</option>
                                            <option value="startsWith">starts with</option>
                                            <option value="endsWith">ends with</option>
                                            <option value="isEmpty">is empty</option>
                                            <option value="isNotEmpty">is not empty</option>
                                            <option value="greaterThan">&gt; (greater than)</option>
                                            <option value="lessThan">&lt; (less than)</option>
                                        </select>
                                        {!['isEmpty', 'isNotEmpty'].includes(condType) && (
                                            <input
                                                type="text"
                                                placeholder="Value..."
                                                value={condValue}
                                                onChange={e => setCondValue(e.target.value)}
                                                style={{ width: '120px' }}
                                            />
                                        )}
                                    </div>
                                    <div className="operation-form">
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>THEN</span>
                                        <input
                                            type="text"
                                            placeholder="Value if true..."
                                            value={condThen}
                                            onChange={e => setCondThen(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>ELSE</span>
                                        <input
                                            type="text"
                                            placeholder="Value if false..."
                                            value={condElse}
                                            onChange={e => setCondElse(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={applyConditional}
                                        disabled={!condColName || !condSourceCol}
                                    >
                                        <Plus size={14} /> Add Conditional Column
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Operations Applied */}
                    {operations.length > 0 && (
                        <Card>
                            <h4 style={{ margin: '0 0 12px' }}>Operations Applied ({operations.length})</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {operations.map((op, i) => (
                                    <li key={i} style={{ marginBottom: '4px' }}>
                                        <strong>{op.type}:</strong> {op.description}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Column Picker */}
                    <ColumnPicker
                        allHeaders={currentHeaders}
                        selected={selectedCols}
                        onChange={setSelectedCols}
                    />

                    {/* Preview Table */}
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0 }}>
                                <Eye size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Preview ({currentRows.length} rows)
                            </h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" onClick={handleReset} disabled={operations.length === 0}>
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
                            rows={currentRows.slice(0, 50)}
                            title="Data Preview"
                        />

                        {currentRows.length > 50 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '12px' }}>
                                Showing first 50 rows of {currentRows.length}
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
