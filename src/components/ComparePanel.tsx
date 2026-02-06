import { useState, useMemo, useEffect } from 'react';
import { Download, RotateCcw, GitCompare } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Stepper } from './ui/Stepper';
import { Button } from './ui/Button';
import { ColumnPicker } from './ui/ColumnPicker';
import { Table } from './ui/Table';
import { parseTabularFile, ACCEPTED_TABULAR_FORMATS, type ParsedData } from '../lib/fileParser';

interface DiffResult {
    added: any[];
    removed: any[];
    changed: any[];
    changedById: Map<string, Record<string, string>>;
    allHeaders: string[];
}

export function ComparePanel() {
    const [step, setStep] = useState(1);
    const [baseData, setBaseData] = useState<ParsedData | null>(null);
    const [compareData, setCompareData] = useState<ParsedData | null>(null);
    const [key, setKey] = useState('');
    const [options, setOptions] = useState({ trim: true, ci: false });

    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
    const [diffTab, setDiffTab] = useState<'added' | 'removed' | 'changed'>('changed');

    const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
    const [summary, setSummary] = useState('');

    // File handlers
    const handleBase = async (f: File) => {
        const p = await parseTabularFile(f);
        setBaseData(p);
        if (compareData) setStep(2);
    };

    const handleCompare = async (f: File) => {
        const p = await parseTabularFile(f);
        setCompareData(p);
        if (baseData) setStep(2);
    };

    // Common headers for key selection
    const commonHeaders = useMemo(() => {
        if (!baseData || !compareData) return [];
        const setA = new Set(baseData.headers);
        return compareData.headers.filter(h => setA.has(h));
    }, [baseData, compareData]);

    // Auto-select first common header as key
    useEffect(() => {
        if (commonHeaders.length > 0 && !key) {
            setKey(commonHeaders[0]);
        }
    }, [commonHeaders, key]);

    // Compute diff
    const handleCompareClick = () => {
        if (!baseData || !compareData || !key) return;

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
        baseData.rows.forEach(r => {
            const id = normalize(r[key]);
            if (id) baseMap.set(id, r);
        });

        const compareMap = new Map<string, any>();
        compareData.rows.forEach(r => {
            const id = normalize(r[key]);
            if (id) compareMap.set(id, r);
        });

        // Union of all headers
        const allHeaders = [...baseData.headers];
        const seen = new Set(allHeaders);
        compareData.headers.forEach(h => {
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

    // Export diff as Excel with colored sheets
    const handleExport = () => {
        if (!diffResult) return;

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Helper function to create sheet with styling
        const createSheet = (rows: any[], fillColor: string, sheetName: string, changedCells?: Map<string, Record<string, string>>) => {
            if (rows.length === 0) {
                // Empty sheet with just headers
                const ws = XLSX.utils.aoa_to_sheet([diffResult.allHeaders]);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
                return;
            }

            // Convert rows to array of arrays for xlsx
            const data = rows.map(row =>
                diffResult.allHeaders.map(h => row[h] ?? '')
            );

            // Add headers as first row
            const sheetData = [diffResult.allHeaders, ...data];
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            // Apply cell styling
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

            for (let R = range.s.r; R <= range.e.r; R++) {
                for (let C = range.s.c; C <= range.e.c; C++) {
                    const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };

                    if (R === 0) {
                        // Header row - bold with fill
                        ws[cellRef].s = {
                            fill: { patternType: 'solid', fgColor: { rgb: 'FF' + fillColor } },
                            font: { bold: true },
                            alignment: { horizontal: 'center' }
                        };
                    } else {
                        // Data rows
                        if (changedCells) {
                            // For changed rows, only highlight cells that actually changed
                            const rowData = rows[R - 1];
                            const id = options.trim
                                ? String(rowData[key] ?? '').trim()
                                : String(rowData[key] ?? '');
                            const normalizedId = options.ci ? id.toLowerCase() : id;
                            const changedFields = changedCells.get(normalizedId);

                            const header = diffResult.allHeaders[C];
                            if (changedFields && changedFields[header] !== undefined) {
                                // This cell was changed - highlight in yellow
                                ws[cellRef].s = {
                                    fill: { patternType: 'solid', fgColor: { rgb: 'FFFFEB9C' } }
                                };
                            }
                        } else {
                            // For added/removed rows, fill all cells
                            ws[cellRef].s = {
                                fill: { patternType: 'solid', fgColor: { rgb: 'FF' + fillColor } }
                            };
                        }
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        };

        // Create sheets with appropriate colors
        createSheet(diffResult.added, 'C6EFCE', 'Added');      // Light green
        createSheet(diffResult.removed, 'FFC7CE', 'Removed');   // Light red
        createSheet(diffResult.changed, 'FFEB9C', 'Changed', diffResult.changedById);  // Yellow for changed cells

        // Generate and download the Excel file
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diff_result.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setBaseData(null);
        setCompareData(null);
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
                        label="Base Data (original)"
                        onFile={handleBase}
                        accept={ACCEPTED_TABULAR_FORMATS}
                        name={baseData ? `✔ ${baseData.name} (${baseData.rows.length} rows)` : ''}
                    />
                    <DropZone
                        label="Compare Data (new version)"
                        onFile={handleCompare}
                        accept={ACCEPTED_TABULAR_FORMATS}
                        name={compareData ? `✔ ${compareData.name} (${compareData.rows.length} rows)` : ''}
                    />
                </div>
            </div>

            {/* Step 2: Configuration */}
            {baseData && compareData && (
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
            {baseData && compareData && key && (
                <div style={{ marginTop: 12 }}>
                    <ColumnPicker
                        allHeaders={diffResult ? diffResult.allHeaders : [...new Set([...baseData.headers, ...compareData.headers])]}
                        selected={selectedCols}
                        onChange={setSelectedCols}
                    />
                </div>
            )}

            {/* Actions */}
            {baseData && compareData && (
                <div style={{ marginTop: 12 }}>
                    <Card>
                        <div className="actions">
                            <Button variant="primary" onClick={handleCompareClick} disabled={!key} icon={<GitCompare size={16} />}>
                                Compare
                            </Button>
                            <Button variant="ok" onClick={handleExport} disabled={!diffResult} icon={<Download size={16} />}>
                                Export Diff Excel
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
