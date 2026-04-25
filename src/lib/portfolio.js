/**
 * Pure portfolio computation — no browser dependencies.
 * Shared between the React app and server.js.
 */
export function computePortfolio(trades, startingPot, savingsSplitPct) {
  let pot = startingPot
  let totalSaved = 0
  let wins = 0
  let losses = 0
  let totalPnl = 0
  let openBuy = null

  for (const t of trades) {
    if (t.type === 'BUY') {
      openBuy = t
    } else if (t.type === 'SELL' && openBuy) {
      const pnl = (t.price - openBuy.price) / openBuy.price * pot
      totalPnl += pnl
      if (pnl > 0) {
        wins++
        const saved = pnl * (savingsSplitPct / 100)
        const reinvested = pnl - saved
        totalSaved += saved
        pot = pot + reinvested
      } else {
        losses++
        pot = Math.max(0, pot + pnl)
      }
      openBuy = null
    }
  }

  return {
    potValue: parseFloat(pot.toFixed(2)),
    totalSaved: parseFloat(totalSaved.toFixed(2)),
    wins,
    losses,
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    openBuy,
  }
}
