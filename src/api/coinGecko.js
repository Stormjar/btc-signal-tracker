/**
 * Market data via Kraken API — free, no key required, no rate limiting.
 * Replaces CoinGecko which rate-limits server-side IPs (429 errors).
 *
 * OHLC format matches CoinGecko: [timestamp, open, high, low, close]
 * so nothing else in the codebase needs to change.
 */

const BASE = 'https://api.kraken.com/0/public'

let lastKnownPrice = null
let lastKnownOhlc = null

export async function fetchPrice() {
  const res = await fetch(`${BASE}/Ticker?pair=XBTGBP`)
  if (!res.ok) throw new Error(`Kraken price fetch failed: ${res.status}`)
  const data = await res.json()
  if (data.error?.length) throw new Error(`Kraken error: ${data.error[0]}`)
  // c[0] = last trade closed price
  const price = parseFloat(Object.values(data.result)[0].c[0])
  lastKnownPrice = price
  return price
}

export async function fetchOhlc() {
  // interval=240 = 4-hour candles, enough history for RSI(14) + EMA(21)
  const res = await fetch(`${BASE}/OHLC?pair=XBTGBP&interval=240`)
  if (!res.ok) throw new Error(`Kraken OHLC fetch failed: ${res.status}`)
  const data = await res.json()
  if (data.error?.length) throw new Error(`Kraken error: ${data.error[0]}`)
  // Kraken format: [time, open, high, low, close, vwap, volume, count]
  // We remap to [time, open, high, low, close] — index 4 stays as close price
  const candles = Object.values(data.result)[0].map(c => [
    c[0] * 1000,          // timestamp ms
    parseFloat(c[1]),     // open
    parseFloat(c[2]),     // high
    parseFloat(c[3]),     // low
    parseFloat(c[4]),     // close
  ])
  lastKnownOhlc = candles
  return candles
}

export async function fetchAll() {
  try {
    const [price, ohlc] = await Promise.all([fetchPrice(), fetchOhlc()])
    return { price, ohlc, stale: false }
  } catch (err) {
    console.error('Market data fetch error:', err.message)
    return { price: lastKnownPrice, ohlc: lastKnownOhlc, stale: true, error: err.message }
  }
}
