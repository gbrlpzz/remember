import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { StorageService } from './services/storage';
import { CaptureBar } from './components/CaptureBar';
import { Feed } from './components/Feed';
import { Navigation } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { Analytics } from "@vercel/analytics/react"

function App() {
  const { user, isLoading, github, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isStorageReady, setIsStorageReady] = useState(false);
  
  // App State
  const [searchQuery, setSearchQuery] = useState('');
  
  const captureRef = useRef<{ focus: () => void, addFile: (file: File) => void, addText: (text: string) => void }>(null);

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

  // Global Event Handlers
  useEffect(() => {
      const handleGlobalDrop = (e: DragEvent) => {
          // Only handle file drops, not internal card reordering
          if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file.type.startsWith('image/')) {
                  captureRef.current?.addFile(file);
              }
          }
      };

      const handleGlobalDragOver = (e: DragEvent) => {
          // Only prevent default for file drags
          if (e.dataTransfer?.types.includes('Files')) {
              e.preventDefault();
          }
      };

      const handleGlobalDoubleClick = (e: MouseEvent) => {
          // Ignore double clicks on interactive elements
          if ((e.target as HTMLElement).closest('button, input, textarea, a, .grid-item')) return;
          captureRef.current?.focus();
      };

      const handleGlobalPaste = (e: ClipboardEvent) => {
          // Ignore paste in input fields
          if ((e.target as HTMLElement).closest('input, textarea')) return;
          
          const text = e.clipboardData?.getData('text');
          if (text && text.trim()) {
              e.preventDefault();
              captureRef.current?.addText(text.trim());
          }
          
          // Also handle pasted images
          const items = e.clipboardData?.items;
          if (items) {
              for (const item of items) {
                  if (item.type.startsWith('image/')) {
                      const file = item.getAsFile();
                      if (file) {
                          e.preventDefault();
                          captureRef.current?.addFile(file);
                          break;
                      }
                  }
              }
          }
      };

      window.addEventListener('drop', handleGlobalDrop);
      window.addEventListener('dragover', handleGlobalDragOver);
      window.addEventListener('dblclick', handleGlobalDoubleClick);
      window.addEventListener('paste', handleGlobalPaste);

      return () => {
          window.removeEventListener('drop', handleGlobalDrop);
          window.removeEventListener('dragover', handleGlobalDragOver);
          window.removeEventListener('dblclick', handleGlobalDoubleClick);
          window.removeEventListener('paste', handleGlobalPaste);
      };
  }, []);

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
      <Analytics />
      <ErrorBoundary>
        <Navigation onSearch={setSearchQuery} />

        <CaptureBar
            ref={captureRef}
            storage={storage}
            onSave={() => {
                queryClient.invalidateQueries({ queryKey: ['items'] });
            }}
        />

        <main style={{ paddingTop: 'var(--space-md)' }}>
            <Feed 
                storage={storage} 
                searchQuery={searchQuery}
            />
        </main>
      </ErrorBoundary>
    </div>
  );
}

export default App;
