import { useState } from 'react';
import { Plus, Trash2, CheckCircle, Download } from 'lucide-react';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Button } from './ui/Button';
import { Stepper } from './ui/Stepper';

import { useToast } from './ui/Toast';
import { parseCSVFile } from '../lib/csv';
import type { ParsedCSV } from '../lib/csv';
import { validateDataset, ValidationRule, RuleType, ValidationResult, CrossColumnOperator } from '../lib/validationUtils';



export function ValidationPanel() {
    const { showToast } = useToast();
    const [step, setStep] = useState<number>(1);
    const [csv, setCsv] = useState<ParsedCSV | null>(null);
    const [rules, setRules] = useState<ValidationRule[]>([]);
    const [result, setResult] = useState<ValidationResult | null>(null);
    const [keyColumn, setKeyColumn] = useState<string>('');

    // Rule Form State
    const [newRuleColumn, setNewRuleColumn] = useState('');
    const [newRuleType, setNewRuleType] = useState<RuleType>('required');
    const [newRuleSeverity, setNewRuleSeverity] = useState<'error' | 'warning'>('error');
    const [newRuleParams, setNewRuleParams] = useState<any>({});

    const handleFile = async (file: File) => {
        try {
            const parsed = await parseCSVFile(file);
            setCsv(parsed);
            if (parsed.headers.length > 0) {
                setKeyColumn(parsed.headers[0]); // Default key
            }
            setStep(2);
        } catch (err) {
            showToast('Failed to parse CSV', 'error');
        }
    };

    const addRule = () => {
        if (!newRuleColumn) return;

        const rule: ValidationRule = {
            id: crypto.randomUUID(),
            column: newRuleColumn,
            type: newRuleType,
            severity: newRuleSeverity,
            params: newRuleParams
        };

        setRules([...rules, rule]);
        setNewRuleParams({}); // Reset params
        showToast('Rule added', 'success');
    };

    const removeRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    const runValidation = () => {
        if (!csv) return;
        const res = validateDataset(csv.rows, rules, keyColumn);
        setResult(res);
        setStep(3);
        showToast(`Validation complete. Found ${res.invalidRows} invalid rows.`, res.invalidRows > 0 ? 'warning' : 'success');
    };

    const handleReset = () => {
        setCsv(null);
        setRules([]);
        setResult(null);
        setStep(1);
    };

    // Helper to render param inputs based on rule type
    const renderParamInputs = () => {
        switch (newRuleType) {
            case 'range':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="number"
                            placeholder="Min"
                            value={newRuleParams.min || ''}
                            onChange={e => setNewRuleParams({ ...newRuleParams, min: Number(e.target.value) })}
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            value={newRuleParams.max || ''}
                            onChange={e => setNewRuleParams({ ...newRuleParams, max: Number(e.target.value) })}
                        />
                    </div>
                );
            case 'regex':
                return (
                    <input
                        type="text"
                        placeholder="Regex Pattern (e.g. ^[A-Z]+$)"
                        value={newRuleParams.pattern || ''}
                        onChange={e => setNewRuleParams({ ...newRuleParams, pattern: e.target.value })}
                    />
                );
            case 'enum':
                return (
                    <input
                        type="text"
                        placeholder="Options (comma separated)"
                        value={newRuleParams.options ? newRuleParams.options.join(',') : ''}
                        onChange={e => setNewRuleParams({ ...newRuleParams, options: e.target.value.split(',').map((s: string) => s.trim()) })}
                    />
                );
            case 'crossColumn':
                return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            style={{ width: '80px' }}
                            value={newRuleParams.operator || '=='}
                            onChange={e => setNewRuleParams({ ...newRuleParams, operator: e.target.value as CrossColumnOperator })}
                        >
                            <option value="==">==</option>
                            <option value="!=">!=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                        </select>
                        <select
                            value={newRuleParams.targetColumn || ''}
                            onChange={e => setNewRuleParams({ ...newRuleParams, targetColumn: e.target.value })}
                        >
                            <option value="">Select Target Column...</option>
                            {csv?.headers.filter(h => h !== newRuleColumn).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                );
            default:
                return null;
        }
    };

    // Download report
    const downloadReport = () => {
        if (!result) return;
        const headers = ['Row ID', 'Column', 'Value', 'Issue', 'Severity'];
        const rows = result.errors.map(e => [
            e.rowId,
            e.column,
            String(e.value),
            e.message,
            e.severity
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'validation-report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="validation-panel">
            <Card style={{ marginBottom: 16 }}>
                <Stepper steps={['Upload Data', 'Define Rules', 'Validation Report']} currentStep={step} />
            </Card>

            {/* Step 1: Upload */}
            <div style={{ display: step === 1 ? 'block' : 'none' }}>
                <DropZone label="Upload CSV to Validate" onFile={handleFile} />
            </div>

            {/* Step 2: Rules */}
            <div style={{ display: step === 2 ? 'block' : 'none' }}>
                <div className="grid grid-2">
                    {/* Add Rule Form */}
                    <Card>
                        <h3>Add Validation Rule</h3>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                            <label>Column</label>
                            <select value={newRuleColumn} onChange={e => setNewRuleColumn(e.target.value)}>
                                <option value="">Select Column...</option>
                                {csv?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>

                            <label>Rule Type</label>
                            <select value={newRuleType} onChange={e => setNewRuleType(e.target.value as RuleType)}>
                                <option value="required">Required (Not Empty)</option>
                                <option value="email">Email</option>
                                <option value="url">URL</option>
                                <option value="number">Number</option>
                                <option value="range">Number Range</option>
                                <option value="regex">Regex Pattern</option>
                                <option value="enum">List of Values (Enum)</option>
                                <option value="enum">List of Values (Enum)</option>
                                <option value="date">Date</option>
                                <option value="crossColumn">Cross Column Comparison</option>
                            </select>

                            {/* Dynamic Params */}
                            {renderParamInputs()}

                            <label>Severity</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                                    <input
                                        type="radio"
                                        name="severity"
                                        value="error"
                                        checked={newRuleSeverity === 'error'}
                                        onChange={() => setNewRuleSeverity('error')}
                                    /> Error
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                                    <input
                                        type="radio"
                                        name="severity"
                                        value="warning"
                                        checked={newRuleSeverity === 'warning'}
                                        onChange={() => setNewRuleSeverity('warning')}
                                    /> Warning
                                </label>
                            </div>

                            <Button onClick={addRule} disabled={!newRuleColumn} variant="secondary" icon={<Plus size={16} />}>
                                Add Rule
                            </Button>
                        </div>
                    </Card>

                    {/* Active Rules List */}
                    <Card>
                        <h3>Active Rules ({rules.length})</h3>
                        <div className="rules-list" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {rules.length === 0 && <p className="text-muted">No rules defined yet.</p>}
                            {rules.map(rule => (
                                <div key={rule.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px',
                                    background: 'var(--bg)',
                                    borderRadius: 'var(--radius-sm)',
                                    borderLeft: `4px solid ${rule.severity === 'error' ? 'var(--danger)' : 'var(--warning)'}`
                                }}>
                                    <div>
                                        <strong>{rule.column}</strong>: {rule.type}
                                        {rule.params && Object.keys(rule.params).length > 0 && (
                                            <span className="text-muted" style={{ fontSize: '0.85rem', marginLeft: '8px' }}>
                                                {rule.type === 'crossColumn'
                                                    ? `(${rule.params.operator} ${rule.params.targetColumn})`
                                                    : `(${JSON.stringify(rule.params)})`
                                                }
                                            </span>
                                        )}
                                    </div>
                                    <Button variant="ghost" onClick={() => removeRule(rule.id)} icon={<Trash2 size={14} />} />
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
                    <Card style={{ flex: 1 }}>
                        <label>Unique Key Column (for error reporting)</label>
                        <select value={keyColumn} onChange={e => setKeyColumn(e.target.value)}>
                            {csv?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </Card>
                    <Button variant="primary" onClick={runValidation} disabled={rules.length === 0}>
                        Run Validation
                    </Button>
                </div>
            </div>

            {/* Step 3: Results */}
            {result && step === 3 && (
                <div className="results-view">
                    {/* Summary Cards */}
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                        <Card style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{result.totalRows}</div>
                            <div className="text-muted">Total Rows</div>
                        </Card>
                        <Card style={{ textAlign: 'center', color: 'var(--success)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{result.validRows}</div>
                            <div className="text-muted">Valid Rows</div>
                        </Card>
                        <Card style={{ textAlign: 'center', color: result.invalidRows > 0 ? 'var(--danger)' : 'var(--text)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{result.invalidRows}</div>
                            <div className="text-muted">Rows with Issues</div>
                        </Card>
                    </div>

                    {/* Error Table */}
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Validation Errors</h3>
                            <Button variant="secondary" onClick={downloadReport} icon={<Download size={14} />} disabled={result.errors.length === 0}>
                                Export Report
                            </Button>
                        </div>
                        <div style={{ marginTop: '16px' }}>
                            {result.errors.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--success)' }}>
                                    <CheckCircle size={48} style={{ marginBottom: '16px' }} />
                                    <p>No validation errors found!</p>
                                </div>
                            ) : (
                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Row ID ({keyColumn})</th>
                                                <th>Column</th>
                                                <th>Value</th>
                                                <th>Issue</th>
                                                <th>Severity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.errors.slice(0, 100).map((err, i) => (
                                                <tr key={i}>
                                                    <td>{err.rowId}</td>
                                                    <td>{err.column}</td>
                                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {String(err.value)}
                                                    </td>
                                                    <td>{err.message}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: err.severity === 'error' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                                                            color: err.severity === 'error' ? 'var(--danger)' : 'var(--warning)',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {err.severity}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {result.errors.length > 100 && (
                                        <p className="text-muted" style={{ textAlign: 'center', padding: '10px' }}>
                                            Showing first 100 errors of {result.errors.length}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="actions" style={{ marginTop: '20px' }}>
                        <Button variant="ghost" onClick={handleReset}>Start Over</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
