import { useState, useMemo } from 'react';
import { Table2, Plus, Trash2, BarChart3, TrendingUp, Download, Copy } from 'lucide-react';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Button } from './ui/Button';
import { Table } from './ui/Table';
import { HelpTooltip } from './ui/HelpTooltip';
import { useToast } from './ui/Toast';
import { parseTabularFile, ACCEPTED_TABULAR_FORMATS, type ParsedData } from '../lib/fileParser';
import {
    aggregate,
    pivot,
    getNumericColumns,
    type AggregateOperation,
    type AggregateConfig,
    type PivotConfig
} from '../lib/pivotUtils';

type Mode = 'aggregate' | 'pivot';

interface AggregationItem {
    column: string;
    operation: AggregateOperation;
    alias: string;
}

// Get cell class based on value relative to column
function getCellClass(value: number, min: number, max: number): string {
    if (isNaN(value)) return '';
    const range = max - min;
    if (range === 0) return 'cell-mid';
    const normalized = (value - min) / range;
    if (normalized >= 0.7) return 'cell-high';
    if (normalized >= 0.3) return 'cell-mid';
    return 'cell-low';
}

export function PivotPanel() {
    const { showToast } = useToast();
    const [data, setData] = useState<ParsedData | null>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<Mode>('aggregate');

    // Aggregation state
    const [groupByColumns, setGroupByColumns] = useState<Set<string>>(new Set());
    const [aggregations, setAggregations] = useState<AggregationItem[]>([]);

    // Pivot state
    const [pivotRowKey, setPivotRowKey] = useState('');
    const [pivotColKey, setPivotColKey] = useState('');
    const [pivotValueKey, setPivotValueKey] = useState('');
    const [pivotOperation, setPivotOperation] = useState<AggregateOperation>('sum');

    // Options
    const [showGrandTotal, setShowGrandTotal] = useState(true);
    const [conditionalFormat, setConditionalFormat] = useState(true);

    // Result state
    const [resultRows, setResultRows] = useState<Record<string, any>[]>([]);
    const [resultHeaders, setResultHeaders] = useState<string[]>([]);

    const handleFile = async (file: File) => {
        try {
            const parsed = await parseTabularFile(file);
            setData(parsed);

            // Reset local state for new file
            setGroupByColumns(new Set());
            setAggregations([]);
            setResultRows([]);
            setResultHeaders([]);
            setPivotRowKey('');
            setPivotColKey('');
            setPivotValueKey('');
            showToast(`${file.name} loaded for analysis`, 'success');
        } catch (err) {
            showToast('Failed to parse file', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Get numeric columns for aggregation suggestions
    const numericColumns = useMemo(() => {
        if (!data) return [];
        return getNumericColumns(data.rows, data.headers);
    }, [data]);

    // Calculate min/max for each numeric column in results
    const columnStats = useMemo(() => {
        const stats: Record<string, { min: number; max: number }> = {};
        if (resultRows.length === 0) return stats;

        resultHeaders.forEach(h => {
            const values = resultRows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
            if (values.length > 0) {
                stats[h] = {
                    min: Math.min(...values),
                    max: Math.max(...values)
                };
            }
        });
        return stats;
    }, [resultRows, resultHeaders]);

    // Grand total row
    const grandTotalRow = useMemo(() => {
        if (!showGrandTotal || resultRows.length === 0) return null;
        const total: Record<string, any> = {};

        resultHeaders.forEach((h, idx) => {
            if (idx === 0) {
                total[h] = 'Grand Total';
            } else {
                const values = resultRows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
                if (values.length > 0) {
                    total[h] = values.reduce((a, b) => a + b, 0);
                } else {
                    total[h] = '';
                }
            }
        });
        return total;
    }, [resultRows, resultHeaders, showGrandTotal]);

    // Add new aggregation
    const addAggregation = () => {
        if (numericColumns.length === 0) return;
        setAggregations([...aggregations, {
            column: numericColumns[0],
            operation: 'sum',
            alias: ''
        }]);
    };

    // Remove aggregation
    const removeAggregation = (index: number) => {
        setAggregations(aggregations.filter((_, i) => i !== index));
    };

    // Update aggregation
    const updateAggregation = (index: number, field: keyof AggregationItem, value: string) => {
        const newAggs = [...aggregations];
        newAggs[index] = { ...newAggs[index], [field]: value };
        setAggregations(newAggs);
    };

    // Apply aggregation
    const applyAggregate = () => {
        if (!data || groupByColumns.size === 0 || aggregations.length === 0) {
            showToast('Please select group-by columns and at least one aggregation', 'error');
            return;
        }

        const config: AggregateConfig = {
            groupByColumns: Array.from(groupByColumns),
            aggregations: aggregations.map(a => ({
                column: a.column,
                operation: a.operation as AggregateOperation,
                alias: a.alias || undefined
            }))
        };

        const result = aggregate(data.rows, config);
        setResultRows(result.rows);
        setResultHeaders(result.headers);
        showToast(`Created ${result.rows.length} aggregated rows`, 'success');
    };

    // Apply pivot
    const applyPivot = () => {
        if (!data || !pivotRowKey || !pivotColKey || !pivotValueKey) {
            showToast('Please select row, column, and value fields', 'error');
            return;
        }

        const config: PivotConfig = {
            rowKey: pivotRowKey,
            colKey: pivotColKey,
            valueKey: pivotValueKey,
            operation: pivotOperation
        };

        const result = pivot(data.rows, config);
        setResultRows(result.rows);
        setResultHeaders(result.headers);
        showToast(`Created pivot table with ${result.rows.length} rows`, 'success');
    };

    // Export result
    const handleExport = () => {
        if (resultRows.length === 0) return;

        const allRows = grandTotalRow ? [...resultRows, grandTotalRow] : resultRows;
        const csvLines = [
            resultHeaders.join(','),
            ...allRows.map(row =>
                resultHeaders.map(h => {
                    const val = row[h];
                    const str = val === null || val === undefined ? '' : String(val);
                    return str.includes(',') || str.includes('"') || str.includes('\n')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                }).join(',')
            )
        ];

        navigator.clipboard.writeText(csvLines.join('\n')).then(() => {
            showToast(`Copied ${allRows.length} rows to clipboard`, 'success');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    };

    // Download as file
    const handleDownload = () => {
        if (resultRows.length === 0) return;

        const allRows = grandTotalRow ? [...resultRows, grandTotalRow] : resultRows;
        const csvLines = [
            resultHeaders.join(','),
            ...allRows.map(row =>
                resultHeaders.map(h => {
                    const val = row[h];
                    const str = val === null || val === undefined ? '' : String(val);
                    return str.includes(',') || str.includes('"') || str.includes('\n')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                }).join(',')
            )
        ];

        const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mode === 'pivot' ? 'pivot_table.csv' : 'aggregation_result.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('File downloaded', 'success');
    };

    // Clear
    const handleClear = () => {
        setData(null);
        setGroupByColumns(new Set());
        setAggregations([]);
        setResultRows([]);
        setResultHeaders([]);
    };

    return (
        <div className="pivot-panel">
            {!data ? (
                <DropZone
                    label={loading ? "Loading..." : "Upload Data to Analyze"}
                    onFile={handleFile}
                    accept={ACCEPTED_TABULAR_FORMATS}
                />
            ) : (
                <div className="pivot-content fade-slide-in">
                    {/* Mode Selector */}
                    <Card className="card-glass">
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <Button
                                variant={mode === 'aggregate' ? 'primary' : 'secondary'}
                                onClick={() => setMode('aggregate')}
                            >
                                <BarChart3 size={16} /> Group & Aggregate
                            </Button>
                            <Button
                                variant={mode === 'pivot' ? 'primary' : 'secondary'}
                                onClick={() => setMode('pivot')}
                            >
                                <Table2 size={16} /> Pivot Table
                            </Button>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                            {mode === 'aggregate'
                                ? 'Group rows by columns and compute aggregations like SUM, AVG, COUNT.'
                                : 'Create a pivot table with row headers, column headers, and aggregated values.'
                            }
                        </p>
                    </Card>

                    {/* Aggregation Mode */}
                    {mode === 'aggregate' && (
                        <>
                            {/* Group By Columns */}
                            <Card>
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={18} />
                                    Group By Columns
                                    <HelpTooltip content="Select columns to group rows by. Rows with the same values in these columns will be combined." />
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {data.headers.map(h => (
                                        <label key={h} className="checkbox-label" style={{
                                            padding: '10px 16px',
                                            background: groupByColumns.has(h) ? 'var(--accent)' : 'var(--surface)',
                                            borderRadius: 'var(--radius)',
                                            cursor: 'pointer',
                                            color: groupByColumns.has(h) ? 'white' : 'inherit',
                                            fontWeight: groupByColumns.has(h) ? 600 : 400,
                                            transition: 'all 0.15s',
                                            border: groupByColumns.has(h) ? 'none' : '1px solid var(--border)'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={groupByColumns.has(h)}
                                                onChange={e => {
                                                    const newSet = new Set(groupByColumns);
                                                    if (e.target.checked) newSet.add(h);
                                                    else newSet.delete(h);
                                                    setGroupByColumns(newSet);
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {h}
                                        </label>
                                    ))}
                                </div>
                            </Card>

                            {/* Aggregations */}
                            <Card>
                                <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BarChart3 size={18} />
                                    Aggregations
                                    <HelpTooltip content="Add calculations to perform on grouped data." />
                                </h4>

                                {aggregations.length === 0 && (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                                        No aggregations added yet. Click "Add Aggregation" to start.
                                    </p>
                                )}

                                {aggregations.map((agg, idx) => (
                                    <div key={idx} className="fade-slide-in" style={{
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center',
                                        marginBottom: '8px',
                                        padding: '12px',
                                        background: 'var(--surface)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <select
                                            value={agg.operation}
                                            onChange={e => updateAggregation(idx, 'operation', e.target.value)}
                                            style={{ width: '100px' }}
                                        >
                                            <option value="sum">SUM</option>
                                            <option value="avg">AVG</option>
                                            <option value="count">COUNT</option>
                                            <option value="min">MIN</option>
                                            <option value="max">MAX</option>
                                            <option value="first">FIRST</option>
                                            <option value="last">LAST</option>
                                        </select>

                                        <span style={{ color: 'var(--text-muted)' }}>(</span>

                                        <select
                                            value={agg.column}
                                            onChange={e => updateAggregation(idx, 'column', e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            {data.headers.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>

                                        <span style={{ color: 'var(--text-muted)' }}>)</span>

                                        <span style={{ color: 'var(--text-muted)' }}>as</span>

                                        <input
                                            type="text"
                                            placeholder="Alias (optional)"
                                            value={agg.alias}
                                            onChange={e => updateAggregation(idx, 'alias', e.target.value)}
                                            style={{ width: '150px' }}
                                        />

                                        <Button variant="ghost" onClick={() => removeAggregation(idx)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ))}

                                <Button variant="ghost" onClick={addAggregation} style={{ marginTop: '8px' }}>
                                    <Plus size={14} /> Add Aggregation
                                </Button>
                            </Card>

                            <Button
                                variant="primary"
                                onClick={applyAggregate}
                                disabled={groupByColumns.size === 0 || aggregations.length === 0}
                            >
                                Apply Aggregation
                            </Button>
                        </>
                    )}

                    {/* Pivot Mode */}
                    {mode === 'pivot' && (
                        <Card>
                            <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Table2 size={18} />
                                Pivot Table Configuration
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                        Row Headers
                                        <HelpTooltip content="Column values that will become row labels" />
                                    </label>
                                    <select
                                        value={pivotRowKey}
                                        onChange={e => setPivotRowKey(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select column...</option>
                                        {data.headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                        Column Headers
                                        <HelpTooltip content="Column values that will become column labels" />
                                    </label>
                                    <select
                                        value={pivotColKey}
                                        onChange={e => setPivotColKey(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select column...</option>
                                        {data.headers.filter(h => h !== pivotRowKey).map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                        Values
                                        <HelpTooltip content="Column to aggregate in the pivot cells" />
                                    </label>
                                    <select
                                        value={pivotValueKey}
                                        onChange={e => setPivotValueKey(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Select column...</option>
                                        {data.headers.filter(h => h !== pivotRowKey && h !== pivotColKey).map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                                        Aggregation
                                    </label>
                                    <select
                                        value={pivotOperation}
                                        onChange={e => setPivotOperation(e.target.value as AggregateOperation)}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="sum">SUM</option>
                                        <option value="avg">AVG</option>
                                        <option value="count">COUNT</option>
                                        <option value="min">MIN</option>
                                        <option value="max">MAX</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={showGrandTotal}
                                        onChange={e => setShowGrandTotal(e.target.checked)}
                                    />
                                    Show Grand Total
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={conditionalFormat}
                                        onChange={e => setConditionalFormat(e.target.checked)}
                                    />
                                    Conditional Formatting
                                </label>
                            </div>

                            <Button
                                variant="primary"
                                onClick={applyPivot}
                                disabled={!pivotRowKey || !pivotColKey || !pivotValueKey}
                                style={{ marginTop: '16px' }}
                            >
                                Create Pivot Table
                            </Button>
                        </Card>
                    )}

                    {/* Result Preview with Conditional Formatting */}
                    {resultRows.length > 0 && (
                        <Card className="fade-slide-in">
                            <h4 style={{ margin: '0 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BarChart3 size={18} />
                                    Result ({resultRows.length} rows{grandTotalRow ? ' + Grand Total' : ''})
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button variant="ghost" onClick={handleExport}>
                                        <Copy size={14} /> Copy
                                    </Button>
                                    <button className="export-btn" onClick={handleDownload}>
                                        <Download size={14} /> Download
                                    </button>
                                </div>
                            </h4>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="pivot-table">
                                    <thead>
                                        <tr>
                                            {resultHeaders.map(h => (
                                                <th key={h}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultRows.slice(0, 50).map((row, i) => (
                                            <tr key={i}>
                                                {resultHeaders.map((h, j) => {
                                                    const val = row[h];
                                                    const numVal = parseFloat(val);
                                                    const stats = columnStats[h];
                                                    const cellClass = conditionalFormat && stats && j > 0
                                                        ? getCellClass(numVal, stats.min, stats.max)
                                                        : '';

                                                    return (
                                                        <td key={h} className={cellClass}>
                                                            {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : val}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        {grandTotalRow && (
                                            <tr className="row-grandtotal">
                                                {resultHeaders.map(h => {
                                                    const val = grandTotalRow[h];
                                                    return (
                                                        <td key={h}>
                                                            {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : val}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {resultRows.length > 50 && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    Showing 50 of {resultRows.length} rows
                                </p>
                            )}
                        </Card>
                    )}

                    {/* Source Data Preview */}
                    <Card>
                        <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Source Data ({data.rows.length.toLocaleString()} rows)
                        </h4>
                        <Table
                            title="Source Data"
                            headers={data.headers}
                            rows={data.rows.slice(0, 10)}
                        />
                        {data.rows.length > 10 && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                Showing 10 of {data.rows.length.toLocaleString()} rows
                            </p>
                        )}
                    </Card>

                    {/* Actions */}
                    <div className="action-buttons">
                        <Button variant="ghost" onClick={handleClear}>
                            Start Over
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
