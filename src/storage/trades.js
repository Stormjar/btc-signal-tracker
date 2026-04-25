export { computePortfolio } from '../lib/portfolio.js'

const TRADES_KEY = 'btc_paper_trades'
const SETTINGS_KEY = 'btc_settings'

export function loadTrades() {
  try {
    return JSON.parse(localStorage.getItem(TRADES_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveTrades(trades) {
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades))
}

export function addTrade(trade) {
  const trades = loadTrades()
  trades.push({ ...trade, id: Date.now() })
  saveTrades(trades)
  return trades
}

export function loadSettings() {
  const defaults = {
    startingPot: 50,
    profitTargetPct: 50,
    savingsSplitPct: 50,
    ntfyTopic: '',
    quietHoursStart: 23,
    quietHoursEnd: 7,
    quietHoursEnabled: false,
    isLiveMode: false,
    livePot: 50,
  }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }
  } catch {
    return defaults
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
