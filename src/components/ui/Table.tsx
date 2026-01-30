

interface TableProps {
    headers: string[];
    rows: any[];
    rowClassFn?: (row: any) => string;
    // Map of ColumnName -> PreviousValue (if changed)
    changedMapByRowFn?: (row: any) => Record<string, string> | null;
    title: string;
    hint?: string;
}

export function Table({ headers, rows, rowClassFn, changedMapByRowFn, title, hint }: TableProps) {
    const CAP = 2000;
    const slice = rows.length > CAP ? rows.slice(0, CAP) : rows;

    return (
        <div className="card">
            <div className="header-row" style={{ justifyContent: 'space-between' }}>
                <strong>{title}</strong>
                {hint && <span className="hint">{hint}</span>}
            </div>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            {headers.map(h => <th key={h}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {slice.map((r, i) => {
                            const changed = changedMapByRowFn ? changedMapByRowFn(r) : null;
                            const cls = rowClassFn ? rowClassFn(r) : '';
                            return (
                                <tr key={i} className={cls}>
                                    {headers.map(h => {
                                        const val = r[h] ?? '';
                                        const oldVal = changed?.[h];
                                        const isChanged = oldVal !== undefined;
                                        return (
                                            <td
                                                key={h}
                                                className={isChanged ? 'changed' : ''}
                                                title={isChanged ? `was: ${oldVal}` : undefined}
                                            >
                                                {val}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {rows.length > CAP && (
                            <tr>
                                <td colSpan={headers.length} className="hint">
                                    Showing first {CAP.toLocaleString()} of {rows.length.toLocaleString()} rows…
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
