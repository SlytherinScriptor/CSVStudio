import { Inbox, FileQuestion, Search, Database } from 'lucide-react';
import { ReactNode } from 'react';

type EmptyStateVariant = 'default' | 'no-data' | 'no-results' | 'no-files';

interface EmptyStateProps {
    variant?: EmptyStateVariant;
    title?: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
}

const defaultContent: Record<EmptyStateVariant, { icon: ReactNode; title: string; description: string }> = {
    'default': {
        icon: <Inbox size={28} />,
        title: 'Nothing here yet',
        description: 'Get started by adding some data or uploading a file.'
    },
    'no-data': {
        icon: <Database size={28} />,
        title: 'No data available',
        description: 'There is no data to display at the moment.'
    },
    'no-results': {
        icon: <Search size={28} />,
        title: 'No results found',
        description: 'Try adjusting your search or filter criteria.'
    },
    'no-files': {
        icon: <FileQuestion size={28} />,
        title: 'No files uploaded',
        description: 'Drag and drop a CSV file or click to browse.'
    }
};

export function EmptyState({
    variant = 'default',
    title,
    description,
    icon,
    action
}: EmptyStateProps) {
    const defaults = defaultContent[variant];

    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                {icon || defaults.icon}
            </div>
            <h3 className="empty-state-title">
                {title || defaults.title}
            </h3>
            <p className="empty-state-description">
                {description || defaults.description}
            </p>
            {action && (
                <div className="empty-state-action">
                    {action}
                </div>
            )}
        </div>
    );
}
