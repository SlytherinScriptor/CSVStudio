import { useState, useMemo } from 'react';
import { Eye, RotateCcw, Copy } from 'lucide-react';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Button } from './ui/Button';
import { ColumnPicker } from './ui/ColumnPicker';
import { Table } from './ui/Table';
import { HelpTooltip } from './ui/HelpTooltip';
import { parseCSVFile, exportToCSV } from '../lib/csv';
import type { ParsedCSV } from '../lib/csv';

export function DeletePanel() {
    const [original, setOriginal] = useState<ParsedCSV | null>(null);
    const [key, setKey] = useState('');
    const [idsText, setIdsText] = useState('');
    const [
        options, setOptions
    ] = useState({ trim: true, dedup: true, ci: false });

    const [idsStats, setIdsStats] = useState('');
    const [cleanIds, setCleanIds] = useState<{ list: string[], set: Set<string> }>({ list: [], set: new Set() });

    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());

    const [previewData, setPreviewData] = useState<{
        toDelete: any[];
        notFound: string[];
    } | null>(null);

    const [summary, setSummary] = useState('');
    const [deleteTab, setDeleteTab] = useState<'delete' | 'notfound'>('delete');

    // 1. File
    const handleOriginal = async (f: File) => {
        const p = await parseCSVFile(f);
        setOriginal(p);
        if (p.headers.length > 0) setKey(p.headers[0]);
        setSelectedCols(new Set(p.headers));
    };

    // 2. Clean IDs
    const handleClean = () => {
        const raw = idsText;
        const parts = raw.split(/[\n\r\t,; ]+/).map(s => s.trim()).filter(Boolean);
        const { trim, dedup, ci } = options;
        const set = new Set<string>();
        const list: string[] = [];

        for (let p of parts) {
            const k = trim ? p.trim() : p;
            const probe = ci ? k.toLowerCase() : k;
            if (dedup) {
                if (!set.has(probe)) {
                    set.add(probe);
                    list.push(k);
                }
            } else {
                list.push(k);
                set.add(probe);
            }
        }
        setCleanIds({ list, set });
        setIdsStats(`IDs detected: ${parts.length}\nUnique: ${list.length}\nPreview: ${list.slice(0, 10).join(', ') || '(none)'}`);
    };

    // 3. Preview
    const handlePreview = () => {
        if (!original || !key || cleanIds.list.length === 0) return;

        const { trim, ci } = options;

        // Check presence
        const presence = new Set(original.rows.map(r => {
            const raw = String(r[key] ?? '');
            const val = trim ? raw.trim() : raw;
            return ci ? val.toLowerCase() : val;
        }));

        const toDelete = original.rows.filter(r => {
            const raw = String(r[key] ?? '');
            const val = trim ? raw.trim() : raw;
            const probe = ci ? val.toLowerCase() : val;
            return cleanIds.set.has(probe);
        });

        const notFound = cleanIds.list.filter(id => {
            const probe = ci ? id.toLowerCase() : id;
            return !presence.has(probe);
        });

        setPreviewData({ toDelete, notFound });
        setSummary(`Delete preview → Will remove: ${toDelete.length} / ${original.rows.length}, IDs not found: ${notFound.length}`);
    };

    const handleRun = () => {
        if (!original || !key) return;
        const { trim, ci } = options;

        const filtered = original.rows.filter(r => {
            const raw = String(r[key] ?? '');
            const val = trim ? raw.trim() : raw;
            const probe = ci ? val.toLowerCase() : val;
            return !cleanIds.set.has(probe);
        });

        // Export CSV with proper quoting
        const csv = exportToCSV(original.headers, filtered);

        navigator.clipboard.writeText(csv).then(() => {
            alert(`Copied to clipboard! Removed: ${original.rows.length - filtered.length}, Remaining: ${filtered.length}`);
        }).catch(() => {
            alert('Failed to copy to clipboard');
        });
    };

    const handleReset = () => {
        setOriginal(null);
        setKey('');
        setIdsText('');
        setIdsStats('');
        setCleanIds({ list: [], set: new Set() });
        setPreviewData(null);
        setSummary('');
    };

    const previewCols = useMemo(() => {
        if (!original) return [];
        let cols = original.headers.filter(h => selectedCols.has(h));
        if (cols.length === 0) cols = [key];
        return cols;
    }, [original, selectedCols, key]);

    return (
        <div>

            {/* Step 1 */}
            <div className="grid grid-2">
                <DropZone
                    label="Original CSV"
                    onFile={handleOriginal}
                    name={original?.name}
                    rowCount={original?.rows.length}
                    columnCount={original?.headers.length}
                />
                <Card>
                    <label>
                        Unique Column
                        <HelpTooltip content="Select the column containing unique identifiers (like ID or email) that will be used to match rows for deletion." />
                    </label>
                    <select value={key} onChange={e => setKey(e.target.value)} disabled={!original}>
                        {original?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <p className="hint">Example: orders__ExternalId__c</p>
                </Card>
            </div>

            {/* Step 2 */}
            <div className="grid grid-2" style={{ marginTop: 12 }}>
                <Card>
                    <label>Paste IDs (one per line, or comma/semicolon/tab separated)</label>
                    <textarea
                        rows={8}
                        placeholder="Paste IDs here…"
                        value={idsText}
                        onChange={e => setIdsText(e.target.value)}
                    />
                    <div className="actions" style={{ marginTop: 8 }}>
                        <label>
                            <input type="checkbox" checked={options.trim} onChange={e => setOptions({ ...options, trim: e.target.checked })} />
                            Trim
                            <HelpTooltip content="Remove leading and trailing whitespace from each ID." />
                        </label>
                        <label>
                            <input type="checkbox" checked={options.dedup} onChange={e => setOptions({ ...options, dedup: e.target.checked })} />
                            Dedupe
                            <HelpTooltip content="Remove duplicate IDs from your list." />
                        </label>
                        <label>
                            <input type="checkbox" checked={options.ci} onChange={e => setOptions({ ...options, ci: e.target.checked })} />
                            Case-insensitive
                            <HelpTooltip content="Match IDs regardless of uppercase/lowercase (e.g., 'ABC' will match 'abc')." />
                        </label>
                        <Button variant="secondary" onClick={handleClean}>Clean IDs</Button>
                    </div>
                    <pre className="stat">{idsStats}</pre>
                </Card>
                {original && (
                    <ColumnPicker
                        allHeaders={original.headers}
                        selected={selectedCols}
                        onChange={setSelectedCols}
                    />
                )}
            </div>

            {/* Actions */}
            {original && cleanIds.list.length > 0 && (
                <div style={{ marginTop: 12 }}>
                    <Card>
                        <div className="actions">
                            <Button variant="secondary" onClick={handlePreview} icon={<Eye size={16} />}>Preview</Button>
                            <Button variant="danger" onClick={handleRun} icon={<Copy size={16} />}>Delete & Copy</Button>
                            <Button variant="ghost" onClick={handleReset} icon={<RotateCcw size={16} />}>Reset</Button>
                        </div>
                        {summary && <div className="stat" style={{ marginTop: 8 }}>{summary}</div>}
                    </Card>
                </div>
            )}

            {/* Tables with Tabs */}
            {previewData && (
                <div style={{ marginTop: 12 }}>
                    <div className="segmented" style={{ marginBottom: 16 }}>
                        <button
                            className={deleteTab === 'delete' ? 'active' : ''}
                            onClick={() => setDeleteTab('delete')}
                        >
                            To Delete ({previewData.toDelete.length})
                        </button>
                        <button
                            className={deleteTab === 'notfound' ? 'active' : ''}
                            onClick={() => setDeleteTab('notfound')}
                        >
                            Not Found ({previewData.notFound.length})
                        </button>
                    </div>

                    {deleteTab === 'delete' && (
                        <Table
                            title="Rows To Delete"
                            headers={previewCols}
                            rows={previewData.toDelete}
                            rowClassFn={() => 'deleted'}
                        />
                    )}

                    {deleteTab === 'notfound' && (
                        <div className="card">
                            <div className="header-row"><strong>IDs Not Found</strong></div>
                            <div className="table-wrap">
                                <table>
                                    <thead><tr><th>ID</th></tr></thead>
                                    <tbody>
                                        {previewData.notFound.map(id => (
                                            <tr key={id}><td>{id}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
