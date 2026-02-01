import { useEffect, useState } from 'react';
import './Welcome.css';

interface WelcomeScreenProps {
    onNavigate: (toolId: string) => void;
    onLoadSample: () => void;
}

export function WelcomeScreen({ onNavigate, onLoadSample }: WelcomeScreenProps) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const features = [
        {
            icon: '🧹',
            title: 'Smart Cleaning',
            desc: 'Auto-detect and fix messy data with AI-powered suggestions',
            color: 'var(--feature-1)',
            badge: 'AI Powered'
        },
        {
            icon: '📊',
            title: 'Analytics',
            desc: 'Instant dashboards with distribution analysis and quality scoring',
            color: 'var(--feature-2)',
            badge: 'Real-time'
        },
        {
            icon: '↕️',
            title: 'Smart Merge',
            desc: 'Intelligent dataset merging with duplicate detection',
            color: 'var(--feature-3)',
            badge: 'Unique ID'
        },
        {
            icon: '✓',
            title: 'Validation',
            desc: 'Custom business logic enforcement for data integrity',
            color: 'var(--feature-4)',
            badge: 'Schema'
        },
    ];

    return (
        <div className="welcome-wrapper-integrated">
            {/* ANIMATED BACKGROUND */}
            <div className="background-elements">
                <div className="gradient-orb orb-1" style={{ left: `${mousePosition.x * 0.01}px`, top: `${mousePosition.y * 0.01}px` }}></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
                <div className="grid-background"></div>
            </div>

            {/* THREE-TIER CONTENT GRID */}
            <div className="welcome-content-grid">

                {/* TIER 1: HERO SECTION */}
                <section className="hero-section animate-slide-up">
                    <div className="hero-badge">
                        <span className="badge-dot"></span>
                        Privacy-First Data Toolkit
                    </div>

                    <h1 className="hero-title">
                        Powerful Data<br />
                        <span className="gradient-text">Transformation Made Simple</span>
                    </h1>

                    <p className="hero-subtitle">
                        Clean, transform, validate, and analyze your CSV data instantly.
                        <span className="highlight">No server uploads. No subscriptions.</span>
                    </p>

                    <div className="hero-cta">
                        <button className="btn btn-primary" onClick={() => onNavigate('studio')}>
                            <span className="btn-icon">⚡</span>
                            <span className="btn-text">Launch Studio</span>
                            <span className="btn-arrow">→</span>
                        </button>
                        <button className="btn btn-secondary" onClick={onLoadSample}>
                            <span className="btn-icon">📂</span>
                            Load Sample
                        </button>
                    </div>

                    <div className="trust-badges">
                        <div className="badge"><span className="check">✓</span> Open Source</div>
                        <div className="badge"><span className="check">✓</span> MIT License</div>
                        <div className="badge"><span className="check">✓</span> 100% Private</div>
                    </div>
                </section>

                {/* TIER 2: FEATURES SECTION */}
                <section className="features-section">
                    <h2 className="section-title animate-slide-up delay-100">Powerful Features</h2>

                    <div className="features-container">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className={`feature-card animate-slide-up delay-${(idx + 2) * 100}`}
                                /* @ts-ignore */
                                style={{ '--feature-color': feature.color }}
                                onClick={() => {
                                    // Map click to nav
                                    if (idx === 0) onNavigate('studio');
                                    if (idx === 1) onNavigate('profile');
                                    if (idx === 2) onNavigate('upsert');
                                    if (idx === 3) onNavigate('validate');
                                }}
                            >
                                <div className="card-header">
                                    <div className="card-icon">{feature.icon}</div>
                                    <div className="card-number">0{idx + 1}</div>
                                </div>
                                <div className="card-content">
                                    <h3 className="card-title">{feature.title}</h3>
                                    <p className="card-desc">{feature.desc}</p>
                                    <div className="card-badge">{feature.badge}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* TIER 3: STATS & FOOTER */}
                <section className="footer-section animate-slide-up delay-400">
                    {/* Stats Removed for Cleaner Look */}

                    <div className="bottom-cta">
                        <p className="text-sm text-gray-500">v2.1 Stable Build</p>
                    </div>
                </section>
            </div>

        </div>
    );
}
