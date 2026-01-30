import { useRef, useState, DragEvent } from 'react';
import { Upload, FileCheck } from 'lucide-react';

interface DropZoneProps {
    label: string;
    onFile: (file: File) => void;
    accept?: string;
    name?: string;
}

export function DropZone({ label, onFile, accept = '.csv', name }: DropZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDrag, setIsDrag] = useState(false);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDrag(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDrag(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDrag(false);
        if (e.dataTransfer.files?.[0]) {
            onFile(e.dataTransfer.files[0]);
        }
    };

    const hasFile = !!name;

    return (
        <div className="card">
            <label>{label}</label>
            <div
                className={`drop ${isDrag ? 'drag' : ''} ${hasFile ? 'has-file' : ''}`}
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                aria-label={`Upload ${label}`}
            >
                <input
                    type="file"
                    ref={inputRef}
                    accept={accept}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        if (e.target.files?.[0]) onFile(e.target.files[0]);
                    }}
                />
                {hasFile ? (
                    <FileCheck size={32} className="drop-icon success" />
                ) : (
                    <Upload size={32} className="drop-icon" />
                )}
                <span>{hasFile ? 'File loaded' : 'Drop or click to select'}</span>
            </div>
            {name && <div className="file-name">{name}</div>}
        </div>
    );
}
