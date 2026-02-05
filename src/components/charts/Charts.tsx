/**
 * Chart Components for Analytics
 * Lightweight chart components using CSS/SVG (no external dependencies)
 */

import React from 'react';

// ===== BAR CHART (Vertical) =====
interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    height?: number;
    showValues?: boolean;
}

export function BarChart({ data, height = 200, showValues = true }: BarChartProps) {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barAreaHeight = height - 40; // Reserve space for labels

    if (data.length === 0) {
        return <div className="chart-empty">No data to display</div>;
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: `${height}px`,
                padding: '8px 0'
            }}
        >
            {/* Bar area */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '8px',
                    flex: 1,
                    minHeight: 0,
                    paddingTop: '32px' // Space for value labels
                }}
            >
                {data.map((item, i) => {
                    const barHeight = Math.max(4, (item.value / maxValue) * barAreaHeight);
                    const barColor = item.color || 'linear-gradient(180deg, #6366F1 0%, #8B5CF6 100%)';

                    return (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                minWidth: '40px',
                                height: '100%'
                            }}
                        >
                            {/* Bar with value */}
                            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                                {showValues && item.value > 0 && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            bottom: `${barHeight + 8}px`,
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            background: 'var(--bg-surface)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            border: '1px solid var(--border-color)',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {item.value.toLocaleString()}
                                    </span>
                                )}
                                <div
                                    style={{
                                        width: '80%',
                                        maxWidth: '48px',
                                        height: `${barHeight}px`,
                                        background: barColor,
                                        borderRadius: '6px 6px 0 0',
                                        transition: 'height 0.3s ease'
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Labels row */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-color)'
                }}
            >
                {data.map((item, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: '40px'
                        }}
                        title={item.label}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
}


export function HorizontalBar({ data, maxLabelWidth = 120 }: HorizontalBarProps) {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    if (data.length === 0) {
        return <div className="chart-empty">No data to display</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {data.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                        style={{
                            width: maxLabelWidth,
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                        title={item.label}
                    >
                        {item.label}
                    </span>
                    <div
                        style={{
                            flex: 1,
                            height: '14px',
                            background: 'var(--bg-soft)',
                            borderRadius: '7px',
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            style={{
                                width: `${(item.value / maxValue) * 100}%`,
                                height: '100%',
                                background: item.color || 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                                borderRadius: '7px',
                                transition: 'width 0.5s ease'
                            }}
                        />
                    </div>
                    <span
                        style={{
                            minWidth: '50px',
                            textAlign: 'right',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}
                    >
                        {item.value.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ===== DONUT/PIE CHART =====
interface PieChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    showLegend?: boolean;
}

export function PieChart({ data, size = 160, showLegend = true }: PieChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return <div className="chart-empty">No data</div>;

    // Create conic gradient
    let gradientStops = '';
    let currentPercent = 0;
    data.forEach((item, i) => {
        const percent = (item.value / total) * 100;
        gradientStops += `${item.color} ${currentPercent}% ${currentPercent + percent}%`;
        currentPercent += percent;
        if (i < data.length - 1) gradientStops += ', ';
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Donut */}
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: `conic-gradient(${gradientStops})`,
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
            >
                {/* Center hole */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '60%',
                        height: '60%',
                        background: 'var(--bg-surface)',
                        borderRadius: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {total.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total</span>
                </div>
            </div>

            {/* Legend */}
            {showLegend && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: item.color,
                                    flexShrink: 0
                                }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>
                                {item.label}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {((item.value / total) * 100).toFixed(1)}%
                            </span>
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

export function SparkLine({ data, width = 120, height = 32, color = '#6366F1', showDots = false }: SparkLineProps) {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return { x, y, value: val };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <svg width={width} height={height} style={{ display: 'block' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: size }}>
            <svg viewBox="0 0 100 60" style={{ width: '100%', height: 'auto' }}>
                {/* Background arc */}
                <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="var(--bg-soft)"
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
                />
                {/* Needle */}
                <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="18"
                    stroke="var(--text-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    transform={`rotate(${rotation} 50 50)`}
                />
                <circle cx="50" cy="50" r="4" fill="var(--text-primary)" />
            </svg>
            <div style={{ fontSize: '24px', fontWeight: 700, color: getColor(), lineHeight: 1, marginTop: '-8px' }}>
                {normalizedScore}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </div>
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
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '20px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                transition: 'all 0.2s ease'
            }}
        >
            {icon && (
                <div
                    style={{
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--color-primary-soft)',
                        borderRadius: '12px',
                        color: color || 'var(--color-primary)',
                        flexShrink: 0
                    }}
                >
                    {icon}
                </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: color || 'var(--text-primary)', lineHeight: 1.2 }}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                {subtitle && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {subtitle}
                    </div>
                )}
            </div>
            {trend && (
                <div
                    style={{
                        padding: '4px 8px',
                        borderRadius: '100px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: trend.isPositive ? 'var(--success-soft)' : 'var(--error-soft)',
                        color: trend.isPositive ? 'var(--success)' : 'var(--error)'
                    }}
                >
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
        <span
            style={{
                display: 'inline-flex',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                background: `${colors[type]}20`,
                color: colors[type]
            }}
        >
            {type}
        </span>
    );
}

// ===== PROGRESS BAR =====
interface ProgressBarProps {
    value: number; // 0-100
    color?: string;
    height?: number;
    showLabel?: boolean;
}

export function ProgressBar({ value, color, height = 8, showLabel = false }: ProgressBarProps) {
    const normalizedValue = Math.max(0, Math.min(100, value));
    const barColor = color || (normalizedValue >= 80 ? '#10b981' : normalizedValue >= 50 ? '#f59e0b' : '#ef4444');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <div
                style={{
                    flex: 1,
                    height: `${height}px`,
                    background: 'var(--bg-soft)',
                    borderRadius: `${height / 2}px`,
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        width: `${normalizedValue}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: `${height / 2}px`,
                        transition: 'width 0.5s ease'
                    }}
                />
            </div>
            {showLabel && (
                <span style={{ fontSize: '13px', fontWeight: 500, color: barColor, minWidth: '40px' }}>
                    {normalizedValue.toFixed(0)}%
                </span>
            )}
        </div>
    );
}
