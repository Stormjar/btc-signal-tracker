/**
 * BTC Signal Tracker — background server
 *
 * - Polls CoinGecko every 5 minutes
 * - Calculates RSI + EMA signals
 * - Auto-logs paper trades when signal fires (BUY on golden cross + oversold, SELL on death cross + overbought)
 * - Sends ntfy.sh push notifications to your phone on BUY or SELL
 * - Serves the built React app + REST API
 *
 * Run once with: node server.js
 * Then open: http://localhost:3001
 */

import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { fetchAll } from './src/api/coinGecko.js'
import { combineSignals } from './src/signals/combineSignals.js'
import { computePortfolio } from './src/lib/portfolio.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// DATA_DIR can be overridden by environment variable — Railway volumes mount at /data
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')
const TRADES_FILE = join(DATA_DIR, 'trades.json')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')
const DIST_DIR = join(__dirname, 'dist')

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// ── File-based storage ────────────────────────────────────────────────────────

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR)

function loadTrades() {
  if (!existsSync(TRADES_FILE)) return []
  try { return JSON.parse(readFileSync(TRADES_FILE, 'utf8')) } catch { return [] }
}

function saveTrades(trades) {
  writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2))
}

function loadSettings() {
  const defaults = {
    startingPot: 50,
    profitTargetPct: 50,
    savingsSplitPct: 50,
    ntfyTopic: '',
    quietHoursStart: 23,
    quietHoursEnd: 7,
    quietHoursEnabled: false,
  }
  if (!existsSync(SETTINGS_FILE)) {
    writeFileSync(SETTINGS_FILE, JSON.stringify(defaults, null, 2))
    return defaults
  }
  try { return { ...defaults, ...JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) } } catch { return defaults }
}

function saveSettings(settings) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

// ── Notification ──────────────────────────────────────────────────────────────

function isQuietHours(settings) {
  if (!settings.quietHoursEnabled) return false
  const now = new Date().getHours()
  const { quietHoursStart: start, quietHoursEnd: end } = settings
  if (start < end) return now >= start && now < end
  return now >= start || now < end // wraps midnight
}

async function notify(signal, reason, settings) {
  if (!settings.ntfyTopic || isQuietHours(settings)) return

  const priority = signal === 'HOLD' ? 'low' : 'high'
  const tags = signal === 'BUY'
    ? 'chart_with_upwards_trend,moneybag'
    : signal === 'SELL'
    ? 'chart_with_downwards_trend,rotating_light'
    : 'hourglass_flowing_sand'

  try {
    const res = await fetch(`https://ntfy.sh/${settings.ntfyTopic.trim()}`, {
      method: 'POST',
      headers: {
        Title: `BTC Signal: ${signal}`,
        Priority: priority,
        Tags: tags,
      },
      body: reason,
    })
    if (!res.ok) console.warn(`ntfy.sh responded ${res.status}`)
    else console.log(`[notify] Sent ${signal} notification to ntfy topic "${settings.ntfyTopic}"`)
  } catch (err) {
    console.warn('[notify] ntfy.sh failed:', err.message)
  }
}

// ── Auto trade logging ────────────────────────────────────────────────────────

function autoLogTrade(signal, price, settings) {
  const trades = loadTrades()
  const portfolio = computePortfolio(trades, settings.startingPot, settings.savingsSplitPct)

  if (signal === 'BUY' && !portfolio.openBuy) {
    trades.push({ id: Date.now(), type: 'BUY', price, timestamp: new Date().toISOString(), auto: true })
    saveTrades(trades)
    console.log(`[trade] AUTO BUY logged @ £${price}`)
    return true
  }

  if (signal === 'SELL' && portfolio.openBuy) {
    trades.push({ id: Date.now(), type: 'SELL', price, timestamp: new Date().toISOString(), auto: true })
    saveTrades(trades)
    const pnl = ((price - portfolio.openBuy.price) / portfolio.openBuy.price * 100).toFixed(2)
    console.log(`[trade] AUTO SELL logged @ £${price} (${pnl > 0 ? '+' : ''}${pnl}% vs buy)`)
    return true
  }

  return false
}

// ── State ─────────────────────────────────────────────────────────────────────

let currentState = {
  price: null,
  signal: 'HOLD',
  confidence: 'Low',
  reason: 'Starting up…',
  rsi: null,
  emaShort: null,
  emaLong: null,
  stale: false,
  lastUpdated: null,
}

let prevSignal = null

// ── Polling loop ──────────────────────────────────────────────────────────────

async function poll() {
  console.log(`[poll] Fetching market data… ${new Date().toLocaleTimeString('en-GB')}`)
  const settings = loadSettings()
  const { price, ohlc, stale } = await fetchAll()

  if (price != null) currentState.price = price
  currentState.stale = stale
  currentState.lastUpdated = new Date().toISOString()

  if (ohlc) {
    const result = combineSignals(ohlc)
    currentState = { ...currentState, ...result }

    const signalChanged = prevSignal !== null && prevSignal !== result.signal
    const isActionable = result.signal === 'BUY' || result.signal === 'SELL'

    if (signalChanged) {
      console.log(`[signal] Changed: ${prevSignal} → ${result.signal} (${result.confidence} confidence)`)

      if (isActionable && price != null) {
        autoLogTrade(result.signal, price, settings)
        await notify(result.signal, result.reason, settings)
      }
    }

    prevSignal = result.signal
  }
}

// Run immediately then on interval
poll()
setInterval(poll, POLL_INTERVAL_MS)

// ── Express API ───────────────────────────────────────────────────────────────

const app = express()
app.use(express.json())

// Serve built React app
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
}

app.get('/api/state', (req, res) => {
  const settings = loadSettings()
  const trades = loadTrades()
  const portfolio = computePortfolio(trades, settings.startingPot, settings.savingsSplitPct)
  res.json({ ...currentState, trades, portfolio })
})

app.get('/api/settings', (req, res) => {
  res.json(loadSettings())
})

app.post('/api/settings', (req, res) => {
  const current = loadSettings()
  const updated = { ...current, ...req.body }
  saveSettings(updated)
  res.json(updated)
})

app.get('/api/trades', (req, res) => {
  res.json(loadTrades())
})

// Manual trade from UI
app.post('/api/trades', (req, res) => {
  const { type, price } = req.body
  if (!type || !price) return res.status(400).json({ error: 'type and price required' })
  const trades = loadTrades()
  trades.push({ id: Date.now(), type, price, timestamp: new Date().toISOString(), auto: false })
  saveTrades(trades)
  res.json(trades)
})

// Test notification endpoint — fires a real BUY alert through the server's ntfy config
app.post('/api/test-notification', async (req, res) => {
  const settings = loadSettings()
  if (!settings.ntfyTopic) {
    return res.status(400).json({ ok: false, error: 'No ntfy topic saved in settings' })
  }
  await notify('BUY', 'Test alert — server notifications are working ✓', { ...settings, quietHoursEnabled: false })
  console.log('[test] Test notification sent')
  res.json({ ok: true, topic: settings.ntfyTopic })
})

// Catch-all: serve React app for any non-API route
app.get('*', (req, res) => {
  if (existsSync(DIST_DIR)) {
    res.sendFile(join(DIST_DIR, 'index.html'))
  } else {
    res.send('Run <code>npm run build</code> first, then restart the server.')
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n  ₿ BTC Signal Tracker running on port ${PORT}`)
  console.log(`  Polling every 5 minutes. Trades auto-logged to ${TRADES_FILE}\n`)
})
