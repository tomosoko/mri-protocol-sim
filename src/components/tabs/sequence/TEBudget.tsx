import { useProtocolStore } from '../../../store/protocolStore'

// ── TE 物理計算 ──────────────────────────────────────────────────────────────
export function MinTECalculator() {
  const { params } = useProtocolStore()

  const minTEtse = params.turboFactor > 1
    ? Math.ceil(Math.floor(params.turboFactor / 2) * params.echoSpacing + 2)
    : null

  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2
  const epiPhaseLines = isDWI ? Math.round(params.matrixPhase / Math.max(params.ipatMode !== 'Off' ? params.ipatFactor : 1, 1)) : 0
  const epiMinTE = isDWI ? Math.ceil(epiPhaseLines * (1 / params.bandwidth * 1000) / 2 + 5) : null
  const epiDistortion = isDWI
    ? Math.round((params.fieldStrength === 3.0 ? 2.0 : 1.0) * epiPhaseLines / (params.bandwidth * 2) * 1000 * 10) / 10
    : null

  const readoutTime = Math.round((params.matrixFreq / params.bandwidth) * 1000 * 10) / 10

  if (!minTEtse && !epiMinTE) return null

  return (
    <div className="mx-3 mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #1a1a2a' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#a78bfa' }}>TE 物理計算</div>
      <div className="space-y-1" style={{ color: '#9ca3af' }}>
        <div className="flex justify-between">
          <span>Readout 時間 (1 line)</span>
          <span className="font-mono text-white">{readoutTime}ms</span>
        </div>
        {minTEtse !== null && (
          <div className="flex justify-between">
            <span>TSE 最小TE推定</span>
            <span className={`font-mono ${params.TE < minTEtse ? 'text-red-400' : 'text-green-400'}`}>
              {minTEtse}ms {params.TE < minTEtse ? '⚠ 設定値不足' : '✓'}
            </span>
          </div>
        )}
        {epiMinTE !== null && (
          <>
            <div className="flex justify-between">
              <span>EPI 最小TE推定</span>
              <span className={`font-mono ${params.TE < epiMinTE ? 'text-red-400' : 'text-green-400'}`}>
                {epiMinTE}ms {params.TE < epiMinTE ? '⚠' : '✓'}
              </span>
            </div>
            {epiDistortion !== null && (
              <div className="flex justify-between">
                <span>EPI 幾何学的歪み</span>
                <span className={`font-mono ${epiDistortion > 2 ? 'text-red-400' : epiDistortion > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                  ~{epiDistortion}px {epiDistortion > 2 ? '歪み大' : epiDistortion > 1 ? '中程度' : '小'}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── TE バジェット分解表 ──────────────────────────────────────────────────────
export function TEBudgetChart() {
  const { params } = useProtocolStore()

  const isTSE = params.turboFactor > 1
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  const rfDur = 2
  const gssRephase = 1.5
  const gpeDur = 1.2
  const readoutHalf = Math.round((params.matrixFreq / params.bandwidth) * 500) / 100
  const gfePreDephase = 1.5
  const tseCenterEcho = isTSE ? Math.floor(params.turboFactor / 2) * params.echoSpacing : 0
  const diffEncode = isDWI && params.bValues.some(b => b > 0) ? 28 : 0

  const teFromComponents = rfDur + gssRephase + gpeDur + gfePreDephase + readoutHalf + diffEncode + tseCenterEcho
  const teMin = Math.ceil(teFromComponents)
  const teActual = params.TE
  const teExcess = Math.max(0, teActual - teMin)

  const W = 300
  const H = 32
  const scale = W / Math.max(teActual, teMin + 5, 20)

  const segments: { label: string; dur: number; color: string }[] = [
    { label: 'RF',    dur: rfDur,         color: '#a78bfa' },
    { label: 'Gss',   dur: gssRephase,    color: '#6b7280' },
    { label: 'Gpe',   dur: gpeDur,        color: '#34d399' },
    { label: 'Gfe↓',  dur: gfePreDephase, color: '#fbbf24' },
    ...(diffEncode > 0   ? [{ label: 'Diff',    dur: diffEncode,     color: '#f87171' }] : []),
    ...(tseCenterEcho > 0 ? [{ label: 'ETL/2×ES', dur: tseCenterEcho, color: '#e88b00' }] : []),
    { label: 'ADC/2', dur: readoutHalf,   color: '#60a5fa' },
    ...(teExcess > 0     ? [{ label: '余裕',     dur: teExcess,       color: '#1a2a1a' }] : []),
  ]

  let cumX = 0

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060a0f', border: '1px solid #1a2035' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px', letterSpacing: '0.05em' }}>TE BUDGET</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono" style={{ color: teActual < teMin ? '#f87171' : '#34d399', fontSize: '9px', fontWeight: 700 }}>
            TE_min: {teMin}ms
          </span>
          <span style={{ color: '#4b5563', fontSize: '8px' }}>/ 設定: {teActual}ms</span>
        </div>
      </div>

      <svg width={W} height={H + 12}>
        {segments.map((seg, i) => {
          const x = cumX * scale
          const w = seg.dur * scale
          cumX += seg.dur
          return (
            <g key={i}>
              <rect x={x} y={4} width={w} height={H - 8}
                fill={seg.color} opacity={seg.label === '余裕' ? 0.2 : 0.75}
                stroke={seg.color} strokeWidth={0.5} strokeOpacity={0.5}
                rx={1} />
              {w > 14 && (
                <text x={x + w / 2} y={H / 2 + 2} textAnchor="middle"
                  fill={seg.label === '余裕' ? '#374151' : '#000'}
                  style={{ fontSize: '6px', fontWeight: 600, pointerEvents: 'none' }}>
                  {seg.label}
                </text>
              )}
            </g>
          )
        })}
        <line x1={teActual * scale} y1={0} x2={teActual * scale} y2={H + 4}
          stroke="#e88b00" strokeWidth={1.5} strokeDasharray="2,2" />
        <text x={teActual * scale + 2} y={H + 10} fill="#e88b00" style={{ fontSize: '7px' }}>TE={teActual}</text>
        {teActual > teMin && (
          <>
            <line x1={teMin * scale} y1={0} x2={teMin * scale} y2={H + 4}
              stroke="#34d399" strokeWidth={1} strokeDasharray="1,2" opacity={0.6} />
            <text x={teMin * scale + 2} y={8} fill="#34d399" style={{ fontSize: '6px' }}>min</text>
          </>
        )}
      </svg>

      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5" style={{ fontSize: '7px' }}>
        {segments.filter(s => s.label !== '余裕').map(seg => (
          <span key={seg.label} style={{ color: seg.color }}>
            {seg.label}:{seg.dur.toFixed(1)}ms
          </span>
        ))}
      </div>
    </div>
  )
}

// ── パルスシーケンス タイミングダイアグラム ─────────────────────────────────
export function PulseSequenceDiagram() {
  const { params } = useProtocolStore()

  const W = 340
  const H = 130
  const rowH = 18
  const ROWS = ['RF', 'Gss', 'Gpe', 'Gfe', 'ADC']
  const PAD = { l: 32, r: 8, t: 8 }
  const innerW = W - PAD.l - PAD.r

  const displayTR = Math.min(params.TR, 1000)
  const scale = innerW / displayTR
  const tx = (t: number) => PAD.l + Math.min(t, displayTR) * scale

  const rfStart = 0
  const rfEnd   = 8
  const teHalf  = params.TE / 2
  const tePos   = params.TE
  const gpeStart = rfEnd + 2
  const gfeStart = teHalf - 4
  const gfeEnd   = tePos + params.echoSpacing
  const adcStart = teHalf
  const adcEnd   = tePos + params.echoSpacing * Math.min(4, params.turboFactor - 1) * 0.5
  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>
        パルスシーケンス タイミング図 (簡略版)
      </div>
      <svg width={W} height={H}>
        {ROWS.map((_, i) => (
          <rect key={i} x={0} y={PAD.t + i * rowH} width={W} height={rowH}
            fill={i % 2 === 0 ? '#0a0a0a' : '#080808'} />
        ))}
        {ROWS.map((label, i) => (
          <text key={label} x={PAD.l - 4} y={PAD.t + i * rowH + rowH * 0.65}
            textAnchor="end" fill="#4b5563" style={{ fontSize: '8px', fontFamily: 'monospace' }}>
            {label}
          </text>
        ))}
        {ROWS.map((_, i) => (
          <line key={i} x1={PAD.l} y1={PAD.t + i * rowH + rowH * 0.5}
            x2={PAD.l + innerW} y2={PAD.t + i * rowH + rowH * 0.5}
            stroke="#1a1a1a" strokeWidth={1} />
        ))}

        {/* RF: 90° pulse */}
        {(() => {
          const y0 = PAD.t + 0 * rowH + rowH * 0.5
          const amp = rowH * 0.38
          const x1 = tx(rfStart), x2 = tx(rfEnd)
          return <path d={`M${x1},${y0} L${x1},${y0 - amp} L${x2},${y0 - amp} L${x2},${y0}`}
            fill="#a78bfa40" stroke="#a78bfa" strokeWidth={1} />
        })()}

        {/* RF: 180° refocusing pulses (TSE) */}
        {params.turboFactor > 1 && (() => {
          const amp = rowH * 0.42
          return (
            <>
              {Array.from({ length: Math.min(3, params.turboFactor) }, (_, ei) => {
                const tRef = rfEnd + params.echoSpacing * ei
                const x = tx(tRef + teHalf - 4)
                const w = Math.max(3, (8 * scale))
                if (x + w > PAD.l + innerW) return null
                return <path key={ei} d={`M${x},${PAD.t + amp * 0.3} L${x},${PAD.t + rowH - amp * 0.3} L${x + w},${PAD.t + rowH - amp * 0.3} L${x + w},${PAD.t + amp * 0.3}`}
                  fill="#c084fc28" stroke="#c084fc" strokeWidth={0.8} />
              })}
            </>
          )
        })()}

        {/* Gss: slice select gradient */}
        {(() => {
          const y0 = PAD.t + 1 * rowH + rowH * 0.5
          const amp = rowH * 0.38
          const x1 = tx(rfStart), x2 = tx(rfEnd + 3)
          const xr1 = tx(rfEnd + 3), xr2 = tx(rfEnd + 6)
          return <>
            <path d={`M${x1},${y0} L${x1},${y0 - amp} L${x2},${y0 - amp} L${x2},${y0}`}
              fill="#60a5fa28" stroke="#60a5fa" strokeWidth={1} />
            <path d={`M${xr1},${y0} L${xr1},${y0 + amp * 0.5} L${xr2},${y0 + amp * 0.5} L${xr2},${y0}`}
              fill="#60a5fa18" stroke="#60a5fa" strokeWidth={0.8} />
          </>
        })()}

        {/* Gpe: phase encode gradient */}
        {(() => {
          const y0 = PAD.t + 2 * rowH + rowH * 0.5
          const steps = [0.38, 0.2, 0, -0.2, -0.38]
          return (
            <>
              {steps.map((amp, i) => {
                const x1 = tx(gpeStart + i * 1.5)
                const x2 = tx(gpeStart + i * 1.5 + 1)
                if (x1 >= PAD.l + innerW) return null
                return <path key={i} d={`M${x1},${y0} L${x1},${y0 - amp * rowH} L${x2},${y0 - amp * rowH} L${x2},${y0}`}
                  fill="#34d39928" stroke="#34d399" strokeWidth={0.8} />
              })}
            </>
          )
        })()}

        {/* Gfe: frequency encode */}
        {(() => {
          const y0 = PAD.t + 3 * rowH + rowH * 0.5
          const amp = rowH * 0.38
          const xd1 = tx(gpeStart + 8), xd2 = tx(gpeStart + 14)
          const xr1 = tx(Math.max(gfeStart, gpeStart + 14))
          const xr2 = tx(Math.min(gfeEnd, displayTR - 2))
          return <>
            <path d={`M${xd1},${y0} L${xd1},${y0 + amp * 0.5} L${xd2},${y0 + amp * 0.5} L${xd2},${y0}`}
              fill="#fbbf2428" stroke="#fbbf24" strokeWidth={0.8} />
            <path d={`M${xr1},${y0} L${xr1},${y0 - amp} L${xr2},${y0 - amp} L${xr2},${y0}`}
              fill="#fbbf2428" stroke="#fbbf24" strokeWidth={1} />
          </>
        })()}

        {/* ADC window */}
        {(() => {
          const y0 = PAD.t + 4 * rowH + rowH * 0.5
          const amp = rowH * 0.3
          const x1 = tx(adcStart)
          const x2 = Math.min(tx(adcEnd), PAD.l + innerW - 2)
          if (x2 <= x1) return null
          return <rect x={x1} y={y0 - amp} width={x2 - x1} height={amp * 2}
            fill="#e88b0030" stroke="#e88b00" strokeWidth={1} />
        })()}

        {/* TE marker */}
        {(() => {
          const x = tx(tePos)
          if (x > PAD.l + innerW - 4) return null
          return <>
            <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + ROWS.length * rowH}
              stroke="#e88b00" strokeWidth={0.8} strokeDasharray="2,2" />
            <text x={x + 2} y={PAD.t + ROWS.length * rowH + 10}
              fill="#e88b00" style={{ fontSize: '8px' }}>TE={params.TE}ms</text>
          </>
        })()}

        {displayTR < params.TR && (
          <text x={PAD.l + innerW - 2} y={PAD.t + ROWS.length * rowH + 10}
            textAnchor="end" fill="#4b5563" style={{ fontSize: '7px' }}>
            …TR={params.TR}ms
          </text>
        )}

        {isDWI && (
          <text x={PAD.l + 4} y={PAD.t + 3 * rowH + 8}
            fill="#f87171" style={{ fontSize: '7px' }}>DWI Gd</text>
        )}
      </svg>
      <div style={{ fontSize: '7px', color: '#374151' }}>
        <span style={{ color: '#a78bfa' }}>■RF</span>{' '}
        <span style={{ color: '#60a5fa' }}>■Gss</span>{' '}
        <span style={{ color: '#34d399' }}>■Gpe</span>{' '}
        <span style={{ color: '#fbbf24' }}>■Gfe</span>{' '}
        <span style={{ color: '#e88b00' }}>■ADC</span>
        {' '}| 簡略図（時間軸は対数表示でありません）
      </div>
    </div>
  )
}
