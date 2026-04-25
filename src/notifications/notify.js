/**
 * Notification handler — browser push + ntfy.sh (phone)
 *
 * Phone setup:
 *   1. Install "ntfy" app on iOS or Android (free)
 *   2. Subscribe to your chosen topic in the app
 *   3. Enter that same topic in Settings here
 *   4. Done — you'll get push notifications when the signal changes
 */

export async function requestBrowserPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function isQuietHours(quietHoursEnabled, start, end) {
  if (!quietHoursEnabled) return false
  const now = new Date().getHours()
  if (start < end) return now >= start && now < end
  // Wraps midnight e.g. 23–07
  return now >= start || now < end
}

export async function sendNotification(signal, reason, settings = {}) {
  const { ntfyTopic = '', quietHoursEnabled = false, quietHoursStart = 23, quietHoursEnd = 7 } = settings

  if (isQuietHours(quietHoursEnabled, quietHoursStart, quietHoursEnd)) return

  const title = `BTC Signal: ${signal}`
  const body = reason

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>₿</text></svg>",
      tag: 'btc-signal', // Replaces previous notification instead of stacking
    })
  }

  // Phone notification via ntfy.sh
  if (ntfyTopic && ntfyTopic.trim()) {
    try {
      const priority = signal === 'HOLD' ? 'low' : signal === 'BUY' ? 'high' : 'high'
      const tags = signal === 'BUY' ? 'chart_with_upwards_trend,moneybag' : signal === 'SELL' ? 'chart_with_downwards_trend' : 'hourglass_flowing_sand'
      await fetch(`https://ntfy.sh/${ntfyTopic.trim()}`, {
        method: 'POST',
        headers: {
          'Title': title,
          'Priority': priority,
          'Tags': tags,
        },
        body,
      })
    } catch (err) {
      console.warn('ntfy.sh notification failed:', err)
    }
  }
}
