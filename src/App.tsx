import { useState, useEffect } from 'react';
import { UpsertPanel } from './components/UpsertPanel';
import { DeletePanel } from './components/DeletePanel';
import { ComparePanel } from './components/ComparePanel';
import { DataStudioPanel } from './components/DataStudioPanel';
import { ValidationPanel } from './components/ValidationPanel';
import { PivotPanel } from './components/PivotPanel';
import { ProfilePanel } from './components/ProfilePanel';
import { ConvertPanel } from './components/ConvertPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { generateSampleData } from './lib/sampleData';
import { ToastProvider } from './components/ui/Toast';

import { ErrorBoundary } from './components/ui/ErrorBoundary';
import {
    ArrowUpDown, Trash2, GitCompare, Sun, Moon, Wand2, ShieldCheck,
    Table2, BarChart3, FileJson, ChevronDown, FileText, Menu, X
} from 'lucide-react';

type Tool = 'upsert' | 'delete' | 'compare' | 'studio' | 'validate' | 'pivot' | 'profile' | 'convert' | 'welcome';

import logo from './assets/logo.svg';

// CSV-specific tools (grouped)
const csvTools = [
    { id: 'upsert' as Tool, label: 'Upsert', icon: ArrowUpDown, description: 'Update & insert rows' },
    { id: 'delete' as Tool, label: 'Delete', icon: Trash2, description: 'Remove rows by ID' },
    { id: 'studio' as Tool, label: 'Data Studio', icon: Wand2, description: 'Clean, transform & map' },
    { id: 'validate' as Tool, label: 'Validate', icon: ShieldCheck, description: 'Check data quality rules' },
];

// Standalone tools
const standaloneTools = [
    { id: 'pivot' as Tool, label: 'Pivot', icon: Table2, description: 'Group & aggregate data' },
    { id: 'profile' as Tool, label: 'Profile', icon: BarChart3, description: 'Analyze data quality' },
    { id: 'convert' as Tool, label: 'Convert', icon: FileJson, description: 'CSV, JSON, XML, TSV' },
    { id: 'compare' as Tool, label: 'Compare', icon: GitCompare, description: 'Diff two datasets' },
];

// All tools combined for lookup
const allTools = [...csvTools, ...standaloneTools];

export default function App() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [activeTool, setActiveTool] = useState<Tool>('welcome');
    const [csvToolsExpanded, setCsvToolsExpanded] = useState(false);
    const [sampleFile, setSampleFile] = useState<File | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const csvToolIds = new Set(csvTools.map(tool => tool.id));
    const isCsvToolActive = csvToolIds.has(activeTool);
    const activeToolMeta = allTools.find(tool => tool.id === activeTool);
    const activeToolLabel = activeTool === 'welcome' ? 'Welcome' : (activeToolMeta?.label ?? 'Tool');
    const activeToolDescription = activeTool === 'welcome'
        ? 'Choose a workflow to start shaping your data.'
        : (activeToolMeta?.description ?? '');

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        'alt+1': () => setActiveTool('upsert'),
        'alt+2': () => setActiveTool('delete'),
        'alt+3': () => setActiveTool('studio'),
        'alt+4': () => setActiveTool('validate'),
        'alt+5': () => setActiveTool('pivot'), // Swapped order based on UI preference if needed
        'alt+6': () => setActiveTool('pivot'),
        'alt+7': () => setActiveTool('profile'),
        'alt+8': () => setActiveTool('convert'),
        'alt+9': () => setActiveTool('compare'),
        'escape': () => setActiveTool('welcome'),
    });

    const handleLoadSample = () => {
        const file = generateSampleData();
        setSampleFile(file);
        setActiveTool('studio');
        setIsSidebarOpen(false);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        if (isCsvToolActive) {
            setCsvToolsExpanded(true);
        }
    }, [isCsvToolActive]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [activeTool]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleToolClick = (toolId: Tool) => {
        setActiveTool(toolId);
        setIsSidebarOpen(false);
        // Manual control only
    };

    return (
        <ToastProvider>

            <div className={`app-shell ${isSidebarOpen ? 'has-sidebar-open' : ''}`}>
                {/* Immersive Background (Global) */}
                <div className="full-bg-container">
                    <div className="background-gradient" />
                    <div className="floating-orbs">
                        <div className="orb orb-1" />
                        <div className="orb orb-2" />
                    </div>
                </div>

                <div
                    className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`}
                    onClick={() => setIsSidebarOpen(false)}
                />

                {/* Sidebar - Always visible */}
                <aside className="sidebar">
                    <div className="sidebar-brand">
                        <div className="logo-icon"><img src={logo} alt="CSV Studio" width="22" height="22" /></div>
                        <h1 className="logo-text">CSV <span className="text-primary-400">Studio</span></h1>
                    </div>

                    <nav className="sidebar-nav">
                        {/* CSV Tools Group (Collapsible) */}
                        <div className="nav-group">
                            <button
                                className={`nav-group-header ${isCsvToolActive ? 'has-active' : ''}`}
                                onClick={() => setCsvToolsExpanded(!csvToolsExpanded)}
                                aria-expanded={csvToolsExpanded}
                            >
                                <div className="flex items-center gap-2">
                                    <FileText size={16} />
                                    <span>CSV Tools</span>
                                </div>
                                <ChevronDown
                                    size={14}
                                    className={`transition-transform duration-200 ${csvToolsExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {csvToolsExpanded && (
                                <div className="nav-group-items">
                                    {csvTools.map(tool => (
                                        <button
                                            key={tool.id}
                                            className={`nav-item ${activeTool === tool.id ? 'active' : ''}`}
                                            onClick={() => handleToolClick(tool.id)}
                                            aria-current={activeTool === tool.id ? 'page' : undefined}
                                        >
                                            <tool.icon size={18} />
                                            <span className="nav-text">
                                                <span className="nav-label">{tool.label}</span>
                                                <span className="nav-desc">{tool.description}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Standalone Tools */}
                        {standaloneTools.map(tool => (
                            <button
                                key={tool.id}
                                className={`nav-item ${activeTool === tool.id ? 'active' : ''}`}
                                onClick={() => handleToolClick(tool.id)}
                                aria-current={activeTool === tool.id ? 'page' : undefined}
                            >
                                <tool.icon size={20} />
                                <span className="nav-text">
                                    <span className="nav-label">{tool.label}</span>
                                    <span className="nav-desc">{tool.description}</span>
                                </span>
                            </button>
                        ))}
                    </nav>

                    {/* Premium Theme Toggle Switch */}
                    <div className="sidebar-footer p-4 border-t border-white/5 mt-auto">
                        <div className="sidebar-links" style={{ marginBottom: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            <a href="https://github.com/SlytherinScriptor/CSVStudio/wiki" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', margin: '0 4px' }}>Docs</a> •
                            <a href="https://github.com/SlytherinScriptor/CSVStudio" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', margin: '0 4px' }}>GitHub</a> •
                            <a href="https://github.com/SlytherinScriptor/CSVStudio/issues" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', margin: '0 4px' }}>Issues</a>
                        </div>

                        <button
                            type="button"
                            className={`theme-switch-container ${theme}`}
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                        >
                            <div className="theme-switch-track">
                                <div className="theme-icon sun">
                                    <Sun size={14} />
                                </div>
                                <div className="theme-icon moon">
                                    <Moon size={14} />
                                </div>
                                <div className="theme-knob" />
                            </div>
                            <span className="theme-label">
                                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                            </span>
                        </button>
                    </div>
                </aside>


                {/* Main Content */}
                <main className="main-content">
                    <div className="mobile-header">
                        <button
                            type="button"
                            className="sidebar-toggle"
                            onClick={() => setIsSidebarOpen(prev => !prev)}
                            aria-label={isSidebarOpen ? 'Close navigation' : 'Open navigation'}
                        >
                            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                        <div className="mobile-header-title">
                            <span className="mobile-header-label">{activeToolLabel}</span>
                            {activeToolDescription && (
                                <span className="mobile-header-desc">{activeToolDescription}</span>
                            )}
                        </div>
                        <button
                            type="button"
                            className="theme-toggle-compact"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                    {activeTool !== 'welcome' && (
                        <header className="content-header">
                            <div>
                                <h1>{activeToolLabel}</h1>
                                <p>{activeToolDescription}</p>
                            </div>
                        </header>
                    )}

                    <div className={`content-body ${activeTool === 'welcome' ? 'welcome-mode' : ''}`}>
                        <ErrorBoundary key={activeTool}>
                            {activeTool === 'welcome' && (
                                <WelcomeScreen
                                    onNavigate={(id) => setActiveTool(id as Tool)}
                                    onLoadSample={handleLoadSample}
                                />
                            )}
                            {activeTool === 'upsert' && <UpsertPanel />}
                            {activeTool === 'delete' && <DeletePanel />}
                            {activeTool === 'studio' && <DataStudioPanel initialFile={sampleFile} />}
                            {activeTool === 'pivot' && <PivotPanel />}
                            {activeTool === 'profile' && <ProfilePanel />}
                            {activeTool === 'convert' && <ConvertPanel />}
                            {activeTool === 'validate' && <ValidationPanel />}
                            {activeTool === 'compare' && <ComparePanel />}
                        </ErrorBoundary>
                    </div>
                </main>
            </div>

        </ToastProvider>
    );
}
