import { useEffect, useRef } from 'react'

export const useWakeLock = (enabled: boolean): void => {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    const acquire = async (): Promise<void> => {
      if (!enabled || !navigator.wakeLock) {
        return
      }

      try {
        sentinelRef.current = await navigator.wakeLock.request('screen')
      } catch {
        sentinelRef.current = null
      }
    }

    void acquire()

    return () => {
      if (sentinelRef.current) {
        void sentinelRef.current.release()
      }
      sentinelRef.current = null
    }
  }, [enabled])
}
