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
                <HelpCircle size={14} />
            </button>
            {visible && (
                <div
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
