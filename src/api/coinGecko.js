const BASE = 'https://api.coingecko.com/api/v3'

let lastKnownPrice = null
let lastKnownOhlc = null

export async function fetchPrice() {
  const res = await fetch(`${BASE}/simple/price?ids=bitcoin&vs_currencies=gbp`)
  if (!res.ok) throw new Error(`CoinGecko price fetch failed: ${res.status}`)
  const data = await res.json()
  lastKnownPrice = data.bitcoin.gbp
  return lastKnownPrice
}

export async function fetchOhlc(days = 30) {
  const res = await fetch(`${BASE}/coins/bitcoin/ohlc?vs_currency=gbp&days=${days}`)
  if (!res.ok) throw new Error(`CoinGecko OHLC fetch failed: ${res.status}`)
  // Each entry: [timestamp, open, high, low, close]
  const data = await res.json()
  lastKnownOhlc = data
  return data
}

export async function fetchAll() {
  try {
    const [price, ohlc] = await Promise.all([fetchPrice(), fetchOhlc(30)])
    return { price, ohlc, stale: false }
  } catch (err) {
    console.error('CoinGecko fetch error:', err)
    // Return cached data with stale flag
    return { price: lastKnownPrice, ohlc: lastKnownOhlc, stale: true, error: err.message }
  }
}
