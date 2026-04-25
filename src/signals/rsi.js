/**
 * RSI (Relative Strength Index) — 14-period
 * BUY  < 35 (oversold)
 * SELL > 65 (overbought)
 * HOLD otherwise
 */
export function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  // Wilder's smoothing for remaining candles
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function rsiSignal(rsi) {
  if (rsi === null) return { signal: 'HOLD', reason: 'Insufficient data' }
  if (rsi < 35) return { signal: 'BUY', reason: `RSI oversold (${rsi.toFixed(1)})` }
  if (rsi > 65) return { signal: 'SELL', reason: `RSI overbought (${rsi.toFixed(1)})` }
  return { signal: 'HOLD', reason: `RSI neutral (${rsi.toFixed(1)})` }
}
