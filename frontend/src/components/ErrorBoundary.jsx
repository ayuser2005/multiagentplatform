import { Component } from 'react'

/**
 * Top-level error boundary.
 *
 * Without it, any render-time exception leaves the user with a blank white
 * screen and no way to recover.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
          <p className="text-sm text-slate-500 max-w-md leading-relaxed">
            The workspace hit an unexpected error. Reloading usually clears it.
          </p>
          {this.state.error?.message && (
            <pre className="max-w-2xl overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-500">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 shadow-xs hover:bg-slate-50 cursor-pointer"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
