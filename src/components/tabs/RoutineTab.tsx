import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField, SectionHeader as SH } from '../ParamField'
import { TISSUES, calcScanTime, calcTEmin, calcTRmin, identifySequence } from '../../store/calculators'
import type { ProtocolParams } from '../../data/presets'

// ── Ernst 角インジケーター ────────────────────────────────────────────────────
function ErnstAngleIndicator() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Only show for GRE-like sequences (short TR)
  const isGRE = params.turboFactor <= 2 && params.TR < 500

  const tissues = TISSUES.filter(t => ['WM', 'GM', 'Fat', 'Liver'].includes(t.label))

  const ernstAngles = tissues.map(t => {
    const T1 = is3T ? t.T1_30 : t.T1_15
    const ea = Math.round((Math.acos(Math.exp(-params.TR / T1)) * 180) / Math.PI)
    return { label: t.label, color: t.color, ea, T1 }
  })

  if (!isGRE) return null

  return (
    <div className="mx-3 mb-1 px-2 py-1.5 rounded" style={{ background: '#111', border: '1px solid #1a2820' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: '#34d399', fontSize: '9px', fontWeight: 600 }}>Ernst Angle (GRE最適FA)</span>
        <span style={{ color: '#374151', fontSize: '8px' }}>= arccos(e^(-TR/T1))</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {ernstAngles.map(({ label, color, ea }) => {
          const diff = Math.abs(params.flipAngle - ea)
          const close = diff <= 5
          return (
            <div key={label} className="flex items-center gap-1">
              <span style={{ color, fontSize: '8px' }}>{label}:</span>
              <span className="font-mono" style={{ color: close ? '#34d399' : diff <= 15 ? '#fbbf24' : '#6b7280', fontSize: '9px', fontWeight: 600 }}>
                {ea}°
              </span>
              {close && <span style={{ color: '#34d399', fontSize: '8px' }}>✓</span>}
            </div>
          )
        })}
        <span style={{ color: '#374151', fontSize: '8px' }}>現在={params.flipAngle}°</span>
      </div>
    </div>
  )
}

// ── T1/T2 信号曲線 ──────────────────────────────────────────────────────────
function SignalCurveChart() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const W = 340
  const H = 80
  const PAD = { l: 30, r: 8, t: 6, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // 3組織のみ (WM, GM, Fat) + CSF
  const tissues = TISSUES.filter(t => ['WM', 'GM', 'Fat', 'CSF'].includes(t.label))

  // T1 recovery: normalized to max = 1 at TR=10000ms
  const maxTR = 10000

  // T2 decay: normalized to max = 1 at TE=0
  const maxTE = 300

  const nPts = 80
  // log scale for TR (0-10000ms)
  const trPoints = Array.from({ length: nPts }, (_, i) => {
    const t = Math.exp(i / (nPts - 1) * Math.log(maxTR + 1)) - 1
    return t
  })
  const tePoints = Array.from({ length: nPts }, (_, i) => i / (nPts - 1) * maxTE)

  const trPathForTissue = (T1: number) => {
    return trPoints.map((t, i) => {
      const s = 1 - Math.exp(-t / T1)
      const x = PAD.l + (Math.log(t + 1) / Math.log(maxTR + 1)) * innerW
      const y = PAD.t + innerH - s * innerH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  const tePathForTissue = (T2: number) => {
    return tePoints.map((t, i) => {
      const s = Math.exp(-t / T2)
      const x = PAD.l + (t / maxTE) * innerW
      const y = PAD.t + innerH - s * innerH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  // Current TR/TE marker positions
  const trMarkerX = PAD.l + (Math.log(params.TR + 1) / Math.log(maxTR + 1)) * innerW
  const teMarkerX = PAD.l + Math.min(1, params.TE / maxTE) * innerW

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>T1回復・T2減衰曲線</div>
      <div className="flex gap-2">
        {/* T1 Recovery */}
        <div className="flex-1">
          <div style={{ fontSize: '8px', color: '#374151', marginBottom: '2px' }}>T1 回復 (log TR)</div>
          <svg width={W / 2 - 4} height={H}>
            {/* Grid lines */}
            {[0, 0.5, 1].map(v => (
              <line key={v} x1={PAD.l} y1={PAD.t + innerH - v * innerH}
                x2={PAD.l + innerW} y2={PAD.t + innerH - v * innerH}
                stroke="#1a1a1a" strokeWidth={1} />
            ))}
            {/* Y-axis */}
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
            <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
            <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
            {/* X-axis label */}
            <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TR (ms)</text>

            {/* Tissue curves */}
            {tissues.map(t => {
              const T1 = is3T ? t.T1_30 : t.T1_15
              return (
                <path key={t.label} d={trPathForTissue(T1)} fill="none"
                  stroke={t.color} strokeWidth={1} opacity={0.7} />
              )
            })}

            {/* TR marker */}
            <line x1={trMarkerX} y1={PAD.t} x2={trMarkerX} y2={PAD.t + innerH}
              stroke="#e88b00" strokeWidth={1.5} strokeDasharray="3,2" />
            <text x={trMarkerX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TR</text>
          </svg>
        </div>

        {/* T2 Decay */}
        <div className="flex-1">
          <div style={{ fontSize: '8px', color: '#374151', marginBottom: '2px' }}>T2 減衰 (TE)</div>
          <svg width={W / 2 - 4} height={H}>
            {/* Grid lines */}
            {[0, 0.5, 1].map(v => (
              <line key={v} x1={PAD.l} y1={PAD.t + innerH - v * innerH}
                x2={PAD.l + innerW} y2={PAD.t + innerH - v * innerH}
                stroke="#1a1a1a" strokeWidth={1} />
            ))}
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
            <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
            <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
            <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TE (ms, 0-300)</text>

            {/* Tissue curves */}
            {tissues.map(t => {
              const T2 = is3T ? t.T2_30 : t.T2_15
              return (
                <path key={t.label} d={tePathForTissue(T2)} fill="none"
                  stroke={t.color} strokeWidth={1} opacity={0.7} />
              )
            })}

            {/* TE marker */}
            <line x1={teMarkerX} y1={PAD.t} x2={teMarkerX} y2={PAD.t + innerH}
              stroke="#e88b00" strokeWidth={1.5} strokeDasharray="3,2" />
            <text x={teMarkerX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TE</text>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-1 flex-wrap" style={{ fontSize: '8px' }}>
        {tissues.map(t => (
          <span key={t.label} style={{ color: t.color }}>● {t.label}</span>
        ))}
      </div>
    </div>
  )
}

// ── スキャン時間分解 ─────────────────────────────────────────────────────────
// ── スライス収集順序 / ステディステート ───────────────────────────────────────
// 実際のスキャナーは interleaved でスライスを収集し、ステディステート確立まで
// ダミーパルスを送信する。この可視化でスライスタイミングを直感的に理解できる
function SliceOrderViz() {
  const { params } = useProtocolStore()

  const nSlices = params.slices
  const tr = params.TR
  const is3T = params.fieldStrength >= 2.5

  // Number of dummy scans to reach steady state
  // T1 of WM: ~800ms (1.5T), ~1000ms (3T)
  // Need ~5 × T1 / TR pulses to reach >99% steady state, typically 2-7 dummies
  const t1WM = is3T ? 1000 : 800
  const dummyScans = Math.min(15, Math.max(2, Math.ceil(5 * t1WM / tr)))

  // Slice ordering: interleaved if slices > 1
  // Sequential: 1,2,3,4... | Interleaved: 1,3,5,2,4,6...
  const isEPI = params.bValues.length >= 2 && params.turboFactor <= 2
  const ordering = isEPI ? 'Interleaved' : nSlices > 8 ? 'Interleaved' : 'Sequential'

  const maxDisplay = Math.min(nSlices, 20)
  const sliceOrder: number[] = []
  if (ordering === 'Interleaved') {
    // Interleaved: odd slices first, then even
    for (let i = 0; i < maxDisplay; i += 2) sliceOrder.push(i)
    for (let i = 1; i < maxDisplay; i += 2) sliceOrder.push(i)
  } else {
    for (let i = 0; i < maxDisplay; i++) sliceOrder.push(i)
  }

  const cellSize = Math.max(4, Math.min(12, Math.floor(280 / maxDisplay)))

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080a0c', border: '1px solid #1a2020' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px', letterSpacing: '0.05em' }}>
          SLICE ACQUISITION ORDER
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#4b5563' }}>{ordering}</span>
          <span style={{ color: '#374151' }}>· {nSlices} slices</span>
        </div>
      </div>

      {/* Slice order visualization */}
      <div className="flex flex-wrap gap-0.5 mb-1.5">
        {sliceOrder.map((sliceIdx, acquireOrder) => {
          // Color: encode acquisition sequence (early=blue, late=red for interleaved)
          const hue = ordering === 'Interleaved'
            ? acquireOrder < maxDisplay / 2 ? '#60a5fa' : '#f472b6'
            : '#a78bfa'
          return (
            <div
              key={sliceIdx}
              title={`Sl ${sliceIdx + 1} → Acq #${acquireOrder + 1}`}
              style={{
                width: cellSize, height: cellSize + 4,
                background: hue + '40',
                border: `1px solid ${hue}70`,
                borderRadius: 1,
                fontSize: '5px',
                color: hue,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 1,
              }}
            >
              {cellSize >= 8 ? sliceIdx + 1 : ''}
            </div>
          )
        })}
        {nSlices > maxDisplay && (
          <span style={{ color: '#374151', fontSize: '7px', alignSelf: 'center' }}>+{nSlices - maxDisplay}</span>
        )}
      </div>

      {/* Dummy scans + timing */}
      <div className="flex gap-3 pt-1" style={{ borderTop: '1px solid #111', fontSize: '8px' }}>
        <div>
          <span style={{ color: '#4b5563' }}>Dummy scans: </span>
          <span className="font-mono font-bold" style={{ color: '#fbbf24' }}>{dummyScans}</span>
          <span style={{ color: '#374151', fontSize: '7px' }}> (T1_WM={t1WM}ms)</span>
        </div>
        <div>
          <span style={{ color: '#4b5563' }}>Prep time: </span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{Math.round(dummyScans * tr / 1000)}s</span>
        </div>
      </div>
    </div>
  )
}

function ScanTimeBreakdown() {
  const { params } = useProtocolStore()
  const totalTime = calcScanTime(params)

  const ipatDiv = params.ipatMode !== 'Off' ? params.ipatFactor : 1
  const pfFactor = params.partialFourier === 'Off' ? 1.0
    : params.partialFourier === '7/8' ? 0.875
    : params.partialFourier === '6/8' ? 0.75
    : params.partialFourier === '5/8' ? 0.625
    : 0.5

  // Baseline (no iPAT, no PF, no resp)
  const basePhaseLines = Math.round(params.matrixPhase * (params.phaseResolution / 100))
  const baseTime = Math.round((params.TR * basePhaseLines * params.averages) / params.turboFactor / 1000)
  const timeWithPF = Math.round(baseTime * pfFactor)
  const timeWithIPAT = Math.round(timeWithPF / ipatDiv)
  const timeWithResp = params.respTrigger === 'RT' || params.respTrigger === 'PACE'
    ? Math.round(timeWithIPAT * 1.4) : timeWithIPAT

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m${s%60>0 ? String(s%60).padStart(2,'0')+'s' : ''}`

  const stages: { label: string; value: number; savings: number; color: string }[] = [
    { label: 'Base (ETL×TR×Avg)', value: baseTime, savings: 0, color: '#4b5563' },
    { label: `PF (${params.partialFourier})`, value: timeWithPF, savings: baseTime - timeWithPF, color: '#60a5fa' },
    { label: `iPAT (${params.ipatMode === 'Off' ? 'Off' : `×${params.ipatFactor}`})`, value: timeWithIPAT, savings: timeWithPF - timeWithIPAT, color: '#34d399' },
    { label: `Resp (${params.respTrigger})`, value: timeWithResp, savings: timeWithIPAT - timeWithResp, color: params.respTrigger !== 'Off' ? '#f87171' : '#374151' },
  ]

  const maxVal = Math.max(baseTime, 1)
  const W = 260

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: '#4b5563' }}>スキャン時間 内訳</span>
        <span className="font-mono font-bold" style={{ color: '#e88b00', fontSize: '11px' }}>{fmt(totalTime)}</span>
      </div>
      <div className="space-y-1">
        {stages.map((s, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-0.5" style={{ fontSize: '8px' }}>
              <span style={{ color: '#6b7280' }}>{s.label}</span>
              <span className="font-mono" style={{ color: s.color }}>{fmt(s.value)}</span>
            </div>
            <div style={{ width: W, height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${(s.value / maxVal) * 100}%`,
                height: '100%',
                background: s.color,
                borderRadius: 3,
                opacity: 0.8,
              }} />
            </div>
            {s.savings > 0 && (
              <div style={{ fontSize: '7px', color: '#34d399', textAlign: 'right' }}>
                −{fmt(s.savings)} 短縮
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1.5 flex items-center gap-2" style={{ borderTop: '1px solid #1a1a1a', fontSize: '8px', color: '#374151' }}>
        <span>AVG×{params.averages}</span>
        <span>ETL×{params.turboFactor}</span>
        <span>Phase {params.matrixPhase}×{params.phaseResolution}%</span>
      </div>
    </div>
  )
}

// ── シミュレーション脳断面 Phantom ──────────────────────────────────────────
// 現在のTR/TE/TI/FAに基づいて各組織の信号強度をリアルタイム計算し
// syngo MR-like な疑似MR断面画像として表示する
function BrainPhantomPreview() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const W = 180, H = 180
  const CX = W / 2, CY = H / 2

  // Tissue signal calculation (SE / IR / GRE)
  const isIR = params.TI > 0
  const isGRE = params.turboFactor <= 2 && params.flipAngle < 60 && params.TR < 200

  const sig = useMemo(() => {
    const getT1T2 = (t: typeof TISSUES[0]) => is3T
      ? { T1: t.T1_30, T2: t.T2_30, T2s: t.T2star_30 }
      : { T1: t.T1_15, T2: t.T2_15, T2s: t.T2star_15 }

    const seSignal = (T1: number, T2: number) =>
      Math.max(0, (1 - Math.exp(-params.TR / T1)) * Math.exp(-params.TE / T2))

    const irSignal = (T1: number, T2: number) =>
      Math.max(0, Math.abs(1 - 2 * Math.exp(-params.TI / T1) + Math.exp(-params.TR / T1)) * Math.exp(-params.TE / T2))

    const faRad = (params.flipAngle * Math.PI) / 180
    const greSignal = (T1: number, T2s: number) => {
      const e1 = Math.exp(-params.TR / T1)
      const ernst = Math.sin(faRad) * (1 - e1) / (1 - Math.cos(faRad) * e1 + 1e-10)
      return Math.max(0, ernst * Math.exp(-params.TE / T2s))
    }

    const compute = (label: string) => {
      const t = TISSUES.find(x => x.label === label)
      if (!t) return 0
      const { T1, T2, T2s } = getT1T2(t)
      let s = isIR ? irSignal(T1, T2) : isGRE ? greSignal(T1, T2s) : seSignal(T1, T2)
      // Fat saturation
      if (params.fatSat !== 'None' && label === 'Fat') s = 0
      return s
    }

    const raw = {
      CSF: compute('CSF'),
      GM: compute('GM'),
      WM: compute('WM'),
      Fat: compute('Fat'),
      Muscle: compute('Muscle'),
    }
    // Normalize to max
    const maxS = Math.max(...Object.values(raw), 0.001)
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / maxS])) as typeof raw
  }, [params.TR, params.TE, params.TI, params.flipAngle, params.fatSat, params.fieldStrength, params.turboFactor, isIR, isGRE, is3T])

  // Signal → grayscale brightness (0-255)
  const gray = (s: number) => Math.round(s * 230)
  const toRgb = (s: number) => { const v = gray(s); return `rgb(${v},${v},${v})` }

  // Phase encode direction arrow
  const peDir = params.phaseEncDir
  const isAP = peDir === 'A>>P' || peDir === 'P>>A'

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#050505', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#4b5563', fontSize: '9px', letterSpacing: '0.06em' }}>
          SIGNAL PREVIEW — Brain Phantom
        </span>
        <span style={{ color: '#4b5563', fontSize: '7px' }}>{params.fieldStrength}T</span>
      </div>
      <div className="flex gap-3">
        {/* Phantom SVG */}
        <svg width={W} height={H} style={{ background: '#000', borderRadius: 4, flexShrink: 0 }}>
          {/* Scalp / outer fat ring */}
          <ellipse cx={CX} cy={CY} rx={82} ry={80}
            fill={toRgb(sig.Fat)} />
          {/* Skull (dark bone) */}
          <ellipse cx={CX} cy={CY} rx={75} ry={73}
            fill="rgb(18,18,18)" />
          {/* White matter */}
          <ellipse cx={CX} cy={CY} rx={65} ry={63}
            fill={toRgb(sig.WM)} />
          {/* Gray matter ring */}
          <ellipse cx={CX} cy={CY} rx={53} ry={51}
            fill={toRgb(sig.GM)} />
          {/* WM inner */}
          <ellipse cx={CX} cy={CY} rx={42} ry={40}
            fill={toRgb(sig.WM)} />
          {/* Basal ganglia (GM-like) */}
          <ellipse cx={CX - 14} cy={CY} rx={12} ry={14}
            fill={toRgb(sig.GM * 0.95)} />
          <ellipse cx={CX + 14} cy={CY} rx={12} ry={14}
            fill={toRgb(sig.GM * 0.95)} />
          {/* Internal capsule (WM) */}
          <ellipse cx={CX - 14} cy={CY} rx={7} ry={10}
            fill={toRgb(sig.WM)} />
          <ellipse cx={CX + 14} cy={CY} rx={7} ry={10}
            fill={toRgb(sig.WM)} />
          {/* Lateral ventricles (CSF) */}
          <ellipse cx={CX - 16} cy={CY - 8} rx={10} ry={14}
            fill={toRgb(sig.CSF)} />
          <ellipse cx={CX + 16} cy={CY - 8} rx={10} ry={14}
            fill={toRgb(sig.CSF)} />
          {/* 3rd ventricle */}
          <rect x={CX - 2} y={CY - 2} width={4} height={16}
            fill={toRgb(sig.CSF)} />
          {/* Cortex outer GM */}
          <ellipse cx={CX} cy={CY} rx={65} ry={63}
            fill="none" stroke={toRgb(sig.GM * 0.9)} strokeWidth={5} opacity={0.6} />

          {/* Phase encode direction indicator */}
          <g opacity={0.6}>
            {isAP ? (
              <>
                <line x1={CX} y1={10} x2={CX} y2={H - 10} stroke="#60a5fa" strokeWidth={0.8} strokeDasharray="3,3" />
                <text x={CX + 3} y={20} fill="#60a5fa" style={{ fontSize: '8px' }}>PE</text>
                <polygon points={`${CX-3},15 ${CX+3},15 ${CX},8`} fill="#60a5fa" />
              </>
            ) : (
              <>
                <line x1={10} y1={CY} x2={W - 10} y2={CY} stroke="#60a5fa" strokeWidth={0.8} strokeDasharray="3,3" />
                <text x={15} y={CY - 3} fill="#60a5fa" style={{ fontSize: '8px' }}>PE</text>
                <polygon points={`${W-15},${CY-3} ${W-15},${CY+3} ${W-8},${CY}`} fill="#60a5fa" />
              </>
            )}
          </g>

          {/* Field strength badge */}
          <text x={6} y={H - 6} fill="#2a2a2a" style={{ fontSize: '8px', fontFamily: 'monospace' }}>
            {params.fieldStrength}T
          </text>
        </svg>

        {/* Signal level bars */}
        <div className="flex flex-col gap-1.5 flex-1" style={{ paddingTop: 4 }}>
          <div style={{ fontSize: '8px', color: '#4b5563', marginBottom: 4 }}>組織信号レベル</div>
          {([
            ['CSF', sig.CSF, '#38bdf8'],
            ['GM', sig.GM, '#a78bfa'],
            ['WM', sig.WM, '#60a5fa'],
            ['Fat', sig.Fat, '#fbbf24'],
            ['Muscle', sig.Muscle, '#f87171'],
          ] as [string, number, string][]).map(([label, s, color]) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-0.5">
                <span style={{ color, fontSize: '8px', width: 40 }}>{label}</span>
                <span className="font-mono" style={{ color, fontSize: '8px' }}>{Math.round(s * 100)}%</span>
              </div>
              <div className="h-1.5 rounded overflow-hidden" style={{ background: '#111' }}>
                <div className="h-full rounded transition-all duration-300"
                  style={{ width: `${s * 100}%`, background: color, opacity: 0.8 }} />
              </div>
            </div>
          ))}
          <div className="mt-1 pt-1.5" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
            {isIR ? `IR (TI=${params.TI}ms)` : isGRE ? `GRE (FA=${params.flipAngle}°)` : 'SE/TSE'}
            {' '}· TR={params.TR} TE={params.TE}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── GM/WM コントラスト TR-TE ヒートマップ ────────────────────────────────────
function ContrastHeatmap() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const GM = TISSUES.find(t => t.label === 'GM')!
  const WM = TISSUES.find(t => t.label === 'WM')!
  const gmT1 = is3T ? GM.T1_30 : GM.T1_15
  const wmT1 = is3T ? WM.T1_30 : WM.T1_15
  const gmT2 = is3T ? GM.T2_30 : GM.T2_15
  const wmT2 = is3T ? WM.T2_30 : WM.T2_15

  const COLS = 16  // TR steps
  const ROWS = 12  // TE steps
  const trRange = [200, 6000]
  const teRange = [5, 200]

  const trVals = Array.from({ length: COLS }, (_, i) => Math.round(trRange[0] + (trRange[1] - trRange[0]) * (i / (COLS - 1))))
  const teVals = Array.from({ length: ROWS }, (_, i) => Math.round(teRange[0] + (teRange[1] - teRange[0]) * (i / (ROWS - 1))))

  // Compute GM-WM contrast at each TR/TE: |S_GM - S_WM|
  const grid = useMemo(() => {
    return teVals.map(te =>
      trVals.map(tr => {
        const sgm = (1 - Math.exp(-tr / gmT1)) * Math.exp(-te / gmT2)
        const swm = (1 - Math.exp(-tr / wmT1)) * Math.exp(-te / wmT2)
        return Math.abs(sgm - swm)
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3T, gmT1, wmT1, gmT2, wmT2])

  const maxContrast = Math.max(...grid.flat())
  const W = 340
  const H = 100
  const PAD = { l: 28, r: 4, t: 4, b: 20 }
  const cellW = (W - PAD.l - PAD.r) / COLS
  const cellH = (H - PAD.t - PAD.b) / ROWS

  // Current TR/TE cell
  const trIdx = trVals.reduce((best, tr, i) => Math.abs(tr - params.TR) < Math.abs(trVals[best] - params.TR) ? i : best, 0)
  const teIdx = teVals.reduce((best, te, i) => Math.abs(te - params.TE) < Math.abs(teVals[best] - params.TE) ? i : best, 0)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>
        GM/WM コントラスト マップ ({params.fieldStrength}T)
        <span className="ml-2 font-normal" style={{ color: '#374151', fontSize: '8px' }}>暗→高コントラスト</span>
      </div>
      <svg width={W} height={H} style={{ display: 'block', cursor: 'crosshair' }}
        onClick={(e) => {
          const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect()
          const x = e.clientX - rect.left - PAD.l
          const y = e.clientY - rect.top - PAD.t
          const ci = Math.max(0, Math.min(COLS - 1, Math.floor(x / cellW)))
          const ri = Math.max(0, Math.min(ROWS - 1, Math.floor(y / cellH)))
          setParam('TR', trVals[ci])
          setParam('TE', teVals[ri])
        }}>
        {/* Cells */}
        {grid.map((row, ri) =>
          row.map((val, ci) => {
            const t = val / maxContrast
            const isCurrent = ci === trIdx && ri === teIdx
            // Colormap: black → blue → cyan → green → yellow → white
            const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 255)
            const g = Math.round(t < 0.25 ? 0 : t < 0.75 ? (t - 0.25) * 2 * 255 : 255)
            const b = Math.round(t < 0.5 ? t * 2 * 255 : (1 - (t - 0.5) * 2) * 255)
            return (
              <rect
                key={`${ri}_${ci}`}
                x={PAD.l + ci * cellW}
                y={PAD.t + ri * cellH}
                width={cellW}
                height={cellH}
                fill={`rgb(${r},${g},${b})`}
                stroke={isCurrent ? '#e88b00' : 'none'}
                strokeWidth={isCurrent ? 1.5 : 0}
              />
            )
          })
        )}
        {/* Y axis labels */}
        {[0, ROWS - 1].map(ri => (
          <text key={ri} x={PAD.l - 2} y={PAD.t + ri * cellH + cellH / 2 + 3}
            textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {teVals[ri]}
          </text>
        ))}
        {/* Y axis label */}
        <text x={8} y={H / 2} textAnchor="middle" fill="#374151"
          transform={`rotate(-90, 8, ${H / 2})`} style={{ fontSize: '7px' }}>
          TE
        </text>
        {/* X axis labels */}
        {[0, Math.floor(COLS / 2), COLS - 1].map(ci => (
          <text key={ci} x={PAD.l + ci * cellW + cellW / 2} y={H - 4}
            textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>
            {trVals[ci] >= 1000 ? `${(trVals[ci] / 1000).toFixed(1)}k` : trVals[ci]}
          </text>
        ))}
        <text x={PAD.l + (W - PAD.l - PAD.r) / 2} y={H} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>
          TR (ms)
        </text>
      </svg>
      <div style={{ fontSize: '8px', color: '#374151', marginTop: '2px' }}>
        クリックで TR/TE を変更。現在: TR={params.TR}ms TE={params.TE}ms (オレンジ枠)
      </div>
    </div>
  )
}

// ── シーケンスプリセットバー ─────────────────────────────────────────────────
// Siemens syngo MR コンソールのプロトコル一覧に相当するシーケンスプリセット選択UI
// クリックすると全パラメータを一括設定（実際のコンソールと同様の挙動）
type SeqPreset = {
  name: string          // syngo MR 表示名
  full: string          // フル名称
  color: string         // アクセントカラー
  category: 'T1' | 'T2' | 'GRE' | 'DWI' | 'Special'
  apply: (p: ProtocolParams, is3T: boolean) => Partial<ProtocolParams>
}

const SEQ_PRESETS: SeqPreset[] = [
  {
    name: 'TSE T2',
    full: 'Turbo Spin Echo T2w',
    color: '#60a5fa',
    category: 'T2',
    apply: (_p, _) => ({
      TR: 5000, TE: 100, TI: 0, flipAngle: 90,
      turboFactor: 15, echoSpacing: 4.5,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 256,
      bandwidth: 200, partialFourier: 'Off', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'FLAIR',
    full: 'Fluid Attenuated IR TSE',
    color: '#a78bfa',
    category: 'T2',
    apply: (_p, is3T) => ({
      TR: 9000, TE: 90, TI: is3T ? 2500 : 2200, flipAngle: 90,
      turboFactor: 16, echoSpacing: 4.5,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 200, partialFourier: '6/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'MPRAGE',
    full: 'Magnetization Prepared Rapid GRE',
    color: '#fbbf24',
    category: 'T1',
    apply: (_p, is3T) => ({
      TR: is3T ? 2300 : 1900, TE: 3, TI: is3T ? 900 : 800, flipAngle: 9,
      turboFactor: 1, echoSpacing: 7.0,
      sliceThickness: 1, matrixFreq: 256, matrixPhase: 256,
      bandwidth: 200, partialFourier: '6/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'SPACE',
    full: '3D Sampling Perfection with Application optimized Contrasts',
    color: '#34d399',
    category: 'T2',
    apply: (_p, _) => ({
      TR: 3200, TE: 500, TI: 0, flipAngle: 120,
      turboFactor: 120, echoSpacing: 3.8,
      sliceThickness: 1, matrixFreq: 256, matrixPhase: 256,
      bandwidth: 650, partialFourier: '6/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'HASTE',
    full: 'Half-Fourier Acquisition Single-shot TSE',
    color: '#38bdf8',
    category: 'T2',
    apply: (_p, _) => ({
      TR: 1400, TE: 84, TI: 0, flipAngle: 90,
      turboFactor: 256, echoSpacing: 3.4,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 128,
      bandwidth: 600, partialFourier: '5/8', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'trueFISP',
    full: 'True Fast Imaging with Steady-state Precession',
    color: '#f472b6',
    category: 'GRE',
    apply: (_p, _) => ({
      TR: 4, TE: 2, TI: 0, flipAngle: 60,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 4, matrixFreq: 192, matrixPhase: 192,
      bandwidth: 1000, partialFourier: 'Off', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'VIBE',
    full: 'Volumetric Interpolated Breath-hold Examination',
    color: '#fb923c',
    category: 'GRE',
    apply: (_p, _) => ({
      TR: 5, TE: 2, TI: 0, flipAngle: 15,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 3, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 490, partialFourier: '6/8', fatSat: 'SPAIR',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'DWI',
    full: 'Diffusion Weighted EPI',
    color: '#f87171',
    category: 'DWI',
    apply: (_p, is3T) => ({
      TR: 4000, TE: 85, TI: 0, flipAngle: 90,
      turboFactor: 1, echoSpacing: 0.77,
      sliceThickness: 5, matrixFreq: 128, matrixPhase: 128,
      bandwidth: 2000, partialFourier: '6/8', fatSat: 'CHESS',
      ipatMode: 'GRAPPA', ipatFactor: is3T ? 3 : 2, bValues: [0, 500, 1000],
    }),
  },
  {
    name: 'SWI',
    full: 'Susceptibility Weighted Imaging',
    color: '#818cf8',
    category: 'GRE',
    apply: (_p, is3T) => ({
      TR: 28, TE: is3T ? 20 : 40, TI: 0, flipAngle: 15,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 2, matrixFreq: 448, matrixPhase: 448,
      bandwidth: 120, partialFourier: '7/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'TOF',
    full: 'Time-of-Flight MRA',
    color: '#e879f9',
    category: 'GRE',
    apply: (_p, is3T) => ({
      TR: is3T ? 22 : 25, TE: 3, TI: 0, flipAngle: 18,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 1.5, matrixFreq: 320, matrixPhase: 256,
      bandwidth: 160, partialFourier: 'Off', fatSat: 'None',
      mt: true, ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'STIR',
    full: 'Short TI Inversion Recovery',
    color: '#4ade80',
    category: 'T2',
    apply: (_p, is3T) => ({
      TR: 5000, TE: 70, TI: is3T ? 220 : 150, flipAngle: 90,
      turboFactor: 16, echoSpacing: 4.5,
      sliceThickness: 4, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 200, partialFourier: 'Off', fatSat: 'STIR',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'T1 TSE',
    full: 'T1-weighted Turbo Spin Echo',
    color: '#fbbf24',
    category: 'T1',
    apply: (_p, _) => ({
      TR: 500, TE: 15, TI: 0, flipAngle: 90,
      turboFactor: 3, echoSpacing: 4.0,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 200, partialFourier: 'Off', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
]

function SequencePresetBar() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const [hoveredName, setHoveredName] = useState<string | null>(null)

  // Detect which preset is currently active (rough match)
  const detectActive = (p: SeqPreset): boolean => {
    const applied = p.apply(params, is3T)
    const keys = Object.keys(applied) as (keyof typeof applied)[]
    // Must match at least TR/TE/turboFactor/flipAngle within tolerance
    const trOk = Math.abs(params.TR - (applied.TR ?? params.TR)) < (applied.TR ?? 1) * 0.15
    const teOk = Math.abs(params.TE - (applied.TE ?? params.TE)) < 15
    const etlOk = Math.abs(params.turboFactor - (applied.turboFactor ?? params.turboFactor)) <= 2
    return trOk && teOk && etlOk && keys.length > 4
  }

  const hovered = hoveredName ? SEQ_PRESETS.find(p => p.name === hoveredName) : null

  return (
    <div style={{ background: '#060809', borderBottom: '1px solid #1a2030' }}>
      {/* Preset button row */}
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', gap: 0 }}>
        {SEQ_PRESETS.map(p => {
          const active = detectActive(p)
          return (
            <button
              key={p.name}
              onMouseEnter={() => setHoveredName(p.name)}
              onMouseLeave={() => setHoveredName(null)}
              onClick={() => {
                const updates = p.apply(params, is3T)
                ;(Object.entries(updates) as [keyof typeof params, unknown][]).forEach(([k, v]) => {
                  setParam(k, v as never)
                })
              }}
              style={{
                background: active ? p.color + '18' : 'transparent',
                color: active ? p.color : '#5a5a5a',
                borderRight: '1px solid #111',
                borderBottom: active ? `2px solid ${p.color}` : '2px solid transparent',
                padding: '4px 8px',
                fontSize: '9px',
                fontFamily: 'monospace',
                fontWeight: active ? 700 : 400,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                flexShrink: 0,
                transition: 'all 0.12s',
              }}
            >
              {p.name}
            </button>
          )
        })}
      </div>
      {/* Tooltip strip */}
      {hovered && (
        <div className="px-3 py-0.5 flex items-center gap-2" style={{ borderTop: '1px solid #111' }}>
          <span className="font-mono font-bold" style={{ color: hovered.color, fontSize: '8px' }}>{hovered.name}</span>
          <span style={{ color: '#374151', fontSize: '8px' }}>—</span>
          <span style={{ color: '#4b5563', fontSize: '8px' }}>{hovered.full}</span>
        </div>
      )}
    </div>
  )
}

export function RoutineTab() {
  const { params, setParam, activeRoutineTab, setActiveRoutineTab, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const [autoAlign, setAutoAlign] = useState(false)
  const [motionCorr, setMotionCorr] = useState('None')
  const [concatenations, setConcatenations] = useState(1)
  const [posL, setPosL] = useState(0.0)
  const [posP, setPosP] = useState(60.0)
  const [posH, setPosH] = useState(0.0)
  const [distFactor, setDistFactor] = useState(10)
  const [sliceGroup, setSliceGroup] = useState(1)

  const phaseEncOptions: typeof params.phaseEncDir[] = ['A>>P', 'P>>A', 'R>>L', 'L>>R', 'H>>F', 'F>>H']

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b" style={{ borderColor: '#252525', background: '#0e0e0e' }}>
        {(['Part1', 'Part2', 'Assistant'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveRoutineTab(t)}
            className="px-4 py-1.5 text-xs transition-colors"
            style={{
              background: activeRoutineTab === t ? '#1e1200' : 'transparent',
              color: activeRoutineTab === t ? '#e88b00' : '#5a5a5a',
              borderBottom: activeRoutineTab === t ? '2px solid #e88b00' : '2px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {activeRoutineTab === 'Part1' && (
        <div className="space-y-0">
          {/* Sequence preset bar — syngo MR protocol selector */}
          <SequencePresetBar />

          {/* Live sequence type indicator — syngo MR protocol header */}
          {(() => {
            const seqId = identifySequence(params)
            return (
              <div className="flex items-center gap-2 px-3 py-1.5"
                style={{ background: seqId.color + '10', borderBottom: `1px solid ${seqId.color}30` }}>
                <span className="font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ background: seqId.color + '20', color: seqId.color, border: `1px solid ${seqId.color}50`, fontSize: '9px' }}>
                  {seqId.type}
                </span>
                <span style={{ color: seqId.color + 'aa', fontSize: '8px' }}>{seqId.details}</span>
                <span style={{ color: '#374151', fontSize: '8px', marginLeft: 'auto' }}>
                  {params.fieldStrength}T · {params.coilType ?? 'Body'}
                </span>
              </div>
            )
          })()}
          <SH label="Slice Group" />
          <ParamField label="Slice Group" value={sliceGroup} type="number" min={1} max={8}
            onChange={v => setSliceGroup(v as number)} />
          <ParamField label="Slices" value={params.slices} type="number" min={1} max={256} step={1}
            onChange={v => setParam('slices', v as number)} />
          <ParamField label="Distance Factor" value={distFactor} type="number" min={0} max={100} step={5} unit="%"
            onChange={v => setDistFactor(v as number)} />

          <SH label="Position" />
          <div className="flex items-center gap-1 px-3 py-0.5">
            <span className="text-xs w-40 shrink-0" style={{ color: '#9ca3af' }}>Position (L / P / H)</span>
            <div className="flex items-center gap-1 ml-auto">
              {[['L', posL, setPosL], ['P', posP, setPosP], ['H', posH, setPosH]].map(([lbl, val, fn]) => (
                <div key={lbl as string} className="flex items-center gap-0.5">
                  <span className="text-xs" style={{ color: '#4b5563' }}>{lbl as string}</span>
                  <input
                    type="number"
                    value={val as number}
                    step={1}
                    onChange={e => (fn as (v: number) => void)(parseFloat(e.target.value) || 0)}
                    className="px-1 py-0 rounded text-xs text-right font-mono outline-none"
                    style={{ background: '#0e0e0e', border: '1px solid #2a2a2a', color: '#d8d8d8', width: '46px', height: '18px' }}
                  />
                </div>
              ))}
            </div>
          </div>
          <ParamField label="Orientation" value={params.orientation} type="select"
            options={['Tra', 'Cor', 'Sag']}
            onChange={v => setParam('orientation', v as typeof params.orientation)} />
          <ParamField label="Phase Enc Dir" hintKey="phaseEncDir" value={params.phaseEncDir} type="select"
            options={phaseEncOptions}
            onChange={v => setParam('phaseEncDir', v as typeof params.phaseEncDir)} highlight={hl('phaseEncDir')} />
          <ParamField label="Phase Oversampling" hintKey="phaseOversampling" value={params.phaseOversampling} type="range"
            min={0} max={100} step={10} unit="%"
            onChange={v => setParam('phaseOversampling', v as number)} highlight={hl('phaseOversampling')} />

          <SH label="Resolution" />
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
          <ParamField label="FOV Phase%" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} />
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range"
            min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />

          <SH label="Timing" />
          {/* Contrast quick-set buttons — syngo MR contrast preset shortcuts */}
          <div className="flex gap-1 px-3 mb-1 flex-wrap">
            {[
              { label: 'T1w', tr: 500, te: 15, fa: 90, ti: 0, color: '#fbbf24' },
              { label: 'T2w', tr: 4000, te: 90, fa: 90, ti: 0, color: '#60a5fa' },
              { label: 'PDw', tr: 3000, te: 25, fa: 90, ti: 0, color: '#34d399' },
              { label: 'FLAIR', tr: 9000, te: 90, fa: 90, ti: params.fieldStrength >= 2.5 ? 2500 : 2200, color: '#a78bfa' },
              { label: 'GRE', tr: 120, te: 5, fa: 25, ti: 0, color: '#fb923c' },
            ].map(({ label, tr, te, fa, ti, color }) => {
              const isActive = Math.abs(params.TR - tr) < tr * 0.1 && Math.abs(params.TE - te) < 10
              return (
                <button
                  key={label}
                  onClick={() => {
                    setParam('TR', tr)
                    setParam('TE', te)
                    setParam('flipAngle', fa)
                    if (ti > 0 || label === 'FLAIR') setParam('TI', ti)
                  }}
                  className="px-1.5 py-0.5 rounded text-xs font-semibold transition-all"
                  style={{
                    background: isActive ? color + '28' : '#1a1a1a',
                    color: isActive ? color : '#4b5563',
                    border: `1px solid ${isActive ? color + '60' : '#2a2a2a'}`,
                    fontSize: '9px',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <ParamField label="TR" hintKey="TR" value={params.TR} type="number" min={100} max={15000} step={100} unit="ms"
            onChange={v => setParam('TR', v as number)} highlight={hl('TR')} />
          {/* TR_min inline indicator */}
          {(() => {
            const trMin = calcTRmin(params)
            const ok = params.TR >= trMin
            if (ok) return null
            return (
              <div className="mx-3 mb-0.5 flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ background: '#1a0505', border: '1px solid #7f1d1d30' }}>
                <span style={{ color: '#f87171', fontSize: '9px' }}>⚠ TR &lt; TR_min ({trMin}ms)</span>
                <button
                  onClick={() => setParam('TR', trMin)}
                  style={{ color: '#34d399', fontSize: '8px', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, padding: '0 4px', cursor: 'pointer' }}>
                  → {trMin}ms
                </button>
              </div>
            )
          })()}
          <ParamField label="TE" hintKey="TE" value={params.TE} type="number" min={1} max={1000} step={1} unit="ms"
            onChange={v => setParam('TE', v as number)} highlight={hl('TE')} />
          {/* TE_min inline indicator — real scanner behavior */}
          {(() => {
            const teMin = calcTEmin(params)
            const ok = params.TE >= teMin
            return (
              <div className="mx-3 mb-0.5 flex items-center gap-2 px-2 py-1 rounded"
                style={{
                  background: ok ? '#0a1208' : '#1a0505',
                  border: `1px solid ${ok ? '#14532d30' : '#7f1d1d60'}`,
                }}>
                <span style={{ color: ok ? '#1f4a2f' : '#f87171', fontSize: '9px' }}>
                  {ok ? '✓' : '⚠'} TE_min: {teMin}ms
                </span>
                {!ok && (
                  <button
                    onClick={() => setParam('TE', teMin)}
                    style={{ color: '#34d399', fontSize: '8px', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, padding: '0 4px', cursor: 'pointer' }}>
                    → {teMin}ms
                  </button>
                )}
                {ok && params.turboFactor > 1 && (
                  <span style={{ color: '#1f4a2f', fontSize: '8px' }}>
                    eff:{Math.round(params.TE + Math.floor(params.turboFactor / 2) * params.echoSpacing)}ms
                  </span>
                )}
              </div>
            )
          })()}
          <ParamField label="TI" hintKey="TI" value={params.TI} type="number" min={0} max={5000} step={10} unit="ms"
            onChange={v => setParam('TI', v as number)} highlight={hl('TI')} />
          <ParamField label="Flip Angle" hintKey="flipAngle" value={params.flipAngle} type="range"
            min={5} max={180} step={5} unit="°"
            onChange={v => setParam('flipAngle', v as number)} highlight={hl('flipAngle')} />
          <ErnstAngleIndicator />

          <SignalCurveChart />

          {/* Parameter coupling status — shows how current TR/TE drive key outcomes */}
          {(() => {
            const scanTime = calcScanTime(params)
            const teMin = calcTEmin(params)
            const trMin = calcTRmin(params)
            const sarPct = Math.min(100, Math.round((params.flipAngle / 90) ** 2 * (2000 / Math.max(params.TR, 100)) * (Math.min(params.turboFactor, 200) / 50) * (params.fieldStrength / 1.5) ** 2 * 32))
            const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

            const items: { label: string; value: string; ok: boolean; note?: string }[] = [
              { label: 'TA', value: fmt(scanTime), ok: scanTime < 300, note: scanTime > 300 ? '長い' : '' },
              { label: 'TE_min', value: `${teMin}ms`, ok: params.TE >= teMin, note: params.TE < teMin ? `→${teMin}ms` : '' },
              { label: 'TR_min', value: `${trMin}ms`, ok: params.TR >= trMin, note: params.TR < trMin ? `→${trMin}ms` : '' },
              { label: 'SAR', value: `${sarPct}%`, ok: sarPct < 80, note: sarPct >= 90 ? 'OVER' : '' },
            ]

            return (
              <div className="mx-3 mb-1 flex gap-1 flex-wrap">
                {items.map(item => (
                  <div key={item.label}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{
                      background: item.ok ? '#0a1208' : '#1a0505',
                      border: `1px solid ${item.ok ? '#14532d40' : '#7f1d1d60'}`,
                    }}>
                    <span style={{ color: '#374151', fontSize: '7px' }}>{item.label}</span>
                    <span className="font-mono font-semibold"
                      style={{ color: item.ok ? '#34d399' : '#f87171', fontSize: '8px' }}>
                      {item.value}
                    </span>
                    {item.note && (
                      <span style={{ color: item.ok ? '#1f4a2f' : '#f87171', fontSize: '7px' }}>{item.note}</span>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Live brain phantom signal preview */}
          <BrainPhantomPreview />

          <ContrastHeatmap />

          <SH label="Averages" />
          <ParamField label="Averages" hintKey="averages" value={params.averages} type="number"
            min={1} max={8} step={1}
            onChange={v => setParam('averages', v as number)} highlight={hl('averages')} />
          <ParamField label="Concatenations" hintKey="Concatenations" value={concatenations} type="number"
            min={1} max={16} step={1}
            onChange={v => setConcatenations(v as number)} />

          <SH label="AutoAlign" />
          <ParamField label="AutoAlign" value={autoAlign} type="toggle"
            onChange={v => setAutoAlign(v as boolean)} />
          {autoAlign && (
            <div className="mx-3 mt-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #3a1a00', color: '#e88b00' }}>
              解剖ランドマーク自動検出でスライス位置・向きを最適化。頭部・膝・脊椎で有効。
            </div>
          )}
        </div>
      )}

      {activeRoutineTab === 'Part2' && (
        <div className="space-y-0">
          <SH label="Introduction" />
          <div className="mx-3 my-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525', color: '#6b7280' }}>
            プロトコル説明・適応メモを記載します。
          </div>

          <SH label="Motion" />
          <ParamField label="Motion Correction" value={motionCorr} type="select"
            options={['None', 'Phase', 'Frequency', 'Navigator']}
            onChange={v => setMotionCorr(v as string)} />
          {motionCorr !== 'None' && (
            <div className="mx-3 mt-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525', color: '#9ca3af' }}>
              {motionCorr === 'Phase' && 'Phase方向動き補正。周期的動き（呼吸・心拍）に有効。'}
              {motionCorr === 'Frequency' && 'Frequency方向の動き補正。'}
              {motionCorr === 'Navigator' && 'ナビゲーターエコーで呼吸を直接追跡・補正。'}
            </div>
          )}

          <SH label="Fat Suppression" />
          <ParamField label="Fat Saturation" hintKey="fatSat" value={params.fatSat} type="select"
            options={['None', 'CHESS', 'SPAIR', 'STIR', 'Dixon']}
            onChange={v => setParam('fatSat', v as typeof params.fatSat)} highlight={hl('fatSat')} />
          {params.fatSat !== 'None' && (
            <div className="mx-3 mt-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525', color: '#9ca3af' }}>
              {params.fatSat === 'CHESS' && 'CHESS: 周波数選択励起。頭部・脊椎（均一磁場）向け。'}
              {params.fatSat === 'SPAIR' && 'SPAIR: 断熱反転回復。磁場不均一でも安定（腹部・乳腺）。造影後も使用可。'}
              {params.fatSat === 'STIR' && '⚠ STIR: 造影後使用禁忌！GdのT1短縮もnullされる。関節・金属周囲向け。'}
              {params.fatSat === 'Dixon' && 'Dixon: 水脂肪分離。3Tダイナミック第一選択。定量脂肪評価も可。'}
            </div>
          )}

          <SH label="Resp Control" />
          <ParamField label="Resp.Control" hintKey="PACE" value={params.respTrigger} type="select"
            options={['Off', 'BH', 'RT', 'PACE']}
            onChange={v => setParam('respTrigger', v as typeof params.respTrigger)} />
        </div>
      )}

      {activeRoutineTab === 'Assistant' && (
        <div className="space-y-0">
          {/* Protocol Quick Adjust — syngo MR Assistant like */}
          {(() => {
            const seqId = identifySequence(params)
            const scanTime = calcScanTime(params)
            const teMin = calcTEmin(params)

            // Quick actions based on current protocol state
            const actions: { label: string; color: string; bg: string; desc: string; apply: () => void }[] = []

            // Faster: reduce averages, increase iPAT
            if (scanTime > 120) {
              actions.push({
                label: '⚡ 高速化',
                color: '#34d399', bg: '#0a1f16',
                desc: `TA ${Math.round(scanTime)}s → ~${Math.round(scanTime * 0.6)}s`,
                apply: () => {
                  if (params.averages > 1) setParam('averages', params.averages - 1)
                  if (params.ipatMode === 'Off') setParam('ipatMode', 'GRAPPA')
                },
              })
            }

            // Better SNR: add averages
            if (params.averages < 4) {
              actions.push({
                label: '📶 SNR向上',
                color: '#60a5fa', bg: '#0a1020',
                desc: `NEX ${params.averages}→${params.averages + 1} (SNR+${Math.round((Math.sqrt(params.averages + 1) / Math.sqrt(params.averages) - 1) * 100)}%)`,
                apply: () => setParam('averages', params.averages + 1),
              })
            }

            // Reduce SAR: increase TR or reduce FA
            const sarPct = Math.round((params.flipAngle / 90) ** 2 * (2000 / Math.max(params.TR, 100)) * (params.turboFactor / 50) * (params.fieldStrength / 1.5) ** 2 * 32)
            if (sarPct > 60) {
              actions.push({
                label: '🌡 SAR低減',
                color: '#f87171', bg: '#1a0505',
                desc: `FA ${params.flipAngle}°→${Math.max(120, params.flipAngle - 20)}° でSAR-${Math.round((1 - (Math.max(120, params.flipAngle - 20) / params.flipAngle) ** 2) * 100)}%`,
                apply: () => setParam('flipAngle', Math.max(120, params.flipAngle - 20)),
              })
            }

            // Fix TE
            if (params.TE < teMin) {
              actions.push({
                label: '⚠ TE修正',
                color: '#fbbf24', bg: '#1a1000',
                desc: `TE_min = ${teMin}ms (現在${params.TE}ms)`,
                apply: () => setParam('TE', teMin),
              })
            }

            // Remove gap if any
            if ((params.sliceGap ?? 0) > 0) {
              actions.push({
                label: '📏 ギャップ解除',
                color: '#a78bfa', bg: '#14102a',
                desc: `SliceGap ${params.sliceGap}mm → 0 (連続スライス)`,
                apply: () => setParam('sliceGap', 0),
              })
            }

            if (actions.length === 0) return (
              <div className="mx-3 mt-2 p-3 rounded text-xs flex items-center gap-2"
                style={{ background: '#0a1208', border: '1px solid #14532d' }}>
                <span style={{ color: '#34d399' }}>✓</span>
                <span style={{ color: '#34d399' }}>プロトコル最適 — 改善提案なし</span>
              </div>
            )

            return (
              <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #252525' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: '#e88b00' }}>
                  Quick Adjust ({seqId.type})
                </div>
                <div className="space-y-1.5">
                  {actions.map((a, i) => (
                    <button
                      key={i}
                      onClick={a.apply}
                      className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded transition-all"
                      style={{
                        background: a.bg,
                        border: `1px solid ${a.color}40`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = a.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = a.color + '40' }}
                    >
                      <span className="font-semibold" style={{ color: a.color, fontSize: '10px' }}>{a.label}</span>
                      <span style={{ color: '#6b7280', fontSize: '8px' }}>{a.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          <SliceOrderViz />

          <ScanTimeBreakdown />

          <SH label="SAR Control" />
          <ParamField label="SAR Assistant" hintKey="SAR" value={params.sarAssistant} type="select"
            options={['Off', 'Normal', 'Advanced']}
            onChange={v => setParam('sarAssistant', v as typeof params.sarAssistant)} />
          <ParamField label="Allowed Delay" value={params.allowedDelay} type="number"
            min={0} max={120} step={10} unit="s"
            onChange={v => setParam('allowedDelay', v as number)} />

          <div className="mt-3 mx-3 p-3 rounded text-xs space-y-1" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>SAR規制値（IEC 60601-2-33）</div>
            <div style={{ color: '#9ca3af' }}>全身平均: <span className="text-white">4 W/kg</span> / 15分</div>
            <div style={{ color: '#9ca3af' }}>頭部: <span className="text-white">3.2 W/kg</span> / 10分</div>
            <div style={{ color: '#9ca3af' }}>局所体幹: <span className="text-white">10 W/kg</span> / 5分</div>
            <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: '1px solid #252525', color: '#6b7280' }}>
              <div>3T は 1.5T の約 <span className="text-yellow-400">4倍</span> SAR</div>
              <div>対策: TR↑ / FA↓ / ETL↓ / iPAT ON</div>
              <div>FA 150°→120°で約 <span className="text-green-400">30% 削減</span></div>
            </div>
          </div>

          <SH label="Field Strength" />
          <div className="px-3 py-1 flex gap-2">
            {([1.5, 3.0] as const).map(f => (
              <button
                key={f}
                onClick={() => setParam('fieldStrength', f)}
                className="flex-1 py-1 rounded text-sm font-bold transition-all"
                style={{
                  background: params.fieldStrength === f ? '#8a4400' : '#1a1a1a',
                  color: params.fieldStrength === f ? '#fff' : '#6b7280',
                  border: `1px solid ${params.fieldStrength === f ? '#c47400' : '#374151'}`,
                }}
              >
                {f}T
              </button>
            ))}
          </div>
          {params.fieldStrength === 3.0 && (
            <div className="mx-3 p-2 rounded text-xs" style={{ background: '#141414', border: '1px solid #7c3aed', color: '#a78bfa' }}>
              3T: SAR≈4倍 / 化学シフト2倍（BW2倍必要）/ Dielectric Effect / SNR理論値↑√2
            </div>
          )}
        </div>
      )}
    </div>
  )
}
