import { useState, useMemo } from 'react';
import { Button } from './Button';

interface ColumnPickerProps {
    allHeaders: string[];
    selected: Set<string>;
    onChange: (selected: Set<string>) => void;
}

export function ColumnPicker({ allHeaders, selected, onChange }: ColumnPickerProps) {
    const [filter, setFilter] = useState('');

    const filtered = useMemo(() => {
        const lower = filter.toLowerCase();
        return allHeaders.filter(h => h.toLowerCase().includes(lower));
    }, [allHeaders, filter]);

    const handleSelectAll = () => onChange(new Set(allHeaders));
    const handleClear = () => onChange(new Set());

    const toggle = (h: string) => {
        const next = new Set(selected);
        if (next.has(h)) next.delete(h);
        else next.add(h);
        onChange(next);
    };

    return (
        <div className="colpicker">
            <div className="toolbar">
                <strong>Columns to Preview</strong>
                <input
                    type="search"
                    placeholder="Filter columns…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                <Button variant="secondary" onClick={handleSelectAll}>Select all</Button>
                <Button variant="secondary" onClick={handleClear}>Clear</Button>
                <span className="hint">{selected.size}/{allHeaders.length} selected</span>
            </div>
            <div className="list">
                {filtered.map(h => (
                    <label className="item" key={h}>
                        <input
                            type="checkbox"
                            checked={selected.has(h)}
                            onChange={() => toggle(h)}
                        />
                        <span>{h}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
