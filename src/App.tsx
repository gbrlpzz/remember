import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { StorageService } from './services/storage';
import { CaptureBar } from './components/CaptureBar';
import { Feed } from './components/Feed';
import { useQueryClient } from '@tanstack/react-query';

function App() {
  const { user, isLoading, github, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isStorageReady, setIsStorageReady] = useState(false);

  const storage = useMemo(() => {
    if (github) return new StorageService(github);
    return null;
  }, [github]);

  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      if (storage) {
        try {
          setInitError(null);
          await storage.init();
          setIsStorageReady(true);
        } catch (e: unknown) {
          console.error("Failed to init storage", e);
          const message = e instanceof Error ? e.message : "Failed to initialize storage";
          setInitError(message);
        }
      }
    };
    initStorage();
  }, [storage]);

  if (isLoading) {
    return (
      <div className="login-swiss">
        <div className="text-mono">LOADING...</div>
      </div>
    );
  }

  if (!user || !storage) {
    return <Login />;
  }

  if (!isStorageReady) {
    return (
      <div className="login-swiss">
        <div className="text-mono">
          {initError ? 'CONNECTION FAILED' : 'INITIALIZING...'}
        </div>
        {initError && (
          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: 'red', marginBottom: '1rem' }}>{initError}</p>
            <button onClick={logout} className="btn outline">
              RETRY LOGIN
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>MNEMOSYNE</h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <small className="text-mono">{user.login}</small>
            <img
              src={user.avatar_url}
              alt={user.login}
              style={{ width: '32px', height: '32px', filter: 'grayscale(100%)' }}
            />
          </div>
          <button onClick={logout} className="btn text" style={{ fontSize: '0.75rem' }}>
            LOGOUT
          </button>
        </div>
      </header>

      <main>
        <CaptureBar
          storage={storage}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
          }}
        />

        <Feed storage={storage} />
      </main>
    </div>
  );
}

export default App;
