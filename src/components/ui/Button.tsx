import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'ok' | 'danger';
    icon?: ReactNode;
}

export function Button({ variant = 'primary', className = '', icon, children, ...props }: ButtonProps) {
    const baseClass = 'btn';
    const variantClass = variant === 'primary' ? '' : variant;

    return (
        <button
            className={`${baseClass} ${variantClass} ${className}`.trim()}
            {...props}
        >
            {icon && <span className="btn-icon">{icon}</span>}
            {children}
        </button>
    );
}
