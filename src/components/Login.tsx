import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
    const { login } = useAuth();
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            await login(token.trim());
        } catch (err) {
            setError('Invalid token. Please check and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-swiss">
            <h1 style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: '1rem' }}>MNEMOSYNE</h1>
            <p style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', marginBottom: '3rem' }}>
                Minimal memory storage.
            </p>

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <input
                    type="password"
                    className="input-swiss"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="GITHUB TOKEN"
                    disabled={isLoading}
                    autoComplete="off"
                />
                
                {error && (
                    <p style={{ color: 'red', marginTop: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </p>
                )}

                <div style={{ marginTop: '2rem' }}>
                    <button type="submit" className="btn" disabled={isLoading || !token.trim()}>
                        {isLoading ? 'CONNECTING...' : 'CONNECT'} →
                    </button>
                </div>
            </form>

            <p style={{ marginTop: '4rem', fontSize: '0.875rem', color: '#999' }}>
                Need a token?{' '}
                <a 
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Mnemosyne" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'underline' }}
                >
                    Generate here
                </a>
                {' '}(requires repo scope)
            </p>
        </div>
    );
}
