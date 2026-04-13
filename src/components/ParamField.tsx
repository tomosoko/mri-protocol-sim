import { useState, useRef } from 'react'
import { X } from 'lucide-react'
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
  coupling?: string[]
  warn?: boolean
  warnMsg?: string
}

export function ParamField({
  label, hintKey, value, type = 'number', options,
  min, max, step = 1, unit, onChange,
  highlight, coupling, warn, warnMsg,
}: ParamFieldProps) {
  const [showHint, setShowHint] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hint = hintKey
    ? (hints[hintKey] ?? hints[Object.keys(hints).find(k => k.toLowerCase() === hintKey.toLowerCase()) ?? ''])
    : null

  const labelColor = warn ? '#c8860a' : highlight ? '#c8860a' : '#5a5a5a'
  const valueColor = warn ? '#fbbf24' : highlight ? '#f0a000' : focused ? '#ffffff' : '#c8ccd6'

  return (
    <div
      className="relative flex items-center"
      style={{
        height: '20px',
        borderBottom: '1px solid #161616',
        background: highlight ? '#1a1200' : 'transparent',
      }}
    >
      {/* Modified indicator bar */}
      {highlight && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: '#e88b00' }} />
      )}

      {/* Label */}
      <div
        className="flex items-center gap-1 shrink-0"
        style={{ width: '46%', paddingLeft: highlight ? '7px' : '8px', paddingRight: '4px' }}
      >
        {warn && (
          <span style={{ color: '#c8860a', fontSize: '8px', flexShrink: 0, lineHeight: 1 }}
            title={warnMsg}>!</span>
        )}
        <span
          className="truncate select-none"
          style={{ color: labelColor, fontSize: '10.5px', letterSpacing: '0.01em', lineHeight: 1, cursor: hint ? 'pointer' : 'default' }}
          onClick={() => hint && setShowHint(true)}
          title={hint ? `${label} — クリックで詳細` : label}
        >
          {label}
        </span>
        {coupling && coupling.length > 0 && (
          <div className="flex gap-0.5 ml-1 shrink-0">
            {coupling.map(c => (
              <span key={c} style={{
                fontSize: '6.5px', color: '#2a3a2a', fontFamily: 'monospace',
                background: '#0d160d', borderRadius: 1, padding: '0 1.5px', lineHeight: '10px',
              }}>{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-center ml-auto shrink-0" style={{ paddingRight: '6px', gap: '3px' }}>
        {type === 'number' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: focused ? '#1a1a1a' : 'transparent',
              border: focused ? '1px solid #333' : '1px solid transparent',
              borderRadius: 2,
            }}>
              <input
                ref={inputRef}
                type="number"
                value={value as number}
                min={min} max={max} step={step}
                onChange={e => onChange(parseFloat(e.target.value) || 0)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => {
                  if (e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(max ?? Infinity, (value as number) + (step ?? 1))) }
                  if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(min ?? -Infinity, (value as number) - (step ?? 1))) }
                }}
                className="outline-none text-right font-mono"
                style={{
                  background: 'transparent', border: 'none',
                  color: valueColor,
                  width: '54px', height: '18px',
                  padding: '0 2px', fontSize: '11px',
                }}
              />
              <div className="flex flex-col" style={{ borderLeft: focused ? '1px solid #282828' : '1px solid transparent' }}>
                <button tabIndex={-1}
                  onMouseDown={e => { e.preventDefault(); onChange(Math.min(max ?? Infinity, (value as number) + (step ?? 1))) }}
                  style={{ background: 'transparent', color: '#363636', border: 'none', height: '9px', width: '12px', fontSize: '6px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▲</button>
                <button tabIndex={-1}
                  onMouseDown={e => { e.preventDefault(); onChange(Math.max(min ?? -Infinity, (value as number) - (step ?? 1))) }}
                  style={{ background: 'transparent', color: '#363636', border: 'none', height: '9px', width: '12px', fontSize: '6px', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >▼</button>
              </div>
            </div>
            {unit && <span style={{ color: '#3a3a3a', fontSize: '9.5px', minWidth: '16px' }}>{unit}</span>}
          </>
        )}

        {type === 'range' && (
          <div className="flex items-center" style={{ gap: '6px' }}>
            <input
              type="range"
              value={value as number}
              min={min} max={max} step={step}
              onChange={e => onChange(parseFloat(e.target.value))}
              style={{
                width: '80px', height: '2px', accentColor: '#e88b00',
                cursor: 'pointer',
              }}
            />
            <span className="font-mono" style={{ color: valueColor, fontSize: '11px', minWidth: '28px', textAlign: 'right' }}>
              {value}
            </span>
            {unit && <span style={{ color: '#3a3a3a', fontSize: '9.5px' }}>{unit}</span>}
          </div>
        )}

        {type === 'select' && options && (
          <select
            value={value as string}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="outline-none"
            style={{
              background: '#0e0e0e',
              border: focused ? '1px solid #333' : '1px solid #1e1e1e',
              borderRadius: 2,
              color: valueColor,
              minWidth: '96px',
              height: '17px',
              fontSize: '10.5px',
              padding: '0 3px',
              cursor: 'pointer',
            }}
          >
            {options.map(o => (
              <option key={o} value={o} style={{ background: '#0e0e0e' }}>{o}</option>
            ))}
          </select>
        )}

        {type === 'toggle' && (
          <button
            onClick={() => onChange(!(value as boolean))}
            style={{
              background: value ? '#0e2018' : '#111',
              border: `1px solid ${value ? '#1e4030' : '#222'}`,
              borderRadius: 2,
              color: value ? '#4ade80' : '#3a3a3a',
              height: '17px',
              minWidth: '34px',
              fontSize: '9.5px',
              padding: '0 5px',
              cursor: 'pointer',
              fontWeight: 600,
              letterSpacing: '0.03em',
            }}
          >
            {value ? 'On' : 'Off'}
          </button>
        )}

        {/* Hint indicator — small dot if hint available */}
        {hint && type !== 'range' && (
          <button
            onClick={() => setShowHint(true)}
            tabIndex={-1}
            title="詳細説明"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: '#282828', fontSize: '7px', lineHeight: 1, marginLeft: '1px',
            }}
          >●</button>
        )}
      </div>

      {/* Hint Popup */}
      {showHint && hint && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'transparent' }}
            onClick={() => setShowHint(false)}
          />
          <div
            className="fixed z-50 shadow-2xl"
            style={{
              background: '#0f0f0f',
              border: '1px solid #2a2a2a',
              borderRadius: 4,
              width: '340px',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '12px 14px',
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span style={{ color: '#e88b00', fontSize: '12px', fontWeight: 600 }}>{hint.title}</span>
                {hint.unit && <span style={{ color: '#3a3a3a', fontSize: '10px', marginLeft: '6px' }}>[{hint.unit}]</span>}
              </div>
              <button onClick={() => setShowHint(false)}
                style={{ color: '#3a3a3a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={12} />
              </button>
            </div>

            {hint.formula && (
              <div style={{
                background: '#080808', border: '1px solid #1e1e1e', borderRadius: 3,
                padding: '4px 8px', marginBottom: '8px', fontFamily: 'monospace',
                fontSize: '10.5px', color: '#c8860a', textAlign: 'center',
              }}>
                {hint.formula}
              </div>
            )}

            <p style={{ color: '#6a6a6a', fontSize: '10.5px', marginBottom: '8px', lineHeight: 1.5 }}>
              {hint.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
              <div style={{ background: '#0a150a', border: '1px solid #1a2a1a', borderRadius: 3, padding: '4px 8px' }}>
                <span style={{ color: '#34d399', fontWeight: 600 }}>↑ 増やすと　</span>
                <span style={{ color: '#8a8a8a' }}>{hint.increase}</span>
              </div>
              <div style={{ background: '#150a0a', border: '1px solid #2a1a1a', borderRadius: 3, padding: '4px 8px' }}>
                <span style={{ color: '#f87171', fontWeight: 600 }}>↓ 減らすと　</span>
                <span style={{ color: '#8a8a8a' }}>{hint.decrease}</span>
              </div>
              <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: '4px 8px' }}>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>Trade-off　</span>
                <span style={{ color: '#8a8a8a' }}>{hint.tradeoff}</span>
              </div>
              <div style={{ background: '#130e00', border: '1px solid #2a1e00', borderRadius: 3, padding: '4px 8px' }}>
                <span style={{ color: '#e88b00', fontWeight: 600 }}>臨床値　</span>
                <span style={{ color: '#8a8a8a' }}>{hint.clinical}</span>
              </div>
              {hint.tip && (
                <div style={{ background: '#0d0a18', border: '1px solid #1e1830', borderRadius: 3, padding: '4px 8px' }}>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>Tip　</span>
                  <span style={{ color: '#8a8a8a' }}>{hint.tip}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Section header — syngo MR style: thin separator + small caps label */
export function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        height: '16px',
        display: 'flex', alignItems: 'center',
        paddingLeft: '8px',
        background: '#0d0d0d',
        borderTop: '1px solid #1a1a1a',
        borderBottom: '1px solid #141414',
      }}
    >
      <span style={{
        color: '#383838',
        fontSize: '8.5px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontFamily: 'monospace',
      }}>
        {label}
      </span>
    </div>
  )
}
