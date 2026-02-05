/**
 * Chart Components for Analytics
 * Lightweight chart components using CSS/SVG (no external dependencies)
 */

import React from 'react';

// ===== HORIZONTAL BAR CHART =====
interface HorizontalBarProps {
    data: { label: string; value: number; color?: string }[];
    maxLabelWidth?: number;
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
