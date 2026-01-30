import { useRef, useState, DragEvent } from 'react';
import { Upload, FileCheck, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

interface DropZoneProps {
    label: string;
    onFile: (file: File) => void;
    accept?: string;
    name?: string;
    rowCount?: number;
    columnCount?: number;
}

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function DropZone({
    label,
    onFile,
    accept = '.csv',
    name,
    rowCount,
    columnCount
}: DropZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDrag, setIsDrag] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDrag(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDrag(false);
    };

    const validateAndProcessFile = (file: File) => {
        // Check file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showToast('Please upload a CSV file', 'error');
            return;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            showToast(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`, 'error');
            return;
        }

        setIsLoading(true);

        // Simulate processing delay for UX
        setTimeout(() => {
            onFile(file);
            setIsLoading(false);
            showToast(`${file.name} uploaded successfully`, 'success');
        }, 300);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDrag(false);
        if (e.dataTransfer.files?.[0]) {
            validateAndProcessFile(e.dataTransfer.files[0]);
        }
    };


    const hasFile = !!name;

    return (
        <div className="card">
            <label>{label}</label>
            <div
                className={`drop ${isDrag ? 'drag' : ''} ${hasFile ? 'has-file' : ''}`}
                tabIndex={0}
                onClick={() => !isLoading && inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                aria-label={`Upload ${label}`}
                role="button"
            >
                <input
                    type="file"
                    ref={inputRef}
                    accept={accept}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            validateAndProcessFile(e.target.files[0]);
                            e.target.value = ''; // Reset for re-upload
                        }
                    }}
                />
                {isLoading ? (
                    <Loader2 size={32} className="drop-icon loading" />
                ) : hasFile ? (
                    <FileCheck size={32} className="drop-icon success" />
                ) : (
                    <Upload size={32} className="drop-icon" />
                )}
                <span className="drop-text">
                    {isLoading
                        ? 'Processing...'
                        : hasFile
                            ? 'Click to replace file'
                            : 'Drag CSV file here or click to browse'}
                </span>
                {!hasFile && !isLoading && (
                    <span className="drop-hint">Max file size: {MAX_FILE_SIZE_MB}MB</span>
                )}
            </div>
            {name && (
                <div className="file-info">
                    <span className="file-name">{name}</span>
                    {(rowCount !== undefined && columnCount !== undefined) && (
                        <span className="file-stats">{rowCount.toLocaleString()} rows • {columnCount} columns</span>
                    )}
                </div>
            )}
        </div>
    );
}

