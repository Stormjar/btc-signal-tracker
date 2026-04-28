import { useState, useEffect, useRef, useCallback } from 'react'
import { loadSettings, saveSettings } from './storage/trades.js'
import { requestBrowserPermission } from './notifications/notify.js'
import { computePortfolio } from './lib/portfolio.js'
import SignalBadge from './components/SignalBadge.jsx'
import PaperTrader from './components/PaperTrader.jsx'
import Compounder from './components/Compounder.jsx'
import Settings from './components/Settings.jsx'
import LivePosition from './components/LivePosition.jsx'

// Poll the server for current state every 30 seconds
const POLL_INTERVAL_MS = 30 * 1000

async function fetchState() {
  const res = await fetch('/api/state')
  if (!res.ok) throw new Error(`Server responded ${res.status}`)
  return res.json()
}

async function postSettings(settings) {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error(`Settings save failed ${res.status}`)
  return res.json()
}

async function postManualTrade(type, price) {
  const res = await fetch('/api/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, price }),
  })
  if (!res.ok) throw new Error(`Trade post failed ${res.status}`)
  return res.json()
}

export default function App() {
  const [price, setPrice] = useState(null)
  const [signalData, setSignalData] = useState({ signal: 'HOLD', confidence: 'Low', reason: 'Connecting to server…' })
  const [stale, setStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [trades, setTrades] = useState([])
  const [portfolio, setPortfolio] = useState({ potValue: 0, totalSaved: 0, wins: 0, losses: 0, totalPnl: 0, openBuy: null })
  const [settings, setSettings] = useState(() => loadSettings())
  const [livePosition, setLivePosition] = useState(null)
  const [liveHistory, setLiveHistory] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState(false)

  const poll = useCallback(async () => {
    try {
      const data = await fetchState()
      setServerError(false)
      if (data.price != null) setPrice(data.price)
      setSignalData({
        signal: data.signal,
        confidence: data.confidence,
        reason: data.reason,
        rsi: data.rsi,
        emaShort: data.emaShort,
        emaLong: data.emaLong,
      })
      setStale(data.stale)
      if (data.lastUpdated) {
        setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      }
      if (data.trades) setTrades(data.trades)
      if (data.portfolio) setPortfolio(data.portfolio)
      if (data.livePosition !== undefined) setLivePosition(data.livePosition)
      if (data.liveHistory) setLiveHistory(data.liveHistory)

      // Sync settings displayed in UI with server settings
      if (data.settings) setSettings(s => ({ ...s, ...data.settings }))
    } catch {
      setServerError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [poll])

  useEffect(() => {
    requestBrowserPermission()
  }, [])

  async function handleSettingsSave(newSettings) {
    try {
      await postSettings(newSettings)
    } catch {
      // Server unreachable — fall back to localStorage
      saveSettings(newSettings)
    }
    setSettings(newSettings)
    setShowSettings(false)
  }

  async function handleLiveBuy(gbpSpent, btcPrice) {
    const res = await fetch('/api/live-position/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gbpSpent, btcPrice }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setLivePosition(data.position)
    setLiveHistory(data.history)
  }

  async function handleLiveSell(btcPrice) {
    const res = await fetch('/api/live-position/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ btcPrice }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setLivePosition(data.position)
    setLiveHistory(data.history)
  }

  async function handleManualTrade(type) {
    if (price == null) return
    try {
      const updated = await postManualTrade(type, price)
      setTrades(updated)
      setPortfolio(computePortfolio(updated, settings.startingPot, settings.savingsSplitPct))
    } catch (err) {
      alert(`Could not log trade: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-primary flex flex-col">
      <div className="max-w-md mx-auto w-full px-4 py-6 flex flex-col gap-6">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-primary text-lg tracking-tight">₿ BTC Signal</h1>
            <p className="text-secondary text-xs">BTC/GBP · auto-tracked</p>
          </div>
          <div className="flex items-center gap-2">
            {serverError && (
              <span className="text-xs text-sell px-2 py-0.5 rounded-full border border-sell/40">
                server offline
              </span>
            )}
            <button
              onClick={() => setShowSettings(s => !s)}
              className="text-secondary hover:text-primary transition-colors p-2 rounded-xl hover:bg-surface"
              aria-label="Settings"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Settings panel */}
        {showSettings && (
          <Settings settings={settings} onSave={handleSettingsSave} />
        )}

        {/* Signal hero */}
        <section className="bg-surface rounded-2xl p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full border-4 border-secondary/30 border-t-buy animate-spin" />
              <p className="text-secondary text-sm">Connecting to server…</p>
            </div>
          ) : (
            <SignalBadge
              signal={signalData.signal}
              confidence={signalData.confidence}
              reason={signalData.reason}
              rsi={signalData.rsi}
              emaShort={signalData.emaShort}
              emaLong={signalData.emaLong}
              price={price}
              stale={stale}
              lastUpdated={lastUpdated}
            />
          )}
        </section>

        {/* Live trade advice */}
        {!loading && (
          <section className="bg-surface rounded-2xl p-5">
            <h2 className="text-primary font-bold text-base mb-3">Your £{settings.startingPot} on Coinbase</h2>
            <LiveAdvice
              signal={signalData.signal}
              confidence={signalData.confidence}
              price={price}
              pot={settings.startingPot}
              profitTargetPct={settings.profitTargetPct}
            />
          </section>
        )}

        {/* Live position tracker */}
        {!loading && (
          <LivePosition
            position={livePosition}
            history={liveHistory}
            currentPrice={price}
            signal={signalData.signal}
            onBuy={handleLiveBuy}
            onSell={handleLiveSell}
          />
        )}

        {/* Paper trading */}
        {!loading && (
          <PaperTrader
            signal={signalData.signal}
            price={price}
            trades={trades}
            portfolio={portfolio}
            onManualTrade={handleManualTrade}
            settings={settings}
          />
        )}

        {/* Compounding tracker */}
        {!loading && (
          <Compounder trades={trades} settings={settings} />
        )}

        {/* Chart toggle */}
        <button
          onClick={() => setShowChart(s => !s)}
          className="text-secondary text-xs hover:text-primary transition-colors text-center py-2"
        >
          {showChart ? 'Hide' : 'Show'} indicator values
        </button>
        {showChart && (
          <section className="bg-surface rounded-2xl p-5">
            <h2 className="text-primary font-bold text-base mb-3">Indicators</h2>
            <div className="text-sm text-secondary space-y-2">
              <p>RSI (14): <span className="text-primary">{signalData.rsi ?? '—'}</span></p>
              <p>9 EMA: <span className="text-primary">£{signalData.emaShort?.toLocaleString('en-GB') ?? '—'}</span></p>
              <p>21 EMA: <span className="text-primary">£{signalData.emaLong?.toLocaleString('en-GB') ?? '—'}</span></p>
            </div>
            <a
              href="https://www.coingecko.com/en/coins/bitcoin/gbp"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs text-blue-400 underline"
            >
              View full chart on CoinGecko →
            </a>
          </section>
        )}

        <footer className="text-center text-xs text-secondary/40 pb-4">
          Paper trading only · Not financial advice · Trades auto-logged by server
        </footer>
      </div>
    </div>
  )
}

function LiveAdvice({ signal, confidence, price, pot, profitTargetPct }) {
  if (signal === 'BUY') {
    const targetPrice = price ? price * (1 + profitTargetPct / 100) : null
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-buy text-2xl font-black">BUY</span>
          <span className="text-secondary text-sm">signal active</span>
        </div>
        <p className="text-primary text-sm">
          Deploy <strong>£{pot.toFixed(2)}</strong> on Coinbase now.
        </p>
        {targetPrice && (
          <p className="text-secondary text-xs">
            Target sell: ~£{targetPrice.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (+{profitTargetPct}%)
          </p>
        )}
        {confidence === 'Low' && (
          <p className="text-hold text-xs">Low confidence — consider waiting for a Medium or High signal</p>
        )}
        <a
          href="https://www.coinbase.com/trade/BTC-GBP"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-center py-2 px-4 rounded-xl bg-buy text-white font-bold text-sm hover:brightness-110 transition-all"
        >
          Open Coinbase →
        </a>
      </div>
    )
  }

  if (signal === 'SELL') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sell text-2xl font-black">SELL</span>
          <span className="text-secondary text-sm">signal active</span>
        </div>
        <p className="text-primary text-sm">If you're holding BTC, consider selling now.</p>
        <a
          href="https://www.coinbase.com/trade/BTC-GBP"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-center py-2 px-4 rounded-xl bg-sell text-white font-bold text-sm hover:brightness-110 transition-all"
        >
          Open Coinbase →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-hold text-xl font-black">HOLD</span>
        <span className="text-secondary text-sm">— no action needed</span>
      </div>
      <p className="text-secondary text-xs">
        Keep your £{pot.toFixed(2)} ready. The server will notify you the moment a BUY or SELL signal fires.
      </p>
    </div>
  )
}
