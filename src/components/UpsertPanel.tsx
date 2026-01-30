import { useState, useMemo, useEffect } from 'react';
import { Eye, Download, RotateCcw } from 'lucide-react';
import Papa from 'papaparse';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Stepper } from './ui/Stepper';
import { Button } from './ui/Button';
import { ColumnPicker } from './ui/ColumnPicker';
import { Table } from './ui/Table';
import { parseCSVFile } from '../lib/csv';
import type { ParsedCSV } from '../lib/csv';

export function UpsertPanel() {
    const [step, setStep] = useState(1);
    const [original, setOriginal] = useState<ParsedCSV | null>(null);
    const [mods, setMods] = useState<ParsedCSV | null>(null);
    const [key, setKey] = useState('');
    const [headerMode, setHeaderMode] = useState<'original' | 'union'>('original');

    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
    const [showOnlyChanged, setShowOnlyChanged] = useState(false);
    const [previewTab, setPreviewTab] = useState<'updates' | 'inserts'>('updates');

    const [previewData, setPreviewData] = useState<{
        updates: any[];
        inserts: any[];
        changedById: Map<string, Record<string, string>>;
        headersOut: string[];
    } | null>(null);

    const [summary, setSummary] = useState('');

    // 1. Files
    const handleOriginal = async (f: File) => {
        const p = await parseCSVFile(f);
        setOriginal(p);
        if (mods) setStep(2);
    };
    const handleMods = async (f: File) => {
        const p = await parseCSVFile(f);
        setMods(p);
        if (original) setStep(2);
    };

    // 2. Keys
    const commonHeaders = useMemo(() => {
        if (!original || !mods) return [];
        const setA = new Set(original.headers);
        return mods.headers.filter(h => setA.has(h));
    }, [original, mods]);

    useEffect(() => {
        if (commonHeaders.length > 0 && !key) {
            setKey(commonHeaders[0]);
        }
    }, [commonHeaders, key]);

    // 3. Preview Logic
    const handlePreview = () => {
        if (!original || !mods || !key) return;

        let headersOut = [...original.headers];
        if (headerMode === 'union') {
            const seen = new Set(headersOut);
            mods.headers.forEach(h => {
                if (!seen.has(h)) { headersOut.push(h); seen.add(h); }
            });
        }

        const modMap = new Map();
        mods.rows.forEach(r => {
            const id = String(r[key] ?? '').trim();
            if (id) modMap.set(id, r);
        });

        const updatesAfter: any[] = [];
        const inserts: any[] = [];
        const changedById = new Map<string, Record<string, string>>();
        let updatedCount = 0;

        original.rows.forEach(or => {
            const id = String(or[key] ?? '').trim();
            if (id && modMap.has(id)) {
                const mr = modMap.get(id);
                const after = { ...or, ...mr };
                const changed: Record<string, string> = {};
                headersOut.forEach(h => {
                    const before = or[h] ?? '';
                    const aft = after[h] ?? '';
                    if (String(before) !== String(aft)) changed[h] = before;
                });
                // Only count as update if there are actual changes
                if (Object.keys(changed).length > 0) {
                    changedById.set(id, changed);
                    updatesAfter.push(after);
                    updatedCount++;
                }
                modMap.delete(id);
            }
        });

        for (const [, r] of modMap) {
            inserts.push(r);
        }

        setPreviewData({
            updates: updatesAfter,
            inserts: inserts,
            changedById,
            headersOut
        });
        setSummary(`Upsert preview → Updated: ${updatedCount}, Inserted: ${inserts.length}, Output columns: ${headersOut.length}`);

        // Select all columns by default for preview
        setSelectedCols(new Set(headersOut));
        setStep(3);
    };

    const handleRun = () => {
        if (!original || !mods || !key) return;

        // Logic similar to preview, but modifying original rows in place (or clone)
        const outRows = original.rows.map(r => ({ ...r })); // shallow clone
        const modMap = new Map();
        mods.rows.forEach(r => {
            const id = String(r[key] ?? '').trim();
            if (id) modMap.set(id, r);
        });

        let updated = 0, inserted = 0;
        outRows.forEach(r => {
            const id = String(r[key] ?? '').trim();
            if (id && modMap.has(id)) {
                Object.assign(r, modMap.get(id));
                updated++;
                modMap.delete(id);
            }
        });
        for (const [, r] of modMap) {
            outRows.push(r);
            inserted++;
        }

        let headersOut = [...original.headers];
        if (headerMode === 'union') {
            const seen = new Set(headersOut);
            mods.headers.forEach(h => { if (!seen.has(h)) { headersOut.push(h); seen.add(h); } });
        }

        const csv = Papa.unparse({
            fields: headersOut,
            data: outRows.map(r => headersOut.map(h => r[h] ?? ''))
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'updated.csv';
        a.click();
        URL.revokeObjectURL(url);
        alert(`Upserted: ${updated} / Inserted: ${inserted}`);
    };

    const handleReset = () => {
        setOriginal(null);
        setMods(null);
        setKey('');
        setPreviewData(null);
        setStep(1);
        setSummary('');
    };

    // Preview Columns Calculation
    const previewCols = useMemo(() => {
        if (!previewData) return [];
        let cols = previewData.headersOut.filter(h => selectedCols.has(h));

        if (showOnlyChanged) {
            const changedSet = new Set<string>();
            // Check updates
            previewData.updates.forEach(row => {
                const id = String(row[key] ?? '').trim();
                const changed = previewData.changedById.get(id) || {};
                Object.keys(changed).forEach(c => changedSet.add(c));
            });
            changedSet.add(key);
            cols = cols.filter(c => changedSet.has(c));
        }

        if (cols.length === 0 && previewData) return [key];
        return cols;
    }, [previewData, selectedCols, showOnlyChanged, key]);

    return (
        <div>
            <Card style={{ marginBottom: 16 }}>
                <Stepper steps={['Files', 'Keys & Columns', 'Preview & Export']} currentStep={step} />
            </Card>

            {/* Step 1: Files */}
            <div style={{ display: step >= 1 ? 'block' : 'none' }}>
                <div className="grid grid-2">
                    <DropZone
                        label="Original CSV"
                        onFile={handleOriginal}
                        name={original ? `✔ ${original.name} (${original.rows.length} rows)` : ''}
                    />
                    <DropZone
                        label="Modifications CSV"
                        onFile={handleMods}
                        name={mods ? `✔ ${mods.name} (${mods.rows.length} rows)` : ''}
                    />
                </div>
            </div>

            {/* Step 2: Keys & Config */}
            {original && mods && (
                <div style={{ marginTop: 12 }}>
                    <div className="grid grid-2">
                        <Card>
                            <label>Unique Column (must exist in both files)</label>
                            <select value={key} onChange={e => setKey(e.target.value)} disabled={step > 2 && !!previewData}>
                                {commonHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <p className="hint">We only show header names present in both CSVs.</p>
                        </Card>
                        <Card>
                            <label>Output Schema</label>
                            <select value={headerMode} onChange={e => setHeaderMode(e.target.value as any)} disabled={step > 2 && !!previewData}>
                                <option value="original">Keep Original column order</option>
                                <option value="union">Union (Original first, then new columns)</option>
                            </select>
                        </Card>
                    </div>
                </div>
            )}

            {/* Column Picker (only when previewing or ready to preview?) The original showed it after step 2 config. */}
            {original && mods && key && (
                <div style={{ marginTop: 12 }}>
                    <ColumnPicker
                        allHeaders={previewData ? previewData.headersOut : (headerMode === 'union' ? [...original.headers, ...mods.headers.filter(h => !original.headers.includes(h))] : original.headers)}
                        selected={selectedCols}
                        onChange={setSelectedCols}
                    />
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                        <label>
                            <input type="checkbox" checked={showOnlyChanged} onChange={e => setShowOnlyChanged(e.target.checked)} />
                            {' '}Show only changed columns (key always visible)
                        </label>
                    </div>
                </div>
            )}

            {/* Actions */}
            {(original && mods) && (
                <div style={{ marginTop: 12 }}>
                    <Card>
                        <div className="actions">
                            <Button variant="secondary" onClick={handlePreview} disabled={!key} icon={<Eye size={16} />}>Preview</Button>
                            <Button variant="ok" onClick={handleRun} disabled={!key} icon={<Download size={16} />}>Download CSV</Button>
                            <Button variant="ghost" onClick={handleReset} icon={<RotateCcw size={16} />}>Reset</Button>
                        </div>
                        {summary && <div className="stat" style={{ marginTop: 8 }}>{summary}</div>}
                    </Card>
                </div>
            )}

            {/* Step 3: Tables with Tabs */}
            {previewData && (
                <div style={{ marginTop: 12 }}>
                    <div className="segmented" style={{ marginBottom: 16 }}>
                        <button
                            className={previewTab === 'updates' ? 'active' : ''}
                            onClick={() => setPreviewTab('updates')}
                        >
                            Updates ({previewData.updates.length})
                        </button>
                        <button
                            className={previewTab === 'inserts' ? 'active' : ''}
                            onClick={() => setPreviewTab('inserts')}
                        >
                            Inserts ({previewData.inserts.length})
                        </button>
                    </div>

                    {previewTab === 'updates' && (
                        <Table
                            title="Updates Preview"
                            hint="Rows whose values will change"
                            headers={previewCols}
                            rows={previewData.updates}
                            changedMapByRowFn={(row) => {
                                const id = String(row[key] ?? '').trim();
                                return previewData.changedById.get(id) || null;
                            }}
                        />
                    )}

                    {previewTab === 'inserts' && (
                        <Table
                            title="Inserted Rows"
                            hint="New rows that will be appended"
                            headers={previewCols}
                            rows={previewData.inserts}
                            rowClassFn={() => 'inserted'}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
