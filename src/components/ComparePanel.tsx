import { useState, useMemo, useEffect } from 'react';
import { Download, RotateCcw, GitCompare } from 'lucide-react';
import Papa from 'papaparse';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Stepper } from './ui/Stepper';
import { Button } from './ui/Button';
import { ColumnPicker } from './ui/ColumnPicker';
import { Table } from './ui/Table';
import { parseCSVFile } from '../lib/csv';
import type { ParsedCSV } from '../lib/csv';

interface DiffResult {
    added: any[];
    removed: any[];
    changed: any[];
    changedById: Map<string, Record<string, string>>;
    allHeaders: string[];
}

export function ComparePanel() {
    const [step, setStep] = useState(1);
    const [baseCSV, setBaseCSV] = useState<ParsedCSV | null>(null);
    const [compareCSV, setCompareCSV] = useState<ParsedCSV | null>(null);
    const [key, setKey] = useState('');
    const [options, setOptions] = useState({ trim: true, ci: false });

    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
    const [diffTab, setDiffTab] = useState<'added' | 'removed' | 'changed'>('changed');

    const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
    const [summary, setSummary] = useState('');

    // File handlers
    const handleBase = async (f: File) => {
        const p = await parseCSVFile(f);
        setBaseCSV(p);
        if (compareCSV) setStep(2);
    };

    const handleCompare = async (f: File) => {
        const p = await parseCSVFile(f);
        setCompareCSV(p);
        if (baseCSV) setStep(2);
    };

    // Common headers for key selection
    const commonHeaders = useMemo(() => {
        if (!baseCSV || !compareCSV) return [];
        const setA = new Set(baseCSV.headers);
        return compareCSV.headers.filter(h => setA.has(h));
    }, [baseCSV, compareCSV]);

    // Auto-select first common header as key
    useEffect(() => {
        if (commonHeaders.length > 0 && !key) {
            setKey(commonHeaders[0]);
        }
    }, [commonHeaders, key]);

    // Compute diff
    const handleCompareClick = () => {
        if (!baseCSV || !compareCSV || !key) return;

        const { trim, ci } = options;

        // Helper to normalize values
        const normalize = (val: any) => {
            let s = String(val ?? '');
            if (trim) s = s.trim();
            if (ci) s = s.toLowerCase();
            return s;
        };

        // Build maps by key
        const baseMap = new Map<string, any>();
        baseCSV.rows.forEach(r => {
            const id = normalize(r[key]);
            if (id) baseMap.set(id, r);
        });

        const compareMap = new Map<string, any>();
        compareCSV.rows.forEach(r => {
            const id = normalize(r[key]);
            if (id) compareMap.set(id, r);
        });

        // Union of all headers
        const allHeaders = [...baseCSV.headers];
        const seen = new Set(allHeaders);
        compareCSV.headers.forEach(h => {
            if (!seen.has(h)) {
                allHeaders.push(h);
                seen.add(h);
            }
        });

        const added: any[] = [];
        const removed: any[] = [];
        const changed: any[] = [];
        const changedById = new Map<string, Record<string, string>>();

        // Find removed and changed
        baseMap.forEach((baseRow, id) => {
            if (!compareMap.has(id)) {
                removed.push(baseRow);
            } else {
                const compareRow = compareMap.get(id);
                const diffs: Record<string, string> = {};
                let hasChange = false;

                allHeaders.forEach(h => {
                    const baseVal = normalize(baseRow[h] ?? '');
                    const compVal = normalize(compareRow[h] ?? '');
                    if (baseVal !== compVal) {
                        diffs[h] = String(baseRow[h] ?? ''); // Store original base value
                        hasChange = true;
                    }
                });

                if (hasChange) {
                    changed.push(compareRow);
                    changedById.set(id, diffs);
                }
            }
        });

        // Find added
        compareMap.forEach((compareRow, id) => {
            if (!baseMap.has(id)) {
                added.push(compareRow);
            }
        });

        setDiffResult({ added, removed, changed, changedById, allHeaders });
        setSummary(`Diff complete → Added: ${added.length}, Removed: ${removed.length}, Changed: ${changed.length}`);
        setSelectedCols(new Set(allHeaders));
        setStep(3);
    };

    // Export diff as CSV
    const handleExport = () => {
        if (!diffResult) return;

        const rows: any[] = [];

        diffResult.added.forEach(r => {
            rows.push({ _diff_type: 'ADDED', ...r });
        });
        diffResult.removed.forEach(r => {
            rows.push({ _diff_type: 'REMOVED', ...r });
        });
        diffResult.changed.forEach(r => {
            const id = String(r[key] ?? '').trim();
            const oldVals = diffResult.changedById.get(id) || {};
            const changedCols = Object.keys(oldVals).join('; ');
            rows.push({ _diff_type: 'CHANGED', _changed_columns: changedCols, ...r });
        });

        const fields = ['_diff_type', '_changed_columns', ...diffResult.allHeaders];
        const csv = Papa.unparse({ fields, data: rows });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diff_result.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setBaseCSV(null);
        setCompareCSV(null);
        setKey('');
        setDiffResult(null);
        setStep(1);
        setSummary('');
        setSelectedCols(new Set());
    };

    // Filtered columns for display
    const displayCols = useMemo(() => {
        if (!diffResult) return [];
        return diffResult.allHeaders.filter(h => selectedCols.has(h));
    }, [diffResult, selectedCols]);

    return (
        <div>
            <Card style={{ marginBottom: 16 }}>
                <Stepper steps={['Upload Files', 'Configure', 'View Diff']} currentStep={step} />
            </Card>

            {/* Step 1: Files */}
            <div style={{ display: step >= 1 ? 'block' : 'none' }}>
                <div className="grid grid-2">
                    <DropZone
                        label="Base CSV (original)"
                        onFile={handleBase}
                        name={baseCSV ? `✔ ${baseCSV.name} (${baseCSV.rows.length} rows)` : ''}
                    />
                    <DropZone
                        label="Compare CSV (new version)"
                        onFile={handleCompare}
                        name={compareCSV ? `✔ ${compareCSV.name} (${compareCSV.rows.length} rows)` : ''}
                    />
                </div>
            </div>

            {/* Step 2: Configuration */}
            {baseCSV && compareCSV && (
                <div style={{ marginTop: 12 }}>
                    <div className="grid grid-2">
                        <Card>
                            <label>Key Column (unique identifier)</label>
                            <select value={key} onChange={e => setKey(e.target.value)} disabled={step > 2 && !!diffResult}>
                                {commonHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <p className="hint">Rows are matched by this column.</p>
                        </Card>
                        <Card>
                            <label>Comparison Options</label>
                            <div className="actions" style={{ marginTop: 8, flexDirection: 'column', gap: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={options.trim}
                                        onChange={e => setOptions({ ...options, trim: e.target.checked })}
                                    />
                                    Trim whitespace
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={options.ci}
                                        onChange={e => setOptions({ ...options, ci: e.target.checked })}
                                    />
                                    Case-insensitive comparison
                                </label>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Column Picker */}
            {baseCSV && compareCSV && key && (
                <div style={{ marginTop: 12 }}>
                    <ColumnPicker
                        allHeaders={diffResult ? diffResult.allHeaders : [...new Set([...baseCSV.headers, ...compareCSV.headers])]}
                        selected={selectedCols}
                        onChange={setSelectedCols}
                    />
                </div>
            )}

            {/* Actions */}
            {baseCSV && compareCSV && (
                <div style={{ marginTop: 12 }}>
                    <Card>
                        <div className="actions">
                            <Button variant="primary" onClick={handleCompareClick} disabled={!key} icon={<GitCompare size={16} />}>
                                Compare
                            </Button>
                            <Button variant="ok" onClick={handleExport} disabled={!diffResult} icon={<Download size={16} />}>
                                Export Diff CSV
                            </Button>
                            <Button variant="ghost" onClick={handleReset} icon={<RotateCcw size={16} />}>
                                Reset
                            </Button>
                        </div>
                        {summary && <div className="stat" style={{ marginTop: 8 }}>{summary}</div>}
                    </Card>
                </div>
            )}

            {/* Step 3: Diff Tables */}
            {diffResult && (
                <div style={{ marginTop: 12 }}>
                    <div className="segmented" style={{ marginBottom: 16 }}>
                        <button
                            className={diffTab === 'added' ? 'active' : ''}
                            onClick={() => setDiffTab('added')}
                        >
                            Added ({diffResult.added.length})
                        </button>
                        <button
                            className={diffTab === 'removed' ? 'active' : ''}
                            onClick={() => setDiffTab('removed')}
                        >
                            Removed ({diffResult.removed.length})
                        </button>
                        <button
                            className={diffTab === 'changed' ? 'active' : ''}
                            onClick={() => setDiffTab('changed')}
                        >
                            Changed ({diffResult.changed.length})
                        </button>
                    </div>

                    {diffTab === 'added' && (
                        <Table
                            title="Added Rows"
                            hint="Rows in Compare CSV but not in Base CSV"
                            headers={displayCols}
                            rows={diffResult.added}
                            rowClassFn={() => 'added'}
                        />
                    )}

                    {diffTab === 'removed' && (
                        <Table
                            title="Removed Rows"
                            hint="Rows in Base CSV but not in Compare CSV"
                            headers={displayCols}
                            rows={diffResult.removed}
                            rowClassFn={() => 'removed'}
                        />
                    )}

                    {diffTab === 'changed' && (
                        <Table
                            title="Changed Rows"
                            hint="Rows with same key but different values (hover cells to see old values)"
                            headers={displayCols}
                            rows={diffResult.changed}
                            changedMapByRowFn={(row) => {
                                const id = options.trim
                                    ? String(row[key] ?? '').trim()
                                    : String(row[key] ?? '');
                                const normalizedId = options.ci ? id.toLowerCase() : id;
                                return diffResult.changedById.get(normalizedId) || null;
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
