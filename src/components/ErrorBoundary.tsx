import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.message}</pre>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ 
                marginTop: '20px', 
                padding: '10px 20px', 
                background: '#000', 
                color: '#fff',
                border: 'none',
                cursor: 'pointer' 
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

