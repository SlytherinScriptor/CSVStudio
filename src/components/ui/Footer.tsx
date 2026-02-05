import { Github, Shield, ExternalLink } from 'lucide-react';
import logo from '../../assets/logo.svg';

const APP_VERSION = '1.0.0';
const GITHUB_URL = 'https://github.com/SlytherinScriptor/CSVStudio';

export function Footer() {
    return (
        <footer className="app-footer">
            <div className="footer-content">
                {/* Left: Logo and branding */}
                <div className="footer-left">
                    <div className="footer-logo">
                        <div className="footer-logo-icon">
                            <img src={logo} alt="CSV Studio" />
                        </div>
                        <span>CSV Studio</span>
                    </div>
                    <span className="footer-version">v{APP_VERSION}</span>
                </div>

                {/* Center: Privacy notice */}
                <div className="footer-center">
                    <Shield size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    <span>100% client-side processing • Your data never leaves your device</span>
                </div>

                {/* Right: Links */}
                <div className="footer-right">
                    <a
                        href="https://github.com/SlytherinScriptor/CSVStudio/wiki"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        Docs
                    </a>
                    <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        <Github size={14} />
                        <span>GitHub</span>
                    </a>
                    <a
                        href="https://github.com/SlytherinScriptor/CSVStudio/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        <ExternalLink size={14} />
                        <span>Feedback</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
