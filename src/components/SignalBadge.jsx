const SIGNAL_STYLES = {
  BUY: 'bg-buy text-white',
  SELL: 'bg-sell text-white',
  HOLD: 'bg-hold text-white',
}

const CONFIDENCE_STYLES = {
  High: 'text-green-400',
  Medium: 'text-yellow-400',
  Low: 'text-secondary',
}

export default function SignalBadge({ signal, confidence, reason, rsi, emaShort, emaLong, price, stale, lastUpdated }) {
  const badgeClass = SIGNAL_STYLES[signal] || SIGNAL_STYLES.HOLD
  const confClass = CONFIDENCE_STYLES[confidence] || 'text-secondary'

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Price header */}
      <div className="flex items-center gap-2 text-secondary text-sm">
        {price != null ? (
          <span className="text-primary font-semibold text-lg">
            £{price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="animate-pulse">Loading price…</span>
        )}
        {stale && (
          <span className="text-hold text-xs font-medium px-2 py-0.5 rounded-full border border-hold/40">
            STALE DATA
          </span>
        )}
      </div>

      {/* Main signal badge */}
      <div
        className={`${badgeClass} rounded-2xl flex items-center justify-center font-black tracking-widest shadow-2xl`}
        style={{ minHeight: 120, minWidth: 260, fontSize: 48 }}
      >
        {signal}
      </div>

      {/* Signal detail */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className={`text-sm font-semibold ${confClass}`}>
          Confidence: {confidence}
        </span>
        <p className="text-secondary text-sm max-w-xs">{reason}</p>
        {rsi != null && (
          <p className="text-xs text-secondary/70 mt-1">
            RSI {rsi} · 9 EMA £{emaShort?.toLocaleString('en-GB') ?? '—'} · 21 EMA £{emaLong?.toLocaleString('en-GB') ?? '—'}
          </p>
        )}
        {lastUpdated && (
          <p className="text-xs text-secondary/50 mt-1">
            Updated {lastUpdated}
          </p>
        )}
      </div>
    </div>
  )
}
