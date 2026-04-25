import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'
import { TISSUES, calcScanTime } from '../../../store/calculators'

// ── Ernst 角インジケーター ────────────────────────────────────────────────────
export function ErnstAngleIndicator() {
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
export function SignalCurveChart() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const W = 340
  const H = 80
  const PAD = { l: 30, r: 8, t: 6, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // 3組織のみ (WM, GM, Fat) + CSF
  const tissues = TISSUES.filter(t => ['WM', 'GM', 'Fat', 'CSF'].includes(t.label))

  const maxTR = 10000
  const maxTE = 300
  const nPts = 80

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
            {[0, 0.5, 1].map(v => (
              <line key={v} x1={PAD.l} y1={PAD.t + innerH - v * innerH}
                x2={PAD.l + innerW} y2={PAD.t + innerH - v * innerH}
                stroke="#1a1a1a" strokeWidth={1} />
            ))}
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
            <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
            <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
            <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TR (ms)</text>
            {tissues.map(t => {
              const T1 = is3T ? t.T1_30 : t.T1_15
              return (
                <path key={t.label} d={trPathForTissue(T1)} fill="none"
                  stroke={t.color} strokeWidth={1} opacity={0.7} />
              )
            })}
            <line x1={trMarkerX} y1={PAD.t} x2={trMarkerX} y2={PAD.t + innerH}
              stroke="#e88b00" strokeWidth={1.5} strokeDasharray="3,2" />
            <text x={trMarkerX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TR</text>
          </svg>
        </div>

        {/* T2 Decay */}
        <div className="flex-1">
          <div style={{ fontSize: '8px', color: '#374151', marginBottom: '2px' }}>T2 減衰 (TE)</div>
          <svg width={W / 2 - 4} height={H}>
            {[0, 0.5, 1].map(v => (
              <line key={v} x1={PAD.l} y1={PAD.t + innerH - v * innerH}
                x2={PAD.l + innerW} y2={PAD.t + innerH - v * innerH}
                stroke="#1a1a1a" strokeWidth={1} />
            ))}
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
            <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
            <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
            <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TE (ms, 0-300)</text>
            {tissues.map(t => {
              const T2 = is3T ? t.T2_30 : t.T2_15
              return (
                <path key={t.label} d={tePathForTissue(T2)} fill="none"
                  stroke={t.color} strokeWidth={1} opacity={0.7} />
              )
            })}
            <line x1={teMarkerX} y1={PAD.t} x2={teMarkerX} y2={PAD.t + innerH}
              stroke="#e88b00" strokeWidth={1.5} strokeDasharray="3,2" />
            <text x={teMarkerX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TE</text>
          </svg>
        </div>
      </div>
      <div className="flex gap-3 mt-1 flex-wrap" style={{ fontSize: '8px' }}>
        {tissues.map(t => (
          <span key={t.label} style={{ color: t.color }}>● {t.label}</span>
        ))}
      </div>
    </div>
  )
}

// ── スライス収集順序 ──────────────────────────────────────────────────────────
export function SliceOrderViz() {
  const { params } = useProtocolStore()

  const nSlices = params.slices
  const tr = params.TR
  const is3T = params.fieldStrength >= 2.5

  const t1WM = is3T ? 1000 : 800
  const dummyScans = Math.min(15, Math.max(2, Math.ceil(5 * t1WM / tr)))

  const isEPI = params.bValues.length >= 2 && params.turboFactor <= 2
  const ordering = isEPI ? 'Interleaved' : nSlices > 8 ? 'Interleaved' : 'Sequential'

  const maxDisplay = Math.min(nSlices, 20)
  const sliceOrder: number[] = []
  if (ordering === 'Interleaved') {
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
      <div className="flex flex-wrap gap-0.5 mb-1.5">
        {sliceOrder.map((sliceIdx, acquireOrder) => {
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

// ── スキャン時間分解 ──────────────────────────────────────────────────────────
export function ScanTimeBreakdown() {
  const { params } = useProtocolStore()
  const totalTime = calcScanTime(params)

  const ipatDiv = params.ipatMode !== 'Off' ? params.ipatFactor : 1
  const pfFactor = params.partialFourier === 'Off' ? 1.0
    : params.partialFourier === '7/8' ? 0.875
    : params.partialFourier === '6/8' ? 0.75
    : params.partialFourier === '5/8' ? 0.625
    : 0.5

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

// ── 定常状態収束シミュレーション ──────────────────────────────────────────────
export function SteadyStateConvergence() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const isTSE = params.turboFactor > 1
  const isGRE = params.turboFactor <= 1 && params.TR < 200

  if (!isGRE && !isTSE) return null

  const fa = params.flipAngle * Math.PI / 180
  const t1WM = is3T ? 1000 : 800

  const N = 12
  const mzHistory: number[] = [1.0]

  for (let i = 0; i < N; i++) {
    const mzPrev = mzHistory[mzHistory.length - 1]
    const mzAfterRF = mzPrev * Math.cos(fa)
    const mzAfterTR = mzAfterRF * Math.exp(-params.TR / t1WM) + (1 - Math.exp(-params.TR / t1WM))
    mzHistory.push(mzAfterTR)
  }

  const mzSS = (1 - Math.exp(-params.TR / t1WM)) / (1 - Math.cos(fa) * Math.exp(-params.TR / t1WM))
  const trToSS = mzHistory.findIndex(mz => Math.abs(mz - mzSS) < 0.05 * Math.abs(1 - mzSS))
  const reachedSS = trToSS >= 0 && trToSS <= N

  const W = 280, H = 50
  const PAD = { l: 20, r: 10, t: 6, b: 14 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const maxMz = 1.0
  const minMz = Math.min(0, ...mzHistory)
  const mzRange = maxMz - minMz

  const tx = (i: number) => PAD.l + (i / N) * innerW
  const ty = (mz: number) => PAD.t + (1 - (mz - minMz) / mzRange) * innerH

  const mzPath = mzHistory.map((mz, i) => `${i === 0 ? 'M' : 'L'}${tx(i).toFixed(1)},${ty(mz).toFixed(1)}`).join(' ')
  const ssSignal = Math.abs(Math.sin(fa)) * mzSS

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080a06', border: '1px solid #1a2010' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#4ade80', fontSize: '9px', letterSpacing: '0.05em' }}>
          STEADY-STATE CONVERGENCE
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#374151' }}>Mz_SS = {mzSS.toFixed(3)}</span>
          <span style={{ color: '#4ade80' }}>S_SS = {(ssSignal * 100).toFixed(1)}%</span>
        </div>
      </div>
      <svg width={W} height={H}>
        <line x1={PAD.l} y1={ty(1.0)} x2={PAD.l + innerW} y2={ty(1.0)}
          stroke="#1a2010" strokeWidth={0.8} strokeDasharray="3,3" />
        <line x1={PAD.l} y1={ty(mzSS)} x2={PAD.l + innerW} y2={ty(mzSS)}
          stroke="#34d39930" strokeWidth={0.8} strokeDasharray="2,2" />
        <path d={mzPath} fill="none" stroke="#4ade80" strokeWidth={1.5} />
        {mzHistory.map((mz, i) => (
          <circle key={i} cx={tx(i)} cy={ty(mz)} r={2}
            fill={reachedSS && i === trToSS ? '#fbbf24' : '#4ade80'} />
        ))}
        {reachedSS && trToSS <= N && (
          <line x1={tx(trToSS)} y1={PAD.t} x2={tx(trToSS)} y2={PAD.t + innerH}
            stroke="#fbbf2440" strokeWidth={1} />
        )}
        <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>M0</text>
        <text x={PAD.l - 2} y={ty(mzSS) + 3} textAnchor="end" fill="#34d399" style={{ fontSize: '6px' }}>SS</text>
        <text x={PAD.l} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>0</text>
        <text x={PAD.l + innerW} y={H - 2} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>{N} TR</text>
      </svg>
      <div style={{ fontSize: '7px', color: '#374151', marginTop: 2 }}>
        {reachedSS
          ? `▸ TR #${trToSS} でSS到達 (95%) — ダミースキャン${trToSS}回推奨`
          : `▸ ${N}TR内にSS未達 — 連続撮像後に信号安定化`}
        {' '}· WM T1={t1WM}ms, TR={params.TR}ms, FA={params.flipAngle}°
      </div>
    </div>
  )
}

// ── シミュレーション脳断面 Phantom ──────────────────────────────────────────
export function BrainPhantomPreview() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const W = 180, H = 180
  const CX = W / 2, CY = H / 2

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
    const maxS = Math.max(...Object.values(raw), 0.001)
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / maxS])) as typeof raw
  }, [params.TR, params.TE, params.TI, params.flipAngle, params.fatSat, params.fieldStrength, params.turboFactor, isIR, isGRE, is3T])

  const gray = (s: number) => Math.round(s * 230)
  const toRgb = (s: number) => { const v = gray(s); return `rgb(${v},${v},${v})` }

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
        <svg width={W} height={H} style={{ background: '#000', borderRadius: 4, flexShrink: 0 }}>
          <ellipse cx={CX} cy={CY} rx={82} ry={80} fill={toRgb(sig.Fat)} />
          <ellipse cx={CX} cy={CY} rx={75} ry={73} fill="rgb(18,18,18)" />
          <ellipse cx={CX} cy={CY} rx={65} ry={63} fill={toRgb(sig.WM)} />
          <ellipse cx={CX} cy={CY} rx={53} ry={51} fill={toRgb(sig.GM)} />
          <ellipse cx={CX} cy={CY} rx={42} ry={40} fill={toRgb(sig.WM)} />
          <ellipse cx={CX - 14} cy={CY} rx={12} ry={14} fill={toRgb(sig.GM * 0.95)} />
          <ellipse cx={CX + 14} cy={CY} rx={12} ry={14} fill={toRgb(sig.GM * 0.95)} />
          <ellipse cx={CX - 14} cy={CY} rx={7} ry={10} fill={toRgb(sig.WM)} />
          <ellipse cx={CX + 14} cy={CY} rx={7} ry={10} fill={toRgb(sig.WM)} />
          <ellipse cx={CX - 16} cy={CY - 8} rx={10} ry={14} fill={toRgb(sig.CSF)} />
          <ellipse cx={CX + 16} cy={CY - 8} rx={10} ry={14} fill={toRgb(sig.CSF)} />
          <rect x={CX - 2} y={CY - 2} width={4} height={16} fill={toRgb(sig.CSF)} />
          <ellipse cx={CX} cy={CY} rx={65} ry={63}
            fill="none" stroke={toRgb(sig.GM * 0.9)} strokeWidth={5} opacity={0.6} />
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
          <text x={6} y={H - 6} fill="#2a2a2a" style={{ fontSize: '8px', fontFamily: 'monospace' }}>
            {params.fieldStrength}T
          </text>
        </svg>
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

// ── GM/WM コントラスト TR-TE ヒートマップ ─────────────────────────────────────
export function ContrastHeatmap() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const GM = TISSUES.find(t => t.label === 'GM')!
  const WM = TISSUES.find(t => t.label === 'WM')!
  const gmT1 = is3T ? GM.T1_30 : GM.T1_15
  const wmT1 = is3T ? WM.T1_30 : WM.T1_15
  const gmT2 = is3T ? GM.T2_30 : GM.T2_15
  const wmT2 = is3T ? WM.T2_30 : WM.T2_15

  const COLS = 16
  const ROWS = 12
  const trRange = [200, 6000]
  const teRange = [5, 200]

  const trVals = Array.from({ length: COLS }, (_, i) => Math.round(trRange[0] + (trRange[1] - trRange[0]) * (i / (COLS - 1))))
  const teVals = Array.from({ length: ROWS }, (_, i) => Math.round(teRange[0] + (teRange[1] - teRange[0]) * (i / (ROWS - 1))))

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
        {grid.map((row, ri) =>
          row.map((val, ci) => {
            const t = val / maxContrast
            const isCurrent = ci === trIdx && ri === teIdx
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
        {[0, ROWS - 1].map(ri => (
          <text key={ri} x={PAD.l - 2} y={PAD.t + ri * cellH + cellH / 2 + 3}
            textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {teVals[ri]}
          </text>
        ))}
        <text x={8} y={H / 2} textAnchor="middle" fill="#374151"
          transform={`rotate(-90, 8, ${H / 2})`} style={{ fontSize: '7px' }}>
          TE
        </text>
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
