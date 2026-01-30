import { useState, useEffect } from 'react';
import './App.css';
import { UpsertPanel } from './components/UpsertPanel';
import { DeletePanel } from './components/DeletePanel';
import { ComparePanel } from './components/ComparePanel';
import { CleanPanel } from './components/CleanPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Footer } from './components/ui/Footer';
import { ArrowUpDown, Trash2, GitCompare, Sun, Moon, Sparkles, ShieldCheck } from 'lucide-react';

type Tool = 'upsert' | 'delete' | 'compare' | 'clean' | 'validate';

const tools = [
    { id: 'upsert' as Tool, label: 'Upsert', icon: ArrowUpDown, description: 'Update & insert rows' },
    { id: 'delete' as Tool, label: 'Delete', icon: Trash2, description: 'Remove rows by ID' },
    { id: 'clean' as Tool, label: 'Clean', icon: Sparkles, description: 'Fix & standardize data' },
    { id: 'validate' as Tool, label: 'Validate', icon: ShieldCheck, description: 'Check data quality rules' },
    { id: 'compare' as Tool, label: 'Compare', icon: GitCompare, description: 'Diff two CSV files' },
];

function App() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [activeTool, setActiveTool] = useState<Tool>('upsert');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    return (
        <ToastProvider>
            <div className="app-shell">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-brand">
                        <div className="sidebar-logo">CSV</div>
                        <span className="sidebar-title">Studio</span>
                    </div>

                    <nav className="sidebar-nav">
                        {tools.map(tool => (
                            <button
                                key={tool.id}
                                className={`nav-item ${activeTool === tool.id ? 'active' : ''}`}
                                onClick={() => setActiveTool(tool.id)}
                                aria-label={`${tool.label}: ${tool.description}`}
                            >
                                <tool.icon size={20} aria-hidden="true" />
                                <div className="nav-text">
                                    <span className="nav-label">{tool.label}</span>
                                    <span className="nav-desc">{tool.description}</span>
                                </div>
                            </button>
                        ))}
                    </nav>

                    <div className="sidebar-footer">
                        <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
                            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    <header className="content-header">
                        <h1>{tools.find(t => t.id === activeTool)?.label}</h1>
                        <p>{tools.find(t => t.id === activeTool)?.description}</p>
                    </header>

                    <div className="content-body">
                        <ErrorBoundary>
                            {activeTool === 'upsert' && <UpsertPanel />}
                            {activeTool === 'delete' && <DeletePanel />}
                            {activeTool === 'clean' && <CleanPanel />}
                            {activeTool === 'validate' && <ValidationPanel />}
                            {activeTool === 'compare' && <ComparePanel />}
                        </ErrorBoundary>
                    </div>
                </main>

                <Footer />
            </div>
        </ToastProvider>
    );
}

export default App;

