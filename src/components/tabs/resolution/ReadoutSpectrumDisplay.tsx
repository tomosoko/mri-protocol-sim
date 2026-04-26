import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'

// ── 読み取り帯域幅スペクトル (Frequency Domain) ────────────────────────────
// リアルな syngo MR コンソールの周波数スペクトル表示に相当
// 帯域幅・化学シフト・水/脂肪ピーク位置を視覚化
export function ReadoutSpectrumDisplay() {
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
