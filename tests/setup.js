// Vitest setup file for Node environments
// Polyfills WebSocket if running on Node.js < 22 where native WebSocket is not present in global scope
if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    constructor(url) {
      this.url = url
      this.readyState = 0 // CONNECTING
      this.bufferedAmount = 0
      this.extensions = ''
      this.protocol = ''
      this.binaryType = 'blob'
      this.onopen = null
      this.onclose = null
      this.onerror = null
      this.onmessage = null
    }
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true
    }
  }
  globalThis.WebSocket = MockWebSocket
}
