import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'

// ── RF パルス形状 + スライスプロファイル ──────────────────────────────────────
export function RFPulseSliceProfile() {
  const { params } = useProtocolStore()

  const N = 64   // DFT points
  const nLobes = 4  // number of sinc lobes (each side)

  const rfTime = useMemo(() => {
    return Array.from({ length: N }, (_, i) => {
      const t = (i / (N - 1) - 0.5) * 2 * nLobes
      const sincVal = Math.abs(t) < 1e-6 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t)
      const hamming = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1))
      return sincVal * hamming
    })
  }, [])

  const sliceProfile = useMemo(() => {
    const profile: number[] = []
    for (let k = 0; k < N; k++) {
      const kc = (k + N / 2) % N
      let re = 0, im = 0
      for (let j = 0; j < N; j++) {
        const angle = 2 * Math.PI * j * kc / N
        re += rfTime[j] * Math.cos(angle)
        im -= rfTime[j] * Math.sin(angle)
      }
      profile.push(Math.sqrt(re * re + im * im))
    }
    return profile
  }, [rfTime])

  const maxProfile = Math.max(...sliceProfile)
  const sliceThickMm = params.sliceThickness
  const isTSE = params.turboFactor > 1

  const W = 280, H = 80
  const PAD = { l: 8, r: 8, t: 6, b: 16 }
  const innerW = W - PAD.l - PAD.r
  const halfW = innerW / 2 - 4
  const innerH = H - PAD.t - PAD.b

  const rfPath = rfTime.map((v, i) => {
    const x = PAD.l + (i / (N - 1)) * halfW
    const y = PAD.t + innerH * 0.6 - v * innerH * 0.55
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const xOffset = PAD.l + halfW + 8
  const profilePath = sliceProfile.map((v, i) => {
    const x = xOffset + (i / (N - 1)) * halfW
    const y = PAD.t + innerH - (v / maxProfile) * innerH * 0.85
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const sliceL = xOffset + innerW * 0.25
  const sliceR = xOffset + innerW * 0.75

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080810', border: '1px solid #1a1a30' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px', letterSpacing: '0.05em' }}>
          RF PULSE / SLICE PROFILE
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px', color: '#4b5563' }}>
          <span>Slice: <span className="font-mono" style={{ color: '#c8ccd6' }}>{sliceThickMm}mm</span></span>
          <span>Window: <span style={{ color: '#c084fc' }}>Hamming</span></span>
          {isTSE && <span style={{ color: '#fbbf24' }}>180°=×2 dur</span>}
        </div>
      </div>

      <svg width={W} height={H}>
        <line x1={PAD.l + halfW + 4} y1={PAD.t} x2={PAD.l + halfW + 4} y2={H - PAD.b}
          stroke="#1a1a2a" strokeWidth={1} />
        <text x={PAD.l} y={PAD.t + 5} fill="#4b5563" style={{ fontSize: '7px' }}>RF pulse (time)</text>
        <line x1={PAD.l} y1={PAD.t + innerH * 0.6} x2={PAD.l + halfW} y2={PAD.t + innerH * 0.6}
          stroke="#1a1a2a" strokeWidth={0.5} />
        <path d={rfPath} fill="none" stroke="#e88b00" strokeWidth={1.5} opacity={0.9} />
        <text x={PAD.l} y={H - 3} fill="#374151" style={{ fontSize: '6px' }}>−{nLobes}π</text>
        <text x={PAD.l + halfW} y={H - 3} textAnchor="end" fill="#374151" style={{ fontSize: '6px' }}>+{nLobes}π</text>

        <text x={xOffset} y={PAD.t + 5} fill="#4b5563" style={{ fontSize: '7px' }}>Slice profile (z)</text>
        <line x1={sliceL} y1={PAD.t + 2} x2={sliceL} y2={PAD.t + innerH}
          stroke="#a78bfa30" strokeWidth={1} strokeDasharray="2,2" />
        <line x1={sliceR} y1={PAD.t + 2} x2={sliceR} y2={PAD.t + innerH}
          stroke="#a78bfa30" strokeWidth={1} strokeDasharray="2,2" />
        <rect x={sliceL} y={PAD.t + 2} width={sliceR - sliceL} height={innerH - 2}
          fill="#a78bfa08" />
        <path d={profilePath} fill="none" stroke="#a78bfa" strokeWidth={1.5} opacity={0.9} />
        <text x={(sliceL + sliceR) / 2} y={H - 3} textAnchor="middle"
          fill="#4b5563" style={{ fontSize: '6px' }}>{sliceThickMm}mm</text>
        <text x={xOffset + halfW} y={PAD.t + 14} textAnchor="end"
          fill="#374151" style={{ fontSize: '6px' }}>Gibbs ~9%</text>
      </svg>

      <div className="flex items-center gap-3 mt-0.5" style={{ fontSize: '7px', color: '#374151' }}>
        <span style={{ color: '#e88b00' }}>── RF sinc</span>
        <span style={{ color: '#a78bfa' }}>── Slice profile</span>
        <span style={{ color: '#4b5563' }}>Hamming windowing → side lobe ≪9%</span>
      </div>
    </div>
  )
}

// ── trueFISP/bSSFP バンディングアーチファクト可視化 ───────────────────────────
export function TrueFISPBandingViz() {
  const { params } = useProtocolStore()

  const isTrueFISP = params.TR <= 6 && params.turboFactor <= 1 && params.flipAngle >= 30 && params.flipAngle <= 80

  const is3T = params.fieldStrength >= 2.5
  const bandingPeriodHz = 1000 / params.TR
  const b0InhomPpm = is3T ? 2.5 : 1.2
  const larmorHz = is3T ? 127740000 : 63870000
  const b0Spread = b0InhomPpm * 1e-6 * larmorHz
  const nBands = Math.round(b0Spread / bandingPeriodHz)

  const W = 290, H = 56
  const PAD = { l: 14, r: 10, t: 8, b: 16 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const maxHz = 400
  const nPts = 200
  const fa = params.flipAngle * Math.PI / 180
  const tr = params.TR / 1000

  const profile = useMemo(() => {
    return Array.from({ length: nPts + 1 }, (_, i) => {
      const df = (i / nPts) * maxHz
      const phase = 2 * Math.PI * df * tr
      const signal = Math.abs(Math.sin(fa / 2)) * Math.sqrt(1 - Math.cos(phase) ** 2 * Math.sin(fa / 2) ** 4)
      const isNull = Math.abs(Math.cos(phase)) > 0.92
      return { df, signal: isNull ? 0 : Math.min(1, signal), isNull }
    })
  }, [fa, tr])

  if (!isTrueFISP) return null

  const maxSig = Math.max(...profile.map(p => p.signal), 0.01)
  const tx = (df: number) => PAD.l + (df / maxHz) * innerW
  const ty = (s: number) => PAD.t + (1 - s / maxSig) * innerH

  const path = profile.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${tx(p.df).toFixed(1)},${ty(p.signal).toFixed(1)}`
  ).join(' ')

  const bandPositions = profile.filter(p => p.isNull).map(p => p.df)
    .filter((df, i, arr) => i === 0 || df - arr[i-1] > 5)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0808', border: '1px solid #2a1010' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#f472b6', fontSize: '9px', letterSpacing: '0.05em' }}>
          trueFISP BANDING ARTIFACT
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#374151' }}>Band Δ = {bandingPeriodHz.toFixed(0)} Hz</span>
          <span style={{ color: nBands > 3 ? '#f87171' : nBands > 1 ? '#fbbf24' : '#34d399' }}>
            ~{nBands} bands
          </span>
        </div>
      </div>
      <svg width={W} height={H}>
        <path d={path} fill="none" stroke="#f472b6" strokeWidth={1.2} opacity={0.85} />
        <path d={`${path} L${tx(maxHz)},${PAD.t + innerH} L${PAD.l},${PAD.t + innerH} Z`}
          fill="#f472b610" />
        {bandPositions.map((df, i) => (
          <g key={i}>
            <line x1={tx(df)} y1={PAD.t} x2={tx(df)} y2={PAD.t + innerH}
              stroke="#f8717140" strokeWidth={2} />
          </g>
        ))}
        {b0Spread < maxHz && (
          <rect x={PAD.l} y={PAD.t} width={tx(b0Spread) - PAD.l} height={innerH}
            fill="#fbbf2408" />
        )}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH}
          stroke="#252525" strokeWidth={0.5} />
        <text x={PAD.l} y={H - 3} fill="#374151" style={{ fontSize: '7px' }}>0 Hz</text>
        <text x={PAD.l + innerW} y={H - 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>{maxHz} Hz</text>
        {b0Spread < maxHz && (
          <text x={tx(b0Spread / 2)} y={PAD.t + 6} textAnchor="middle" fill="#fbbf2480" style={{ fontSize: '7px' }}>
            B0±{b0InhomPpm}ppm
          </text>
        )}
      </svg>
      <div style={{ fontSize: '7px', color: '#374151', marginTop: 2 }}>
        {nBands > 2
          ? `⚠ TR=${params.TR}ms → バンドが${nBands}本。TRを短く (≤4ms) するかB0 shimを強化。`
          : `trueFISP: TR=${params.TR}ms — バンド間隔${bandingPeriodHz.toFixed(0)}Hz — ${is3T ? '3T' : '1.5T'}では注意が必要`}
      </div>
    </div>
  )
}
