import { computePortfolio } from '../storage/trades.js'

export default function Compounder({ trades, settings }) {
  const { startingPot, profitTargetPct, savingsSplitPct } = settings
  const portfolio = computePortfolio(trades, startingPot, savingsSplitPct)

  const { potValue, totalSaved } = portfolio
  const totalValue = potValue + totalSaved

  // Project future cycles
  const reinvestRate = (profitTargetPct / 100) * (1 - savingsSplitPct / 100)
  const cycles = projectCycles(potValue, profitTargetPct / 100, savingsSplitPct / 100, 8)

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="text-primary font-bold text-base">Compounding Tracker</h2>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Active Pot" value={`£${potValue.toFixed(2)}`} />
        <Stat label="In Savings" value={`£${totalSaved.toFixed(2)}`} />
        <Stat label="Total" value={`£${totalValue.toFixed(2)}`} highlight />
      </div>

      {/* Progress bar toward savings goal */}
      <div>
        <div className="flex justify-between text-xs text-secondary mb-1">
          <span>Savings progress</span>
          <span>£{totalSaved.toFixed(2)} / target</span>
        </div>
        <div className="bg-bg rounded-full h-2 overflow-hidden">
          <div
            className="bg-buy h-2 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, (totalSaved / startingPot) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-secondary/60 mt-1 text-right">
          {savingsSplitPct}% of each profit goes to savings
        </p>
      </div>

      {/* Projection */}
      {cycles.length > 0 && (
        <div>
          <p className="text-xs text-secondary mb-2">
            Projection: {profitTargetPct}% profit target per cycle
          </p>
          <div className="flex flex-col gap-1">
            {cycles.map((c, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-secondary">Cycle {i + 1}</span>
                <span className="text-primary">Pot £{c.pot.toFixed(2)}</span>
                <span className="text-buy">Saved £{c.saved.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-secondary/60 mt-2">
            After 8 cycles: ~£{cycles[7]?.saved.toFixed(2)} saved, ~£{cycles[7]?.pot.toFixed(2)} active pot
          </p>
        </div>
      )}
    </div>
  )
}

function projectCycles(startPot, profitRate, savingsRate, count) {
  const rows = []
  let pot = startPot
  let saved = 0
  for (let i = 0; i < count; i++) {
    const profit = pot * profitRate
    const toSave = profit * savingsRate
    const toReinvest = profit - toSave
    saved += toSave
    pot += toReinvest
    rows.push({ pot: parseFloat(pot.toFixed(2)), saved: parseFloat(saved.toFixed(2)) })
  }
  return rows
}

function Stat({ label, value, highlight }) {
  return (
    <div className="bg-bg rounded-xl p-3 flex flex-col gap-1">
      <span className="text-secondary text-xs">{label}</span>
      <span className={`font-bold text-base ${highlight ? 'text-buy' : 'text-primary'}`}>{value}</span>
    </div>
  )
}
