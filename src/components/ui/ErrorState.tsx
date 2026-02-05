import { AlertTriangle, RefreshCw, XCircle, WifiOff, FileWarning } from 'lucide-react';
import { ReactNode } from 'react';

type ErrorVariant = 'default' | 'network' | 'file' | 'permission';

interface ErrorStateProps {
    variant?: ErrorVariant;
    title?: string;
    description?: string;
    error?: Error | string;
    icon?: ReactNode;
    onRetry?: () => void;
    retryLabel?: string;
}

const defaultContent: Record<ErrorVariant, { icon: ReactNode; title: string; description: string }> = {
    'default': {
        icon: <XCircle size={28} />,
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.'
    },
    'network': {
        icon: <WifiOff size={28} />,
        title: 'Connection error',
        description: 'Unable to connect. Please check your internet connection.'
    },
    'file': {
        icon: <FileWarning size={28} />,
        title: 'File error',
        description: 'There was a problem processing your file. Please check the format and try again.'
    },
    'permission': {
        icon: <AlertTriangle size={28} />,
        title: 'Access denied',
        description: 'You don\'t have permission to perform this action.'
    }
};

export function ErrorState({
    variant = 'default',
    title,
    description,
    error,
    icon,
    onRetry,
    retryLabel = 'Try again'
}: ErrorStateProps) {
    const defaults = defaultContent[variant];
    const errorMessage = error instanceof Error ? error.message : error;

    return (
        <div className="error-state">
            <div className="error-state-icon">
                {icon || defaults.icon}
            </div>
            <h3 className="error-state-title">
                {title || defaults.title}
            </h3>
            <p className="error-state-description">
                {description || defaults.description}
            </p>
            {errorMessage && (
                <div className="error-state-details">
                    <code className="text-xs text-muted">{errorMessage}</code>
                </div>
            )}
            {onRetry && (
                <button
                    className="btn btn-secondary mt-4"
                    onClick={onRetry}
                >
                    <RefreshCw size={16} />
                    {retryLabel}
                </button>
            )}
        </div>
    );
}
