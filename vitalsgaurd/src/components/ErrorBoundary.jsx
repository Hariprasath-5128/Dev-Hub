import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface it somewhere a developer can actually find it — an uncaught
    // render error previously just unmounted the whole tree to a blank page.
    console.error('VitalsGuard UI crashed:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #fff5f7 0%, #fff0f3 34%, #ffe4e9 62%, #fff5f7 100%)',
        fontFamily: "'Inter', sans-serif", padding: 24,
      }}>
        <div style={{
          maxWidth: 440, background: '#fff', borderRadius: 20, padding: '2rem',
          boxShadow: '0 16px 48px rgba(20,30,60,0.12)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Something went wrong</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
            This section hit an unexpected error and couldn't render. Your session is still
            active — you can try again, or reload the page.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #dfe6f2', background: '#fff', color: '#22415f', fontWeight: 700, cursor: 'pointer' }}
            >
              Reload page
            </button>
          </div>
          {/* Shown always (not just in dev) while this is still an internal build —
              makes it possible to screenshot the real error instead of guessing. */}
          <pre style={{ marginTop: 16, textAlign: 'left', fontSize: 11, color: '#b3401f', background: '#fff3f0', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 160 }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      </div>
    );
  }
}
