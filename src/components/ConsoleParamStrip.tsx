import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { calcTEmin, calcTRmin, calcScanTime, identifySequence } from '../store/calculators'
import { KSpaceFillCanvas } from './KSpaceFillCanvas'
import { FrequencyScoutSpectrum } from './FrequencyScoutSpectrum'
import { SARModeChip } from './SARModeChip'
import { ChipParam, ChipDiv } from './ChipParam'

// ── Console Parameter Strip ──────────────────────────────────────────────────
// syngo MR コンソール風の生パラメータ表示ストリップ
// TE_min/TR_min を物理計算し、設定値が不正な場合はリアルタイムで警告する
// ── Prescan steps (auto-prescan sequence) ────────────────────────────────────
// syngo MR の自動プリスキャンは毎回スキャン前に自動実行される
// Frequency Scout → B0 Shim → Flip Angle Cal → Noise Cal → SAR Check
const PRESCAN_STEPS = [
  { label: 'Frequency Scout',    dur: 380 },
  { label: 'B0 Shim Optimize',   dur: 480 },
  { label: 'Tx Ref Cal',         dur: 320 },
  { label: 'Noise Calibration',  dur: 220 },
  { label: 'SAR Pre-Check',      dur: 100 },
] as const

export function ConsoleParamStrip() {
  const { params, setParam } = useProtocolStore()

  const teMin = calcTEmin(params)
  const trMin = calcTRmin(params)
  const teOk = params.TE >= teMin
  const trOk = params.TR >= trMin
  const scanTime = calcScanTime(params)
  const seqId = identifySequence(params)

  // Scan simulation state
  const [scanState, setScanState] = useState<'idle' | 'preparing' | 'scanning' | 'recon' | 'done'>('idle')
  const [scanProgress, setScanProgress] = useState(0)  // 0-100
  const [scanElapsed, setScanElapsed] = useState(0)    // seconds
  const [prescanStep, setPrescanStep] = useState(-1)   // -1=not started, 0-4=step index
  const [prescanDone, setPrescanDone] = useState<boolean[]>([])
  const [reconStep, setReconStep] = useState(-1)       // index into recon steps
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanStartRef = useRef<number>(0)

  // Gradient coil temperature — heats during scanning, cools when idle
  const [gradTemp, setGradTemp] = useState(28.5)
  useEffect(() => {
    const heatRate = scanState === 'scanning'
      ? (params.gradientMode === 'Fast' ? 0.12 : params.gradientMode === 'Whisper' ? 0.04 : 0.07)
      : -0.02
    const id = setInterval(() => {
      setGradTemp(t => {
        const next = t + heatRate
        return Math.max(28.5, Math.min(55, next))
      })
    }, 1000)
    return () => clearInterval(id)
  }, [scanState, params.gradientMode])

  // Larmor frequency (MHz) — 42.577 MHz/T for ¹H
  const larmorMHz = (params.fieldStrength * 42.577).toFixed(2)

  // B1rms in µT — approximation based on flip angle, TR, pulse duration
  // pulse duration ≈ 3ms for sinc, duty cycle = pulseDur/TR
  const pulseDurMs = 3 // ms, typical sinc pulse
  const dutyCycle = pulseDurMs / params.TR
  const b1Peak = params.flipAngle / 180 * Math.PI / (pulseDurMs * 1e-3 * 2 * Math.PI * 42.577e6) * 1e6 // µT
  const b1Rms = Math.round(b1Peak * Math.sqrt(dutyCycle) * 10) / 10

  // Estimated acoustic noise level (dB SPL)
  const noiseDb = useMemo(() => {
    const isEPI = params.bValues.length > 1 && params.turboFactor <= 2
    const isTSE = params.turboFactor > 1
    const isSSFP = params.TR < 8 && params.TE < 3
    let db = isEPI ? 120 : isSSFP ? 103 : isTSE ? (90 + Math.min(params.turboFactor, 8)) : 84
    if (params.gradientMode === 'Fast') db += 7
    else if (params.gradientMode === 'Whisper') db -= 15
    return Math.round(db)
  }, [params.bValues.length, params.turboFactor, params.TR, params.TE, params.gradientMode])

  // Gradient duty cycle (%)
  const gdc = useMemo(() => {
    const isEPI = params.bValues.length > 1 && params.turboFactor <= 2
    const isTSE = params.turboFactor > 1
    const isSSFP = params.TR < 8
    let pct = isEPI ? 78 : isSSFP ? 85 : isTSE ? Math.min(20 + params.turboFactor * 2, 65) : 30
    if (params.gradientMode === 'Fast') pct = Math.min(pct * 1.15, 95)
    return Math.round(pct)
  }, [params.bValues.length, params.turboFactor, params.TR, params.gradientMode])

  // K-space fill mode: centric for TSE/IR, linear for EPI/SE/GRE
  const kCentric = params.turboFactor > 1 || params.TI > 0

  // Prescan results — computed once from current params
  const prescanResults = useMemo(() => {
    const is3T = params.fieldStrength >= 2.5
    const b0Offset = 12 + Math.floor(Math.random() * 18)  // 12-29 Hz
    const b0Residual = 2 + Math.floor(Math.random() * 6)  // 2-7 Hz rms
    const txVoltage = is3T ? (180 + Math.floor(Math.random() * 40)) : (310 + Math.floor(Math.random() * 60))
    const snrEst = 40 + Math.floor(Math.random() * 20)
    const sarPct = Math.round((params.TR > 0 ? (params.flipAngle / 90) ** 2 * (params.slices / 20) * 50 : 30))
    return [
      `Δf₀: +${b0Offset}Hz → 0Hz`,
      `ΔB0: ${b0Residual}Hz rms`,
      `Tx: ${txVoltage}V`,
      `SNR est: ${snrEst}`,
      `SAR: ${Math.min(sarPct, 95)}%  OK`,
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState])

  const stopScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }
  }, [])

  const startScan = useCallback(() => {
    stopScan()
    setScanState('preparing')
    setScanProgress(0)
    setScanElapsed(0)
    setPrescanStep(0)
    setPrescanDone([])

    // Step through prescan steps
    let elapsed = 0
    PRESCAN_STEPS.forEach((step, idx) => {
      elapsed += step.dur
      setTimeout(() => {
        setPrescanStep(idx + 1)
        setPrescanDone(prev => { const next = [...prev]; next[idx] = true; return next })
      }, elapsed)
    })

    // After all prescan steps, start actual scanning
    const totalPrescanMs = PRESCAN_STEPS.reduce((s, st) => s + st.dur, 0)
    setTimeout(() => {
      setScanState('scanning')
      setPrescanStep(-1)
      scanStartRef.current = Date.now()
      const displayDuration = Math.min(scanTime * 1000, 30000)
      scanTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - scanStartRef.current) / 1000
        const progress = Math.min(100, (elapsed / (displayDuration / 1000)) * 100)
        setScanProgress(progress)
        setScanElapsed(elapsed)
        if (progress >= 100) {
          stopScan()
          setScanState('recon')
          setReconStep(0)
          // Build inline recon steps based on sequence type
          const isDWISeq = params.bValues.length > 1 && params.turboFactor <= 2
          const hasInlineMIP = params.inlineMIP
          const reconSteps = [
            { label: 'Image Reconstruction', dur: 350 },
            { label: 'Phase Correction',     dur: 180 },
            ...(isDWISeq ? [{ label: 'Inline ADC Map', dur: 280 }, { label: 'Inline Trace', dur: 220 }] : []),
            ...(hasInlineMIP ? [{ label: 'Inline MIP', dur: 240 }] : []),
            { label: 'Sending → PACS',       dur: 160 },
          ]
          let reconElapsed = 0
          reconSteps.forEach((_, idx) => {
            reconElapsed += reconSteps[idx].dur
            setTimeout(() => setReconStep(idx + 1), reconElapsed)
          })
          const totalReconMs = reconSteps.reduce((s, r) => s + r.dur, 0)
          setTimeout(() => {
            setScanState('done')
            setReconStep(-1)
            setTimeout(() => setScanState('idle'), 2500)
          }, totalReconMs + 100)
        }
      }, 50)
    }, totalPrescanMs + 100)
  }, [scanTime, stopScan, params.bValues.length, params.inlineMIP, params.turboFactor])

  // Cleanup on unmount
  useEffect(() => () => stopScan(), [stopScan])

  // F5 global shortcut → toggle scan
  useEffect(() => {
    const handler = () => {
      if (scanState === 'idle' || scanState === 'done') startScan()
      else if (scanState === 'scanning') stopScan()
    }
    window.addEventListener('mri-scan-toggle', handler)
    return () => window.removeEventListener('mri-scan-toggle', handler)
  }, [scanState, startScan, stopScan])

  const isTSE = params.turboFactor > 1
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2
  const isIR = params.TI > 0

  // TE_eff for TSE
  const teEff = isTSE
    ? Math.round(params.TE + Math.floor(params.turboFactor / 2) * params.echoSpacing)
    : null

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex items-center shrink-0 overflow-x-auto select-none"
      style={{ background: '#070b10', borderBottom: '1px solid #0f1a24', height: '28px', gap: 0 }}>

      {/* Sequence type badge */}
      <div className="flex items-center px-2 gap-1.5 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span className="font-mono font-bold px-1.5 rounded"
          style={{ background: seqId.color + '18', color: seqId.color, border: `1px solid ${seqId.color}30`, fontSize: '9px' }}>
          {seqId.type}
        </span>
      </div>

      {/* TR */}
      <ChipParam
        label="TR"
        value={`${params.TR}`}
        unit="ms"
        ok={trOk}
        warnMsg={trOk ? undefined : `min ${trMin}`}
        onFix={trOk ? undefined : () => setParam('TR', trMin)}
      />
      <ChipDiv />

      {/* TE / TE_eff */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px', letterSpacing: '0.06em' }}>TE</span>
        <button
          className="font-mono font-semibold"
          style={{
            color: teOk ? '#dde4ec' : '#fca5a5',
            fontSize: '11px',
            background: teOk ? 'transparent' : '#1a0505',
            border: teOk ? 'none' : '1px solid #7f1d1d30',
            borderRadius: 3,
            padding: '0 2px',
            cursor: teOk ? 'default' : 'pointer',
          }}
          title={teOk ? `TE_min = ${teMin}ms` : `⚠ TE < TE_min (${teMin}ms) — クリックで自動修正`}
          onClick={teOk ? undefined : () => setParam('TE', teMin)}
        >
          {params.TE}
        </button>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>ms</span>
        {/* TE_min indicator */}
        <span style={{
          color: teOk ? '#1f4a2f' : '#f87171',
          fontSize: '8px',
          fontFamily: 'monospace',
        }}>
          {teOk ? `(min ${teMin})` : `⚠min:${teMin}`}
        </span>
        {!teOk && (
          <button
            onClick={() => setParam('TE', teMin)}
            style={{
              color: '#34d399', fontSize: '8px', background: '#0a1f16',
              border: '1px solid #14532d', borderRadius: 2, padding: '0 3px',
              cursor: 'pointer', lineHeight: '14px',
            }}
          >→{teMin}</button>
        )}
        {/* TE_eff for TSE */}
        {teEff !== null && teEff !== params.TE && (
          <span style={{ color: '#4b5563', fontSize: '8px' }}>eff:{teEff}ms</span>
        )}
      </div>
      <ChipDiv />

      {/* TI (IR sequences) */}
      {isIR && (
        <>
          <ChipParam label="TI" value={`${params.TI}`} unit="ms" ok={true} />
          <ChipDiv />
        </>
      )}

      {/* FA */}
      <ChipParam label="FA" value={`${params.flipAngle}°`} unit="" ok={true} />
      <ChipDiv />

      {/* ETL (TSE) */}
      {isTSE && (
        <>
          <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
            <span style={{ color: '#374151', fontSize: '8px', letterSpacing: '0.06em' }}>ETL</span>
            <span className="font-mono font-semibold" style={{ color: '#a78bfa', fontSize: '10px' }}>{params.turboFactor}</span>
            <span style={{ color: '#374151', fontSize: '8px' }}>ES:{params.echoSpacing}ms</span>
          </div>
          <ChipDiv />
        </>
      )}

      {/* b-values (DWI) */}
      {isDWI && (
        <>
          <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
            <span style={{ color: '#374151', fontSize: '8px' }}>b=</span>
            <span className="font-mono font-semibold" style={{ color: '#f87171', fontSize: '9px' }}>
              {params.bValues.join('/')}
            </span>
          </div>
          <ChipDiv />
        </>
      )}

      {/* iPAT */}
      {params.ipatMode !== 'Off' && (
        <>
          <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
            <span style={{ color: '#374151', fontSize: '8px' }}>iPAT</span>
            <span className="font-mono font-semibold" style={{ color: '#34d399', fontSize: '9px' }}>×{params.ipatFactor}</span>
          </div>
          <ChipDiv />
        </>
      )}

      {/* Scan time */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27', background: '#050d18' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px', letterSpacing: '0.08em' }}>TA</span>
        <span className="font-mono font-bold" style={{ color: '#f0f4f8', fontSize: '13px', letterSpacing: '0.02em' }}>{fmt(scanTime)}</span>
      </div>
      <ChipDiv />

      {/* Matrix + slices */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>Mtx</span>
        <span className="font-mono" style={{ color: '#9ab0c0', fontSize: '10px' }}>
          {params.matrixFreq}×{params.matrixPhase}
        </span>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>/{params.slices}sl</span>
      </div>
      <ChipDiv />

      {/* Pixel resolution */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>px</span>
        <span className="font-mono" style={{ color: '#7a9ab0', fontSize: '9.5px' }}>
          {(params.fov / params.matrixFreq).toFixed(1)}×{(params.fov * (params.phaseResolution ?? 100) / 100 / params.matrixPhase).toFixed(1)}mm
        </span>
      </div>

      {/* Bandwidth per pixel */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>BW</span>
        <span className="font-mono" style={{ color: '#7a9ab0', fontSize: '9.5px' }}>
          {Math.round(params.bandwidth * 2 / params.matrixFreq * 1000)}Hz/px
        </span>
      </div>

      {/* Field strength + Larmor freq */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span className="font-mono font-semibold" style={{ color: '#e88b00', fontSize: '10px' }}>{params.fieldStrength}T</span>
        <span className="font-mono" style={{ color: '#5a4010', fontSize: '9px' }}>{larmorMHz}MHz</span>
      </div>

      {/* B1 RMS */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>B1</span>
        <span className="font-mono" style={{
          color: b1Rms > 3 ? '#f87171' : b1Rms > 2 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{b1Rms}µT</span>
      </div>

      {/* Gradient duty cycle */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>GDC</span>
        <span className="font-mono" style={{
          color: gdc > 70 ? '#f87171' : gdc > 45 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{gdc}%</span>
      </div>

      {/* Acoustic noise */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>dB</span>
        <span className="font-mono" style={{
          color: noiseDb >= 115 ? '#f87171' : noiseDb >= 95 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{noiseDb}</span>
      </div>

      {/* Gradient coil temperature */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>GC</span>
        <span className="font-mono" style={{
          color: gradTemp > 45 ? '#f87171' : gradTemp > 38 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{gradTemp.toFixed(1)}°C</span>
        {gradTemp > 38 && (
          <span style={{ fontSize: '7px', color: gradTemp > 45 ? '#f87171' : '#fbbf24' }}>▲</span>
        )}
      </div>

      {/* SAR Operating Mode (IEC 60601-2-33) */}
      <SARModeChip />

      {/* Scan simulation button + progress */}
      <div className="flex items-center gap-1.5 px-2 ml-auto shrink-0">

        {/* Frequency scout spectrum (appears after first prescan step) */}
        {scanState === 'preparing' && prescanDone[0] && (
          <FrequencyScoutSpectrum visible={true} fieldStrength={params.fieldStrength} />
        )}

        {/* Prescan step indicators */}
        {scanState === 'preparing' && (
          <div className="flex items-center gap-0" style={{ borderRight: '1px solid #111d27', paddingRight: 6, marginRight: 2 }}>
            {PRESCAN_STEPS.map((step, i) => {
              const done = prescanDone[i]
              const active = prescanStep === i
              return (
                <div key={i} className="flex items-center gap-1 px-1.5" style={{ borderRight: i < PRESCAN_STEPS.length - 1 ? '1px solid #0f1a24' : 'none' }}>
                  <span style={{
                    fontSize: '7px',
                    color: done ? '#34d399' : active ? '#e88b00' : '#1f3020',
                    transition: 'color 0.2s',
                  }}>
                    {done ? '●' : active ? '◉' : '○'}
                  </span>
                  <span style={{
                    fontSize: '7px',
                    color: done ? '#1f4a2f' : active ? '#c8ccd6' : '#1a2520',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    transition: 'color 0.2s',
                  }}>
                    {step.label}
                  </span>
                  {done && (
                    <span className="font-mono" style={{ fontSize: '6.5px', color: '#1a4a30' }}>
                      {prescanResults[i]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Scanning progress — k-space fill canvas + stats */}
        {scanState === 'scanning' && (
          <div className="flex items-center gap-1.5">
            <KSpaceFillCanvas progress={scanProgress} centric={kCentric} />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono" style={{ color: '#34d399', fontSize: '8px' }}>
                {scanProgress.toFixed(0)}%
              </span>
              <span className="font-mono" style={{ color: '#1d4a34', fontSize: '7px' }}>
                SL {Math.min(params.slices, Math.max(1, Math.ceil(scanProgress / 100 * params.slices)))}/{params.slices}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ color: '#374151', fontSize: '7px' }}>{scanElapsed.toFixed(0)}s / {fmt(scanTime)}</span>
              <span style={{ color: '#1a2a1a', fontSize: '6.5px', fontFamily: 'monospace' }}>
                {kCentric ? 'CENTRIC' : 'LINEAR'} k-fill
              </span>
            </div>
          </div>
        )}

        {/* Inline recon steps */}
        {scanState === 'recon' && (() => {
          const isDWISeq = params.bValues.length > 1 && params.turboFactor <= 2
          const hasInlineMIP = params.inlineMIP
          const steps = [
            'Image Recon', 'Phase Corr',
            ...(isDWISeq ? ['ADC Map', 'Trace'] : []),
            ...(hasInlineMIP ? ['MIP'] : []),
            '→ PACS',
          ]
          return (
            <div className="flex items-center gap-0" style={{ borderRight: '1px solid #111d27', paddingRight: 6, marginRight: 2 }}>
              {steps.map((label, i) => (
                <div key={i} className="flex items-center gap-1 px-1.5" style={{ borderRight: i < steps.length - 1 ? '1px solid #0f1a24' : 'none' }}>
                  <span style={{ fontSize: '7px', color: i < reconStep ? '#60a5fa' : i === reconStep ? '#a78bfa' : '#1a1f40' }}>
                    {i < reconStep ? '●' : i === reconStep ? '◉' : '○'}
                  </span>
                  <span style={{ fontSize: '7px', color: i < reconStep ? '#1a2a4a' : i === reconStep ? '#c8ccd6' : '#1a1f40', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )
        })()}

        {scanState === 'done' && (
          <span className="font-mono" style={{ color: '#60a5fa', fontSize: '8px' }}>✓ IMAGES STORED</span>
        )}

        <button
          onClick={scanState === 'idle' || scanState === 'done' ? startScan : stopScan}
          style={{
            background: scanState === 'scanning' ? '#2a0505' : scanState === 'recon' ? '#0a0f1f' : scanState === 'done' ? '#0a0f1f' : '#0a2d1a',
            color: scanState === 'scanning' ? '#f87171' : scanState === 'recon' ? '#60a5fa' : scanState === 'done' ? '#60a5fa' : '#34d399',
            border: `1px solid ${scanState === 'scanning' ? '#7f1d1d' : (scanState === 'recon' || scanState === 'done') ? '#1d3d7f' : '#14532d'}`,
            borderRadius: 4,
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 16px',
            cursor: 'pointer',
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
            boxShadow: (scanState === 'idle' || scanState === 'done') ? '0 0 8px #14532d80' : 'none',
            minWidth: '72px',
          }}
        >
          {scanState === 'scanning' ? '■ STOP' : scanState === 'preparing' ? '· · ·' : scanState === 'recon' ? 'RECON' : '▶ SCAN'}
        </button>
      </div>
    </div>
  )
}
