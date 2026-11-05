import { Component } from 'react'

// Isolates 3D failures: if the WebGL canvas throws (lost context, broken
// driver, old GPU), the classroom keeps working with the 2D portrait
// instead of unmounting the whole page.
export default class StageErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    // Fallback render below; nothing else to do.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
