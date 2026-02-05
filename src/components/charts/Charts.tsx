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
