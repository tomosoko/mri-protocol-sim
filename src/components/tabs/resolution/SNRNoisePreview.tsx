import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'
import { calcSNR } from '../../../store/calculators'

// ── SNR ノイズプレビュー ─────────────────────────────────────────────────────
// 現在の SNR に基づいて脳ファントム画像に合成ノイズを重畳表示
// SNR が低いほどノイズが多く見える — 直感的なSNR可視化
export function SNRNoisePreview() {
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
