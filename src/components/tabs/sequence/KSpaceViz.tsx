import { useMemo, useState } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'
import { calcT2Blur } from '../../../store/calculators'

// ── k空間エコー並びビジュアライザー ─────────────────────────────────────────
export function KSpaceEchoTrainViz() {
  const { params } = useProtocolStore()
  const etl = Math.min(params.turboFactor, 40)

  if (etl <= 1) return null

  const W = 330
  const H = 54
  const PAD = { l: 14, r: 14, t: 8, b: 22 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const effEchoIdx = Math.floor(etl / 2)
  const kLines = Array.from({ length: etl }, (_, i) => (i - effEchoIdx) / (etl / 2))
  const T2 = params.fieldStrength >= 2.5 ? 69 : 75
  const weights = Array.from({ length: etl }, (_, i) => {
    const te_i = params.TE + i * params.echoSpacing
    return Math.exp(-te_i / T2)
  })
  const maxW = Math.max(...weights)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>k空間エコー配置 (Linear Ordering)</div>
      <svg width={W} height={H}>
        <line x1={PAD.l} y1={PAD.t + innerH + 2} x2={PAD.l + innerW} y2={PAD.t + innerH + 2}
          stroke="#252525" strokeWidth={1} />
        <line x1={PAD.l + innerW / 2} y1={PAD.t} x2={PAD.l + innerW / 2} y2={PAD.t + innerH + 4}
          stroke="#374151" strokeWidth={1} strokeDasharray="2,2" />
        <text x={PAD.l + innerW / 2} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>k=0</text>
        <text x={PAD.l} y={H - 4} textAnchor="start" fill="#374151" style={{ fontSize: '7px' }}>-kmax</text>
        <text x={PAD.l + innerW} y={H - 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+kmax</text>

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
export function PSFBlurSimulator() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  if (params.turboFactor <= 2) return null

  const T2_TISSUES: { label: string; T2: number; color: string }[] = [
    { label: 'CSF',   T2: is3T ? 1500 : 1800, color: '#38bdf8' },
    { label: 'WM',    T2: is3T ? 69 : 72,     color: '#60a5fa' },
    { label: 'GM',    T2: is3T ? 83 : 95,     color: '#a78bfa' },
    { label: 'Cart',  T2: is3T ? 32 : 35,     color: '#4ade80' },
    { label: 'Liver', T2: is3T ? 34 : 40,     color: '#fb923c' },
  ]

  const etl = params.turboFactor
  const es  = params.echoSpacing

  const psfFWHM = (T2: number) => {
    const fwhm = (etl * es) / (Math.PI * T2) * 1000
    return Math.min(fwhm, etl)
  }

  const N = 100
  const W = 270, H = 80
  const PAD = { l: 8, r: 8, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const halfW = 4

  const paths = useMemo(() => T2_TISSUES.map(t => {
    const maxJ = Math.min(etl, 64)
    const pts = Array.from({ length: N + 1 }, (_, n) => {
      const x = -halfW + (n / N) * 2 * halfW
      let re = 0
      for (let j = 0; j < maxJ; j++) {
        const kPos = (j / (maxJ - 1)) * 2 - 1
        const te = params.TE + (j - maxJ / 2) * es
        const w = Math.exp(-Math.max(0, te) / t.T2)
        re += w * Math.cos(Math.PI * kPos * x)
      }
      return re
    })
    const peak = Math.max(...pts.map(p => Math.abs(p)))
    const norm = pts.map(p => p / (peak || 1))
    const d = norm.map((v, i) => {
      const px = PAD.l + (i / N) * innerW
      const py = PAD.t + (1 - Math.max(0, Math.min(1, v))) * innerH
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`
    }).join(' ')
    const fwhm = psfFWHM(t.T2)
    return { ...t, d, fwhm }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH}
          stroke="#252525" strokeWidth={1} />
        <line x1={PAD.l + innerW / 2} y1={PAD.t} x2={PAD.l + innerW / 2} y2={PAD.t + innerH}
          stroke="#374151" strokeWidth={0.8} strokeDasharray="2,2" />
        <line x1={PAD.l} y1={PAD.t + innerH / 2} x2={PAD.l + innerW} y2={PAD.t + innerH / 2}
          stroke="#1a1a1a" strokeWidth={0.5} />
        <text x={PAD.l + 2} y={PAD.t + innerH / 2 - 1} fill="#374151" style={{ fontSize: '6px' }}>0.5</text>
        {paths.map(t => (
          <path key={t.label} d={t.d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.8} />
        ))}
        {[-3, -2, -1, 0, 1, 2, 3].map(v => {
          const x = PAD.l + ((v + halfW) / (2 * halfW)) * innerW
          return (
            <text key={v} x={x} y={H - 3} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{v}</text>
          )
        })}
        <text x={PAD.l + innerW / 2} y={H} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>pixel</text>
      </svg>
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

export function KSpaceGrid2D() {
  const { params } = useProtocolStore()
  const [hovered, setHovered] = useState<{ row: number; info: string } | null>(null)

  const etl   = Math.min(params.turboFactor, 64)
  const isTSE = etl > 1
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  const ROWS = 40
  const COLS = 20
  const cellW = 8
  const cellH = 5
  const W = COLS * cellW + 40
  const H = ROWS * cellH + 28
  const PAD_L = 30

  const ipatFactor = params.ipatMode !== 'Off' ? params.ipatFactor : 1

  const pfFrac = params.partialFourier === 'Off' ? 1.0
    : params.partialFourier === '7/8' ? 7/8
    : params.partialFourier === '6/8' ? 6/8
    : params.partialFourier === '5/8' ? 5/8
    : 0.5
  const missingRows = Math.round(ROWS * (1 - pfFrac))

  const ACS_HALF = ipatFactor > 1 ? 3 : 0
  const centerRow = Math.floor(ROWS / 2)

  const ETL_COLORS = [
    '#e88b00', '#60a5fa', '#34d399', '#a78bfa', '#f87171',
    '#fbbf24', '#38bdf8', '#4ade80', '#fb923c', '#c084fc',
  ]

  const linesPerTR = etl
  const getEchoGroup = (row: number) => Math.floor(row / linesPerTR)

  const rows = useMemo(() => {
    return Array.from({ length: ROWS }, (_, r) => {
      const isPFMissing = r < missingRows
      const isACS = Math.abs(r - centerRow) <= ACS_HALF && ipatFactor > 1
      const relRow = r - centerRow
      const isIPATSkipped = ipatFactor > 1 && !isACS && Math.abs(relRow) % ipatFactor !== 0
      const echoGroup = isTSE ? getEchoGroup(r) : 0
      const color = isTSE ? ETL_COLORS[echoGroup % ETL_COLORS.length] : (isDWI ? '#f87171' : '#60a5fa')
      const distFromCenter = Math.abs(r - centerRow) / (ROWS / 2)
      const kWeight = Math.exp(-distFromCenter * distFromCenter * 3)
      return { isPFMissing, isACS, isIPATSkipped, echoGroup, color, kWeight, r }
    })
  }, [etl, ipatFactor, pfFrac, isTSE, isDWI, centerRow, ACS_HALF, missingRows])

  const epiOrderMap = useMemo(() => {
    if (!isDWI) return new Map<number, number>()
    const map = new Map<number, number>()
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
        <svg width={W} height={H} style={{ cursor: 'crosshair' }}>
          <text x={PAD_L + (COLS * cellW) / 2} y={H - 2} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>kx</text>
          <text x={PAD_L - 4} y={12} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+ky</text>
          <text x={PAD_L - 4} y={ROWS * cellH / 2 + 8} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
          <text x={PAD_L - 4} y={ROWS * cellH + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>−ky</text>
          <text x={8} y={ROWS * cellH / 2} textAnchor="middle" fill="#2a2a2a"
            transform={`rotate(-90,8,${ROWS * cellH / 2})`} style={{ fontSize: '7px' }}>ky</text>

          {rows.map(({ isPFMissing, isACS, isIPATSkipped, echoGroup, color, kWeight, r }) => {
            const y = r * cellH + 8
            let fill: string
            let opacity = 0.85
            let strokeColor = 'none'
            let strokeW = 0

            if (isPFMissing) {
              fill = '#150a0a'; strokeColor = '#3a1a1a'; strokeW = 0.5
            } else if (isIPATSkipped && !isACS) {
              fill = '#111'; strokeColor = color + '40'; strokeW = 0.5
            } else if (isACS) {
              fill = '#1a1500'; strokeColor = '#e88b0080'; strokeW = 1; opacity = 0.95
            } else {
              const isCenter = Math.abs(r - centerRow) < 1
              if (isCenter) {
                fill = '#ffffff'
              } else if (isTSE) {
                const bright = 0.25 + kWeight * 0.65
                fill = color; opacity = bright
              } else if (isDWI) {
                const acqIdx = epiOrderMap.get(r) ?? r
                fill = color; opacity = 0.3 + kWeight * 0.6
                strokeColor = acqIdx % 2 === 0 ? '#f8717140' : 'none'
                strokeW = acqIdx % 2 === 0 ? 0.5 : 0
              } else {
                fill = color; opacity = 0.3 + kWeight * 0.5
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
                <rect
                  x={PAD_L} y={y}
                  width={COLS * cellW} height={cellH - 0.5}
                  fill={fill} fillOpacity={opacity}
                  stroke={strokeColor} strokeWidth={strokeW}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered({ row: r, info })}
                  onMouseLeave={() => setHovered(null)}
                />
                {isKCenter && !isPFMissing && (
                  <rect x={PAD_L} y={y} width={COLS * cellW} height={cellH - 0.5}
                    fill="none" stroke="#e88b00" strokeWidth={1.5} />
                )}
              </g>
            )
          })}

          {missingRows > 0 && (
            <line
              x1={PAD_L - 2} y1={missingRows * cellH + 8}
              x2={PAD_L + COLS * cellW + 2} y2={missingRows * cellH + 8}
              stroke="#f87171" strokeWidth={1} strokeDasharray="3,2"
            />
          )}
        </svg>

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
          {hovered && (
            <div className="mt-2 p-1.5 rounded" style={{ background: '#111', border: '1px solid #252525', fontSize: '7px', color: '#9ca3af', maxWidth: 90 }}>
              {hovered.info}
            </div>
          )}
        </div>
      </div>

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
