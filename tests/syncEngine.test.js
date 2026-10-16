import { describe, it, expect } from 'vitest'
import { calculateTargetTime, DRIFT_THRESHOLD_SECONDS } from '../src/lib/syncEngine'

describe('Watch Together Synchronization Engine', () => {
  it('drift threshold is configured appropriately to 1.5s', () => {
    expect(DRIFT_THRESHOLD_SECONDS).toBe(1.5)
  })

  it('keeps exact time when video is paused', () => {
    const sentTime = 42.5
    const sentTimestamp = Date.now() - 500 // 500ms ago
    const target = calculateTargetTime(sentTime, sentTimestamp, false)
    expect(target).toBe(42.5)
  })

  it('compensates for network latency when playing at 1x speed', () => {
    const sentTime = 10.0
    const sentTimestamp = Date.now() - 1000 // 1000ms (1 second) of network transit
    const target = calculateTargetTime(sentTime, sentTimestamp, true, 1.0)
    // Target should be approx 11.0s (within small execution tolerance)
    expect(target).toBeGreaterThanOrEqual(10.9)
    expect(target).toBeLessThan(11.2)
  })

  it('compensates for latency when playing at 1.5x playback rate', () => {
    const sentTime = 20.0
    const sentTimestamp = Date.now() - 1000 // 1000ms ago
    const target = calculateTargetTime(sentTime, sentTimestamp, true, 1.5)
    // Target should be 20.0 + 1.0 * 1.5 = 21.5s
    expect(target).toBeGreaterThanOrEqual(21.4)
    expect(target).toBeLessThan(21.7)
  })
})
