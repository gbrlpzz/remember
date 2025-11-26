import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
    const { login } = useAuth();
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Staggered entrance animation
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            await login(token.trim());
        } catch {
            setError('The key does not fit.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className={`login-content ${isVisible ? 'visible' : ''}`}>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className={`login-input-wrapper ${isFocused ? 'focused' : ''} ${token ? 'has-value' : ''}`}>
                        <input
                            type="password"
                            className="login-pill-input"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={isFocused ? "Access Key" : "Enter..."}
                            disabled={isLoading}
                            autoComplete="off"
                            autoFocus
                        />
                    </div>

                    {token.trim() && (
                        <button type="submit" className="login-pill-enter">
                            <span className="login-enter-icon">↵</span>
                        </button>
                    )}
                    
                    {error && (
                        <p className="login-error">{error}</p>
                    )}

                    <a 
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Mnemosyne" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="login-help"
                    >
                        Generate a key
                    </a>
                </form>
            </div>
        </div>
    );
}
