import { calculateRSI, rsiSignal } from './rsi.js'
import { emaSignal } from './ema.js'

/**
 * Combine RSI + EMA signals into a final signal with confidence.
 * BUY:  both agree BUY  → High confidence
 * SELL: both agree SELL → High confidence
 * One agrees, one HOLD  → Medium confidence
 * Mixed (one BUY, one SELL) → HOLD, Low
 */
export function combineSignals(ohlcData) {
  if (!ohlcData || ohlcData.length < 22) {
    return {
      signal: 'HOLD',
      confidence: 'Low',
      reason: 'Insufficient market data',
      rsi: null,
      emaShort: null,
      emaLong: null,
    }
  }

  // Extract closing prices from OHLC: [timestamp, open, high, low, close]
  const closes = ohlcData.map(c => c[4])

  const rsi = calculateRSI(closes)
  const rsiResult = rsiSignal(rsi)
  const emaResult = emaSignal(closes)

  const rsiSig = rsiResult.signal
  const emaSig = emaResult.signal

  let signal, confidence, reason

  if (rsiSig === emaSig && rsiSig !== 'HOLD') {
    // Both agree on BUY or SELL
    signal = rsiSig
    confidence = 'High'
    reason = `${rsiResult.reason} + ${emaResult.reason}`
  } else if (rsiSig === 'HOLD' && emaSig !== 'HOLD') {
    signal = emaSig
    confidence = 'Medium'
    reason = `${emaResult.reason} (RSI neutral)`
  } else if (emaSig === 'HOLD' && rsiSig !== 'HOLD') {
    signal = rsiSig
    confidence = 'Medium'
    reason = `${rsiResult.reason} (EMA neutral)`
  } else if (rsiSig !== emaSig && rsiSig !== 'HOLD' && emaSig !== 'HOLD') {
    // Conflicting signals
    signal = 'HOLD'
    confidence = 'Low'
    reason = `Mixed signals: RSI says ${rsiSig}, EMA says ${emaSig}`
  } else {
    signal = 'HOLD'
    confidence = 'Low'
    reason = `${rsiResult.reason} · ${emaResult.reason}`
  }

  return {
    signal,
    confidence,
    reason,
    rsi: rsi ? parseFloat(rsi.toFixed(1)) : null,
    emaShort: emaResult.shortEma ? parseFloat(emaResult.shortEma.toFixed(2)) : null,
    emaLong: emaResult.longEma ? parseFloat(emaResult.longEma.toFixed(2)) : null,
  }
}
