/**
 * Chart Components for Analytics
 * Lightweight chart components using CSS/SVG (no external dependencies)
 */

import React from 'react';

// ===== BAR CHART =====
interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    height?: number;
    showValues?: boolean;
    animate?: boolean;
}

export function BarChart({ data, height = 200, showValues = true, animate = true }: BarChartProps) {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="chart-bar" style={{ height }}>
            <div className="bar-container">
                {data.map((item, i) => {
                    const barHeight = (item.value / maxValue) * 100;
                    return (
                        <div key={i} className="bar-item">
                            <div
                                className="bar-fill"
                                style={{
                                    height: `${barHeight}%`,
                                    background: item.color || 'var(--accent)',
                                    animationDelay: animate ? `${i * 50}ms` : '0ms'
                                }}
                            >
                                {showValues && item.value > 0 && (
                                    <span className="bar-value">{item.value.toLocaleString()}</span>
                                )}
                            </div>
                            <span className="bar-label" title={item.label}>{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ===== HORIZONTAL BAR CHART =====
interface HorizontalBarProps {
    data: { label: string; value: number; color?: string }[];
    maxLabelWidth?: number;
}

export function HorizontalBar({ data, maxLabelWidth = 120 }: HorizontalBarProps) {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="chart-horizontal-bar">
            {data.map((item, i) => (
                <div key={i} className="hbar-row">
                    <span className="hbar-label" style={{ width: maxLabelWidth }} title={item.label}>
                        {item.label}
                    </span>
                    <div className="hbar-track">
                        <div
                            className="hbar-fill"
                            style={{
                                width: `${(item.value / maxValue) * 100}%`,
                                background: item.color || 'linear-gradient(90deg, var(--accent), #c084fc)'
                            }}
                        />
                    </div>
                    <span className="hbar-value">{item.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

// ===== PIE CHART =====
interface PieChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    showLegend?: boolean;
}

export function PieChart({ data, size = 160, showLegend = true }: PieChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return <div className="chart-empty">No data</div>;

    let cumulativePercent = 0;
    const segments = data.map(item => {
        const percent = (item.value / total) * 100;
        const startAngle = cumulativePercent * 3.6; // 3.6 = 360/100
        cumulativePercent += percent;
        return { ...item, percent, startAngle };
    });

    // Create conic gradient
    let gradientStops = '';
    let currentPercent = 0;
    segments.forEach(seg => {
        gradientStops += `${seg.color} ${currentPercent}% ${currentPercent + seg.percent}%`;
        currentPercent += seg.percent;
        if (currentPercent < 100) gradientStops += ', ';
    });

    return (
        <div className="chart-pie-container">
            <div
                className="chart-pie"
                style={{
                    width: size,
                    height: size,
                    background: `conic-gradient(${gradientStops})`
                }}
            >
                <div className="pie-center">
                    <span className="pie-total">{total.toLocaleString()}</span>
                    <span className="pie-label">Total</span>
                </div>
            </div>
            {showLegend && (
                <div className="pie-legend">
                    {segments.map((seg, i) => (
                        <div key={i} className="legend-item">
                            <span className="legend-dot" style={{ background: seg.color }} />
                            <span className="legend-label">{seg.label}</span>
                            <span className="legend-value">{seg.percent.toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ===== SPARKLINE =====
interface SparkLineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    showDots?: boolean;
}

export function SparkLine({ data, width = 120, height = 32, color = 'var(--accent)', showDots = false }: SparkLineProps) {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return { x, y, value: val };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <svg className="chart-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {showDots && points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
            ))}
        </svg>
    );
}

// ===== QUALITY GAUGE =====
interface QualityGaugeProps {
    score: number; // 0-100
    size?: number;
    label?: string;
}

export function QualityGauge({ score, size = 120, label = 'Quality' }: QualityGaugeProps) {
    const normalizedScore = Math.max(0, Math.min(100, score));
    const rotation = (normalizedScore / 100) * 180 - 90;

    const getColor = () => {
        if (normalizedScore >= 80) return '#10b981';
        if (normalizedScore >= 60) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="chart-gauge" style={{ width: size }}>
            <svg viewBox="0 0 100 60" className="gauge-svg">
                {/* Background arc */}
                <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="var(--surface)"
                    strokeWidth="8"
                    strokeLinecap="round"
                />
                {/* Value arc */}
                <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${normalizedScore * 1.26} 126`}
                    className="gauge-fill"
                />
                {/* Needle */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="18"
                    stroke="var(--text)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    transform={`rotate(${rotation} 50 50)`}
                    className="gauge-needle"
                />
                <circle cx="50" cy="50" r="4" fill="var(--text)" />
            </svg>
            <div className="gauge-value" style={{ color: getColor() }}>{normalizedScore}%</div>
            <div className="gauge-label">{label}</div>
        </div>
    );
}

// ===== STAT CARD =====
interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
    return (
        <div className="chart-stat-card">
            {icon && <div className="stat-icon" style={{ color: color || 'var(--accent)' }}>{icon}</div>}
            <div className="stat-content">
                <span className="stat-title">{title}</span>
                <span className="stat-value" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
                {subtitle && <span className="stat-subtitle">{subtitle}</span>}
            </div>
            {trend && (
                <div className={`stat-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </div>
            )}
        </div>
    );
}

// ===== DATA TYPE BADGE =====
interface TypeBadgeProps {
    type: 'text' | 'number' | 'numeric' | 'date' | 'boolean' | 'mixed';
}

export function TypeBadge({ type }: TypeBadgeProps) {
    const colors: Record<string, string> = {
        text: '#3b82f6',
        number: '#10b981',
        numeric: '#10b981',
        date: '#8b5cf6',
        boolean: '#f59e0b',
        mixed: '#6b7280'
    };

    return (
        <span className="type-badge" style={{ background: `${colors[type]}20`, color: colors[type] }}>
            {type}
        </span>
    );
}
