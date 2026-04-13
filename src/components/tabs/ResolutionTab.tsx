import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { chemShift, calcSNR, calcGFactor } from '../../store/calculators'
import { VizSection } from '../VizSection'

// ── 読み取り帯域幅スペクトル (Frequency Domain) ────────────────────────────
// リアルな syngo MR コンソールの周波数スペクトル表示に相当
// 帯域幅・化学シフト・水/脂肪ピーク位置を視覚化
function ReadoutSpectrumDisplay() {
  const { params } = useProtocolStore()

  const is3T = params.fieldStrength >= 2.5
  const halfBW = params.bandwidth / 2   // Hz/px, 片側

  // 水脂肪化学シフト: 3.5ppm × ラーモア周波数
  // 1.5T: 63.87MHz → 3.5ppm = 224Hz; 3T: 127.74MHz → 447Hz
  const csHz = is3T ? 447 : 224

  // Spectral display range
  const displayHalfW = Math.max(halfBW * 2, csHz * 1.5)

  const W = 320, H = 80
  const PAD = { l: 24, r: 10, t: 8, b: 22 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const fx = (hz: number) => PAD.l + ((hz + displayHalfW) / (2 * displayHalfW)) * innerW

  // Readout bandwidth: each pixel covers params.bandwidth Hz
  const bwHalfHz = (params.bandwidth * params.matrixFreq) / 2

  // MR spectrum profile: water peak at 0, fat peak at -csHz (fat resonates lower freq)
  const nPts = 200
  const spectrum = useMemo(() => Array.from({ length: nPts + 1 }, (_, i) => {
    const hz = -displayHalfW + (i / nPts) * 2 * displayHalfW
    // Water peak: Lorentzian at 0
    const waterLinewidth = 50  // Hz typical linewidth
    const waterS = 1.0 / (1 + ((hz) / waterLinewidth) ** 2)
    // Fat peak: multiple CH2 groups → broad peak
    // Main fat resonance at -csHz, width ~100Hz
    const fatMain = 0.75 / (1 + ((hz + csHz) / 80) ** 2)
    // Fat olefinic (minor, ~2.4ppm above water)
    const fatOlefinic = 0.12 / (1 + ((hz - 100) / 40) ** 2)
    return { hz, sig: waterS * 0.7 + fatMain + fatOlefinic * 0.3 }
  }), [csHz, displayHalfW])

  const maxSig = Math.max(...spectrum.map(s => s.sig))
  const spectrumPath = spectrum.map((s, i) => {
    const x = fx(s.hz)
    const y = PAD.t + innerH - (s.sig / maxSig) * innerH * 0.9
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // Acquisition window (readout BW covers this range)
  const acqL = Math.max(PAD.l, fx(-bwHalfHz))
  const acqR = Math.min(PAD.l + innerW, fx(bwHalfHz))

  const csX = fx(-csHz)  // fat peak x position
  const waterX = fx(0)   // water peak x position

  // Chemical shift in pixels: csHz / bandwidth
  const csPx = (csHz / params.bandwidth).toFixed(1)
  const csOutside = csHz > bwHalfHz

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#050a10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.05em' }}>
          READOUT FREQUENCY SPECTRUM
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>BW: {params.bandwidth} Hz/px</span>
      </div>
      <svg width={W} height={H}>
        {/* Acquisition window background */}
        <rect x={acqL} y={PAD.t} width={Math.max(0, acqR - acqL)} height={innerH}
          fill="#1a2a1a" opacity={0.7} />
        <rect x={acqL} y={PAD.t} width={Math.max(0, acqR - acqL)} height={innerH}
          fill="none" stroke="#34d39940" strokeWidth={1} />

        {/* Baseline */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH}
          stroke="#1a1a1a" strokeWidth={1} />
        {/* Zero frequency center */}
        <line x1={PAD.l + innerW / 2} y1={PAD.t} x2={PAD.l + innerW / 2} y2={PAD.t + innerH}
          stroke="#252525" strokeWidth={0.5} strokeDasharray="2,2" />

        {/* Spectrum curve */}
        <path d={spectrumPath} fill="none" stroke="#60a5fa" strokeWidth={1.5} opacity={0.85} />

        {/* Water peak indicator */}
        <line x1={waterX} y1={PAD.t + 2} x2={waterX} y2={PAD.t + innerH}
          stroke="#38bdf8" strokeWidth={1} strokeDasharray="2,2" opacity={0.7} />
        <text x={waterX + 2} y={PAD.t + 9} fill="#38bdf8" style={{ fontSize: '7px' }}>H₂O</text>

        {/* Fat peak indicator */}
        {csX >= PAD.l && csX <= PAD.l + innerW && (
          <>
            <line x1={csX} y1={PAD.t + 2} x2={csX} y2={PAD.t + innerH}
              stroke={csOutside ? '#f87171' : '#fbbf24'} strokeWidth={1} strokeDasharray="2,2" opacity={0.7} />
            <text x={csX + 2} y={PAD.t + 9} fill={csOutside ? '#f87171' : '#fbbf24'} style={{ fontSize: '7px' }}>Fat</text>
          </>
        )}

        {/* Chemical shift arrow */}
        <defs>
          <marker id="csArrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill="#fbbf24" />
          </marker>
        </defs>
        <line x1={waterX} y1={PAD.t + 20} x2={Math.max(csX, PAD.l + 4)} y2={PAD.t + 20}
          stroke="#fbbf2470" strokeWidth={0.8} markerEnd="url(#csArrow)" />
        <text x={(waterX + Math.max(csX, PAD.l)) / 2} y={PAD.t + 17}
          textAnchor="middle" fill="#fbbf24" style={{ fontSize: '7px' }}>Δ{csPx}px</text>

        {/* Acquisition window labels */}
        <text x={acqL + 2} y={H - 5} fill="#34d399" style={{ fontSize: '7px' }}>−BW/2</text>
        <text x={acqR - 2} y={H - 5} textAnchor="end" fill="#34d399" style={{ fontSize: '7px' }}>+BW/2</text>

        {/* x-axis ticks */}
        {[-csHz * 2, -csHz, 0, csHz].map(hz => {
          const x = fx(hz)
          if (x < PAD.l || x > PAD.l + innerW) return null
          const kHz = Math.abs(hz) < 1000
            ? `${hz > 0 ? '+' : ''}${hz}Hz`
            : `${(hz / 1000).toFixed(1)}k`
          return (
            <g key={hz}>
              <line x1={x} y1={PAD.t + innerH} x2={x} y2={PAD.t + innerH + 3} stroke="#252525" strokeWidth={1} />
              <text x={x} y={H - 4} textAnchor="middle" fill="#252525" style={{ fontSize: '6px' }}>{kHz}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex gap-3 mt-0.5 flex-wrap" style={{ fontSize: '7px', color: '#374151' }}>
        <span style={{ color: '#34d399' }}>■ 取得窓 (±{(bwHalfHz/1000).toFixed(1)}kHz)</span>
        <span style={{ color: '#38bdf8' }}>| 水</span>
        <span style={{ color: csOutside ? '#f87171' : '#fbbf24' }}>| 脂肪{csOutside ? ' (窓外)' : ''}</span>
        <span>CS={csPx}px{parseFloat(csPx) >= 3 ? ' ⚠大' : ''}</span>
      </div>
    </div>
  )
}

// ── SNR ノイズプレビュー ─────────────────────────────────────────────────────
// 現在の SNR に基づいて脳ファントム画像に合成ノイズを重畳表示
// SNR が低いほどノイズが多く見える — 直感的なSNR可視化
function SNRNoisePreview() {
  const { params } = useProtocolStore()
  const snr = calcSNR(params)

  // Pixel size for display
  const readPxMm = params.fov / params.matrixFreq
  const phasePxMm = (params.fov * params.phaseResolution / 100) / params.matrixPhase

  // Display at fixed size, showing pixels as blocks
  const DISPLAY_W = 120, DISPLAY_H = 100
  const PHANTOM_COLS = 24, PHANTOM_ROWS = 20

  // Noise standard deviation: inversely proportional to SNR
  // At SNR=100, sigma=0.03; at SNR=10, sigma=0.3; at SNR=5, sigma=0.6
  const noiseSigma = Math.min(0.8, 80 / Math.max(snr, 5))

  // Generate deterministic noise field using LCG pseudo-random
  const noiseField = useMemo(() => {
    const field: number[] = []
    let seed = snr * 100 + params.matrixFreq * 10 + params.bandwidth
    for (let i = 0; i < PHANTOM_COLS * PHANTOM_ROWS; i++) {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      const u1 = (seed >>> 0) / 0x100000000
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      const u2 = (seed >>> 0) / 0x100000000
      // Box-Muller transform
      const n = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
      field.push(n)
    }
    return field
  }, [snr, params.matrixFreq, params.bandwidth])

  // Phantom signal map (simplified brain cross-section, normalized 0-1)
  const phantomSignal = useMemo(() => {
    const cx = PHANTOM_COLS / 2, cy = PHANTOM_ROWS / 2
    const map: number[] = []
    for (let row = 0; row < PHANTOM_ROWS; row++) {
      for (let col = 0; col < PHANTOM_COLS; col++) {
        const nx = (col - cx) / (PHANTOM_COLS * 0.4)
        const ny = (row - cy) / (PHANTOM_ROWS * 0.4)
        const r2 = nx * nx + ny * ny
        if (r2 > 1.0) { map.push(0); continue }
        // Skull: 0.05 (dark bone)
        // WM: 0.7, GM: 0.55, CSF: 0.9
        const ri = Math.sqrt(r2)
        if (ri > 0.88) { map.push(0.15); continue }  // scalp/fat
        if (ri > 0.82) { map.push(0.05); continue }  // skull
        if (ri > 0.72) { map.push(0.55); continue }  // GM cortex
        // Inner structure
        const nx2 = nx * 1.5, ny2 = ny * 1.5
        const r2v = nx2 * nx2 + ny2 * ny2
        if (r2v < 0.08) { map.push(0.9); continue }  // ventricles (CSF)
        map.push(0.70)  // WM
      }
    }
    return map
  }, [])

  const cellW = DISPLAY_W / PHANTOM_COLS
  const cellH = DISPLAY_H / PHANTOM_ROWS

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#050505', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.05em' }}>
          SNR NOISE PREVIEW
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span className="font-mono font-bold" style={{
            color: snr >= 80 ? '#34d399' : snr >= 40 ? '#fbbf24' : '#f87171'
          }}>SNR={snr}</span>
          <span style={{ color: '#374151' }}>
            σ={noiseSigma.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <svg width={DISPLAY_W} height={DISPLAY_H} style={{ background: '#000', borderRadius: 2, flexShrink: 0 }}>
          {Array.from({ length: PHANTOM_ROWS }, (_, row) =>
            Array.from({ length: PHANTOM_COLS }, (_, col) => {
              const idx = row * PHANTOM_COLS + col
              const baseSignal = phantomSignal[idx]
              const noise = noiseField[idx] * noiseSigma
              const signal = Math.max(0, Math.min(1, baseSignal + noise))
              const v = Math.round(signal * 240)
              return (
                <rect key={idx}
                  x={col * cellW} y={row * cellH}
                  width={cellW} height={cellH}
                  fill={`rgb(${v},${v},${v})`}
                />
              )
            })
          )}
        </svg>
        <div className="flex flex-col gap-1 text-xs flex-1">
          <div style={{ color: '#374151', fontSize: '7px' }}>解像度</div>
          <div className="font-mono" style={{ color: '#9ca3af', fontSize: '8px' }}>
            {readPxMm.toFixed(2)}×{phasePxMm.toFixed(2)} mm
          </div>
          <div style={{ color: '#374151', fontSize: '7px' }}>ボクセル体積</div>
          <div className="font-mono" style={{ color: '#9ca3af', fontSize: '8px' }}>
            {(readPxMm * phasePxMm * params.sliceThickness).toFixed(2)} mm³
          </div>
          <div style={{ color: '#374151', fontSize: '7px' }}>Noise σ</div>
          <div style={{ fontSize: '7px' }}>
            <div className="h-1.5 rounded overflow-hidden" style={{ background: '#111', marginTop: 2 }}>
              <div className="h-full rounded" style={{
                width: `${Math.min(100, noiseSigma * 125)}%`,
                background: snr >= 80 ? '#34d399' : snr >= 40 ? '#fbbf24' : '#f87171',
              }} />
            </div>
          </div>
          {snr < 20 && (
            <div style={{ color: '#f87171', fontSize: '7px' }}>⚠ SNR低: ノイズ目立つ</div>
          )}
          {snr >= 80 && (
            <div style={{ color: '#34d399', fontSize: '7px' }}>✓ SNR良好</div>
          )}
        </div>
      </div>
    </div>
  )
}

type SubTab = 'Common' | 'Acceleration' | 'Filter'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

// ── Readout Duration / ADC Sampling Parameters ─────────────────────────────
// MRI の読み出しタイミングパラメータ：実際の syngo コンソールで確認できる値
function ReadoutTimingPanel() {
  const { params } = useProtocolStore()

  // Readout duration (ADC duration): matrix_freq / (2 × bandwidth_per_pixel × matrix_freq)
  // = 1 / (2 × BW_per_pixel)   where BW_per_pixel = total_BW / matrix_freq
  // total_BW (Hz) = bandwidth (Hz/px) × matrixFreq
  // Readout time = matrixFreq / total_BW = 1 / (bandwidth) seconds
  const pixelBW = params.bandwidth  // Hz/pixel
  const totalBW = pixelBW * params.matrixFreq  // total receiver bandwidth (Hz)
  // Actually: readout = matrixFreq / (2 * halfBW_total) = matrixFreq / totalBW
  const adcDuration = (params.matrixFreq / totalBW * 1000).toFixed(2)  // ms
  const noiseBW = totalBW  // noise BW ≈ acquisition BW
  const dwellTime = (1 / totalBW * 1e6).toFixed(1)  // μs per sample

  // Chemical shift in mm: cs_Hz / (total_BW / FOV_mm)
  const is3T = params.fieldStrength >= 2.5
  const csHz = is3T ? 447 : 224
  const csPixels = csHz / pixelBW
  const csMm = csPixels * (params.fov / params.matrixFreq)

  const bwOk = pixelBW >= (is3T ? 200 : 130)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c08', border: '1px solid #1a2a1a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#4ade80', fontSize: '9px', letterSpacing: '0.05em' }}>
          READOUT / ADC PARAMETERS
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>{params.matrixFreq} samples</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ fontSize: '8px' }}>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Pixel BW</span>
          <span className="font-mono font-bold" style={{ color: bwOk ? '#4ade80' : '#fbbf24' }}>{pixelBW} Hz/px</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Total BW</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{(totalBW / 1000).toFixed(1)} kHz</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>ADC Duration</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{adcDuration} ms</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Dwell Time</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{dwellTime} μs</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>CS (pixels)</span>
          <span className="font-mono" style={{ color: csPixels > 2 ? '#f87171' : '#34d399' }}>{csPixels.toFixed(1)} px</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>CS (mm)</span>
          <span className="font-mono" style={{ color: csMm > 2 ? '#f87171' : '#34d399' }}>{csMm.toFixed(1)} mm</span>
        </div>
      </div>

      <div className="mt-1.5 pt-1" style={{ borderTop: '1px solid #0f1f0f', fontSize: '7px', color: '#374151' }}>
        {is3T && pixelBW < 200
          ? '⚠ 3Tではピクセル帯域幅≥200Hz/pxを推奨 (化学シフト対策)'
          : `Noise BW = ${(noiseBW/1000).toFixed(1)}kHz — ADC ${adcDuration}ms/line`}
      </div>
    </div>
  )
}

// ── SNR Factor Breakdown ─────────────────────────────────────────────────────
function SNRFactorBreakdown() {
  const { params } = useProtocolStore()

  const voxelVol = (params.fov / params.matrixFreq) * (params.fov / params.matrixPhase) * params.sliceThickness
  const bwFactor = Math.round(Math.sqrt(200 / Math.max(params.bandwidth, 50)) * 100)
  const avgFactor = Math.round(Math.sqrt(params.averages) * 100)
  const gFactor = calcGFactor(params.ipatMode, params.ipatFactor)
  const ipatFactor = params.ipatMode !== 'Off'
    ? Math.round((1 / (Math.sqrt(params.ipatFactor) * gFactor)) * 100)
    : 100
  const COIL_SNR: Record<string, number> = { Head_64: 100, Head_20: 75, Spine_32: 85, Body: 55, Knee: 80, Shoulder: 72, Flex: 60 }
  const coilFactor = COIL_SNR[params.coilType] ?? 60
  const fieldFactor = params.fieldStrength === 3.0 ? 160 : 100

  const totalSNR = calcSNR(params)

  const factors: { label: string; value: number; note: string; color: string }[] = [
    { label: 'ボクセル体積', value: Math.min(200, Math.round(voxelVol * 10)), note: `${voxelVol.toFixed(2)}mm³`, color: '#60a5fa' },
    { label: '帯域幅 (1/√BW)', value: bwFactor, note: `BW=${params.bandwidth}`, color: '#34d399' },
    { label: '加算 (√NEX)', value: avgFactor, note: `NEX=${params.averages}`, color: '#4ade80' },
    { label: 'iPAT/g-factor', value: ipatFactor, note: params.ipatMode !== 'Off' ? `×${params.ipatFactor} g=${gFactor.toFixed(2)}` : 'Off', color: ipatFactor < 70 ? '#f87171' : '#fbbf24' },
    { label: 'コイル係数', value: coilFactor, note: params.coilType, color: '#a78bfa' },
    { label: '磁場強度', value: fieldFactor, note: `${params.fieldStrength}T`, color: '#fb923c' },
  ]

  const maxVal = Math.max(...factors.map(f => f.value), 1)

  return (
    <div className="mx-3 mt-2 p-2.5 rounded" style={{ background: '#111', border: '1px solid #1a1a2a' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" style={{ color: '#60a5fa', fontSize: '10px' }}>SNR 寄与因子</div>
        <div className="font-mono font-bold" style={{ color: '#e2e8f0', fontSize: '11px' }}>SNR={totalSNR}</div>
      </div>
      <div className="space-y-1.5">
        {factors.map(f => (
          <div key={f.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span style={{ color: '#6b7280', fontSize: '8px' }}>{f.label}</span>
              <span className="font-mono" style={{ color: f.color, fontSize: '8px' }}>{f.note}</span>
            </div>
            <div className="h-1.5 rounded overflow-hidden" style={{ background: '#1a1a1a' }}>
              <div className="h-full rounded transition-all duration-300"
                style={{ width: `${Math.min(100, f.value / maxVal * 100)}%`, background: f.color, opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid #1a1a1a', color: '#374151', fontSize: '8px' }}>
        SNR ∝ ボクセル × (1/√BW) × √NEX × (1/√iPAT × g⁻¹) × コイル × B₀
      </div>
    </div>
  )
}

export function ResolutionTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Common')

  // local state for Acceleration / Filter params not in ProtocolParams
  const [accelMode, setAccelMode] = useState('Off')
  const [deepResolve, setDeepResolve] = useState(false)
  const [phasePartialFourier, setPhasePartialFourier] = useState('Off')
  const [refScans, setRefScans] = useState('GRE')
  const [accelFactorPE, setAccelFactorPE] = useState(1)
  const [refLinesPE, setRefLinesPE] = useState(24)
  const [rawFilter, setRawFilter] = useState(false)
  const [ellipticalFilter, setEllipticalFilter] = useState(false)
  const [imageFilter, setImageFilter] = useState(false)
  const [normalize, setNormalize] = useState(false)
  const [distortionCorr, setDistortionCorr] = useState('Off')

  const readPx = (params.fov / params.matrixFreq).toFixed(2)
  const phasePx = (params.fov / params.matrixPhase * (100 / params.phaseResolution)).toFixed(2)
  const cs = chemShift(params)
  // BW変更時の SNR/CS 予測
  const bwOptions = [100, 150, 200, 300, 400, 500, 800, 1000, 1500, 2000]
  const bwImpact = bwOptions.map(bw => ({
    bw,
    snrRel: Math.round(Math.sqrt(params.bandwidth / bw) * 100),
    cs: Math.round((params.fieldStrength === 3.0 ? 440 : 220) / bw * 10) / 10,
  }))

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Common', 'Acceleration', 'Filter'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="px-4 py-1.5 text-xs transition-colors"
            style={subTabStyle(subTab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'Common' && (
        <div className="space-y-0.5">
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
          <ParamField label="FOV Phase%" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} highlight={hl('phaseResolution')} />
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range" min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />
          <ParamField label="Base Resolution" hintKey="matrix" value={params.matrixFreq} type="select"
            options={['64','96','128','192','256','320','384','512']}
            onChange={v => setParam('matrixFreq', parseInt(v as string))} highlight={hl('matrixFreq')} />
          <ParamField label="Phase Resolution%" value={params.matrixPhase} type="select"
            options={['64','96','128','192','256','320','384','512']}
            onChange={v => setParam('matrixPhase', parseInt(v as string))} highlight={hl('matrixPhase')} />
          <ParamField label="Interpolation" value={params.interpolation} type="toggle"
            onChange={v => setParam('interpolation', v as boolean)} />

          {/* Voxel info */}
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>ボクセルサイズ計算</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ color: '#9ca3af' }}>
              <span>読み取り方向:</span>
              <span className="text-white font-mono">{readPx} mm</span>
              <span>位相方向:</span>
              <span className="text-white font-mono">{phasePx} mm</span>
              <span>スライス方向:</span>
              <span className="text-white font-mono">{params.sliceThickness.toFixed(1)} mm</span>
              <span>ボクセル体積:</span>
              <span className="text-white font-mono">{(parseFloat(readPx) * parseFloat(phasePx) * params.sliceThickness).toFixed(2)} mm³</span>
            </div>
          </div>

          {/* Readout / ADC timing */}
          <VizSection><ReadoutTimingPanel /></VizSection>

          {/* Chemical shift */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>
              化学シフト量 ({params.fieldStrength}T)
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded" style={{ background: '#252525' }}>
                <div className="h-full rounded" style={{
                  width: `${Math.min(cs * 20, 100)}%`,
                  background: cs < 1.5 ? '#34d399' : cs < 3 ? '#fbbf24' : '#f87171',
                }} />
              </div>
              <span className={`font-mono font-bold ${cs < 1.5 ? 'text-green-400' : cs < 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                {cs} px
              </span>
            </div>
            <div className="mt-1" style={{ color: '#6b7280' }}>
              水脂肪周波数差: {params.fieldStrength === 3.0 ? '440Hz (3T)' : '220Hz (1.5T)'} ÷ BW {params.bandwidth}Hz/Px
            </div>
            {cs >= 3 && (
              <div className="mt-1 text-red-400">⚠ 化学シフトアーチファクトが顕著です。BW増加か脂肪抑制を推奨。</div>
            )}
          </div>

          {/* Bandwidth トレードオフ表 */}
          <VizSection>
            <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #1a1520' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold" style={{ color: '#e88b00' }}>BW トレードオフ</div>
                <ParamField label="" value={params.bandwidth} type="number"
                  min={50} max={3000} step={50} unit="Hz/px"
                  onChange={v => setParam('bandwidth', v as number)} highlight={hl('bandwidth')} />
              </div>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#4b5563', fontSize: '9px' }}>
                    <th className="text-left py-0.5">BW</th>
                    <th className="text-center py-0.5">SNR 相対</th>
                    <th className="text-center py-0.5">化学シフト</th>
                    <th className="text-left py-0.5 pl-2">適用</th>
                  </tr>
                </thead>
                <tbody>
                  {bwImpact.map(({ bw, snrRel, cs: bwCs }) => {
                    const isCurrent = bw === params.bandwidth
                    return (
                      <tr
                        key={bw}
                        className="cursor-pointer"
                        style={{
                          borderTop: '1px solid #111',
                          background: isCurrent ? '#2a1200' : 'transparent',
                        }}
                        onClick={() => setParam('bandwidth', bw)}
                      >
                        <td className="py-0.5 font-mono" style={{ color: isCurrent ? '#e88b00' : '#9ca3af', fontSize: '9px' }}>
                          {bw}
                        </td>
                        <td className="text-center py-0.5 font-mono" style={{
                          color: snrRel >= 100 ? '#34d399' : snrRel >= 70 ? '#fbbf24' : '#f87171',
                          fontSize: '9px',
                        }}>
                          {snrRel}%
                        </td>
                        <td className="text-center py-0.5 font-mono" style={{
                          color: bwCs <= 1.5 ? '#34d399' : bwCs <= 3 ? '#fbbf24' : '#f87171',
                          fontSize: '9px',
                        }}>
                          {bwCs}px
                        </td>
                        <td className="py-0.5 pl-2" style={{ color: '#4b5563', fontSize: '8px' }}>
                          {bw <= 150 ? '高SNR・CS大' :
                           bw <= 300 ? '脳・脊椎標準' :
                           bw <= 500 ? '腹部・関節' :
                           bw <= 1000 ? '腹部高速' : 'EPI・DWI'}
                        </td>
                        {isCurrent && <td>←</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="mt-1.5" style={{ color: '#374151', fontSize: '9px' }}>
                行をクリックで BW を変更。SNR∝1/√BW、CS=化学シフト量(px)
              </div>
            </div>
          </VizSection>

          {/* Readout frequency spectrum */}
          <VizSection><ReadoutSpectrumDisplay /></VizSection>

          {/* SNR Factor Breakdown */}
          <VizSection><SNRFactorBreakdown /></VizSection>

          {/* SNR noise preview image */}
          <VizSection><SNRNoisePreview /></VizSection>
        </div>
      )}

      {subTab === 'Acceleration' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>iPAT（並列撮像）</div>
          <ParamField label="Acceleration Mode" hintKey="iPAT" value={accelMode} type="select"
            options={['Off', 'GRAPPA', 'CAIPIRINHA']}
            onChange={v => setAccelMode(v as string)} />
          <ParamField label="Deep Resolve" value={deepResolve} type="toggle"
            onChange={v => setDeepResolve(v as boolean)} />
          <ParamField label="Phase Partial Fourier" hintKey="partialFourier" value={phasePartialFourier} type="select"
            options={['Off', '4/8', '5/8', '6/8', '7/8']}
            onChange={v => setPhasePartialFourier(v as string)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Reference</div>
          <ParamField label="Reference Scans" value={refScans} type="select"
            options={['GRE', 'Sep', 'EPI']}
            onChange={v => setRefScans(v as string)} />
          <ParamField label="Acceleration Factor PE" value={accelFactorPE} type="number"
            min={1} max={4} step={1}
            onChange={v => setAccelFactorPE(v as number)} />
          <ParamField label="Reference Lines PE" value={refLinesPE} type="number"
            min={8} max={64} step={4}
            onChange={v => setRefLinesPE(v as number)} />

          {/* iPAT SNR calculation */}
          {accelMode !== 'Off' && (
            <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #3a1a00' }}>
              <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>
                iPAT SNR推定（AF={accelFactorPE}）
              </div>
              <div className="space-y-1" style={{ color: '#9ca3af' }}>
                <div>SNR低下: <span className="font-mono text-yellow-400">
                  {(100 / Math.sqrt(accelFactorPE)).toFixed(0)}%
                </span>（√{accelFactorPE}×g-factor分）</div>
                <div>撮像時間: <span className="font-mono text-green-400">約1/{accelFactorPE}に短縮</span></div>
                {accelMode === 'GRAPPA' && (
                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid #252525' }}>
                    <span className="text-blue-400">GRAPPA: </span>
                    k空間アンダーサンプリング→コイル感度で補間。ACS（Reference Lines）が精度の鍵。
                  </div>
                )}
                {accelMode === 'CAIPIRINHA' && (
                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid #252525' }}>
                    <span className="text-purple-400">CAIPIRINHA: </span>
                    SMS同時多断面励起+ブリップ傾斜でエイリアスをシフト。GRAPPAより68%のケースで画質優位。腹部3D撮像に最適。
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GRAPPA vs CAIPIRINHA comparison */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>GRAPPA vs CAIPIRINHA</div>
            <table className="w-full" style={{ color: '#9ca3af' }}>
              <thead>
                <tr style={{ color: '#6b7280', borderBottom: '1px solid #252525' }}>
                  <th className="text-left pb-1 text-xs">項目</th>
                  <th className="text-center pb-1 text-xs">GRAPPA</th>
                  <th className="text-center pb-1 text-xs">CAIPIRINHA</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-0.5">加速軸</td><td className="text-center">位相方向のみ</td><td className="text-center">位相+スライス</td></tr>
                <tr><td className="py-0.5">g-factor</td><td className="text-center text-yellow-400">高め</td><td className="text-center text-green-400">低い</td></tr>
                <tr><td className="py-0.5">適応</td><td className="text-center">2D/3D全般</td><td className="text-center">3D腹部・骨盤</td></tr>
                <tr><td className="py-0.5">1.5T</td><td className="text-center">AF≤2推奨</td><td className="text-center">AF≤2</td></tr>
                <tr><td className="py-0.5">3T</td><td className="text-center">AF≤3</td><td className="text-center">AF≤3</td></tr>
              </tbody>
            </table>
            <div className="mt-2 pt-1 text-xs" style={{ borderTop: '1px solid #252525', color: '#6b7280' }}>
              DWI(EPI)でAF=2使用→エコートレイン半分→磁化率歪み・EPI歪みが大幅改善（一石二鳥）
            </div>
          </div>
        </div>
      )}

      {subTab === 'Filter' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Raw Data Filter</div>
          <ParamField label="Raw Filter" value={rawFilter} type="toggle"
            onChange={v => setRawFilter(v as boolean)} />
          <ParamField label="Elliptical Filter" value={ellipticalFilter} type="toggle"
            onChange={v => setEllipticalFilter(v as boolean)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Image Filter</div>
          <ParamField label="Image Filter" value={imageFilter} type="toggle"
            onChange={v => setImageFilter(v as boolean)} />
          <ParamField label="Normalize" value={normalize} type="toggle"
            onChange={v => setNormalize(v as boolean)} />
          <ParamField label="Distortion Correction" value={distortionCorr} type="select"
            options={['Off', '2D', '3D']}
            onChange={v => setDistortionCorr(v as string)} />
        </div>
      )}
    </div>
  )
}
