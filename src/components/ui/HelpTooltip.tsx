import { useState, useRef, useEffect, type ReactNode } from 'react';

interface HelpTooltipProps {
    content: string;
    children?: ReactNode;
}

export function HelpTooltip({ content, children }: HelpTooltipProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<'top' | 'bottom'>('top');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Show below if too close to top
            setPosition(rect.top < 80 ? 'bottom' : 'top');
        }
    }, [visible]);

    return (
        <span className="help-tooltip-wrapper">
            <button
                ref={triggerRef}
                type="button"
                className="help-tooltip-trigger"
                aria-label="Help"
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onFocus={() => setVisible(true)}
                onBlur={() => setVisible(false)}
            >
                {children || '?'}
            </button>
            {visible && (
                <div
                    ref={tooltipRef}
                    className={`help-tooltip-content help-tooltip-${position}`}
                    role="tooltip"
                >
                    {content}
                    <span className="help-tooltip-arrow" />
                </div>
            )}
        </span>
    );
}
