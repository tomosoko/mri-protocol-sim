import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'

// ── T2* 減衰カーブ ─────────────────────────────────────────────────────────────
export function T2StarDecayChart({ fieldStrength, TE }: { fieldStrength: number; TE: number }) {
  const is3T = fieldStrength >= 2.5

  // T2* values (ms) at 1.5T and 3T for key tissues
  const tissues: { label: string; t2s_15: number; t2s_30: number; color: string }[] = [
    { label: 'GM',    t2s_15: 66,  t2s_30: 33,  color: '#a78bfa' },
    { label: 'WM',    t2s_15: 72,  t2s_30: 36,  color: '#60a5fa' },
    { label: 'Liver', t2s_15: 23,  t2s_30: 12,  color: '#fb923c' },
    { label: 'Spleen',t2s_15: 60,  t2s_30: 30,  color: '#4ade80' },
    { label: 'Muscle',t2s_15: 35,  t2s_30: 18,  color: '#fbbf24' },
    { label: 'Blood', t2s_15: 200, t2s_30: 90,  color: '#f87171' },
  ]

  const W = 290, H = 90
  const PAD = { l: 28, r: 8, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxTE = 150
  const nPts = 80

  const tx = (t: number) => PAD.l + (t / maxTE) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, s))) * innerH

  const paths = useMemo(() => tissues.map(t => {
    const T2s = is3T ? t.t2s_30 : t.t2s_15
    const d = Array.from({ length: nPts + 1 }, (_, i) => {
      const te = (i / nPts) * maxTE
      const s = Math.exp(-te / T2s)
      return `${i === 0 ? 'M' : 'L'}${tx(te).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    return { ...t, T2s, d }
  }), [is3T])

  const teX = tx(Math.min(TE, maxTE))

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span style={{ color: '#4b5563', fontSize: '9px', fontWeight: 600 }}>T2* 減衰カーブ ({fieldStrength}T)</span>
        <span style={{ color: '#6b7280', fontSize: '8px' }}>TE={TE}ms</span>
      </div>
      <svg width={W} height={H}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#111" strokeWidth={v === 0.5 ? 1 : 0.5} />
        ))}
        {/* Y-axis labels */}
        {[0.5, 1.0].map(v => (
          <text key={v} x={PAD.l - 3} y={ty(v) + 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {v === 1.0 ? 'S₀' : '0.5'}
          </text>
        ))}

        {/* Tissue curves */}
        {paths.map(t => (
          <path key={t.label} d={t.d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.8} />
        ))}

        {/* Current TE marker */}
        {TE > 0 && TE <= maxTE && (
          <>
            <line x1={teX} y1={PAD.t} x2={teX} y2={PAD.t + innerH}
              stroke="#e88b00" strokeWidth={1} strokeDasharray="3,2" />
            <text x={teX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TE={TE}</text>
          </>
        )}

        {/* X-axis labels */}
        {[0, 30, 60, 90, 120, 150].map(t => (
          <text key={t} x={tx(t)} y={H - 3} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{t}</text>
        ))}
        <text x={PAD.l + innerW / 2} y={H} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>TE (ms)</text>
      </svg>
      <div className="flex flex-wrap gap-x-2 px-2 pb-1.5" style={{ fontSize: '7px' }}>
        {paths.map(t => (
          <span key={t.label} style={{ color: t.color }}>
            {t.label} T2*={t.T2s}ms
          </span>
        ))}
      </div>
    </div>
  )
}

// ── MRスペクトロスコピー 代謝産物スペクトル ──────────────────────────────────
// PRESS/STEAM シングルボクセル MRS の 1H スペクトルシミュレーション
// NAA/Cho/Cr/mI/Glx の主要代謝産物ピークを TE 依存 T2 減衰を含めて描画
export function MRSSpectrum() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const TE = params.TE

  // Metabolite definitions: ppm, T2 (ms), amplitude, label, color
  const METABOLITES = [
    { ppm: 1.33, T2: 200,  amp: 0.6,  label: 'Lac',  color: '#f87171', note: '乳酸(虚血・腫瘍)' },
    { ppm: 2.01, T2: 250,  amp: 1.0,  label: 'NAA',  color: '#34d399', note: 'N-acetylaspartate (神経マーカー)' },
    { ppm: 2.25, T2: 160,  amp: 0.35, label: 'Glx',  color: '#4ade80', note: 'Glu+Gln (神経活性)' },
    { ppm: 3.03, T2: 170,  amp: 0.65, label: 'Cr',   color: '#60a5fa', note: 'Creatine (基準代謝産物)' },
    { ppm: 3.21, T2: 280,  amp: 0.55, label: 'Cho',  color: '#fbbf24', note: 'Choline (細胞膜代謝)' },
    { ppm: 3.56, T2: 110,  amp: 0.45, label: 'mI',   color: '#a78bfa', note: 'Myo-inositol (グリア)' },
    { ppm: 4.68, T2: 50,   amp: 0.08, label: 'H₂O', color: '#374151', note: '残留水ピーク(抑制後)' },
  ]

  // Linewidth: depends on B0 inhomogeneity + T2*
  // 1.5T: ~3Hz, 3T: ~5Hz (in Hz)
  const lw = is3T ? 5 : 3  // Hz linewidth (FWHM)
  const ppmPerHz = 1 / (is3T ? 127.74 : 63.87) / 1e6  // ppm per Hz

  const W = 290, H = 90
  const PAD = { l: 8, r: 10, t: 8, b: 20 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // ppm display: 5.0 → 0.5 (reversed - convention in MRS)
  const ppmMin = 0.5, ppmMax = 5.2
  const tx = (ppm: number) => PAD.l + (1 - (ppm - ppmMin) / (ppmMax - ppmMin)) * innerW

  // Compute spectrum by summing Lorentzian peaks
  const nPts = 300
  const xPts = Array.from({ length: nPts }, (_, i) => ppmMin + (i / (nPts - 1)) * (ppmMax - ppmMin))

  const spectrum = useMemo(() => {
    const lwPpm = lw * ppmPerHz * 1e6  // convert linewidth Hz → ppm
    return xPts.map(ppm => {
      let sig = 0
      for (const m of METABOLITES) {
        // T2 decay at current TE
        const t2factor = Math.exp(-TE / m.T2)
        // Lorentzian peak: L(x) = (γ/2π) / ((x-x0)² + (γ/2π)²)
        const gamma = lwPpm / 2
        const lorentz = (gamma / Math.PI) / ((ppm - m.ppm) ** 2 + gamma ** 2)
        sig += m.amp * t2factor * lorentz * gamma * Math.PI  // normalized
      }
      // Add baseline noise
      return sig
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TE, is3T])

  const maxSig = Math.max(...spectrum) || 1

  const specPath = xPts.map((ppm, i) => {
    const x = tx(ppm)
    const y = PAD.t + innerH - (spectrum[i] / maxSig) * innerH * 0.88
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // Peak amplitudes at current TE for legend
  const peakAmps = METABOLITES.map(m => ({
    ...m,
    relAmp: Math.round(m.amp * Math.exp(-TE / m.T2) / METABOLITES[3].amp * 100) / 100,  // relative to Cr
  }))

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060810', border: '1px solid #1a1a30' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px', letterSpacing: '0.05em' }}>
          ¹H MRS SPECTRUM (Simulated)
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#374151' }}>TE={TE}ms</span>
          <span style={{ color: '#374151' }}>{is3T ? '3T (5Hz/lw)' : '1.5T (3Hz/lw)'}</span>
        </div>
      </div>

      <svg width={W} height={H}>
        {/* Baseline */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH}
          stroke="#1a1a2a" strokeWidth={0.5} />

        {/* Peak labels */}
        {METABOLITES.filter(m => m.ppm < 5).map(m => {
          const x = tx(m.ppm)
          const t2f = Math.exp(-TE / m.T2)
          const peakY = PAD.t + innerH - (m.amp * t2f / maxSig) * innerH * 0.88 - 2
          if (m.amp * t2f < maxSig * 0.05) return null  // hide very small peaks
          return (
            <g key={m.label}>
              <line x1={x} y1={peakY} x2={x} y2={PAD.t + innerH}
                stroke={m.color + '20'} strokeWidth={0.5} strokeDasharray="1,2" />
              <text x={x} y={peakY - 2} textAnchor="middle"
                fill={m.color + 'aa'} style={{ fontSize: '6px' }}>{m.label}</text>
            </g>
          )
        })}

        {/* Spectrum curve */}
        <path d={specPath} fill={`url(#mrsGrad)`} stroke="#a78bfa" strokeWidth={1.2} opacity={0.9} />

        {/* Fill gradient under curve */}
        <defs>
          <linearGradient id="mrsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ppm axis labels */}
        {[1, 2, 3, 4, 5].map(ppm => (
          <text key={ppm} x={tx(ppm)} y={H - 3} textAnchor="middle"
            fill="#252525" style={{ fontSize: '7px' }}>{ppm}</text>
        ))}
        <text x={PAD.l + innerW / 2} y={H - 1} textAnchor="middle"
          fill="#1a1a30" style={{ fontSize: '7px' }}>ppm</text>
      </svg>

      {/* Metabolite legend with current TE amplitudes */}
      <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5" style={{ fontSize: '7px' }}>
        {peakAmps.filter(m => m.ppm < 4.5).map(m => (
          <span key={m.label} style={{ color: m.relAmp < 0.1 ? '#252525' : m.color }}>
            {m.label} {m.relAmp < 0.05 ? '---' : m.relAmp.toFixed(2)}
          </span>
        ))}
        <span style={{ color: '#252525', marginLeft: 4 }}>相対値 (Cr=1.0基準)</span>
      </div>
    </div>
  )
}
