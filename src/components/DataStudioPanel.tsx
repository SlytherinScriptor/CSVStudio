import { useState, useMemo, useEffect } from 'react';
import {
    Wand2, Eye, Copy, RotateCcw, ArrowUp, ArrowDown, Plus, Trash2,
    Edit3, Replace, Zap, Search, Split, Merge, Type, Filter,
    AlertCircle, CheckCircle, Sparkles, History, Settings
} from 'lucide-react';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Button } from './ui/Button';
import { ColumnPicker } from './ui/ColumnPicker';
import { Table } from './ui/Table';
import { HelpTooltip } from './ui/HelpTooltip';
import { useToast } from './ui/Toast';
import { parseTabularFile, ACCEPTED_TABULAR_FORMATS, type ParsedData } from '../lib/fileParser';
import { formatPreservingExport } from '../lib/csv';

// Import all utilities from unified library
import {
    // Cleaning utilities
    handleMissingValues,
    standardizeText,
    removeDuplicates,
    trimAllColumns,
    findAndReplace,
    splitColumn,
    combineColumns,
    countMissing,
    // Transform utilities
    renameColumn,
    moveColumn,
    addFormulaColumn,
    applyValueMapping,
    deleteColumns,
    duplicateColumn,
    createConditionalColumn,
    getUniqueValues,
    // Enhanced utilities
    calculateQualityMetrics,
    generateOperationId,
    formatOperationDescription,
    getOperationCategory,
    type FillStrategy,
    type TextCase,
    type FormulaOperation,
    type ValueMapping,
    type OperationType,
    type OperationRecord,
    type DataQualityMetrics
} from '../lib/dataStudioUtils';

type StudioTab = 'quality' | 'text' | 'columns' | 'formula' | 'mapping';

const tabs: { id: StudioTab; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'quality', label: 'Quality', icon: <Sparkles size={16} />, description: 'Missing values & duplicates' },
    { id: 'text', label: 'Text', icon: <Type size={16} />, description: 'Case, trim & find/replace' },
    { id: 'columns', label: 'Columns', icon: <Settings size={16} />, description: 'Rename, split & combine' },
    { id: 'formula', label: 'Formula', icon: <Zap size={16} />, description: 'Calculate new columns' },
    { id: 'mapping', label: 'Mapping', icon: <Replace size={16} />, description: 'Value lookup & conditionals' },
];

interface DataStudioPanelProps {
    initialFile?: File | null;
}

export function DataStudioPanel({ initialFile }: DataStudioPanelProps) {
    const { showToast } = useToast();
    const [data, setData] = useState<ParsedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
    const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<Record<string, any>[] | null>(null);
    const [operations, setOperations] = useState<OperationRecord[]>([]);
    const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<StudioTab>('quality');
    const [showHistory, setShowHistory] = useState(false);

    // Quality tab state
    const [missingColumn, setMissingColumn] = useState('');
    const [missingStrategy, setMissingStrategy] = useState<FillStrategy>('remove');
    const [fillValue, setFillValue] = useState('');
    const [dedupeColumns, setDedupeColumns] = useState<Set<string>>(new Set());

    // Text tab state
    const [textColumn, setTextColumn] = useState('');
    const [textMode, setTextMode] = useState<TextCase>('trim');
    const [findColumn, setFindColumn] = useState('');
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [findRegex, setFindRegex] = useState(false);

    // Columns tab state
    const [renameSource, setRenameSource] = useState('');
    const [renameTarget, setRenameTarget] = useState('');
    const [reorderColumn, setReorderColumn] = useState('');
    const [splitColumnName, setSplitColumnName] = useState('');
    const [splitDelimiter, setSplitDelimiter] = useState(',');
    const [combineColumnsList, setCombineColumnsList] = useState<Set<string>>(new Set());
    const [combineSeparator, setCombineSeparator] = useState(' ');
    const [newCombinedName, setNewCombinedName] = useState('Combined');

    // Formula tab state
    const [formulaName, setFormulaName] = useState('');
    const [formulaOperation, setFormulaOperation] = useState<FormulaOperation>('concat');
    const [formulaColumns, setFormulaColumns] = useState<Set<string>>(new Set());
    const [formulaSeparator, setFormulaSeparator] = useState(' ');
    const [formulaPrefix, setFormulaPrefix] = useState('');
    const [formulaSuffix, setFormulaSuffix] = useState('');

    // Mapping tab state
    const [mappingColumn, setMappingColumn] = useState('');
    const [mappings, setMappings] = useState<ValueMapping[]>([{ from: '', to: '' }]);
    const [mappingCaseSensitive, setMappingCaseSensitive] = useState(false);
    const [condColName, setCondColName] = useState('');
    const [condSourceCol, setCondSourceCol] = useState('');
    const [condType, setCondType] = useState<'equals' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan'>('equals');
    const [condValue, setCondValue] = useState('');
    const [condThen, setCondThen] = useState('');
    const [condElse, setCondElse] = useState('');

    const currentHeaders = previewHeaders.length > 0 ? previewHeaders : (data?.headers || []);
    const currentRows = previewRows || data?.rows || [];

    // Calculate quality metrics
    const qualityMetrics = useMemo<DataQualityMetrics | null>(() => {
        if (!data || currentRows.length === 0) return null;
        return calculateQualityMetrics(currentRows, currentHeaders);
    }, [data, currentRows, currentHeaders]);

    // Unique values for mapping
    const uniqueValues = useMemo(() => {
        if (!mappingColumn || !data) return [];
        return getUniqueValues(currentRows, mappingColumn, 50);
    }, [mappingColumn, currentRows, data]);

    const handleFile = async (file: File) => {
        setLoading(true);
        try {
            const parsed = await parseTabularFile(file);
            setData(parsed);
            setSelectedCols(new Set(parsed.headers));
            setPreviewHeaders(parsed.headers);
            setPreviewRows(null);
            setOperations([]);
            setChangedKeys(new Set());
            resetAllForms();
            showToast(`${file.name} loaded`, 'success');
        } catch (err) {
            showToast('Failed to parse file', 'error');
        } finally {
            setLoading(false);
        }
    };

    // React to data changes from context


    // React to initialFile prop
    useEffect(() => {
        if (initialFile) {
            handleFile(initialFile);
        }
    }, [initialFile]);

    const resetAllForms = () => {
        setMissingColumn(''); setFillValue('');
        setDedupeColumns(new Set());
        setTextColumn(''); setFindColumn(''); setFindText(''); setReplaceText('');
        setRenameSource(''); setRenameTarget('');
        setReorderColumn('');
        setSplitColumnName(''); setSplitDelimiter(',');
        setCombineColumnsList(new Set()); setNewCombinedName('Combined');
        setFormulaName(''); setFormulaColumns(new Set());
        setMappingColumn(''); setMappings([{ from: '', to: '' }]);
        setCondColName(''); setCondSourceCol(''); setCondValue(''); setCondThen(''); setCondElse('');
    };

    // Add operation to history
    const addOperation = (type: OperationType, details: Record<string, any>, affected: number) => {
        const op: OperationRecord = {
            id: generateOperationId(),
            type,
            category: getOperationCategory(type),
            description: formatOperationDescription(type, details),
            affected,
            timestamp: new Date(),
            canUndo: true
        };
        setOperations(prev => [...prev, op]);
    };

    // Mark rows as changed
    const markRowsChanged = (rows: Record<string, any>[]) => {
        if (!data) return;
        const keyCol = currentHeaders[0];
        if (!keyCol) return;
        const newKeys = new Set(changedKeys);
        rows.forEach(row => {
            const key = String(row[keyCol] ?? '').trim();
            if (key) newKeys.add(key);
        });
        setChangedKeys(newKeys);
    };

    // ============ QUALITY OPERATIONS ============
    const applyMissingOperation = () => {
        if (!data || !missingColumn) return;
        const result = handleMissingValues(currentRows, missingColumn, missingStrategy, fillValue);
        setPreviewRows(result.rows);
        addOperation('missing', { column: missingColumn, strategy: missingStrategy }, result.affected);
        if (result.affected > 0) markRowsChanged(result.rows);
        showToast(`Processed ${result.affected} rows`, 'success');
    };

    const applyDedupeOperation = () => {
        if (!data || dedupeColumns.size === 0) return;
        const cols = Array.from(dedupeColumns);
        const result = removeDuplicates(currentRows, cols);
        setPreviewRows(result.rows);
        addOperation('dedupe', { columns: cols }, result.affected);
        showToast(`Removed ${result.affected} duplicate rows`, 'success');
    };

    // ============ TEXT OPERATIONS ============
    const applyTextOperation = () => {
        if (!data || !textColumn) return;
        const result = standardizeText(currentRows, textColumn, textMode);
        setPreviewRows(result.rows);
        addOperation('text', { column: textColumn, mode: textMode }, result.affected);
        if (result.affected > 0) markRowsChanged(result.rows);
        showToast(`Standardized ${result.affected} values`, 'success');
    };

    const applyTrimAll = () => {
        if (!data) return;
        const result = trimAllColumns(currentRows, currentHeaders);
        setPreviewRows(result.rows);
        addOperation('trimAll', {}, result.affected);
        if (result.affected > 0) markRowsChanged(result.rows);
        showToast(`Trimmed whitespace in ${result.affected} rows`, 'success');
    };

    const applyFindReplace = () => {
        if (!data || !findColumn || !findText) return;
        const result = findAndReplace(currentRows, findColumn, findText, replaceText, findRegex, false);
        setPreviewRows(result.rows);
        addOperation('findReplace', { column: findColumn, find: findText, replace: replaceText }, result.affected);
        showToast(`Replaced ${result.affected} occurrences`, 'success');
    };

    // ============ COLUMN OPERATIONS ============
    const applyRename = () => {
        if (!data || !renameSource || !renameTarget) return;
        const result = renameColumn(currentRows, currentHeaders, renameSource, renameTarget);
        if (result.success) {
            setPreviewRows(result.rows);
            setPreviewHeaders(result.headers);
            const newSelected = new Set(selectedCols);
            newSelected.delete(renameSource);
            newSelected.add(renameTarget);
            setSelectedCols(newSelected);
            addOperation('rename', { oldName: renameSource, newName: renameTarget }, result.rows.length);
            showToast(`Renamed column to "${renameTarget}"`, 'success');
            setRenameSource(''); setRenameTarget('');
        } else {
            showToast('Failed to rename column', 'error');
        }
    };

    const applyMove = (direction: 'up' | 'down') => {
        if (!reorderColumn) return;
        const newHeaders = moveColumn(currentHeaders, reorderColumn, direction);
        setPreviewHeaders(newHeaders);
        addOperation('reorder', { column: reorderColumn, direction }, 1);
        showToast(`Moved column ${direction}`, 'success');
    };

    const applySplit = () => {
        if (!data || !splitColumnName || !splitDelimiter) return;
        const result = splitColumn(currentRows, currentHeaders, splitColumnName, splitDelimiter);
        setPreviewRows(result.rows);
        setPreviewHeaders(result.headers);
        const newSelected = new Set(selectedCols);
        result.headers.forEach(h => { if (!currentHeaders.includes(h)) newSelected.add(h); });
        setSelectedCols(newSelected);
        addOperation('split', { column: splitColumnName, delimiter: splitDelimiter }, result.affected);
        showToast('Split column into new parts', 'success');
    };

    const applyCombine = () => {
        if (!data || combineColumnsList.size < 2 || !newCombinedName) return;
        const colsToCombine = Array.from(combineColumnsList);
        const result = combineColumns(currentRows, currentHeaders, colsToCombine, combineSeparator, newCombinedName);
        setPreviewRows(result.rows);
        setPreviewHeaders(result.headers);
        const newSelected = new Set(selectedCols);
        newSelected.add(newCombinedName);
        setSelectedCols(newSelected);
        addOperation('combine', { columns: colsToCombine, newColumn: newCombinedName }, result.affected);
        showToast(`Combined ${colsToCombine.length} columns`, 'success');
    };

    const handleDuplicate = () => {
        if (!data || !reorderColumn) return;
        const newName = `${reorderColumn}_copy`;
        const result = duplicateColumn(currentRows, currentHeaders, reorderColumn, newName);
        if (result.success) {
            setPreviewRows(result.rows);
            setPreviewHeaders(result.headers);
            const newSelected = new Set(selectedCols);
            newSelected.add(newName);
            setSelectedCols(newSelected);
            addOperation('duplicate', { source: reorderColumn, target: newName }, result.rows.length);
            showToast(`Duplicated column as "${newName}"`, 'success');
        }
    };

    const handleDeleteColumns = () => {
        if (!data || selectedCols.size === currentHeaders.length) {
            showToast('Cannot delete all columns', 'warning');
            return;
        }
        const colsToDelete = currentHeaders.filter(h => !selectedCols.has(h));
        if (colsToDelete.length === 0) return;
        const result = deleteColumns(currentRows, currentHeaders, colsToDelete);
        setPreviewRows(result.rows);
        setPreviewHeaders(result.headers);
        addOperation('delete', { count: colsToDelete.length }, colsToDelete.length);
        showToast(`Deleted ${colsToDelete.length} columns`, 'success');
    };

    // ============ FORMULA OPERATIONS ============
    const applyFormula = () => {
        if (!data || !formulaName || formulaColumns.size === 0) return;
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
            addOperation('formula', { columnName: formulaName, operation: formulaOperation }, result.affected);
            showToast(`Added formula column "${formulaName}"`, 'success');
            setFormulaName(''); setFormulaColumns(new Set());
        }
    };

    // ============ MAPPING OPERATIONS ============
    const applyMapping = () => {
        if (!data || !mappingColumn) return;
        const validMappings = mappings.filter(m => m.from.trim() !== '');
        if (validMappings.length === 0) {
            showToast('Add at least one mapping', 'warning');
            return;
        }
        const result = applyValueMapping(currentRows, mappingColumn, validMappings, mappingCaseSensitive);
        setPreviewRows(result.rows);
        addOperation('mapping', { column: mappingColumn, count: validMappings.length }, result.affected);
        showToast(`Applied ${result.affected} value mappings`, 'success');
    };

    const applyConditional = () => {
        if (!data || !condColName || !condSourceCol) return;
        const result = createConditionalColumn(
            currentRows, currentHeaders, condColName, condSourceCol,
            condType, condValue, condThen, condElse
        );
        if (result.headers.length > currentHeaders.length) {
            setPreviewRows(result.rows);
            setPreviewHeaders(result.headers);
            const newSelected = new Set(selectedCols);
            newSelected.add(condColName);
            setSelectedCols(newSelected);
            addOperation('conditional', { columnName: condColName }, result.affected);
            showToast(`Added conditional column "${condColName}"`, 'success');
            setCondColName('');
        }
    };

    // ============ COMMON ACTIONS ============
    const handleReset = () => {
        if (!data) return;
        setPreviewRows(null);
        setPreviewHeaders(data.headers);
        setSelectedCols(new Set(data.headers));
        setOperations([]);
        setChangedKeys(new Set());
        resetAllForms();
        showToast('Reset to original data', 'info');
    };

    const handleExport = () => {
        if (!data) return;
        const rows = currentRows;
        const headers = currentHeaders.filter(h => selectedCols.has(h));
        const keyColumn = headers[0] || '';
        const csvString = formatPreservingExport(headers, rows, data, keyColumn, changedKeys);
        navigator.clipboard.writeText(csvString).then(() => {
            showToast(`Copied ${rows.length} rows to clipboard`, 'success');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    };

    const handleClear = () => {
        setData(null);
        setPreviewRows(null);
        setPreviewHeaders([]);
        setOperations([]);
        setSelectedCols(new Set());
        setChangedKeys(new Set());
        resetAllForms();
    };

    // Mapping helpers
    const addMappingRow = () => setMappings(prev => [...prev, { from: '', to: '' }]);
    const updateMapping = (i: number, field: 'from' | 'to', value: string) => {
        setMappings(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], [field]: value };
            return updated;
        });
    };
    const removeMapping = (i: number) => setMappings(prev => prev.filter((_, idx) => idx !== i));

    const displayCols = currentHeaders.filter(h => selectedCols.has(h));

    return (
        <div className="data-studio-panel">
            {!data ? (
                <DropZone label={loading ? "Loading..." : "Upload Data to Data Studio"} onFile={handleFile} accept={ACCEPTED_TABULAR_FORMATS} />
            ) : (
                <div className="studio-content">
                    {/* Quality Dashboard */}
                    {qualityMetrics && (
                        <Card>
                            <div className="quality-dashboard">
                                <div className="quality-header">
                                    <h3><Wand2 size={18} /> Data Quality Dashboard</h3>
                                    <Button variant="ghost" onClick={() => setShowHistory(!showHistory)}>
                                        <History size={16} /> {showHistory ? 'Hide' : 'Show'} History ({operations.length})
                                    </Button>
                                </div>

                                <div className="quality-stats">
                                    <div className="stat-card">
                                        <span className="stat-value">{qualityMetrics.totalRows.toLocaleString()}</span>
                                        <span className="stat-label">Rows</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">{qualityMetrics.totalColumns}</span>
                                        <span className="stat-label">Columns</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value" style={{
                                            color: qualityMetrics.completenessScore >= 90 ? 'var(--success)' :
                                                qualityMetrics.completenessScore >= 70 ? 'var(--warning)' : 'var(--danger)'
                                        }}>
                                            {qualityMetrics.completenessScore}%
                                        </span>
                                        <span className="stat-label">Complete</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">{qualityMetrics.duplicateCount}</span>
                                        <span className="stat-label">Duplicates</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-value">{operations.length}</span>
                                        <span className="stat-label">Operations</span>
                                    </div>
                                </div>

                                {qualityMetrics.suggestions.length > 0 && (
                                    <div className="quality-suggestions">
                                        {qualityMetrics.suggestions.map((s, i) => (
                                            <div key={i} className={`suggestion suggestion-${s.type}`}>
                                                {s.type === 'warning' && <AlertCircle size={14} />}
                                                {s.type === 'tip' && <CheckCircle size={14} />}
                                                <span>{s.message}</span>
                                                {s.action && <small>{s.action}</small>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Operations History (collapsible) */}
                    {showHistory && operations.length > 0 && (
                        <Card>
                            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={16} /> Operations History
                            </h4>
                            <div className="operations-timeline">
                                {operations.slice().reverse().map((op) => (
                                    <div key={op.id} className="operation-item">
                                        <span className={`op-badge op-${op.category}`}>{op.category}</span>
                                        <span className="op-desc">{op.description}</span>
                                        <span className="op-affected">{op.affected} affected</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Tab Navigation */}
                    <Card>
                        <div className="studio-tabs">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`studio-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon}
                                    <div className="tab-text">
                                        <span className="tab-label">{tab.label}</span>
                                        <span className="tab-desc">{tab.description}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* QUALITY TAB */}
                        {activeTab === 'quality' && (
                            <div className="studio-section">
                                <div className="section-grid">
                                    {/* Missing Values */}
                                    <div className="section-card">
                                        <h4><Filter size={16} /> Handle Missing Values
                                            <HelpTooltip content="Remove rows with empty values or fill them" />
                                        </h4>
                                        <div className="form-stack">
                                            <select value={missingColumn} onChange={e => setMissingColumn(e.target.value)}>
                                                <option value="">Select column...</option>
                                                {currentHeaders.map(h => (
                                                    <option key={h} value={h}>{h} ({countMissing(currentRows, h)} missing)</option>
                                                ))}
                                            </select>
                                            <select value={missingStrategy} onChange={e => setMissingStrategy(e.target.value as FillStrategy)}>
                                                <option value="remove">Remove rows</option>
                                                <option value="value">Fill with value</option>
                                                <option value="average">Fill with average</option>
                                                <option value="mode">Fill with most common</option>
                                            </select>
                                            {missingStrategy === 'value' && (
                                                <input type="text" placeholder="Fill value..." value={fillValue} onChange={e => setFillValue(e.target.value)} />
                                            )}
                                            <Button variant="secondary" onClick={applyMissingOperation} disabled={!missingColumn}>Apply</Button>
                                        </div>
                                    </div>

                                    {/* Duplicates */}
                                    <div className="section-card">
                                        <h4><Trash2 size={16} /> Remove Duplicates
                                            <HelpTooltip content="Remove duplicate rows based on selected columns" />
                                        </h4>
                                        <div className="checkbox-grid">
                                            {currentHeaders.map(h => (
                                                <label key={h} className="checkbox-label">
                                                    <input type="checkbox" checked={dedupeColumns.has(h)}
                                                        onChange={e => {
                                                            const newSet = new Set(dedupeColumns);
                                                            e.target.checked ? newSet.add(h) : newSet.delete(h);
                                                            setDedupeColumns(newSet);
                                                        }} />
                                                    {h}
                                                </label>
                                            ))}
                                        </div>
                                        <Button variant="secondary" onClick={applyDedupeOperation} disabled={dedupeColumns.size === 0}
                                            style={{ marginTop: '12px' }}>Remove Duplicates</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TEXT TAB */}
                        {activeTab === 'text' && (
                            <div className="studio-section">
                                {/* Find & Replace - Full Width */}
                                <div className="section-card full-width">
                                    <h4><Search size={16} /> Find & Replace
                                        <HelpTooltip content="Search for text and replace it. Supports Regex." />
                                    </h4>
                                    <div className="form-row">
                                        <select value={findColumn} onChange={e => setFindColumn(e.target.value)} style={{ flex: 1 }}>
                                            <option value="">Select column...</option>
                                            {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                        <input type="text" placeholder="Find..." value={findText} onChange={e => setFindText(e.target.value)} style={{ flex: 2 }} />
                                        <input type="text" placeholder="Replace..." value={replaceText} onChange={e => setReplaceText(e.target.value)} style={{ flex: 2 }} />
                                        <label className="checkbox-inline">
                                            <input type="checkbox" checked={findRegex} onChange={e => setFindRegex(e.target.checked)} /> Regex
                                        </label>
                                        <Button variant="secondary" onClick={applyFindReplace} disabled={!findColumn || !findText}>Replace</Button>
                                    </div>
                                </div>

                                <div className="section-grid">
                                    {/* Text Standardization */}
                                    <div className="section-card">
                                        <h4><Type size={16} /> Text Standardization
                                            <HelpTooltip content="Convert text case or trim whitespace" />
                                        </h4>
                                        <div className="form-stack">
                                            <select value={textColumn} onChange={e => setTextColumn(e.target.value)}>
                                                <option value="">Select column...</option>
                                                {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <select value={textMode} onChange={e => setTextMode(e.target.value as TextCase)}>
                                                <option value="trim">Trim whitespace</option>
                                                <option value="lowercase">lowercase</option>
                                                <option value="uppercase">UPPERCASE</option>
                                                <option value="titlecase">Title Case</option>
                                            </select>
                                            <Button variant="secondary" onClick={applyTextOperation} disabled={!textColumn}>Apply</Button>
                                        </div>
                                    </div>

                                    {/* Trim All */}
                                    <div className="section-card">
                                        <h4><Sparkles size={16} /> Quick Actions</h4>
                                        <Button variant="secondary" onClick={applyTrimAll}>Trim All Whitespace</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* COLUMNS TAB */}
                        {activeTab === 'columns' && (
                            <div className="studio-section">
                                <div className="section-grid">
                                    {/* Rename */}
                                    <div className="section-card">
                                        <h4><Edit3 size={16} /> Rename Column</h4>
                                        <div className="form-stack">
                                            <select value={renameSource} onChange={e => setRenameSource(e.target.value)}>
                                                <option value="">Select column...</option>
                                                {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <input type="text" placeholder="New name..." value={renameTarget} onChange={e => setRenameTarget(e.target.value)} />
                                            <Button variant="secondary" onClick={applyRename} disabled={!renameSource || !renameTarget}>Rename</Button>
                                        </div>
                                    </div>

                                    {/* Reorder */}
                                    <div className="section-card">
                                        <h4><ArrowUp size={16} /> Reorder & Manage</h4>
                                        <div className="form-stack">
                                            <select value={reorderColumn} onChange={e => setReorderColumn(e.target.value)}>
                                                <option value="">Select column...</option>
                                                {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <div className="button-row">
                                                <Button variant="secondary" onClick={() => applyMove('up')} disabled={!reorderColumn}><ArrowUp size={14} /></Button>
                                                <Button variant="secondary" onClick={() => applyMove('down')} disabled={!reorderColumn}><ArrowDown size={14} /></Button>
                                                <Button variant="secondary" onClick={handleDuplicate} disabled={!reorderColumn}><Copy size={14} /></Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Split */}
                                    <div className="section-card">
                                        <h4><Split size={16} /> Split Column</h4>
                                        <div className="form-stack">
                                            <select value={splitColumnName} onChange={e => setSplitColumnName(e.target.value)}>
                                                <option value="">Select column...</option>
                                                {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <input type="text" placeholder="Delimiter (e.g. ,)" value={splitDelimiter} onChange={e => setSplitDelimiter(e.target.value)} />
                                            <Button variant="secondary" onClick={applySplit} disabled={!splitColumnName || !splitDelimiter}>Split</Button>
                                        </div>
                                    </div>

                                    {/* Combine */}
                                    <div className="section-card">
                                        <h4><Merge size={16} /> Combine Columns</h4>
                                        <div className="checkbox-grid" style={{ maxHeight: '120px' }}>
                                            {currentHeaders.map(h => (
                                                <label key={h} className="checkbox-label">
                                                    <input type="checkbox" checked={combineColumnsList.has(h)}
                                                        onChange={e => {
                                                            const newSet = new Set(combineColumnsList);
                                                            e.target.checked ? newSet.add(h) : newSet.delete(h);
                                                            setCombineColumnsList(newSet);
                                                        }} />
                                                    {h}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="form-row" style={{ marginTop: '8px' }}>
                                            <input type="text" placeholder="Separator" value={combineSeparator} onChange={e => setCombineSeparator(e.target.value)} style={{ width: '80px' }} />
                                            <input type="text" placeholder="New column name" value={newCombinedName} onChange={e => setNewCombinedName(e.target.value)} style={{ flex: 1 }} />
                                            <Button variant="secondary" onClick={applyCombine} disabled={combineColumnsList.size < 2}>Combine</Button>
                                        </div>
                                    </div>
                                </div>

                                <Button variant="danger" onClick={handleDeleteColumns} disabled={selectedCols.size === currentHeaders.length}
                                    style={{ marginTop: '16px' }}>
                                    <Trash2 size={14} /> Delete Unselected Columns ({currentHeaders.length - selectedCols.size})
                                </Button>
                            </div>
                        )}

                        {/* FORMULA TAB */}
                        {activeTab === 'formula' && (
                            <div className="studio-section">
                                <div className="section-card full-width">
                                    <h4><Zap size={16} /> Add Formula Column
                                        <HelpTooltip content="Create a new column using calculations or text operations" />
                                    </h4>
                                    <div className="form-stack">
                                        <div className="form-row">
                                            <input type="text" placeholder="New column name..." value={formulaName} onChange={e => setFormulaName(e.target.value)} style={{ flex: 1 }} />
                                            <select value={formulaOperation} onChange={e => setFormulaOperation(e.target.value as FormulaOperation)}>
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
                                        {formulaOperation === 'concat' && (
                                            <input type="text" placeholder="Separator" value={formulaSeparator} onChange={e => setFormulaSeparator(e.target.value)} />
                                        )}
                                        {formulaOperation === 'prefix' && (
                                            <input type="text" placeholder="Prefix text..." value={formulaPrefix} onChange={e => setFormulaPrefix(e.target.value)} />
                                        )}
                                        {formulaOperation === 'suffix' && (
                                            <input type="text" placeholder="Suffix text..." value={formulaSuffix} onChange={e => setFormulaSuffix(e.target.value)} />
                                        )}
                                        <div className="checkbox-grid">
                                            {currentHeaders.map(h => (
                                                <label key={h} className="checkbox-label">
                                                    <input type="checkbox" checked={formulaColumns.has(h)}
                                                        onChange={e => {
                                                            const newSet = new Set(formulaColumns);
                                                            e.target.checked ? newSet.add(h) : newSet.delete(h);
                                                            setFormulaColumns(newSet);
                                                        }} />
                                                    {h}
                                                </label>
                                            ))}
                                        </div>
                                        <Button variant="secondary" onClick={applyFormula} disabled={!formulaName || formulaColumns.size === 0}>
                                            <Plus size={14} /> Add Column
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MAPPING TAB */}
                        {activeTab === 'mapping' && (
                            <div className="studio-section">
                                <div className="section-grid">
                                    {/* Value Mapping */}
                                    <div className="section-card">
                                        <h4><Replace size={16} /> Value Mapping
                                            <HelpTooltip content="Replace values using a lookup table" />
                                        </h4>
                                        <div className="form-stack">
                                            <div className="form-row">
                                                <select value={mappingColumn} onChange={e => setMappingColumn(e.target.value)} style={{ flex: 1 }}>
                                                    <option value="">Select column...</option>
                                                    {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                                <label className="checkbox-inline">
                                                    <input type="checkbox" checked={mappingCaseSensitive} onChange={e => setMappingCaseSensitive(e.target.checked)} />
                                                    Case sensitive
                                                </label>
                                            </div>
                                            {uniqueValues.length > 0 && (
                                                <div className="hint">Values: {uniqueValues.slice(0, 5).join(', ')}{uniqueValues.length > 5 ? ` +${uniqueValues.length - 5}` : ''}</div>
                                            )}
                                            <div className="mapping-rows">
                                                {mappings.map((m, i) => (
                                                    <div key={i} className="mapping-row">
                                                        <input type="text" placeholder="From..." value={m.from} onChange={e => updateMapping(i, 'from', e.target.value)} list={`vals-${i}`} />
                                                        <datalist id={`vals-${i}`}>{uniqueValues.map(v => <option key={v} value={v} />)}</datalist>
                                                        <span>→</span>
                                                        <input type="text" placeholder="To..." value={m.to} onChange={e => updateMapping(i, 'to', e.target.value)} />
                                                        <button className="icon-btn" onClick={() => removeMapping(i)} disabled={mappings.length === 1}><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="button-row">
                                                <Button variant="ghost" onClick={addMappingRow}><Plus size={14} /> Add Row</Button>
                                                <Button variant="secondary" onClick={applyMapping} disabled={!mappingColumn}>Apply Mapping</Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conditional */}
                                    <div className="section-card">
                                        <h4><Zap size={16} /> Conditional Column
                                            <HelpTooltip content="Create IF/THEN/ELSE column" />
                                        </h4>
                                        <div className="form-stack">
                                            <input type="text" placeholder="New column name..." value={condColName} onChange={e => setCondColName(e.target.value)} />
                                            <div className="form-row">
                                                <span className="label">IF</span>
                                                <select value={condSourceCol} onChange={e => setCondSourceCol(e.target.value)} style={{ flex: 1 }}>
                                                    <option value="">Column...</option>
                                                    {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                                <select value={condType} onChange={e => setCondType(e.target.value as any)}>
                                                    <option value="equals">equals</option>
                                                    <option value="contains">contains</option>
                                                    <option value="startsWith">starts with</option>
                                                    <option value="endsWith">ends with</option>
                                                    <option value="isEmpty">is empty</option>
                                                    <option value="isNotEmpty">is not empty</option>
                                                    <option value="greaterThan">&gt;</option>
                                                    <option value="lessThan">&lt;</option>
                                                </select>
                                            </div>
                                            {!['isEmpty', 'isNotEmpty'].includes(condType) && (
                                                <input type="text" placeholder="Value..." value={condValue} onChange={e => setCondValue(e.target.value)} />
                                            )}
                                            <div className="form-row">
                                                <span className="label">THEN</span>
                                                <input type="text" placeholder="Value if true..." value={condThen} onChange={e => setCondThen(e.target.value)} style={{ flex: 1 }} />
                                            </div>
                                            <div className="form-row">
                                                <span className="label">ELSE</span>
                                                <input type="text" placeholder="Value if false..." value={condElse} onChange={e => setCondElse(e.target.value)} style={{ flex: 1 }} />
                                            </div>
                                            <Button variant="secondary" onClick={applyConditional} disabled={!condColName || !condSourceCol}>
                                                <Plus size={14} /> Add Conditional Column
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Column Picker */}
                    <ColumnPicker allHeaders={currentHeaders} selected={selectedCols} onChange={setSelectedCols} />

                    {/* Preview Table */}
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0 }}>
                                <Eye size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Preview ({currentRows.length} rows)
                            </h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" onClick={handleReset} disabled={operations.length === 0}>
                                    <RotateCcw size={14} /> Reset
                                </Button>
                                <Button variant="ok" onClick={handleExport}>
                                    <Copy size={14} /> Copy to Clipboard
                                </Button>
                            </div>
                        </div>
                        <Table headers={displayCols} rows={currentRows.slice(0, 50)} title="Data Preview" />
                        {currentRows.length > 50 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '12px' }}>
                                Showing first 50 rows of {currentRows.length}
                            </p>
                        )}
                    </Card>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={handleClear}>Start Over</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
