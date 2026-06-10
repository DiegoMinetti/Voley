import { useEffect, useRef } from 'react'

/**
 * Acquire a screen wake lock while `enabled` is true.
 * Re-acquires automatically on visibilitychange (after returning to the tab)
 * to work around the browser auto-releasing the lock when the tab is hidden.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Wake_Lock_API
 */
export const useWakeLock = (enabled: boolean): void => {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    let cancelled = false

    const acquire = async (): Promise<void> => {
      if (!enabled || !navigator.wakeLock) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release().catch(() => undefined)
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null
          }
        })
      } catch {
        sentinelRef.current = null
      }
    }

    const release = async (): Promise<void> => {
      if (sentinelRef.current) {
        try {
          await sentinelRef.current.release()
        } catch {
          /* ignore */
        }
        sentinelRef.current = null
      }
    }

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible' && enabled) {
        void acquire()
      } else {
        void release()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void release()
    }
  }, [enabled])
}
