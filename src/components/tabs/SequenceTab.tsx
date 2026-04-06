import { useMemo, useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { calcT2Blur } from '../../store/calculators'

// ── TE 物理計算 ──────────────────────────────────────────────────────────────
function MinTECalculator() {
  const { params } = useProtocolStore()

  // TSE 最小TE推定: minTE ≈ N/2 × ES + RF_dur (≈2ms)
  const minTEtse = params.turboFactor > 1
    ? Math.ceil(Math.floor(params.turboFactor / 2) * params.echoSpacing + 2)
    : null

  // EPI 最小TE: N_phase × ES (N_phase = matrix/iPAT)
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2
  const epiPhaseLines = isDWI ? Math.round(params.matrixPhase / Math.max(params.ipatMode !== 'Off' ? params.ipatFactor : 1, 1)) : 0
  const epiMinTE = isDWI ? Math.ceil(epiPhaseLines * (1 / params.bandwidth * 1000) / 2 + 5) : null

  // EPI 幾何学的歪み (voxel shift in phase dir)
  const epiDistortion = isDWI
    ? Math.round((params.fieldStrength === 3.0 ? 2.0 : 1.0) * epiPhaseLines / (params.bandwidth * 2) * 1000 * 10) / 10
    : null

  // 読み取り時間 (ADC window duration)
  const readoutTime = Math.round((params.matrixFreq / params.bandwidth) * 1000 * 10) / 10  // ms

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
// リアルな syngo MR コンソールの「TE Budget」表示
// TE の物理的な構成要素をブロック図で視覚化する
function TEBudgetChart() {
  const { params } = useProtocolStore()

  const isTSE = params.turboFactor > 1
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  // Time components (simplified)
  const rfDur = 2           // RF pulse duration (ms)
  const gssRephase = 1.5    // Slice select rephase lobe (ms)
  const gpeDur = 1.2        // Phase encode duration (ms)
  const readoutHalf = Math.round((params.matrixFreq / params.bandwidth) * 500) / 100  // ms, half-readout
  const gfePreDephase = 1.5  // Freq encode pre-dephase (ms)

  // For TSE: center echo position adds ES × floor(ETL/2)
  const tseCenterEcho = isTSE
    ? Math.floor(params.turboFactor / 2) * params.echoSpacing
    : 0

  // For DWI: diffusion encoding (two lobes + crusher)
  const diffEncode = isDWI && params.bValues.some(b => b > 0) ? 28 : 0

  // Total TE from these components
  const teFromComponents = rfDur + gssRephase + gpeDur + gfePreDephase + readoutHalf + diffEncode + tseCenterEcho

  const teMin = Math.ceil(teFromComponents)
  const teActual = params.TE
  const teExcess = Math.max(0, teActual - teMin)

  const W = 300
  const H = 32
  const scale = W / Math.max(teActual, teMin + 5, 20)

  const segments: { label: string; dur: number; color: string; hint: string }[] = [
    { label: 'RF', dur: rfDur, color: '#a78bfa', hint: `RF励起パルス ~${rfDur}ms` },
    { label: 'Gss', dur: gssRephase, color: '#6b7280', hint: `スライス選択再位相 ${gssRephase}ms` },
    { label: 'Gpe', dur: gpeDur, color: '#34d399', hint: `位相エンコード ${gpeDur}ms` },
    { label: 'Gfe↓', dur: gfePreDephase, color: '#fbbf24', hint: `読み取り方向デフェーズ ${gfePreDephase}ms` },
    ...(diffEncode > 0 ? [{ label: 'Diff', dur: diffEncode, color: '#f87171', hint: `拡散エンコード ${diffEncode}ms` }] : []),
    ...(tseCenterEcho > 0 ? [{ label: `ETL/2×ES`, dur: tseCenterEcho, color: '#e88b00', hint: `k中心エコーまで ${tseCenterEcho.toFixed(1)}ms (ETL=${params.turboFactor}×ES/2)` }] : []),
    { label: 'ADC/2', dur: readoutHalf, color: '#60a5fa', hint: `読み取り半分 ${readoutHalf}ms` },
    ...(teExcess > 0 ? [{ label: '余裕', dur: teExcess, color: '#1a2a1a', hint: `TE余裕 +${teExcess.toFixed(1)}ms (TE_min=${teMin}ms)` }] : []),
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
          <span style={{ color: '#4b5563', fontSize: '8px' }}>
            / 設定: {teActual}ms
          </span>
        </div>
      </div>

      {/* Time bar chart */}
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
        {/* TE marker */}
        <line x1={teActual * scale} y1={0} x2={teActual * scale} y2={H + 4}
          stroke="#e88b00" strokeWidth={1.5} strokeDasharray="2,2" />
        <text x={teActual * scale + 2} y={H + 10} fill="#e88b00" style={{ fontSize: '7px' }}>TE={teActual}</text>
        {/* TE_min marker */}
        {teActual > teMin && (
          <>
            <line x1={teMin * scale} y1={0} x2={teMin * scale} y2={H + 4}
              stroke="#34d399" strokeWidth={1} strokeDasharray="1,2" opacity={0.6} />
            <text x={teMin * scale + 2} y={8} fill="#34d399" style={{ fontSize: '6px' }}>min</text>
          </>
        )}
      </svg>

      {/* Duration legend */}
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
function PulseSequenceDiagram() {
  const { params } = useProtocolStore()

  const W = 340
  const H = 130
  const rowH = 18
  const ROWS = ['RF', 'Gss', 'Gpe', 'Gfe', 'ADC']
  const PAD = { l: 32, r: 8, t: 8 }
  const innerW = W - PAD.l - PAD.r

  // Normalize time axis: 0 ~ TR (capped at 1000ms for display)
  const displayTR = Math.min(params.TR, 1000)
  const scale = innerW / displayTR

  const tx = (t: number) => PAD.l + Math.min(t, displayTR) * scale

  // Key timing events
  const rfStart = 0
  const rfEnd   = 8  // 90° pulse duration ~8ms (simplified)
  const teHalf  = params.TE / 2
  const tePos   = params.TE

  // Phase encode: happens after RF
  const gpeStart = rfEnd + 2

  // Freq encode: centered at TE
  const gfeStart = teHalf - 4
  const gfeEnd   = tePos + params.echoSpacing

  // ADC window
  const adcStart = teHalf
  const adcEnd   = tePos + params.echoSpacing * Math.min(4, params.turboFactor - 1) * 0.5

  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>
        パルスシーケンス タイミング図 (簡略版)
      </div>
      <svg width={W} height={H}>
        {/* Row backgrounds alternating */}
        {ROWS.map((_, i) => (
          <rect key={i} x={0} y={PAD.t + i * rowH} width={W} height={rowH}
            fill={i % 2 === 0 ? '#0a0a0a' : '#080808'} />
        ))}

        {/* Row labels */}
        {ROWS.map((label, i) => (
          <text key={label} x={PAD.l - 4} y={PAD.t + i * rowH + rowH * 0.65}
            textAnchor="end" fill="#4b5563" style={{ fontSize: '8px', fontFamily: 'monospace' }}>
            {label}
          </text>
        ))}

        {/* Baseline lines */}
        {ROWS.map((_, i) => (
          <line key={i} x1={PAD.l} y1={PAD.t + i * rowH + rowH * 0.5}
            x2={PAD.l + innerW} y2={PAD.t + i * rowH + rowH * 0.5}
            stroke="#1a1a1a" strokeWidth={1} />
        ))}

        {/* RF: 90° pulse (square pulse) */}
        {(() => {
          const y0 = PAD.t + 0 * rowH + rowH * 0.5
          const amp = rowH * 0.38
          const x1 = tx(rfStart), x2 = tx(rfEnd)
          return <path d={`M${x1},${y0} L${x1},${y0 - amp} L${x2},${y0 - amp} L${x2},${y0}`}
            fill="#a78bfa40" stroke="#a78bfa" strokeWidth={1} />
        })()}
        {/* RF: 180° refocusing pulse (TSE) if ETL > 1 */}
        {params.turboFactor > 1 && (() => {
          const y0 = PAD.t + 0 * rowH + rowH * 0.5
          const amp = rowH * 0.42
          Array.from({ length: Math.min(3, params.turboFactor) }, (_, ei) => {
            const tRef = rfEnd + params.TE / 2 + ei * params.echoSpacing
            if (tRef >= displayTR) return null
            const x = tx(tRef), w = 3
            return <path key={ei} d={`M${x},${y0 + amp} L${x},${y0 - amp} L${x + w},${y0 - amp} L${x + w},${y0 + amp}`}
              fill="#c084fc40" stroke="#c084fc" strokeWidth={1} />
          })
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
          const xr1 = tx(rfEnd + 3), xr2 = tx(rfEnd + 6)  // rephase lobe
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

        {/* Gfe: frequency encode + dephase + rephase */}
        {(() => {
          const y0 = PAD.t + 3 * rowH + rowH * 0.5
          const amp = rowH * 0.38
          const xd1 = tx(gpeStart + 8), xd2 = tx(gpeStart + 14)  // dephase
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

        {/* TR marker */}
        {displayTR < params.TR && (
          <text x={PAD.l + innerW - 2} y={PAD.t + ROWS.length * rowH + 10}
            textAnchor="end" fill="#4b5563" style={{ fontSize: '7px' }}>
            …TR={params.TR}ms
          </text>
        )}

        {/* DWI: diffusion gradients */}
        {isDWI && (
          <>
            <text x={PAD.l + 4} y={PAD.t + 3 * rowH + 8}
              fill="#f87171" style={{ fontSize: '7px' }}>DWI Gd</text>
          </>
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

// ── k空間エコー並びビジュアライザー ─────────────────────────────────────────
function KSpaceEchoTrainViz() {
  const { params } = useProtocolStore()
  const etl = Math.min(params.turboFactor, 40)  // 表示上限40

  if (etl <= 1) return null

  const W = 330
  const H = 54
  const PAD = { l: 14, r: 14, t: 8, b: 22 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // リニア順 (echo 1 = k端, echo ETL/2 = k中心)
  // Siemens TSEはリニア順をデフォルトとする
  // k中心のエコー番号 (0-indexed): effEchoIdx = floor(ETL / 2)
  const effEchoIdx = Math.floor(etl / 2)

  // k空間ライン位置: -1(端) ~ 0(中心) ~ +1(端)
  // リニア順: echo i → kLine = ((i - effEchoIdx) / (etl / 2))
  const kLines = Array.from({ length: etl }, (_, i) => {
    return (i - effEchoIdx) / (etl / 2)
  })

  // T2 減衰重み: w(i) = exp(-TE_i / T2) normalized
  const T2 = params.fieldStrength >= 2.5 ? 69 : 75  // WM T2
  const weights = Array.from({ length: etl }, (_, i) => {
    const te_i = params.TE + i * params.echoSpacing
    return Math.exp(-te_i / T2)
  })
  const maxW = Math.max(...weights)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>k空間エコー配置 (Linear Ordering)</div>
      <svg width={W} height={H}>
        {/* k-space axis */}
        <line x1={PAD.l} y1={PAD.t + innerH + 2} x2={PAD.l + innerW} y2={PAD.t + innerH + 2}
          stroke="#252525" strokeWidth={1} />
        {/* k-center marker */}
        <line x1={PAD.l + innerW / 2} y1={PAD.t} x2={PAD.l + innerW / 2} y2={PAD.t + innerH + 4}
          stroke="#374151" strokeWidth={1} strokeDasharray="2,2" />
        <text x={PAD.l + innerW / 2} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>k=0</text>
        <text x={PAD.l} y={H - 4} textAnchor="start" fill="#374151" style={{ fontSize: '7px' }}>-kmax</text>
        <text x={PAD.l + innerW} y={H - 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+kmax</text>

        {/* Echo bars */}
        {kLines.map((kLine, i) => {
          const x = PAD.l + ((kLine + 1) / 2) * innerW
          const barH = Math.max(3, weights[i] / maxW * innerH)
          const isCenter = i === effEchoIdx
          const color = isCenter ? '#e88b00' : `rgba(96, 165, 250, ${0.3 + weights[i] / maxW * 0.6})`
          return (
            <rect key={i}
              x={x - 1} y={PAD.t + innerH - barH}
              width={Math.max(2, innerW / etl - 1)} height={barH}
              fill={color}
            />
          )
        })}

        {/* Effective TE label */}
        <text x={PAD.l + innerW / 2 + 3} y={PAD.t + 8}
          fill="#e88b00" style={{ fontSize: '7px' }}>
          effTE={Math.round(params.TE + effEchoIdx * params.echoSpacing)}ms
        </text>
      </svg>
      <div style={{ fontSize: '7px', color: '#374151' }}>
        バーの高さ = T2減衰重み (WM T2={T2}ms) | 橙 = k中心エコー (Effective TE)
      </div>
    </div>
  )
}

// ── PSF (Point Spread Function) T2 ブラーシミュレーション ────────────────────
function PSFBlurSimulator() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Only show for TSE sequences
  if (params.turboFactor <= 2) return null

  const T2_TISSUES: { label: string; T2: number; color: string }[] = [
    { label: 'CSF',  T2: is3T ? 1500 : 1800, color: '#38bdf8' },
    { label: 'WM',   T2: is3T ? 69 : 72,     color: '#60a5fa' },
    { label: 'GM',   T2: is3T ? 83 : 95,     color: '#a78bfa' },
    { label: 'Cart', T2: is3T ? 32 : 35,     color: '#4ade80' },
    { label: 'Liver',T2: is3T ? 34 : 40,     color: '#fb923c' },
  ]

  const etl = params.turboFactor
  const es  = params.echoSpacing

  // For each tissue compute PSF FWHM in units of voxels
  // PSF(k) = sum_j [w_j * exp(-i*k_j*x)] where w_j = exp(-te_j / T2)
  // For linear k-ordering: te_j ≈ TE + (j - ETL/2) * ES
  // PSF FWHM ≈ ETL * ES / (pi * T2) (approximate Lorentzian FWHM)
  const psfFWHM = (T2: number) => {
    const fwhm = (etl * es) / (Math.PI * T2) * 1000  // in fractional voxels
    return Math.min(fwhm, etl)
  }

  // Compute PSF shape: approximate 1D PSF as inverse FT of T2-weighted k-weighting
  const N = 100  // display pixels
  const W = 270, H = 80
  const PAD = { l: 8, r: 8, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const halfW = 4  // +/- 4 voxel display range

  const paths = useMemo(() => T2_TISSUES.map(t => {
    // 1D PSF: numerically compute sum_j W_j exp(i*2pi*k_j*x/N)
    // Simplified: PSF(x) = sum_{j=0}^{ETL-1} w_j * cos(2pi * kj * x / kmax)
    const maxJ = Math.min(etl, 64)
    const pts = Array.from({ length: N + 1 }, (_, n) => {
      const x = -halfW + (n / N) * 2 * halfW  // position in voxels
      let re = 0
      for (let j = 0; j < maxJ; j++) {
        const kPos = (j / (maxJ - 1)) * 2 - 1  // -1 to +1 (linear k-order)
        const te = params.TE + (j - maxJ / 2) * es
        const w = Math.exp(-Math.max(0, te) / t.T2)
        re += w * Math.cos(Math.PI * kPos * x)
      }
      return re
    })
    // Normalize to peak=1
    const peak = Math.max(...pts.map(p => Math.abs(p)))
    const norm = pts.map(p => p / (peak || 1))
    const d = norm.map((v, i) => {
      const px = PAD.l + (i / N) * innerW
      const py = PAD.t + (1 - Math.max(0, Math.min(1, v))) * innerH
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`
    }).join(' ')
    const fwhm = psfFWHM(t.T2)
    return { ...t, d, fwhm }
  }), [etl, es, params.TE, is3T])

  const blurPct = calcT2Blur(params)
  const blurColor = blurPct > 60 ? '#f87171' : blurPct > 35 ? '#fbbf24' : '#4ade80'

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px' }}>PSF T2 ブラー (ETL={etl} × ES={es}ms)</span>
        <span className="font-mono font-bold" style={{ color: blurColor, fontSize: '9px' }}>Blur {blurPct}%</span>
      </div>
      <svg width={W} height={H}>
        {/* Baseline and center */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH}
          stroke="#252525" strokeWidth={1} />
        <line x1={PAD.l + innerW / 2} y1={PAD.t} x2={PAD.l + innerW / 2} y2={PAD.t + innerH}
          stroke="#374151" strokeWidth={0.8} strokeDasharray="2,2" />
        {/* Grid: half-power (-3dB) line */}
        <line x1={PAD.l} y1={PAD.t + innerH / 2} x2={PAD.l + innerW} y2={PAD.t + innerH / 2}
          stroke="#1a1a1a" strokeWidth={0.5} />
        <text x={PAD.l + 2} y={PAD.t + innerH / 2 - 1} fill="#374151" style={{ fontSize: '6px' }}>0.5</text>
        {/* PSF curves */}
        {paths.map(t => (
          <path key={t.label} d={t.d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.8} />
        ))}
        {/* X axis labels */}
        {[-3, -2, -1, 0, 1, 2, 3].map(v => {
          const x = PAD.l + ((v + halfW) / (2 * halfW)) * innerW
          return (
            <text key={v} x={x} y={H - 3} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{v}</text>
          )
        })}
        <text x={PAD.l + innerW / 2} y={H} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>pixel</text>
      </svg>
      {/* FWHM table */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1" style={{ fontSize: '7px' }}>
        {paths.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <span style={{ color: t.color }}>—</span>
            <span style={{ color: '#6b7280' }}>{t.label}</span>
            <span className="font-mono" style={{ color: t.fwhm > 1.5 ? '#f87171' : '#4ade80' }}>
              FWHM={t.fwhm.toFixed(2)}px
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 pt-1" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        PSF広がり: ETL↑・ES↑・T2短い組織で増大。FWHM&gt;1.5px → 空間分解能の実質的低下（T2ブラー）。
      </div>
    </div>
  )
}

// ── 2D k空間サンプリンググリッド ─────────────────────────────────────────────
// Siemens syngo MR コンソールの k-space browser に相当するビジュアライザー
// iPAT間引き・Partial Fourier欠損・ETLグループ配色・ACSライン表示
function KSpaceGrid2D() {
  const { params } = useProtocolStore()
  const [hovered, setHovered] = useState<{ row: number; info: string } | null>(null)

  const etl   = Math.min(params.turboFactor, 64)
  const isTSE = etl > 1
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  // Display: 40 ky lines × 20 kx columns
  const ROWS = 40
  const COLS = 20
  const cellW = 8
  const cellH = 5
  const W = COLS * cellW + 40
  const H = ROWS * cellH + 28
  const PAD_L = 30

  const ipatFactor = params.ipatMode !== 'Off' ? params.ipatFactor : 1

  // Partial Fourier: missing from one end
  const pfFrac = params.partialFourier === 'Off' ? 1.0
    : params.partialFourier === '7/8' ? 7/8
    : params.partialFourier === '6/8' ? 6/8
    : params.partialFourier === '5/8' ? 5/8
    : 0.5
  const missingRows = Math.round(ROWS * (1 - pfFrac))

  // ACS region for iPAT (center ±3 lines)
  const ACS_HALF = ipatFactor > 1 ? 3 : 0
  const centerRow = Math.floor(ROWS / 2)

  // ETL group → colour palette (10 distinct colours cycling)
  const ETL_COLORS = [
    '#e88b00', '#60a5fa', '#34d399', '#a78bfa', '#f87171',
    '#fbbf24', '#38bdf8', '#4ade80', '#fb923c', '#c084fc',
  ]

  // For TSE: which ETL group does row `r` belong to?
  // Linear ordering: fill from row 0 → ROWS-1 sequentially across TRs
  const linesPerTR = etl
  const getEchoGroup = (row: number) => Math.floor(row / linesPerTR)

  const rows = useMemo(() => {
    return Array.from({ length: ROWS }, (_, r) => {
      const isPFMissing = r < missingRows   // bottom (−ky) side missing

      // ACS: center rows always acquired in iPAT
      const isACS = Math.abs(r - centerRow) <= ACS_HALF && ipatFactor > 1

      // iPAT skip: every other line (relative to center)
      const relRow = r - centerRow
      const isIPATSkipped = ipatFactor > 1 && !isACS && Math.abs(relRow) % ipatFactor !== 0

      // EPI: acquisition order (zigzag — rows acquired bottom to top alternating direction)
      const echoGroup = isTSE ? getEchoGroup(r) : (isDWI ? 0 : 0)
      const color = isTSE ? ETL_COLORS[echoGroup % ETL_COLORS.length] : (isDWI ? '#f87171' : '#60a5fa')

      // k-space weight (signal, Gaussian envelope peaking at center)
      const distFromCenter = Math.abs(r - centerRow) / (ROWS / 2)
      const kWeight = Math.exp(-distFromCenter * distFromCenter * 3)

      return { isPFMissing, isACS, isIPATSkipped, echoGroup, color, kWeight, r }
    })
  }, [etl, ipatFactor, pfFrac, isTSE, isDWI, centerRow, ACS_HALF, missingRows])

  // EPI zigzag: row acquisition order
  const epiOrderMap = useMemo(() => {
    if (!isDWI) return new Map<number, number>()
    const map = new Map<number, number>()
    // EPI fills from center outward, alternating
    const order: number[] = []
    let lo = centerRow, hi = centerRow + 1
    order.push(centerRow)
    while (order.length < ROWS) {
      if (hi < ROWS) { order.push(hi++); }
      if (lo >= 0)   { order.push(lo--); }
    }
    order.forEach((r, i) => map.set(r, i))
    return map
  }, [isDWI, centerRow])

  const totalGroups = isTSE ? Math.ceil(ROWS / etl) : 1

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.06em' }}>
          k-SPACE SAMPLING PATTERN
        </span>
        <div className="flex gap-1.5 text-xs" style={{ fontSize: '7px', color: '#4b5563' }}>
          {isTSE && <span>ETL={etl} / {totalGroups} shots</span>}
          {isDWI && <span>EPI single-shot</span>}
          {ipatFactor > 1 && <span style={{ color: '#34d399' }}>iPAT ×{ipatFactor}</span>}
          {params.partialFourier !== 'Off' && <span style={{ color: '#fbbf24' }}>PF {params.partialFourier}</span>}
        </div>
      </div>

      <div className="flex gap-2">
        {/* k-space grid */}
        <svg width={W} height={H} style={{ cursor: 'crosshair' }}>
          {/* kx axis label */}
          <text x={PAD_L + (COLS * cellW) / 2} y={H - 2} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>kx</text>
          {/* ky labels */}
          <text x={PAD_L - 4} y={12} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+ky</text>
          <text x={PAD_L - 4} y={ROWS * cellH / 2 + 8} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
          <text x={PAD_L - 4} y={ROWS * cellH + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>−ky</text>
          <text x={8} y={ROWS * cellH / 2} textAnchor="middle" fill="#2a2a2a"
            transform={`rotate(-90,8,${ROWS * cellH / 2})`} style={{ fontSize: '7px' }}>ky</text>

          {rows.map(({ isPFMissing, isACS, isIPATSkipped, echoGroup, color, kWeight, r }) => {
            const y = r * cellH + 8  // offset for label

            // Determine fill color
            let fill: string
            let opacity = 0.85
            let strokeColor = 'none'
            let strokeW = 0

            if (isPFMissing) {
              fill = '#150a0a'
              strokeColor = '#3a1a1a'
              strokeW = 0.5
            } else if (isIPATSkipped && !isACS) {
              fill = '#111'
              strokeColor = color + '40'
              strokeW = 0.5
            } else if (isACS) {
              fill = '#1a1500'
              strokeColor = '#e88b0080'
              strokeW = 1
              opacity = 0.95
            } else {
              // Normal acquired line — brightness by k-weight and echo group
              const isCenter = Math.abs(r - centerRow) < 1
              if (isCenter) {
                fill = '#ffffff'
              } else if (isTSE) {
                // Blend ETL color with k-weight brightness
                const bright = 0.25 + kWeight * 0.65
                fill = color
                opacity = bright
              } else if (isDWI) {
                // EPI zigzag: alternating brightness
                const acqIdx = epiOrderMap.get(r) ?? r
                fill = color
                opacity = 0.3 + kWeight * 0.6
                strokeColor = acqIdx % 2 === 0 ? '#f8717140' : 'none'
                strokeW = acqIdx % 2 === 0 ? 0.5 : 0
              } else {
                fill = color
                opacity = 0.3 + kWeight * 0.5
              }
            }

            const isKCenter = Math.abs(r - centerRow) < 1
            const info = isPFMissing
              ? `ky[${r}]: Partial Fourier 欠損 (非取得)`
              : isACS
              ? `ky[${r}]: ACS (Auto-Calibration) — iPAT参照ライン`
              : isIPATSkipped
              ? `ky[${r}]: iPAT ×${ipatFactor} 間引き (補間)`
              : isTSE
              ? `ky[${r}]: Shot ${echoGroup + 1} / ETL Echo ${(r % etl) + 1}  k-weight=${kWeight.toFixed(2)}`
              : isDWI
              ? `ky[${r}]: EPI 取得順 ${(epiOrderMap.get(r) ?? 0) + 1}`
              : `ky[${r}]: 取得済み`

            return (
              <g key={r}>
                {/* Full-width stripe for all kx */}
                <rect
                  x={PAD_L}
                  y={y}
                  width={COLS * cellW}
                  height={cellH - 0.5}
                  fill={fill}
                  fillOpacity={opacity}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered({ row: r, info })}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* k-center special decoration */}
                {isKCenter && !isPFMissing && (
                  <rect x={PAD_L} y={y} width={COLS * cellW} height={cellH - 0.5}
                    fill="none" stroke="#e88b00" strokeWidth={1.5} />
                )}
              </g>
            )
          })}

          {/* Partial Fourier divider line */}
          {missingRows > 0 && (
            <line
              x1={PAD_L - 2}
              y1={missingRows * cellH + 8}
              x2={PAD_L + COLS * cellW + 2}
              y2={missingRows * cellH + 8}
              stroke="#f87171"
              strokeWidth={1}
              strokeDasharray="3,2"
            />
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-1 justify-start" style={{ minWidth: 80, paddingTop: 8 }}>
          <div style={{ fontSize: '7px', color: '#4b5563', marginBottom: 2 }}>凡例</div>
          <LegendItem color="#ffffff" label="k=0 center" />
          {isTSE && ETL_COLORS.slice(0, Math.min(totalGroups, 4)).map((c, i) => (
            <LegendItem key={i} color={c} label={`Shot ${i + 1}`} opacity={0.7} />
          ))}
          {ipatFactor > 1 && (
            <>
              <LegendItem color="#e88b00" label="ACS line" border />
              <LegendItem color="#111" label="iPAT 間引き" border borderColor="#60a5fa40" />
            </>
          )}
          {missingRows > 0 && <LegendItem color="#150a0a" label={`PF 欠損 (${missingRows}行)`} border borderColor="#3a1a1a" />}

          {/* Hover info */}
          {hovered && (
            <div className="mt-2 p-1.5 rounded" style={{ background: '#111', border: '1px solid #252525', fontSize: '7px', color: '#9ca3af', maxWidth: 90 }}>
              {hovered.info}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mt-1.5 pt-1.5 flex-wrap" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        {(() => {
          const acquired = rows.filter(r => !r.isPFMissing && !r.isIPATSkipped).length
          const missing = rows.filter(r => r.isPFMissing).length
          const interpolated = rows.filter(r => r.isIPATSkipped && !r.isPFMissing).length
          return (
            <>
              <span style={{ color: '#4ade80' }}>取得: {acquired}行 ({Math.round(acquired/ROWS*100)}%)</span>
              {interpolated > 0 && <span style={{ color: '#60a5fa' }}>補間: {interpolated}行</span>}
              {missing > 0 && <span style={{ color: '#f87171' }}>PF欠損: {missing}行</span>}
            </>
          )
        })()}
        {isTSE && <span>Shot数: {Math.ceil(ROWS/etl)}回 / ETL</span>}
      </div>
    </div>
  )
}

function LegendItem({ color, label, opacity = 1, border = false, borderColor }: {
  color: string; label: string; opacity?: number; border?: boolean; borderColor?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <div style={{
        width: 10, height: 6, background: color, opacity,
        border: border ? `1px solid ${borderColor ?? color}` : 'none',
        borderRadius: 1, flexShrink: 0,
      }} />
      <span style={{ color: '#4b5563', fontSize: '7px' }}>{label}</span>
    </div>
  )
}

// 臨床用 b値プリセット
const B_VALUE_PRESETS: { label: string; values: number[]; hint: string }[] = [
  { label: '脳梗塞', values: [0, 1000], hint: 'b=0+1000 | 急性期梗塞の標準' },
  { label: '頭部標準', values: [0, 500, 1000], hint: 'b=0+500+1000 | ADC精度向上' },
  { label: '腹部', values: [0, 50, 800], hint: 'b=0+50+800 | IVIM+悪性判定' },
  { label: '肝臓', values: [0, 50, 400, 800], hint: 'b=0+50+400+800 | EOBプロトコル' },
  { label: '前立腺', values: [0, 50, 400, 800, 1500], hint: 'PI-RADS v2.1推奨' },
  { label: '前立腺高b', values: [0, 50, 400, 800, 2000], hint: 'b=2000 | 高感度癌検出' },
]

export function SequenceTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1
  const isHASTE = params.turboFactor >= 80
  const t2blur = calcT2Blur(params)
  const effTE = params.TE + params.echoSpacing * Math.floor(params.turboFactor / 2)
  const lastEchoTE = params.TE + params.echoSpacing * (params.turboFactor - 1)

  // PartialFourier の推奨
  const pfRec = isHASTE ? '5/8 推奨' : params.turboFactor > 30 ? '6/8 推奨' : null

  return (
    <div className="space-y-0.5">
      <ParamField label="Turbo Factor / ETL" hintKey="TurboFactor" value={params.turboFactor} type="range"
        min={1} max={250} step={1}
        onChange={v => setParam('turboFactor', v as number)} highlight={hl('turboFactor')} />
      <ParamField label="Echo Spacing" value={params.echoSpacing} type="number"
        min={2} max={10} step={0.1} unit="ms"
        onChange={v => setParam('echoSpacing', v as number)} />
      <ParamField label="Partial Fourier" hintKey="PartialFourier" value={params.partialFourier} type="select"
        options={['Off', '7/8', '6/8', '5/8', '4/8']}
        onChange={v => setParam('partialFourier', v as typeof params.partialFourier)} highlight={hl('partialFourier')} />

      {/* TE 関連の物理パラメータ */}
      <MinTECalculator />

      {/* TE Budget breakdown */}
      <TEBudgetChart />

      {/* Pulse sequence timing diagram */}
      <PulseSequenceDiagram />

      {/* k-space echo train visualization */}
      <KSpaceEchoTrainViz />

      {/* 2D k-space sampling pattern */}
      <KSpaceGrid2D />

      {/* ETL 計算インジケーター */}
      {params.turboFactor > 1 && (
        <div className="mx-3 mt-2 p-3 rounded text-xs space-y-1.5" style={{ background: '#111', border: '1px solid #252525' }}>
          <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>ETL 計算結果</div>
          <div className="flex justify-between">
            <span style={{ color: '#6b7280' }}>Effective TE (k中心)</span>
            <span className="font-mono text-white">{effTE.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#6b7280' }}>最終エコー TE</span>
            <span className="font-mono text-white">{lastEchoTE.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: '#6b7280' }}>T2 ぼけ係数 (PSF)</span>
            <span className="font-mono" style={{ color: t2blur > 0.7 ? '#34d399' : t2blur > 0.4 ? '#fbbf24' : '#f87171' }}>
              {t2blur.toFixed(2)} {t2blur < 0.5 ? '⚠ ぼけ大' : ''}
            </span>
          </div>
          {/* T2 blur bar */}
          <div className="w-full h-1.5 rounded overflow-hidden" style={{ background: '#1e1e1e' }}>
            <div className="h-full rounded" style={{
              width: `${t2blur * 100}%`,
              background: t2blur > 0.7 ? '#34d399' : t2blur > 0.4 ? '#fbbf24' : '#f87171',
            }} />
          </div>
          {pfRec && (
            <div style={{ color: '#fbbf24', fontSize: '9px' }}>💡 {pfRec}</div>
          )}
        </div>
      )}

      {/* ETL guide */}
      <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #1a1a1a' }}>
        <div className="font-semibold mb-1.5" style={{ color: '#e88b00' }}>Turbo Factor 臨床ガイド</div>
        <table className="w-full">
          <thead>
            <tr style={{ color: '#4b5563', fontSize: '9px' }}>
              <th className="text-left py-0.5 w-32">用途</th>
              <th className="text-center py-0.5">ETL</th>
              <th className="text-left py-0.5 pl-2">特性</th>
            </tr>
          </thead>
          <tbody style={{ color: '#9ca3af' }}>
            {[
              ['T2 TSE 頭部', '15-25', 'コントラスト良好'],
              ['T2 TSE 腹部', '25-40', '速度・ぼけのバランス'],
              ['T2 TSE 関節', '10-15', '精細描出・ぼけ最小'],
              ['PDw TSE', '8-12', 'TE短縮・高SNR'],
              ['FLAIR', '20-30', 'PF必須・SAR注意'],
              ['HASTE', '100+', 'シングルショット'],
              ['MRCP', '150+', '重T2・PF必須'],
            ].map(([label, etl, note]) => (
              <tr key={label} style={{ borderTop: '1px solid #111' }}>
                <td className="py-0.5 text-white">{label}</td>
                <td className="text-center py-0.5 font-mono">{etl}</td>
                <td className="py-0.5 pl-2" style={{ fontSize: '9px', color: '#6b7280' }}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PSF Blur Simulator (TSE only) */}
      <PSFBlurSimulator />

      {/* DWI b-values */}
      <div className="border-t mt-2 pt-2 mx-3" style={{ borderColor: '#252525' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: '#9ca3af' }}>b値設定（DWI）</div>

        {/* Current b values */}
        <div className="flex flex-wrap gap-1 mb-2">
          {params.bValues.sort((a, b) => a - b).map((b, i) => (
            <button
              key={i}
              onClick={() => {
                if (params.bValues.length > 1) {
                  setParam('bValues', params.bValues.filter((_, j) => j !== i))
                }
              }}
              className="px-2 py-0.5 rounded text-xs font-mono transition-colors group"
              style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #c47400' }}
              title="クリックで削除"
            >
              b={b}
            </button>
          ))}
        </div>

        {/* Add individual b value */}
        <div className="flex flex-wrap gap-1 mb-2">
          {[0, 50, 100, 400, 500, 800, 1000, 1500, 2000].filter(b => !params.bValues.includes(b)).map(b => (
            <button
              key={b}
              onClick={() => setParam('bValues', [...params.bValues, b].sort((a, z) => a - z))}
              className="px-1.5 py-0.5 rounded text-xs font-mono transition-colors"
              style={{ background: '#1a1a1a', color: '#6b7280', border: '1px solid #2a2a2a' }}
            >
              +{b}
            </button>
          ))}
        </div>

        {/* Clinical b-value presets */}
        <div className="mt-2">
          <div className="text-xs mb-1.5" style={{ color: '#4b5563' }}>臨床プリセット</div>
          <div className="grid grid-cols-2 gap-1">
            {B_VALUE_PRESETS.map(preset => {
              const isActive = JSON.stringify(preset.values.sort()) === JSON.stringify([...params.bValues].sort((a,b) => a-b))
              return (
                <button
                  key={preset.label}
                  onClick={() => setParam('bValues', preset.values)}
                  className="px-2 py-1 rounded text-left transition-colors"
                  style={{
                    background: isActive ? '#2a1200' : '#151515',
                    color: isActive ? '#e88b00' : '#9ca3af',
                    border: `1px solid ${isActive ? '#c47400' : '#252525'}`,
                    fontSize: '10px',
                  }}
                  title={preset.hint}
                >
                  <div className="font-semibold">{preset.label}</div>
                  <div className="font-mono" style={{ fontSize: '8px', color: isActive ? '#c47400' : '#4b5563' }}>
                    b={preset.values.join('+')}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {isDWI && (
          <div className="mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>b値 臨床ガイド</div>
            <table className="w-full">
              <tbody style={{ color: '#9ca3af' }}>
                {[
                  ['b=0', '実質T2画像。ADC算出の基準点'],
                  ['b=50', '灌流効果 (IVIM)。低b値成分の分離'],
                  ['b=400-500', '腹部・肝臓の悪性病変スクリーニング'],
                  ['b=800-1000', '脳梗塞・前立腺の標準'],
                  ['b≥1500', '前立腺高b値 (PI-RADS v2.1推奨)'],
                ].map(([bv, desc]) => (
                  <tr key={bv} style={{ borderTop: '1px solid #111' }}>
                    <td className="py-0.5 text-white w-24 font-mono" style={{ fontSize: '9px' }}>{bv}</td>
                    <td className="py-0.5" style={{ fontSize: '9px' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid #252525', color: '#6b7280', fontSize: '9px' }}>
              ADC算出には最低2点（b=0 + b≥500）が必要。精度向上には3点以上推奨。
              {params.bValues.length >= 3 && (
                <span className="text-green-400"> ✓ {params.bValues.length}点取得 — ADC精度良好</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
