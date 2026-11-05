import { Component } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { stopSpeaking } from '../services/voiceService.js'

// Isolates classroom failures (3D, voice, chat): if anything in the classroom
// tree throws during render, the boundary shows an in-place recovery card
// instead of unmounting the whole app into a black screen. Speech is stopped
// on capture and on retry; the mic is released by the voice cleanup that runs
// when the failed tree unmounts.
export default class ClassroomErrorBoundary extends Component {
  state = { failed: false, message: '', stack: '' }

  static getDerivedStateFromError(error) {
    return { failed: true, message: error?.message ?? '', stack: '' }
  }

  componentDidCatch(error, info) {
    stopSpeaking()
    const stack = info?.componentStack ?? ''
    try {
      console.error('Classroom error:', error, stack)
    } catch {
      // Logging must never throw.
    }
    this.setState({ stack })
  }

  handleRetry = () => {
    stopSpeaking()
    this.setState({ failed: false, message: '' })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="card p-6 text-center sm:p-8">
          <h1 className="font-display text-2xl">The classroom hit a snag</h1>
          <p className="mt-2 text-sm text-[#9aa3bd]">
            Your saved lesson history is safe. Reload the classroom to continue learning.
          </p>
          {this.state.message && (
            <p className="mt-3 rounded-lg border border-white/10 bg-navy-950 px-3 py-2 text-left font-mono text-xs break-words text-muted-ink">
              {this.state.message}
            </p>
          )}
          {this.state.stack && (
            <details className="mt-3 text-left">
              <summary className="cursor-pointer text-xs text-[#9aa3bd]">
                Technical details
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded-lg border border-white/10 bg-navy-950 p-3 font-mono text-[11px] whitespace-pre-wrap text-muted-ink">
                {this.state.stack}
              </pre>
            </details>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              onClick={this.handleRetry}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <RotateCcw size={15} aria-hidden="true" /> Reload classroom
            </button>
            <Link to="/" className="btn-ghost px-4 py-2 text-sm">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
