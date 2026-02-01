import { useState } from 'react';
import { FileJson, FileCode, FileSpreadsheet, Download, Copy, ArrowRight, Check, Upload } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';
import { parseCSVFile } from '../lib/csv';
import {
    detectFormat,
    csvToJson,
    csvToXml,
    csvToTsv,
    jsonToCsv,
    xmlToCsv,
    tsvToCsv,
    formatCsvOutput,
    getFileExtension,
    type FormatType,
    type ConversionOptions
} from '../lib/formatUtils';
import type { ParsedCSV } from '../lib/csv';

const ACCEPTED_FORMATS = '.csv,.json,.xml,.tsv,.txt';

export function ConvertPanel() {
    const { showToast } = useToast();
    const [inputFormat, setInputFormat] = useState<FormatType | null>(null);
    const [outputFormat, setOutputFormat] = useState<FormatType>('json');
    const [inputContent, setInputContent] = useState('');
    const [outputContent, setOutputContent] = useState('');
    const [csv, setCsv] = useState<ParsedCSV | null>(null);
    const [fileName, setFileName] = useState('');

    // Options
    const [prettyPrint, setPrettyPrint] = useState(true);
    const [rootElement, setRootElement] = useState('data');
    const [rowElement, setRowElement] = useState('row');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const content = await file.text();
            setInputContent(content);
            setFileName(file.name);

            // Auto-detect format
            const detected = detectFormat(content);
            setInputFormat(detected);

            // Set default output format (different from input)
            if (detected === outputFormat) {
                const alternatives: FormatType[] = ['json', 'csv', 'tsv', 'xml'];
                setOutputFormat(alternatives.find(f => f !== detected) || 'json');
            }

            // If CSV, parse it
            if (detected === 'csv') {
                const parsed = await parseCSVFile(file);
                setCsv(parsed);
            } else {
                setCsv(null);
            }

            showToast(`Detected ${detected.toUpperCase()} format`, 'success');
        } catch (err) {
            showToast('Failed to read file', 'error');
        }
    };

    const handleConvert = async () => {
        if (!inputContent.trim() || !inputFormat) {
            showToast('Please upload a file first', 'error');
            return;
        }

        try {
            let rows: Record<string, any>[] = [];
            let headers: string[] = [];

            // Parse input based on format
            if (inputFormat === 'csv' && csv) {
                rows = csv.rows;
                headers = csv.headers;
            } else if (inputFormat === 'json') {
                const result = jsonToCsv(inputContent);
                if (!result) {
                    showToast('Invalid JSON format', 'error');
                    return;
                }
                rows = result.rows;
                headers = result.headers;
            } else if (inputFormat === 'xml') {
                const result = xmlToCsv(inputContent);
                if (!result) {
                    showToast('Invalid XML format', 'error');
                    return;
                }
                rows = result.rows;
                headers = result.headers;
            } else if (inputFormat === 'tsv') {
                const result = tsvToCsv(inputContent);
                if (!result) {
                    showToast('Invalid TSV format', 'error');
                    return;
                }
                rows = result.rows;
                headers = result.headers;
            } else if (inputFormat === 'csv') {
                // Parse CSV from text
                const lines = inputContent.trim().split('\n');
                headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                rows = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    const row: Record<string, any> = {};
                    headers.forEach((h, i) => {
                        row[h] = values[i] || '';
                    });
                    return row;
                });
            }

            // Convert to output format
            const options: ConversionOptions = {
                prettyPrint,
                rootElement,
                arrayName: rowElement
            };

            let output = '';
            switch (outputFormat) {
                case 'json':
                    output = csvToJson(rows, headers, options);
                    break;
                case 'xml':
                    output = csvToXml(rows, headers, options);
                    break;
                case 'tsv':
                    output = csvToTsv(rows, headers, options);
                    break;
                case 'csv':
                    output = formatCsvOutput(rows, headers);
                    break;
            }

            setOutputContent(output);
            showToast(`Converted to ${outputFormat.toUpperCase()}`, 'success');
        } catch (err) {
            showToast('Conversion failed', 'error');
        }
    };

    const handleCopy = () => {
        if (!outputContent) return;
        navigator.clipboard.writeText(outputContent).then(() => {
            showToast('Copied to clipboard', 'success');
        }).catch(() => {
            showToast('Failed to copy', 'error');
        });
    };

    const handleDownload = () => {
        if (!outputContent) return;

        const blob = new Blob([outputContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted${getFileExtension(outputFormat)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('File downloaded', 'success');
    };

    const handleClear = () => {
        setInputContent('');
        setOutputContent('');
        setCsv(null);
        setInputFormat(null);
        setFileName('');
    };

    const getFormatIcon = (format: FormatType) => {
        switch (format) {
            case 'json': return <FileJson size={18} />;
            case 'xml': return <FileCode size={18} />;
            default: return <FileSpreadsheet size={18} />;
        }
    };

    const getFormatColor = (format: FormatType) => {
        switch (format) {
            case 'json': return '#f59e0b';
            case 'xml': return '#8b5cf6';
            case 'tsv': return '#10b981';
            default: return '#3b82f6';
        }
    };

    const availableOutputs: FormatType[] = ['csv', 'json', 'xml', 'tsv'].filter(f => f !== inputFormat) as FormatType[];

    return (
        <div className="convert-panel">
            {/* Upload Section */}
            {!inputFormat ? (
                <Card>
                    <div className="convert-upload">
                        <label className="convert-dropzone">
                            <input
                                type="file"
                                accept={ACCEPTED_FORMATS}
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <Upload size={48} className="upload-icon" />
                            <h3>Upload a file to convert</h3>
                            <p>Drag & drop or click to browse</p>
                            <span className="format-badges">
                                <span className="format-badge csv">CSV</span>
                                <span className="format-badge json">JSON</span>
                                <span className="format-badge xml">XML</span>
                                <span className="format-badge tsv">TSV</span>
                            </span>
                        </label>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Conversion Flow */}
                    <Card>
                        <div className="convert-flow">
                            {/* Input Format (Auto-detected) */}
                            <div className="format-display input-format">
                                <div className="format-icon" style={{ background: `${getFormatColor(inputFormat)}20`, color: getFormatColor(inputFormat) }}>
                                    {getFormatIcon(inputFormat)}
                                </div>
                                <div className="format-info">
                                    <span className="format-label">Input</span>
                                    <span className="format-name">{inputFormat.toUpperCase()}</span>
                                    {fileName && <span className="format-file">{fileName}</span>}
                                </div>
                                <span className="auto-badge"><Check size={12} /> Auto-detected</span>
                            </div>

                            <ArrowRight size={24} className="flow-arrow" />

                            {/* Output Format (User selects) */}
                            <div className="format-display output-format">
                                <div className="format-icon" style={{ background: `${getFormatColor(outputFormat)}20`, color: getFormatColor(outputFormat) }}>
                                    {getFormatIcon(outputFormat)}
                                </div>
                                <div className="format-info">
                                    <span className="format-label">Output</span>
                                    <select
                                        value={outputFormat}
                                        onChange={e => setOutputFormat(e.target.value as FormatType)}
                                        className="format-select"
                                    >
                                        {availableOutputs.map(f => (
                                            <option key={f} value={f}>{f.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <Button variant="primary" onClick={handleConvert} className="convert-btn">
                                Convert
                            </Button>
                        </div>
                    </Card>

                    {/* Options */}
                    <Card>
                        <div className="convert-options">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={prettyPrint}
                                    onChange={e => setPrettyPrint(e.target.checked)}
                                />
                                Pretty Print (indented output)
                            </label>

                            {outputFormat === 'xml' && (
                                <>
                                    <div className="option-field">
                                        <label>Root Element</label>
                                        <input
                                            type="text"
                                            value={rootElement}
                                            onChange={e => setRootElement(e.target.value)}
                                        />
                                    </div>
                                    <div className="option-field">
                                        <label>Row Element</label>
                                        <input
                                            type="text"
                                            value={rowElement}
                                            onChange={e => setRowElement(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Output Preview */}
                    {outputContent && (
                        <Card>
                            <div className="output-header">
                                <h4>
                                    {getFormatIcon(outputFormat)}
                                    Output Preview
                                </h4>
                                <div className="output-actions">
                                    <Button variant="ghost" onClick={handleCopy}>
                                        <Copy size={16} /> Copy
                                    </Button>
                                    <Button variant="secondary" onClick={handleDownload}>
                                        <Download size={16} /> Download
                                    </Button>
                                </div>
                            </div>
                            <pre className="output-preview">
                                {outputContent.slice(0, 3000)}
                                {outputContent.length > 3000 && '\n... (truncated)'}
                            </pre>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="action-buttons">
                        <Button variant="ghost" onClick={handleClear}>
                            Start Over
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
