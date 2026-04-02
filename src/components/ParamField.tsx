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
    <div className={`relative flex items-center gap-2 py-1.5 px-3 rounded transition-all ${highlight ? 'ring-1 ring-yellow-400 bg-yellow-400/5' : ''}`}>
      {/* Label */}
      <div className="flex items-center gap-1 w-44 shrink-0">
        <span className="text-xs" style={{ color: '#9ca3af' }}>{label}</span>
        {hint && (
          <button
            onClick={() => setShowHint(true)}
            className="transition-colors hover:text-blue-400"
            style={{ color: '#4b5563' }}
          >
            <HelpCircle size={11} />
          </button>
        )}
        {highlight && <span className="text-xs text-yellow-400 font-bold">★</span>}
      </div>

      {/* Input */}
      {type === 'number' && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value as number}
            min={min}
            max={max}
            step={step}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-0.5 rounded text-xs text-right font-mono outline-none"
            style={{ background: '#111827', border: '1px solid #374151', color: '#e5e7eb' }}
          />
          {unit && <span className="text-xs" style={{ color: '#6b7280' }}>{unit}</span>}
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
            className="flex-1 accent-blue-500"
            style={{ accentColor: '#3b82f6' }}
          />
          <span className="text-xs font-mono w-20 text-right" style={{ color: '#e5e7eb' }}>
            {value}{unit && ` ${unit}`}
          </span>
        </div>
      )}

      {type === 'select' && options && (
        <select
          value={value as string}
          onChange={e => onChange(e.target.value)}
          className="px-2 py-0.5 rounded text-xs outline-none"
          style={{ background: '#111827', border: '1px solid #374151', color: '#e5e7eb', minWidth: '110px' }}
        >
          {options.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}

      {type === 'toggle' && (
        <button
          onClick={() => onChange(!(value as boolean))}
          className={`px-3 py-0.5 rounded text-xs font-semibold transition-colors ${value ? 'text-green-400' : 'text-gray-500'}`}
          style={{ background: value ? '#064e3b' : '#1f2937', border: `1px solid ${value ? '#065f46' : '#374151'}` }}
        >
          {value ? 'ON' : 'OFF'}
        </button>
      )}

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
            <div className="p-2 rounded" style={{ background: '#0f172a' }}>
              <span className="font-semibold text-green-400">↑ 上げると: </span>
              <span style={{ color: '#d1d5db' }}>{hint.increase}</span>
            </div>
            <div className="p-2 rounded" style={{ background: '#0f172a' }}>
              <span className="font-semibold text-red-400">↓ 下げると: </span>
              <span style={{ color: '#d1d5db' }}>{hint.decrease}</span>
            </div>
            <div className="p-2 rounded" style={{ background: '#0f172a' }}>
              <span className="font-semibold" style={{ color: '#fbbf24' }}>Trade-off: </span>
              <span style={{ color: '#d1d5db' }}>{hint.tradeoff}</span>
            </div>
            <div className="p-2 rounded" style={{ background: '#1e3a5f', border: '1px solid #1d4ed8' }}>
              <span className="font-semibold" style={{ color: '#60a5fa' }}>臨床値: </span>
              <span style={{ color: '#d1d5db' }}>{hint.clinical}</span>
            </div>
            {hint.tip && (
              <div className="p-2 rounded" style={{ background: '#1a1a2e', border: '1px solid #7c3aed' }}>
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
