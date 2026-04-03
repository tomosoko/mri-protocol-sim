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
  const hint = hintKey
    ? (hints[hintKey] ?? hints[Object.keys(hints).find(k => k.toLowerCase() === hintKey.toLowerCase()) ?? ''])
    : null

  return (
    <div
      className={`relative flex items-center transition-all ${highlight ? 'bg-yellow-400/5' : 'hover:bg-white/[0.02]'}`}
      style={{ minHeight: '28px', borderBottom: '1px solid #1a1a1a' }}
    >
      {/* Highlight indicator */}
      {highlight && (
        <div style={{ width: '2px', height: '100%', minHeight: '20px', background: '#e88b00', position: 'absolute', left: 0, top: 0 }} />
      )}

      {/* Label column — ~45% width */}
      <div
        className="flex items-center gap-1 shrink-0 pl-3 pr-2"
        style={{ width: '45%' }}
      >
        <span
          className="text-xs leading-tight truncate"
          style={{ color: highlight ? '#fbbf24' : '#8a8a8a', fontSize: '11px' }}
        >
          {label}
        </span>
        {hint && (
          <button
            onClick={() => setShowHint(true)}
            className="shrink-0 hover:text-blue-400 transition-colors"
            style={{ color: '#3a3a3a' }}
          >
            <HelpCircle size={9} />
          </button>
        )}
      </div>

      {/* Value column — ~55% width */}
      <div className="flex items-center gap-1.5 pr-2" style={{ width: '55%' }}>
        {type === 'number' && (
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              value={value as number}
              min={min}
              max={max}
              step={step}
              onChange={e => onChange(parseFloat(e.target.value) || 0)}
              className="text-xs text-right font-mono outline-none focus:ring-1 focus:ring-orange-500/40"
              style={{
                background: '#0c0c0c',
                border: '1px solid #2a2a2a',
                borderRadius: '2px',
                color: highlight ? '#fbbf24' : '#d8d8d8',
                width: '72px',
                height: '16px',
                padding: '0 4px',
                fontSize: '11px',
              }}
            />
            {unit && (
              <span style={{ color: '#4a4a4a', fontSize: '10px', minWidth: '18px' }}>{unit}</span>
            )}
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
              className="flex-1"
              style={{ accentColor: '#e88b00', height: '2px' }}
            />
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="font-mono font-semibold" style={{ color: highlight ? '#fbbf24' : '#d8d8d8', minWidth: '36px', textAlign: 'right', fontSize: '11px' }}>
                {value}
              </span>
              {unit && <span style={{ color: '#4a4a4a', fontSize: '10px' }}>{unit}</span>}
            </div>
          </div>
        )}

        {type === 'select' && options && (
          <select
            value={value as string}
            onChange={e => onChange(e.target.value)}
            className="outline-none focus:ring-1 focus:ring-orange-500/40 ml-auto"
            style={{
              background: '#0c0c0c',
              border: '1px solid #2a2a2a',
              borderRadius: '2px',
              color: highlight ? '#fbbf24' : '#d8d8d8',
              minWidth: '110px',
              height: '16px',
              fontSize: '11px',
              padding: '0 4px',
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
            className="font-semibold transition-all ml-auto shrink-0"
            style={{
              background: value ? '#0d2b1a' : '#0c0c0c',
              border: `1px solid ${value ? '#1a4a2a' : '#2a2a2a'}`,
              borderRadius: '2px',
              color: value ? '#4ade80' : '#4a4a4a',
              height: '16px',
              minWidth: '36px',
              fontSize: '10px',
              padding: '0 6px',
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
          style={{ background: '#1a1000', border: '1px solid #c47400', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold" style={{ color: '#e88b00' }}>
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
            <div className="p-2 rounded" style={{ background: '#1a0e00', border: '1px solid #c47400' }}>
              <span className="font-semibold" style={{ color: '#e88b00' }}>臨床値: </span>
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
    <div
      className="flex items-center px-3 py-1"
      style={{ background: '#161616', borderBottom: '1px solid #1a1a1a', borderTop: '1px solid #1a1a1a' }}
    >
      <span style={{ color: '#505050', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}
