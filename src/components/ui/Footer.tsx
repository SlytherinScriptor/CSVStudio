import { Github, Shield } from 'lucide-react';

const APP_VERSION = '1.0.0';
const GITHUB_URL = 'https://github.com/SlytherinScriptor/CSVStudio';

export function Footer() {
    return (
        <footer className="app-footer">
            <div className="footer-content">
                <div className="footer-left">
                    <Shield size={14} />
                    <span>Your data is processed locally and never sent to any server</span>
                </div>
                <div className="footer-right">
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        <Github size={14} />
                        <span>GitHub</span>
                    </a>
                    <span className="footer-version">v{APP_VERSION}</span>
                </div>
            </div>
        </footer>
    );
}
