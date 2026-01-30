import React from 'react';

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`card ${className}`.trim()} {...props}>
            {children}
        </div>
    );
}
