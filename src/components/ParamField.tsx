import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { hints } from '../data/clinicalHints'

interface ParamFieldProps {
  label: string
  hintKey?: string
  value: number | string | boolean
  type?: 'number' | 'select' | 'toggle' | 'range'
  options?: string[]
  min?: number
  max?: number
  step?: number
  unit?: string
  onChange: (v: number | string | boolean) => void
  highlight?: boolean
}

export function ParamField({ label, hintKey, value, type = 'number', options, min, max, step = 1, unit, onChange, highlight }: ParamFieldProps) {
  const [showHint, setShowHint] = useState(false)
  const hint = hintKey ? hints[hintKey] : null

  return (
    <div className={`relative flex items-center gap-2 py-0.5 px-2 transition-all ${highlight ? 'ring-1 ring-yellow-400/40 bg-yellow-400/5' : ''}`}
      style={{ minHeight: '22px' }}>

      {/* Label column */}
      <div className="flex items-center gap-1 shrink-0" style={{ width: '160px' }}>
        {highlight && <span className="text-yellow-400 text-xs font-bold leading-none">★</span>}
        <span className="text-xs leading-tight" style={{ color: highlight ? '#fbbf24' : '#9ca3af' }}>{label}</span>
        {hint && (
          <button
            onClick={() => setShowHint(true)}
            className="shrink-0 hover:text-blue-400 transition-colors"
            style={{ color: '#374151' }}
          >
            <HelpCircle size={10} />
          </button>
        )}
      </div>

      {/* Separator */}
      <div className="shrink-0" style={{ width: '1px', height: '14px', background: '#252525' }} />

      {/* Value column */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {type === 'number' && (
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              value={value as number}
              min={min}
              max={max}
              step={step}
              onChange={e => onChange(parseFloat(e.target.value) || 0)}
              className="px-1.5 py-0 rounded text-xs text-right font-mono outline-none focus:ring-1 focus:ring-blue-500/50"
              style={{ background: '#0d1117', border: '1px solid #374151', color: '#e5e7eb', width: '80px', height: '18px' }}
            />
            {unit && <span className="text-xs shrink-0" style={{ color: '#4b5563' }}>{unit}</span>}
          </div>
        )}

        {type === 'range' && (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range"
              value={value as number}
              min={min}
              max={max}
              step={step}
              onChange={e => onChange(parseFloat(e.target.value))}
              className="flex-1 h-1"
              style={{ accentColor: '#3b82f6' }}
            />
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="text-xs font-mono font-semibold" style={{ color: '#e5e7eb', minWidth: '42px', textAlign: 'right' }}>
                {value}
              </span>
              {unit && <span className="text-xs shrink-0" style={{ color: '#4b5563' }}>{unit}</span>}
            </div>
          </div>
        )}

        {type === 'select' && options && (
          <select
            value={value as string}
            onChange={e => onChange(e.target.value)}
            className="px-1.5 py-0 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500/50 ml-auto"
            style={{
              background: '#0d1117',
              border: '1px solid #374151',
              color: '#e5e7eb',
              minWidth: '120px',
              height: '18px',
              fontSize: '11px',
            }}
          >
            {options.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )}

        {type === 'toggle' && (
          <button
            onClick={() => onChange(!(value as boolean))}
            className="px-2.5 py-0 rounded text-xs font-semibold transition-all ml-auto shrink-0"
            style={{
              background: value ? '#052e16' : '#0e0e0e',
              border: `1px solid ${value ? '#166534' : '#374151'}`,
              color: value ? '#4ade80' : '#6b7280',
              height: '18px',
              minWidth: '40px',
            }}
          >
            {value ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      {/* Hint Popup */}
      {showHint && hint && (
        <div
          className="fixed z-50 w-96 rounded-lg shadow-2xl p-4"
          style={{ background: '#1e2435', border: '1px solid #3b82f6', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: '#93c5fd' }}>
              {hint.title}
              {hint.unit && <span className="ml-2 text-xs font-normal" style={{ color: '#6b7280' }}>[{hint.unit}]</span>}
            </span>
            <button onClick={() => setShowHint(false)} style={{ color: '#6b7280' }}><X size={14} /></button>
          </div>
          <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>{hint.description}</p>
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded" style={{ background: '#111111' }}>
              <span className="font-semibold text-green-400">↑ 上げると: </span>
              <span style={{ color: '#d1d5db' }}>{hint.increase}</span>
            </div>
            <div className="p-2 rounded" style={{ background: '#111111' }}>
              <span className="font-semibold text-red-400">↓ 下げると: </span>
              <span style={{ color: '#d1d5db' }}>{hint.decrease}</span>
            </div>
            <div className="p-2 rounded" style={{ background: '#111111' }}>
              <span className="font-semibold" style={{ color: '#fbbf24' }}>Trade-off: </span>
              <span style={{ color: '#d1d5db' }}>{hint.tradeoff}</span>
            </div>
            <div className="p-2 rounded" style={{ background: '#1e3a5f', border: '1px solid #1d4ed8' }}>
              <span className="font-semibold" style={{ color: '#60a5fa' }}>臨床値: </span>
              <span style={{ color: '#d1d5db' }}>{hint.clinical}</span>
            </div>
            {hint.tip && (
              <div className="p-2 rounded" style={{ background: '#141414', border: '1px solid #7c3aed' }}>
                <span className="font-semibold" style={{ color: '#a78bfa' }}>★ Tip: </span>
                <span style={{ color: '#d1d5db' }}>{hint.tip}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Section header used inside tabs */
export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-2 pt-2.5 pb-0.5 flex items-center gap-2">
      <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#374151' }}>{label}</div>
      <div className="flex-1 h-px" style={{ background: '#252525' }} />
    </div>
  )
}
