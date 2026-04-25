import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'

// ── 脂肪抑制 B0 不均一性感受性チャート ──────────────────────────────────────
// 各脂肪抑制法の磁場不均一性(ppm)に対する効果を可視化
export function FatSatB0Chart() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Fat suppression effectiveness vs B0 inhomogeneity
  // Models (simplified): effectiveness = f(B0_error_Hz)
  const csFatHz = is3T ? 447 : 224  // fat-water separation

  // Each method's effectiveness model
  const methods = useMemo(() => [
    {
      name: 'CHESS',
      color: '#fbbf24',
      // CHESS: very sensitive to B0 — effectiveness drops rapidly
      eff: (dppm: number) => {
        const dHz = dppm * (is3T ? 127.74 : 63.87)
        return Math.max(0, 1 - (dHz / (csFatHz * 0.15)) ** 2)
      },
    },
    {
      name: 'SPAIR',
      color: '#fb923c',
      // SPAIR: adiabatic — effective up to ~1.5-2 ppm
      eff: (dppm: number) => {
        return Math.max(0, 1 - (dppm / 2.5) ** 2)
      },
    },
    {
      name: 'STIR',
      color: '#4ade80',
      // STIR: B0 independent (T1 based)
      eff: () => 0.85,  // consistent but lower SNR
    },
    {
      name: 'Dixon',
      color: '#38bdf8',
      // Dixon: moderate sensitivity
      eff: (dppm: number) => {
        return Math.max(0, 1 - (dppm / 3.5) ** 1.5)
      },
    },
  ], [is3T, csFatHz])

  const W = 290, H = 80
  const PAD = { l: 28, r: 10, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxPpm = 5
  const nPts = 50

  const ppmPts = Array.from({ length: nPts + 1 }, (_, i) => (i / nPts) * maxPpm)
  const tx = (ppm: number) => PAD.l + (ppm / maxPpm) * innerW
  const ty = (e: number) => PAD.t + (1 - Math.max(0, Math.min(1, e))) * innerH

  const paths = useMemo(() => methods.map(m => {
    const d = ppmPts.map((ppm, i) => {
      const e = m.eff(ppm)
      return `${i === 0 ? 'M' : 'L'}${tx(ppm).toFixed(1)},${ty(e).toFixed(1)}`
    }).join(' ')
    // Current effectiveness at typical field uniformity
    const typicalPpm = is3T ? 1.5 : 0.8
    const currentEff = Math.round(m.eff(typicalPpm) * 100)
    const isSelected = params.fatSat === m.name
    return { ...m, d, currentEff, isSelected }
  }), [methods, ppmPts, tx, ty, is3T, params.fatSat])

  // Current B0 uniformity line (typical value)
  const typicalPpm = is3T ? 1.5 : 0.8

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0808', border: '1px solid #1a1020' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#fbbf24', fontSize: '9px' }}>
          脂肪抑制 B0感受性 ({params.fieldStrength}T)
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>典型的B0均一性: {typicalPpm}ppm</span>
      </div>
      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#111" strokeWidth={1} />
        ))}
        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>100%</text>
        <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>

        {/* Method curves */}
        {paths.map(m => (
          <path key={m.name} d={m.d} fill="none" stroke={m.color}
            strokeWidth={m.isSelected ? 2 : 1} opacity={m.isSelected ? 1 : 0.5} />
        ))}

        {/* Current B0 uniformity line */}
        <line x1={tx(typicalPpm)} y1={PAD.t} x2={tx(typicalPpm)} y2={PAD.t + innerH}
          stroke="#e88b00" strokeWidth={1} strokeDasharray="2,2" opacity={0.6} />
        <text x={tx(typicalPpm) + 2} y={PAD.t + 8} fill="#e88b0090" style={{ fontSize: '7px' }}>B0typ</text>

        {/* Axis */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>B0 不均一性 (ppm)</text>
        {[0, 1, 2, 3, 4, 5].map(v => (
          <text key={v} x={tx(v)} y={H - 2} textAnchor="middle" fill="#252525" style={{ fontSize: '6px' }}>{v}</text>
        ))}
      </svg>
      {/* Legend with current effectiveness */}
      <div className="flex flex-wrap gap-x-3 gap-y-0 mt-1" style={{ fontSize: '7px' }}>
        {paths.map(m => (
          <span key={m.name} style={{ color: m.isSelected ? m.color : '#374151', fontWeight: m.isSelected ? 700 : 400 }}>
            {m.name}:{m.currentEff}%{m.isSelected ? ' ←' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export const fatSatDesc: Record<string, string> = {
  None: 'なし — 脂肪信号あり',
  CHESS: '化学シフト選択励起 — 均一磁場に最適（頭部・脊椎）',
  SPAIR: 'Spectral Adiabatic IR — 不均一磁場でも均一抑制（腹部・乳腺）',
  STIR: 'Short TI IR — 磁場不均一に最強。造影後は不可',
  Dixon: '水脂肪分離 — 定量評価・造影ダイナミックに最適',
}

// ── MT比 (Magnetization Transfer Ratio) 可視化 ────────────────────────────────
// MTRを組織別に表示。MRA/造影後のMTCの効果を定量的に示す
export function MTRatioDisplay() {
  // Clinical MTR values (literature, % = (S0 - Smt)/S0 × 100)
  const tissues = [
    { label: 'White Matter', mtr: 42, color: '#60a5fa', note: 'MS plaque検出に重要' },
    { label: 'Gray Matter',  mtr: 35, color: '#a78bfa', note: '脱髄の鑑別' },
    { label: 'Muscle',       mtr: 40, color: '#f87171', note: '筋疾患スクリーニング' },
    { label: 'Cartilage',    mtr: 28, color: '#34d399', note: '関節軟骨評価' },
    { label: 'Free Water',   mtr: 3,  color: '#38bdf8', note: 'CSF/浮腫は低MTR' },
    { label: 'Fat',          mtr: 5,  color: '#fbbf24', note: '脂肪は低MTR' },
  ]

  return (
    <div className="mx-3 mt-1 p-2 rounded" style={{ background: '#0a0f0a', border: '1px solid #1a2a1a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#34d399', fontSize: '9px', letterSpacing: '0.05em' }}>
          MTR — Magnetization Transfer Ratio
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>MTR = (S₀−Smt)/S₀ × 100%</span>
      </div>
      <div className="space-y-1">
        {tissues.map(t => (
          <div key={t.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span style={{ color: t.color, fontSize: '8px' }}>{t.label}</span>
              <div className="flex items-center gap-2">
                <span style={{ color: '#374151', fontSize: '7px' }}>{t.note}</span>
                <span className="font-mono font-bold" style={{ color: t.color, fontSize: '9px' }}>{t.mtr}%</span>
              </div>
            </div>
            <div className="h-1.5 rounded overflow-hidden" style={{ background: '#111' }}>
              <div className="h-full rounded" style={{ width: `${t.mtr / 50 * 100}%`, background: t.color, opacity: 0.75 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1" style={{ borderTop: '1px solid #0f1f0f', fontSize: '7px', color: '#374151' }}>
        MTCは白質・筋肉で顕著。脱髄プラーク(MS)は正常WMより低い。SAR+10-15%増加に注意。
      </div>
    </div>
  )
}
