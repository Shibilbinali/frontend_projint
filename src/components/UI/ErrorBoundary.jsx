import { Component } from 'react';

/**
 * ErrorBoundary — catches React render errors in the subtree and displays
 * a friendly recovery screen instead of crashing the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('🚨 [ErrorBoundary] Caught render error:', error);
    console.error('📋 Component stack:', info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 24px',
          gap: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>⚠️</div>
          <h2 style={{ margin: 0, color: 'var(--color-danger)', fontFamily: 'var(--font-display)' }}>
            Something went wrong
          </h2>
          <p style={{
            color: 'var(--color-text-muted)',
            maxWidth: 420,
            margin: 0,
            fontSize: '0.95rem',
            lineHeight: 1.5,
          }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button className="btn btn-primary" onClick={this.handleReset}>
            Try Again
          </button>
          {import.meta.env.DEV && this.state.error && (
            <details style={{
              textAlign: 'left',
              maxWidth: 640,
              width: '100%',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              marginTop: 8,
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: 8, fontWeight: 600 }}>
                Error Details (Dev only)
              </summary>
              <pre style={{
                overflow: 'auto',
                padding: '12px 16px',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.7rem',
                lineHeight: 1.6,
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
