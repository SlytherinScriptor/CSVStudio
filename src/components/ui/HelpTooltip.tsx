import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
    content: string;
}

export function HelpTooltip({ content }: HelpTooltipProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<'top' | 'bottom'>('top');
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (visible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition(rect.top < 80 ? 'bottom' : 'top');
        }
    }, [visible]);

    // Inline styles to avoid CSS conflicts
    const wrapperStyle: React.CSSProperties = {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '8px',
        verticalAlign: 'middle',
    };

    const triggerStyle: React.CSSProperties = {
        width: '18px',
        height: '18px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        border: '1.5px solid var(--border-color)',
        background: 'var(--bg-soft)',
        color: 'var(--text-muted)',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'help',
        padding: 0,
        lineHeight: 1,
    };

    const tooltipStyle: React.CSSProperties = {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1e1e2e',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        fontSize: '12px',
        color: '#e0e0e0',
        lineHeight: 1.5,
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        maxWidth: '280px',
        minWidth: '180px',
        zIndex: 99999,
        ...(position === 'top' ? { bottom: 'calc(100% + 10px)' } : { top: 'calc(100% + 10px)' }),
    };

    const arrowStyle: React.CSSProperties = {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        ...(position === 'top'
            ? { bottom: '-6px', borderTop: '6px solid #1e1e2e' }
            : { top: '-6px', borderBottom: '6px solid #1e1e2e' }),
    };

    return (
        <span style={wrapperStyle}>
            <button
                ref={triggerRef}
                type="button"
                style={triggerStyle}
                aria-label="Help"
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onFocus={() => setVisible(true)}
                onBlur={() => setVisible(false)}
            >
                <HelpCircle size={14} />
            </button>
            {visible && (
                <div style={tooltipStyle} role="tooltip">
                    {content}
                    <span style={arrowStyle} />
                </div>
            )}
        </span>
    );
}
