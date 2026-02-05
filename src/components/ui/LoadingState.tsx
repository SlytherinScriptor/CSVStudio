

interface LoadingStateProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
    message = 'Loading...',
    size = 'md'
}: LoadingStateProps) {
    const spinnerClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';

    return (
        <div className="loading-state">
            <div className={`spinner ${spinnerClass}`} />
            {message && <p className="loading-state-text">{message}</p>}
        </div>
    );
}

interface SkeletonProps {
    variant?: 'text' | 'heading' | 'avatar' | 'button' | 'card';
    width?: string;
    height?: string;
    className?: string;
}

export function Skeleton({
    variant = 'text',
    width,
    height,
    className = ''
}: SkeletonProps) {
    const variantClass = `skeleton-${variant}`;

    return (
        <div
            className={`skeleton ${variantClass} ${className}`}
            style={{ width, height }}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="card">
            <div className="flex items-center gap-3 mb-4">
                <Skeleton variant="avatar" />
                <div className="grow">
                    <Skeleton variant="heading" width="60%" />
                    <Skeleton variant="text" width="40%" className="mt-2" />
                </div>
            </div>
            <Skeleton variant="text" />
            <Skeleton variant="text" className="mt-2" />
            <Skeleton variant="text" width="80%" className="mt-2" />
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i}>
                                <Skeleton variant="text" width="80px" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        <tr key={rowIdx}>
                            {Array.from({ length: cols }).map((_, colIdx) => (
                                <td key={colIdx}>
                                    <Skeleton variant="text" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
