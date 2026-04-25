import { useState } from 'react'
import { requestBrowserPermission } from '../notifications/notify.js'

export default function Settings({ settings, onSave }) {
  const [form, setForm] = useState(settings)
  const [permGranted, setPermGranted] = useState(Notification.permission === 'granted')
  const [saved, setSaved] = useState(false)

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSave() {
    onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleRequestPermission() {
    const granted = await requestBrowserPermission()
    setPermGranted(granted)
  }

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-5">
      <h2 className="text-primary font-bold text-base">Settings</h2>

      {/* Capital */}
      <Section title="Capital">
        <Field label="Starting pot (£)">
          <input
            type="number"
            min="1"
            value={form.startingPot}
            onChange={e => set('startingPot', parseFloat(e.target.value) || 0)}
            className="input"
          />
        </Field>
        <Field label="Profit target per cycle (%)">
          <input
            type="number"
            min="1"
            max="200"
            value={form.profitTargetPct}
            onChange={e => set('profitTargetPct', parseFloat(e.target.value) || 0)}
            className="input"
          />
        </Field>
        <Field label="Savings split (%)">
          <input
            type="number"
            min="0"
            max="100"
            value={form.savingsSplitPct}
            onChange={e => set('savingsSplitPct', parseFloat(e.target.value) || 0)}
            className="input"
          />
        </Field>
        <p className="text-xs text-secondary">
          Each profitable trade: {form.savingsSplitPct}% → savings, {100 - form.savingsSplitPct}% reinvested
        </p>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {!permGranted ? (
          <button onClick={handleRequestPermission} className="btn-secondary text-sm">
            Enable browser notifications
          </button>
        ) : (
          <p className="text-xs text-buy">Browser notifications enabled</p>
        )}

        <Field label="ntfy.sh topic (for phone)">
          <input
            type="text"
            placeholder="e.g. jim-btc-abc123"
            value={form.ntfyTopic}
            onChange={e => set('ntfyTopic', e.target.value)}
            className="input"
          />
        </Field>
        <div className="text-xs text-secondary space-y-1">
          <p className="font-medium text-secondary">Phone setup (free, no account):</p>
          <p>1. Install <strong className="text-primary">ntfy</strong> app (iOS / Android)</p>
          <p>2. Tap + and subscribe to your topic above</p>
          <p>3. Done — BUY/SELL alerts go straight to your phone</p>
        </div>

        <div className="flex items-center gap-3">
          <Toggle
            checked={form.quietHoursEnabled}
            onChange={v => set('quietHoursEnabled', v)}
          />
          <span className="text-sm text-secondary">Quiet hours</span>
        </div>
        {form.quietHoursEnabled && (
          <div className="flex gap-3">
            <Field label="Start (hour)">
              <input
                type="number"
                min="0"
                max="23"
                value={form.quietHoursStart}
                onChange={e => set('quietHoursStart', parseInt(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="End (hour)">
              <input
                type="number"
                min="0"
                max="23"
                value={form.quietHoursEnd}
                onChange={e => set('quietHoursEnd', parseInt(e.target.value))}
                className="input"
              />
            </Field>
          </div>
        )}
      </Section>

      <button
        onClick={handleSave}
        className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
      >
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-secondary uppercase tracking-wider">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-secondary">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-buy' : 'bg-bg'} border border-secondary/30 relative`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}
