

interface Option {
    id: string;
    label: string;
}

interface SegmentedControlProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
    return (
        <div className="segmented" role="tablist">
            {options.map(opt => (
                <button
                    key={opt.id}
                    className={value === opt.id ? 'active' : ''}
                    role="tab"
                    aria-selected={value === opt.id}
                    onClick={() => onChange(opt.id)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
