/**
 * Exponential Moving Average + crossover detection
 * Short EMA: 9-period   Long EMA: 21-period
 * BUY  = golden cross (9 crosses above 21)
 * SELL = death cross  (9 crosses below 21)
 * HOLD = no crossover
 */
export function calculateEMA(closes, period) {
  if (closes.length < period) return []
  const k = 2 / (period + 1)
  const emas = []
  // Seed with SMA
  let sum = 0
  for (let i = 0; i < period; i++) sum += closes[i]
  emas[period - 1] = sum / period
  for (let i = period; i < closes.length; i++) {
    emas[i] = closes[i] * k + emas[i - 1] * (1 - k)
  }
  return emas
}

export function emaSignal(closes) {
  const short = calculateEMA(closes, 9)
  const long = calculateEMA(closes, 21)

  if (short.length < 2 || long.length < 2) {
    return { signal: 'HOLD', reason: 'Insufficient data', shortEma: null, longEma: null }
  }

  const n = closes.length - 1
  const prevN = n - 1

  const shortCurr = short[n]
  const longCurr = long[n]
  const shortPrev = short[prevN]
  const longPrev = long[prevN]

  if (!shortCurr || !longCurr || !shortPrev || !longPrev) {
    return { signal: 'HOLD', reason: 'EMA data insufficient', shortEma: shortCurr, longEma: longCurr }
  }

  const goldenCross = shortPrev <= longPrev && shortCurr > longCurr
  const deathCross = shortPrev >= longPrev && shortCurr < longCurr

  const diff = ((shortCurr - longCurr) / longCurr * 100).toFixed(2)

  if (goldenCross) {
    return { signal: 'BUY', reason: 'EMA golden cross detected', shortEma: shortCurr, longEma: longCurr, diff }
  }
  if (deathCross) {
    return { signal: 'SELL', reason: 'EMA death cross detected', shortEma: shortCurr, longEma: longCurr, diff }
  }

  const trend = shortCurr > longCurr ? 'above' : 'below'
  return {
    signal: 'HOLD',
    reason: `9 EMA ${trend} 21 EMA (${diff > 0 ? '+' : ''}${diff}%)`,
    shortEma: shortCurr,
    longEma: longCurr,
    diff,
  }
}
