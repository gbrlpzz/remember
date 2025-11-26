import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { StorageService } from './services/storage';
import { CaptureBar } from './components/CaptureBar';
import { Feed } from './components/Feed';
import { Navigation } from './components/Navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { FilterOption, SortOption } from './types';

function App() {
  const { user, isLoading, github, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isStorageReady, setIsStorageReady] = useState(false);
  
  // App State
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  // Reference to trigger capture expansion from nav
  const captureInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddClick = () => {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // In a real implementation, we might want to pass a prop to CaptureBar to auto-focus
      // For now, focusing via ref or state is tricky without lifting state up further or using context
      // But CaptureBar is right there.
      const input = document.querySelector('.capture-area input') as HTMLInputElement;
      if (input) {
          input.focus();
      }
  };

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
      <Navigation 
        currentFilter={filterBy}
        onFilterChange={setFilterBy}
        onSortChange={setSortBy}
        onSearch={setSearchQuery}
        onAdd={handleAddClick}
        onLogout={logout}
      />

      <main style={{ paddingLeft: '60px' }}>
        <CaptureBar
          storage={storage}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
          }}
        />

        <Feed 
            storage={storage} 
            filterBy={filterBy}
            sortBy={sortBy}
            searchQuery={searchQuery}
        />
      </main>
    </div>
  );
}

export default App;
