import { useState, useMemo, useEffect } from 'react';
import { BarChart3, PieChart, AlertTriangle, CheckCircle, Info, Download, TrendingUp, Activity, FileSpreadsheet, Layers, Copy } from 'lucide-react';
import { Card } from './ui/Card';
import { DropZone } from './ui/DropZone';
import { Button } from './ui/Button';
import { HelpTooltip } from './ui/HelpTooltip';
import { useToast } from './ui/Toast';
import { parseTabularFile, ACCEPTED_TABULAR_FORMATS, type ParsedData } from '../lib/fileParser';
import {
    getDataProfile,
    getCorrelationMatrix,
    getDataQualityScore,
    type DataProfile
} from '../lib/profilingUtils';


// Quality Score Ring Component
import { QualityGauge, BarChart, StatCard, TypeBadge } from './charts/Charts';

export function ProfilePanel() {
    const { showToast } = useToast();
    const [data, setData] = useState<ParsedData | null>(null);
    const [loading, setLoading] = useState(false);


    // Alias for compatibility
    const parsedData = data;
    const [profile, setProfile] = useState<DataProfile | null>(null);
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

    useEffect(() => {
        if (parsedData) {
            try {
                const dataProfile = getDataProfile(parsedData.rows, parsedData.headers);
                setProfile(dataProfile);
                setSelectedColumn(null);
                showToast(`Profile generated for ${parsedData.rows.length} rows`, 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to profile data', 'error');
            }
        } else {
            setProfile(null);
            setSelectedColumn(null);
        }
    }, [parsedData, showToast]);

    const handleClear = () => {
        setData(null);
    };

    const handleFile = async (file: File) => {
        setLoading(true);
        try {
            const parsed = await parseTabularFile(file);
            setData(parsed);
            showToast(`${file.name} loaded successfully`, 'success');
        } catch (error) {
            showToast('Failed to parse file', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate quality score
    const qualityScore = useMemo(() => {
        if (!profile) return 0;
        return getDataQualityScore(profile);
    }, [profile]);

    // Get numeric columns for correlation
    const numericColumns = useMemo(() => {
        if (!profile) return [];
        return profile.columns
            .filter(c => c.type === 'numeric')
            .map(c => c.column);
    }, [profile]);

    // Correlation matrix
    const correlation = useMemo(() => {
        if (!parsedData || numericColumns.length < 2) return null;
        return getCorrelationMatrix(parsedData.rows, numericColumns);
    }, [parsedData, numericColumns]);

    // Get selected column stats
    const selectedStats = useMemo(() => {
        if (!profile || !selectedColumn) return null;
        return profile.columns.find(c => c.column === selectedColumn) || null;
    }, [profile, selectedColumn]);

    // Quality breakdown
    const qualityBreakdown = useMemo(() => {
        if (!profile) return [];
        return [
            { label: 'Completeness', value: profile.completeness, color: '#22c55e' },
            { label: 'No Duplicates', value: 100 - (profile.duplicateRows / profile.rowCount) * 100, color: '#3b82f6' },
            { label: 'Data Variety', value: Math.min(100, (profile.columns.reduce((s, c) => s + c.uniqueCount, 0) / profile.rowCount) * 10), color: '#8b5cf6' }
        ];
    }, [profile]);



    const formatNumber = (num: number | undefined, decimals = 2) => {
        if (num === undefined) return '-';
        return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
    };

    const handleExportReport = () => {
        if (!profile) return;

        const report = `
DATA PROFILE REPORT
===================
Generated: ${new Date().toLocaleString()}

OVERVIEW
--------
Rows: ${profile.rowCount.toLocaleString()}
Columns: ${profile.columnCount}
Data Quality Score: ${qualityScore}%
Duplicate Rows: ${profile.duplicateRows.toLocaleString()}
Completeness: ${profile.completeness.toFixed(1)}%

COLUMN SUMMARY
--------------
${profile.columns.map(col => `
${col.column}
  Type: ${col.type}
  Fill Rate: ${col.fillRate.toFixed(1)}%
  Unique Values: ${col.uniqueCount}
  Top Value: ${col.topValues[0]?.value || 'N/A'} (${col.topValues[0]?.percentage.toFixed(1) || 0}%)
  ${col.type === 'numeric' ? `Min: ${col.min}, Max: ${col.max}, Mean: ${col.mean?.toFixed(2)}, Median: ${col.median?.toFixed(2)}` : ''}
`).join('')}
        `.trim();

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data_profile_report.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Report downloaded', 'success');
    };

    return (
        <div className="profile-panel">
            {!parsedData ? (
                <DropZone
                    label={loading ? "Analyzing..." : "Upload Data to Profile"}
                    onFile={handleFile}
                    accept={ACCEPTED_TABULAR_FORMATS}
                />
            ) : profile && (
                <div className="profile-content fade-slide-in">
                    {/* Overview Cards with Quality Ring */}
                    {/* Overview Cards with Quality Ring */}
                    <div className="stats-grid">
                        <div className="stat-card" style={{ display: 'grid', placeItems: 'center', padding: '24px' }}>
                            <QualityGauge score={qualityScore} label="Overall Quality" />
                        </div>

                        <StatCard
                            title="Total Rows"
                            value={profile.rowCount}
                            icon={<Layers size={20} />}
                            color="var(--accent)"
                        />

                        <StatCard
                            title="Total Columns"
                            value={profile.columnCount}
                            icon={<FileSpreadsheet size={20} />}
                            color="#3b82f6"
                        />

                        <StatCard
                            title="Duplicate Rows"
                            value={profile.duplicateRows}
                            icon={<Copy size={20} />}
                            color={profile.duplicateRows > 0 ? 'var(--warning)' : 'var(--success)'}
                            subtitle={`${((profile.duplicateRows / profile.rowCount) * 100).toFixed(1)}% of total`}
                        />
                    </div>

                    {/* Quality Breakdown */}
                    <Card>
                        <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={18} />
                            Quality Breakdown
                            <HelpTooltip content="Shows different aspects contributing to overall data quality" />
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            {qualityBreakdown.map((item, idx) => (
                                <div key={idx}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 500 }}>{item.label}</span>
                                        <span style={{ color: item.color, fontWeight: 600 }}>{item.value.toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${item.value}%`, background: item.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Column Summary */}
                    <Card>
                        <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} />
                            Column Summary
                            <HelpTooltip content="Click a column to see detailed statistics and histogram" />
                        </h4>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="profile-table">
                                <thead>
                                    <tr>
                                        <th>Column</th>
                                        <th>Type</th>
                                        <th>Fill Rate</th>
                                        <th>Unique</th>
                                        <th>Top Value</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.columns.map(col => (
                                        <tr
                                            key={col.column}
                                            onClick={() => setSelectedColumn(col.column)}
                                            style={{
                                                cursor: 'pointer',
                                                background: selectedColumn === col.column ? 'var(--surface-hover)' : undefined
                                            }}
                                        >
                                            <td style={{ fontWeight: 500 }}>{col.column}</td>
                                            <td>
                                                <TypeBadge type={col.type} />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="progress-bar" style={{ width: '60px', height: '6px' }}>
                                                        <div
                                                            className="progress-fill"
                                                            style={{
                                                                width: `${col.fillRate}%`,
                                                                background: col.fillRate >= 90 ? 'var(--success)' : col.fillRate >= 70 ? 'var(--warning)' : 'var(--danger)'
                                                            }}
                                                        />
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem' }}>{col.fillRate.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td>{col.uniqueCount.toLocaleString()}</td>
                                            <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {col.topValues[0]?.value || '-'}
                                            </td>
                                            <td>
                                                {col.fillRate >= 90 ? (
                                                    <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                                                ) : col.fillRate >= 70 ? (
                                                    <Info size={16} style={{ color: 'var(--warning)' }} />
                                                ) : (
                                                    <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Selected Column Details with Histogram */}
                    {selectedStats && (
                        <Card className="fade-slide-in">
                            <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PieChart size={18} />
                                Column: {selectedStats.column}
                                <TypeBadge type={selectedStats.type} />
                            </h4>

                            <div className="stats-grid" style={{ marginBottom: '20px' }}>
                                <StatCard title="Total Values" value={selectedStats.totalCount} color="var(--accent)" />
                                <StatCard
                                    title="Null/Empty"
                                    value={selectedStats.nullCount}
                                    color={selectedStats.nullCount > 0 ? 'var(--warning)' : 'var(--success)'}
                                />
                                <StatCard title="Unique Values" value={selectedStats.uniqueCount} color="var(--accent)" />
                                <StatCard
                                    title="Fill Rate"
                                    value={`${selectedStats.fillRate.toFixed(1)}%`}
                                    color={selectedStats.fillRate >= 90 ? 'var(--success)' : 'var(--warning)'}
                                />
                            </div>

                            {/* Numeric Stats */}
                            {(selectedStats.type === 'numeric' || selectedStats.type === 'mixed') && selectedStats.mean !== undefined && (
                                <div style={{ marginBottom: '20px' }}>
                                    <h5 style={{ margin: '0 0 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={16} />
                                        Numeric Statistics
                                    </h5>
                                    <div className="stats-grid">
                                        <StatCard title="Min" value={formatNumber(selectedStats.min)} />
                                        <StatCard title="Max" value={formatNumber(selectedStats.max)} />
                                        <StatCard title="Mean" value={formatNumber(selectedStats.mean)} />
                                        <StatCard title="Median" value={formatNumber(selectedStats.median)} />
                                        <StatCard title="Std Dev" value={formatNumber(selectedStats.stdDev)} />
                                    </div>
                                </div>
                            )}

                            {/* Value Distribution Histogram */}
                            <div>
                                <h5 style={{ margin: '0 0 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BarChart3 size={16} />
                                    Value Distribution (Top 10)
                                </h5>
                                <BarChart
                                    data={selectedStats.topValues.map(tv => ({
                                        label: String(tv.value),
                                        value: tv.count,
                                        color: 'var(--accent)'
                                    }))}
                                    height={240}
                                />
                            </div>
                        </Card>
                    )}

                    {/* Correlation Matrix */}
                    {correlation && correlation.columns.length >= 2 && (
                        <Card>
                            <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={18} />
                                Correlation Matrix
                                <HelpTooltip content="Shows relationships between numeric columns. Blue = positive, Red = negative. Stronger colors = stronger correlation." />
                            </h4>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="correlation-table">
                                    <thead>
                                        <tr>
                                            <th></th>
                                            {correlation.columns.map(col => (
                                                <th key={col} style={{ writingMode: 'vertical-lr', textAlign: 'left', padding: '8px 4px' }}>
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {correlation.matrix.map((row, i) => (
                                            <tr key={correlation.columns[i]}>
                                                <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{correlation.columns[i]}</td>
                                                {row.map((val, j) => {
                                                    const absVal = Math.abs(val || 0);
                                                    const isPositive = val !== null && val > 0;
                                                    const bgColor = val === null ? 'var(--surface)' :
                                                        val === 1 ? 'var(--accent)' :
                                                            isPositive ? `rgba(59, 130, 246, ${absVal * 0.8})` :
                                                                `rgba(239, 68, 68, ${absVal * 0.8})`;
                                                    return (
                                                        <td
                                                            key={j}
                                                            style={{
                                                                background: bgColor,
                                                                color: absVal > 0.4 ? 'white' : 'inherit',
                                                                textAlign: 'center',
                                                                padding: '10px',
                                                                minWidth: '60px',
                                                                fontWeight: absVal > 0.7 ? 600 : 400,
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {val !== null ? val.toFixed(2) : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="action-buttons">
                        <Button variant="ghost" onClick={handleClear}>
                            Start Over
                        </Button>
                        <button className="export-btn" onClick={handleExportReport}>
                            <Download size={16} />
                            Export Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
