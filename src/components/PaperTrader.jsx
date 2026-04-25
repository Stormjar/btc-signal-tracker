export default function PaperTrader({ signal, price, trades, portfolio, onManualTrade, settings }) {
  const { potValue, totalSaved, wins, losses, totalPnl, openBuy } = portfolio

  const canBuy = signal === 'BUY' && !openBuy
  const canSell = signal === 'SELL' && openBuy != null

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-primary font-bold text-base">Paper Trading</h2>
        <span className="text-xs text-secondary/60">auto-logged by server</span>
      </div>

      {/* Manual override buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onManualTrade('BUY')}
          disabled={!canBuy || price == null}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all
            disabled:opacity-30 disabled:cursor-not-allowed
            enabled:bg-buy enabled:text-white enabled:hover:brightness-110 enabled:active:scale-95"
        >
          Log Buy
        </button>
        <button
          onClick={() => onManualTrade('SELL')}
          disabled={!canSell || price == null}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all
            disabled:opacity-30 disabled:cursor-not-allowed
            enabled:bg-sell enabled:text-white enabled:hover:brightness-110 enabled:active:scale-95"
        >
          Log Sell
        </button>
      </div>

      {openBuy && (
        <p className="text-xs text-secondary text-center">
          Open position: bought at £{openBuy.price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {openBuy.auto && <span className="text-secondary/50"> (auto)</span>}
          {price && (
            <span className={price > openBuy.price ? ' text-buy' : ' text-sell'}>
              {' '}({price > openBuy.price ? '+' : ''}
              {(((price - openBuy.price) / openBuy.price) * 100).toFixed(2)}%)
            </span>
          )}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Pot" value={`£${potValue.toFixed(2)}`} />
        <Stat label="Saved" value={`£${totalSaved.toFixed(2)}`} />
        <Stat
          label="P&L"
          value={`${totalPnl >= 0 ? '+' : ''}£${totalPnl.toFixed(2)}`}
          highlight={totalPnl > 0 ? 'buy' : totalPnl < 0 ? 'sell' : null}
        />
      </div>

      <div className="flex justify-center gap-6 text-xs text-secondary">
        <span className="text-buy">{wins} wins</span>
        <span className="text-sell">{losses} losses</span>
        <span>{wins + losses} trades</span>
      </div>

      {/* Recent trades */}
      {trades.length > 0 && (
        <div className="mt-1">
          <p className="text-xs text-secondary mb-2">Trade history</p>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
            {[...trades].reverse().slice(0, 20).map(t => (
              <div key={t.id} className="flex justify-between items-center text-xs">
                <span className={t.type === 'BUY' ? 'text-buy' : 'text-sell'}>
                  {t.type}
                  {t.auto && <span className="text-secondary/50 ml-1 text-[10px]">auto</span>}
                </span>
                <span className="text-secondary">£{t.price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-secondary/50">
                  {new Date(t.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {' '}
                  {new Date(t.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
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
      <span className={`font-bold text-base ${colour}`}>{value}</span>
    </div>
  )
}
