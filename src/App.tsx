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
        <div style={{ fontWeight: 600, letterSpacing: '-0.04em', fontSize: '1.1rem' }}>MNEMOSYNE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={logout} className="btn text" style={{ fontSize: '0.8rem', color: '#999' }}>
            EXIT
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
