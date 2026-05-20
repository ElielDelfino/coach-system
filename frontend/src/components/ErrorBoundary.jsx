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
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const mensagem =
      this.state.error?.message || 'Ocorreu um erro inesperado na interface.';

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="max-w-md w-full border border-red-900/50 bg-red-950/20 rounded-xl p-8 text-center flex flex-col items-center gap-4">
          <span className="text-4xl">⚠️</span>
          <p className="text-red-400 font-bold text-sm uppercase tracking-widest">
            Algo deu errado
          </p>
          <p className="text-zinc-400 text-sm">{mensagem}</p>
          {import.meta.env.DEV && this.state.error?.stack && (
            <pre className="text-[10px] text-zinc-500 bg-surface-input rounded p-3 max-h-48 overflow-auto text-left w-full whitespace-pre-wrap">
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={this.handleReset}
              className="text-xs text-brand border border-brand/40 px-4 py-2 rounded hover:bg-brand/10 font-bold uppercase tracking-widest"
            >
              Tentar de novo
            </button>
            <button
              onClick={this.handleReload}
              className="text-xs text-white bg-brand px-4 py-2 rounded hover:bg-brand/90 font-bold uppercase tracking-widest"
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
