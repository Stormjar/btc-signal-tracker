import { useState } from 'react'

export default function LivePosition({ position, history, currentPrice, signal, onBuy, onSell }) {
  const [buyForm, setBuyForm] = useState({ gbpSpent: '50', btcPrice: currentPrice?.toFixed(2) ?? '' })
  const [sellPrice, setSellPrice] = useState(currentPrice?.toFixed(2) ?? '')
  const [mode, setMode] = useState(null) // null | 'buy' | 'sell'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Live P&L on open position
  const currentValue = position && currentPrice
    ? position.btcAmount * currentPrice
    : null
  const livePnl = currentValue != null ? currentValue - position.gbpSpent : null
  const livePnlPct = livePnl != null ? (livePnl / position.gbpSpent) * 100 : null

  async function handleBuy() {
    setError(null)
    setBusy(true)
    try {
      await onBuy(parseFloat(buyForm.gbpSpent), parseFloat(buyForm.btcPrice))
      setMode(null)
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  async function handleSell() {
    setError(null)
    setBusy(true)
    try {
      await onSell(parseFloat(sellPrice))
      setMode(null)
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-primary font-bold text-base">Live Position</h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sell/20 text-sell">
          REAL MONEY
        </span>
      </div>

      {/* No open position */}
      {!position && (
        <div className="flex flex-col gap-3">
          <p className="text-secondary text-sm">
            {signal === 'BUY'
              ? 'Signal is BUY — record your Coinbase purchase below.'
              : 'No open position. Record a buy when you purchase on Coinbase.'}
          </p>

          {mode !== 'buy' ? (
            <button
              onClick={() => {
                setBuyForm({ gbpSpent: '50', btcPrice: currentPrice?.toFixed(2) ?? '' })
                setMode('buy')
              }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-buy text-white hover:brightness-110 transition-all active:scale-95"
            >
              I've bought BTC
            </button>
          ) : (
            <div className="flex flex-col gap-3 bg-bg rounded-xl p-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Record purchase</p>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary">Amount spent (£)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={buyForm.gbpSpent}
                  onChange={e => setBuyForm(f => ({ ...f, gbpSpent: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary">BTC price you paid (£)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={buyForm.btcPrice}
                  onChange={e => setBuyForm(f => ({ ...f, btcPrice: e.target.value }))}
                  className="input"
                />
                {currentPrice && (
                  <button
                    onClick={() => setBuyForm(f => ({ ...f, btcPrice: currentPrice.toFixed(2) }))}
                    className="text-xs text-blue-400 text-left hover:text-blue-300"
                  >
                    Use current price (£{currentPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </button>
                )}
              </div>
              {error && <p className="text-xs text-sell">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleBuy}
                  disabled={busy || !buyForm.gbpSpent || !buyForm.btcPrice}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-buy text-white disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  {busy ? 'Saving…' : 'Confirm buy'}
                </button>
                <button
                  onClick={() => { setMode(null); setError(null) }}
                  className="px-4 py-2.5 rounded-xl text-sm text-secondary border border-secondary/30 hover:text-primary transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Open position */}
      {position && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Spent" value={`£${position.gbpSpent.toFixed(2)}`} />
            <Stat
              label="Current value"
              value={currentValue != null ? `£${currentValue.toFixed(2)}` : '—'}
            />
            <Stat
              label="P&L"
              value={livePnl != null ? `${livePnl >= 0 ? '+' : ''}£${livePnl.toFixed(2)}` : '—'}
              highlight={livePnl != null ? (livePnl >= 0 ? 'buy' : 'sell') : null}
            />
            <Stat
              label="Return"
              value={livePnlPct != null ? `${livePnlPct >= 0 ? '+' : ''}${livePnlPct.toFixed(2)}%` : '—'}
              highlight={livePnlPct != null ? (livePnlPct >= 0 ? 'buy' : 'sell') : null}
            />
          </div>

          <p className="text-xs text-secondary">
            Bought {position.btcAmount.toFixed(8)} BTC @ £{position.btcPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {' · '}{new Date(position.openedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {' '}{new Date(position.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>

          {signal === 'SELL' && (
            <p className="text-xs font-semibold text-sell">
              ⚠ SELL signal active — consider closing this position
            </p>
          )}

          {mode !== 'sell' ? (
            <button
              onClick={() => {
                setSellPrice(currentPrice?.toFixed(2) ?? '')
                setMode('sell')
              }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-sell text-white hover:brightness-110 transition-all active:scale-95"
            >
              I've sold BTC
            </button>
          ) : (
            <div className="flex flex-col gap-3 bg-bg rounded-xl p-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Record sale</p>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondary">BTC price you sold at (£)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                  className="input"
                />
                {currentPrice && (
                  <button
                    onClick={() => setSellPrice(currentPrice.toFixed(2))}
                    className="text-xs text-blue-400 text-left hover:text-blue-300"
                  >
                    Use current price (£{currentPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </button>
                )}
              </div>
              {sellPrice && position && (
                <p className="text-xs text-secondary">
                  You'd get back:{' '}
                  <span className={(position.btcAmount * parseFloat(sellPrice)) >= position.gbpSpent ? 'text-buy font-semibold' : 'text-sell font-semibold'}>
                    £{(position.btcAmount * parseFloat(sellPrice)).toFixed(2)}
                    {' '}({((position.btcAmount * parseFloat(sellPrice) - position.gbpSpent) / position.gbpSpent * 100) >= 0 ? '+' : ''}
                    {((position.btcAmount * parseFloat(sellPrice) - position.gbpSpent) / position.gbpSpent * 100).toFixed(2)}%)
                  </span>
                </p>
              )}
              {error && <p className="text-xs text-sell">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSell}
                  disabled={busy || !sellPrice}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-sell text-white disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  {busy ? 'Saving…' : 'Confirm sale'}
                </button>
                <button
                  onClick={() => { setMode(null); setError(null) }}
                  className="px-4 py-2.5 rounded-xl text-sm text-secondary border border-secondary/30 hover:text-primary transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trade history */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-secondary mb-2">Real trade history</p>
          <div className="flex flex-col gap-2">
            {[...history].reverse().map((h, i) => (
              <div key={i} className="bg-bg rounded-xl p-3 flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">{new Date(h.openedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  <span className={h.pnl >= 0 ? 'text-buy font-bold' : 'text-sell font-bold'}>
                    {h.pnl >= 0 ? '+' : ''}£{h.pnl.toFixed(2)} ({h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between text-xs text-secondary/70">
                  <span>Buy £{h.btcPrice.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  <span>Sell £{h.sellPrice.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  <span>£{h.gbpSpent} → £{h.gbpReturned}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-secondary flex justify-between">
            <span>Total real P&L:</span>
            <span className={history.reduce((s, h) => s + h.pnl, 0) >= 0 ? 'text-buy font-bold' : 'text-sell font-bold'}>
              {history.reduce((s, h) => s + h.pnl, 0) >= 0 ? '+' : ''}
              £{history.reduce((s, h) => s + h.pnl, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }) {
  const colour = highlight === 'buy' ? 'text-buy' : highlight === 'sell' ? 'text-sell' : 'text-primary'
  return (
    <div className="bg-bg rounded-xl p-3 flex flex-col gap-1">
      <span className="text-secondary text-xs">{label}</span>
      <span className={`font-bold text-sm ${colour}`}>{value}</span>
    </div>
  )
}
