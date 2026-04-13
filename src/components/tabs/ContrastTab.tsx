import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { TISSUES, calcTissueContrast } from '../../store/calculators'
import { VizSection } from '../VizSection'
// TISSUES imported above and used in IRSignalEvolution + LiveTissueSignalBar

// ── Dixon In/Out-of-Phase TE 計算器 ───────────────────────────────────────────
// 水と脂肪の化学シフト差によるビート周波数を元に in-phase / out-of-phase TE を計算
// 臨床: 肝臓（脂肪肝）・副腎・骨髄の脂肪定量に必須
function DixonTECalculator() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Fat-water chemical shift: 3.5ppm × Larmor freq
  const csHz = is3T ? 447 : 224  // Hz at 3T or 1.5T
  const beatPeriodMs = 1000 / csHz  // ms per full beat cycle

  // In-phase TEs: csHz × n (water and fat fully aligned)
  // Out-of-phase TEs: csHz × (n - 0.5) (water and fat opposed)
  const nMax = 6
  const inPhase = Array.from({ length: nMax }, (_, i) => Math.round(beatPeriodMs * (i + 1) * 100) / 100)
  const outPhase = Array.from({ length: nMax }, (_, i) => Math.round(beatPeriodMs * (i + 0.5) * 100) / 100)

  // Practical range (TE > 1ms, < params.TR/2)
  const maxTE = Math.min(60, params.TR / 2)
  const usableIn  = inPhase.filter(te => te >= 1 && te <= maxTE)
  const usableOut = outPhase.filter(te => te >= 1 && te <= maxTE)

  // Current TE classification
  const currentTE = params.TE
  const nearestIn  = inPhase.find(te => Math.abs(te - currentTE) < beatPeriodMs * 0.15)
  const nearestOut = outPhase.find(te => Math.abs(te - currentTE) < beatPeriodMs * 0.15)
  const teClass = nearestIn ? 'in-phase' : nearestOut ? 'out-of-phase' : 'neither'

  const W = 290, H = 36
  const PAD = { l: 8, r: 8 }
  const innerW = W - PAD.l - PAD.r
  const maxTeDisplay = Math.min(20, maxTE)
  const tx = (te: number) => PAD.l + (te / maxTeDisplay) * innerW

  // Fat/water signal at current TE
  const fatWaterPhase = ((currentTE / beatPeriodMs) % 1) * 360  // degrees
  const fatSignal = Math.cos(fatWaterPhase * Math.PI / 180)  // +1=in-phase, -1=out-of-phase

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080810', border: '1px solid #1a1a30' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#38bdf8', fontSize: '9px', letterSpacing: '0.05em' }}>
          DIXON / FAT-WATER TE
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#4b5563' }}>{is3T ? '3T' : '1.5T'}: Δf={csHz}Hz</span>
          <span className="font-mono" style={{
            color: teClass === 'in-phase' ? '#34d399' : teClass === 'out-of-phase' ? '#f87171' : '#6b7280',
            fontWeight: 700,
          }}>
            TE={currentTE}ms: {teClass === 'in-phase' ? '● IN-PHASE' : teClass === 'out-of-phase' ? '◐ OUT-OF-PHASE' : '○ Mixed'}
          </span>
        </div>
      </div>

      {/* TE timeline */}
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {/* Baseline */}
        <line x1={PAD.l} y1={18} x2={PAD.l + innerW} y2={18} stroke="#1a1a2a" strokeWidth={1} />

        {/* In-phase markers (green diamonds) */}
        {usableIn.map((te, i) => {
          const x = tx(te)
          if (x > PAD.l + innerW) return null
          return (
            <g key={i}>
              <polygon points={`${x},10 ${x+4},18 ${x},26 ${x-4},18`} fill="#34d39940" stroke="#34d399" strokeWidth={0.8} />
              <text x={x} y={8} textAnchor="middle" fill="#34d39980" style={{ fontSize: '6px' }}>{te}</text>
            </g>
          )
        })}

        {/* Out-of-phase markers (red circles) */}
        {usableOut.map((te, i) => {
          const x = tx(te)
          if (x > PAD.l + innerW) return null
          return (
            <g key={i}>
              <circle cx={x} cy={18} r={4} fill="#f8717130" stroke="#f87171" strokeWidth={0.8} />
              <text x={x} y={H - 1} textAnchor="middle" fill="#f8717180" style={{ fontSize: '6px' }}>{te}</text>
            </g>
          )
        })}

        {/* Current TE cursor */}
        {currentTE <= maxTeDisplay && (
          <line x1={tx(currentTE)} y1={4} x2={tx(currentTE)} y2={H - 4}
            stroke="#e88b00" strokeWidth={1.5} opacity={0.9} />
        )}

        {/* Axis labels */}
        <text x={PAD.l} y={H} fill="#252525" style={{ fontSize: '6px' }}>0</text>
        <text x={PAD.l + innerW} y={H} textAnchor="end" fill="#252525" style={{ fontSize: '6px' }}>{maxTeDisplay}ms</text>
      </svg>

      {/* Quick-set buttons */}
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span style={{ fontSize: '7px', color: '#374151' }}>Set TE:</span>
        {usableIn.slice(0, 3).map(te => (
          <button key={te} onClick={() => setParam('TE', te)}
            style={{ background: '#0a1f10', color: '#34d399', border: '1px solid #14532d', borderRadius: 2, fontSize: '7px', padding: '1px 4px', cursor: 'pointer' }}>
            {te}ms IP
          </button>
        ))}
        {usableOut.slice(0, 3).map(te => (
          <button key={te} onClick={() => setParam('TE', te)}
            style={{ background: '#1a0a0a', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: 2, fontSize: '7px', padding: '1px 4px', cursor: 'pointer' }}>
            {te}ms OP
          </button>
        ))}
      </div>

      {/* Fat signal indicator */}
      <div className="flex items-center gap-2 mt-1" style={{ fontSize: '7px', color: '#4b5563' }}>
        <span>Fat signal:</span>
        <div className="h-1.5 rounded overflow-hidden" style={{ width: 80, background: '#111' }}>
          <div style={{
            width: `${Math.abs(fatSignal) * 100}%`,
            height: '100%',
            background: fatSignal > 0 ? '#f87171' : '#38bdf8',
            float: fatSignal >= 0 ? 'left' : 'right',
          }} />
        </div>
        <span style={{ color: fatSignal > 0.5 ? '#f87171' : fatSignal < -0.5 ? '#38bdf8' : '#fbbf24' }}>
          {fatSignal.toFixed(2)} ({fatSignal > 0.3 ? '脂肪↑' : fatSignal < -0.3 ? '脂肪↓（水のみ）' : '中間'})
        </span>
      </div>
    </div>
  )
}

// ── ガドリニウム造影剤 T1 短縮計算機 ──────────────────────────────────────────
// Gd濃度 × 縦緩和率 r1 によるT1短縮と信号増強をシミュレーション
// 1/T1_post = 1/T1_pre + r1 × [Gd]
function GadoliniumEnhancement() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const [dose, setDose] = useState(0.1)          // mmol/kg
  const [agent, setAgent] = useState<'GdDTPA' | 'GdEOB' | 'GdBOPTA'>('GdDTPA')
  const [phase, setPhase] = useState<'art' | 'pvp' | 'eq' | 'hbs'>('pvp')

  const AGENTS = {
    GdDTPA:  { label: 'Gd-DTPA (Magnevist)',   r1_15: 4.0, r1_3: 3.7, eob: false },
    GdEOB:   { label: 'Gd-EOB (Primovist)',     r1_15: 6.4, r1_3: 5.5, eob: true  },
    GdBOPTA: { label: 'Gd-BOPTA (MultiHance)', r1_15: 5.2, r1_3: 4.7, eob: false },
  }
  const agentSpec = AGENTS[agent]
  const r1 = is3T ? agentSpec.r1_3 : agentSpec.r1_15

  // Estimated tissue Gd concentration (mmol/L) per phase
  // Blood peak at arte/pvp, equilibrium 20% of peak, hepatobiliary for EOB
  const patientWt = 70  // kg (from patient header)
  const totalDose = dose * patientWt  // mmol total
  const bloodVol = 5.0  // L
  const bloodConc = (totalDose / bloodVol) * (phase === 'art' ? 0.8 : phase === 'pvp' ? 0.6 : phase === 'eq' ? 0.2 : 0.05)

  const TISSUES_GD = [
    { label: 'Blood',  T1_pre_15: 1200, T1_pre_3: 1600, r1_factor: 1.0 },
    { label: 'WM',     T1_pre_15: 1080, T1_pre_3: 1084, r1_factor: 0.05 },
    { label: 'GM',     T1_pre_15: 1470, T1_pre_3: 1820, r1_factor: 0.08 },
    { label: 'Liver',  T1_pre_15: 576,  T1_pre_3: 812,  r1_factor: phase === 'hbs' && agentSpec.eob ? 0.8 : 0.15 },
    { label: 'Muscle', T1_pre_15: 1008, T1_pre_3: 1420, r1_factor: 0.05 },
    { label: 'Tumor',  T1_pre_15: 1500, T1_pre_3: 1800, r1_factor: 0.35 },
  ]

  // GRE T1w signal: S ∝ sin(FA) × (1 - exp(-TR/T1)) / (1 - cos(FA) × exp(-TR/T1))
  const gre_sig = (T1: number) => {
    const FA = params.flipAngle * Math.PI / 180
    const E1 = Math.exp(-params.TR / T1)
    return Math.sin(FA) * (1 - E1) / (1 - Math.cos(FA) * E1)
  }

  const tissues = TISSUES_GD.map(t => {
    const T1_pre = (is3T ? t.T1_pre_3 : t.T1_pre_15)
    const gdConc = bloodConc * t.r1_factor
    const T1_post = 1 / (1 / T1_pre + r1 * gdConc)
    const sig_pre = gre_sig(T1_pre)
    const sig_post = gre_sig(Math.max(T1_post, 1))
    const enh_pct = sig_pre > 0 ? Math.round((sig_post / sig_pre - 1) * 100) : 0
    return { label: t.label, T1_pre: Math.round(T1_pre), T1_post: Math.round(T1_post), enh_pct, sig_pre, sig_post }
  })

  const maxSig = Math.max(...tissues.map(t => t.sig_post), 0.01)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a060e', border: '1px solid #1a1030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#c084fc', fontSize: '9px', letterSpacing: '0.05em' }}>
          GADOLINIUM ENHANCEMENT
        </span>
        <span style={{ color: '#374151', fontSize: '7px', fontFamily: 'monospace' }}>
          r1={r1} L/mmol/s · {is3T ? '3T' : '1.5T'}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span style={{ color: '#374151', fontSize: '7px' }}>Agent</span>
          <select
            value={agent}
            onChange={e => setAgent(e.target.value as typeof agent)}
            style={{ background: '#0f0818', color: '#c084fc', border: '1px solid #2a1040', borderRadius: 2, fontSize: '7.5px', padding: '1px 3px' }}
          >
            {Object.entries(AGENTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label.split(' ')[0]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <span style={{ color: '#374151', fontSize: '7px' }}>Dose (mmol/kg)</span>
          <div className="flex items-center gap-1">
            <input type="range" min={0.05} max={0.3} step={0.025} value={dose}
              onChange={e => setDose(parseFloat(e.target.value))}
              style={{ width: 60 }} />
            <span className="font-mono" style={{ color: '#c084fc', fontSize: '8px' }}>{dose.toFixed(3)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span style={{ color: '#374151', fontSize: '7px' }}>Phase</span>
          <div className="flex gap-0.5">
            {(['art', 'pvp', 'eq', 'hbs'] as const).map(p => (
              <button key={p}
                onClick={() => setPhase(p)}
                style={{
                  background: phase === p ? '#2a1040' : '#0f0818',
                  color: phase === p ? '#c084fc' : '#374151',
                  border: `1px solid ${phase === p ? '#7c3aed' : '#1a1030'}`,
                  borderRadius: 2, fontSize: '7px', padding: '1px 4px', cursor: 'pointer',
                }}
              >
                {p === 'art' ? 'Art' : p === 'pvp' ? 'PVP' : p === 'eq' ? 'Eq' : 'HBS'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tissue T1 + enhancement table */}
      <div className="space-y-0.5">
        {tissues.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <span style={{ color: '#4b5563', fontSize: '6.5px', width: 34, flexShrink: 0 }}>{t.label}</span>
            <span className="font-mono" style={{ color: '#374151', fontSize: '6.5px', width: 34, flexShrink: 0 }}>
              {t.T1_pre}→{t.T1_post}
            </span>
            <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background: '#0f0818' }}>
              <div className="h-full rounded"
                style={{ width: `${(t.sig_post / maxSig) * 100}%`, background: '#c084fc', opacity: 0.6 }} />
            </div>
            <span className="font-mono" style={{
              color: t.enh_pct > 50 ? '#c084fc' : t.enh_pct > 20 ? '#a78bfa' : '#374151',
              fontSize: '7px', width: 28, textAlign: 'right', flexShrink: 0,
            }}>
              {t.enh_pct > 0 ? `+${t.enh_pct}%` : `${t.enh_pct}%`}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-1 pt-1" style={{ borderTop: '1px solid #1a1030', fontSize: '6.5px', color: '#374151' }}>
        {phase === 'hbs' && agentSpec.eob
          ? '肝細胞相 (15-20min後): 肝細胞選択的取込みで肝転移が低信号に。FA=25°/TR=4ms のVIBEが最適。'
          : phase === 'art'
          ? '動脈相 (20-25sec): 過血管性病変・AVM・肝細胞癌が増強。造影剤ボーラストラッキングで適切なタイミングを。'
          : phase === 'pvp'
          ? '門脈相 (70-80sec): 肝転移の検出に最適。正常肝実質が最大増強。'
          : '平衡相 (2-3min): 線維性腫瘍・肝硬変・遅延増強病変の評価に。'}
      </div>
    </div>
  )
}

// ── ライブ組織コントラストバー ────────────────────────────────────────────────
// 現在の TR/TE/TI/FA 設定に基づき全組織の信号強度をリアルタイム比較表示
function LiveTissueSignalBar() {
  const { params } = useProtocolStore()
  const signals = useMemo(() => calcTissueContrast(params), [params])  // eslint-disable-line react-hooks/exhaustive-deps

  // Sort by signal strength for display
  const sorted = [...signals].sort((a, b) => b.signal - a.signal)

  return (
    <div className="mx-3 mt-2 p-2.5 rounded" style={{ background: '#080c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold" style={{ color: '#e88b00', fontSize: '9px', letterSpacing: '0.05em' }}>
          TISSUE SIGNAL — Live
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>
          {params.TR}/{params.TE}ms{params.TI > 0 ? ` TI${params.TI}` : ''}
        </span>
      </div>
      <div className="space-y-1.5">
        {sorted.map(({ tissue, signal, nulled }) => {
          const pct = Math.round(signal * 100)
          return (
            <div key={tissue.label}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tissue.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: nulled ? '#4b5563' : tissue.color, fontSize: '8px', textDecoration: nulled ? 'line-through' : 'none' }}>
                    {tissue.label}
                  </span>
                  {nulled && <span style={{ color: '#f87171', fontSize: '7px' }}>null</span>}
                </div>
                <span className="font-mono font-semibold" style={{ color: nulled ? '#374151' : tissue.color, fontSize: '9px' }}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 rounded overflow-hidden" style={{ background: '#111' }}>
                <div className="h-full rounded transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    background: nulled ? '#1a1a1a' : tissue.color,
                    opacity: nulled ? 0.3 : 0.75,
                  }} />
              </div>
            </div>
          )
        })}
      </div>
      {/* Contrast ratios for key pairs */}
      {(() => {
        const gmSig = signals.find(s => s.tissue.label === 'GM')?.signal ?? 0
        const wmSig = signals.find(s => s.tissue.label === 'WM')?.signal ?? 0
        const csfSig = signals.find(s => s.tissue.label === 'CSF')?.signal ?? 0
        const fatSig = signals.find(s => s.tissue.label === 'Fat')?.signal ?? 0
        const minS = Math.min(gmSig, wmSig)
        const maxS = Math.max(gmSig, wmSig)
        const cnr = minS > 0 ? (maxS - minS) / ((maxS + minS) / 2) : 0
        const higher = gmSig > wmSig ? 'GM' : 'WM'
        return (
          <div className="mt-2 pt-1.5 flex gap-3 flex-wrap" style={{ borderTop: '1px solid #111', fontSize: '7px' }}>
            <div>
              <span style={{ color: '#4b5563' }}>GM/WM CNR: </span>
              <span className="font-mono" style={{ color: cnr > 0.15 ? '#34d399' : cnr > 0.05 ? '#fbbf24' : '#f87171' }}>
                {(cnr * 100).toFixed(0)}%
              </span>
              <span style={{ color: '#374151' }}> ({higher}↑)</span>
            </div>
            {csfSig > 0.1 && (
              <div>
                <span style={{ color: '#4b5563' }}>CSF: </span>
                <span className="font-mono" style={{ color: '#38bdf8' }}>{Math.round(csfSig * 100)}%</span>
              </div>
            )}
            {fatSig < 0.05 && params.fatSat !== 'None' && (
              <div style={{ color: '#34d399' }}>脂肪抑制 ✓</div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

type SubTab = 'Common' | 'Dynamic'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

// ── 脂肪抑制 B0 不均一性感受性チャート ──────────────────────────────────────
// 各脂肪抑制法の磁場不均一性(ppm)に対する効果を可視化
function FatSatB0Chart() {
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

const fatSatDesc: Record<string, string> = {
  None: 'なし — 脂肪信号あり',
  CHESS: '化学シフト選択励起 — 均一磁場に最適（頭部・脊椎）',
  SPAIR: 'Spectral Adiabatic IR — 不均一磁場でも均一抑制（腹部・乳腺）',
  STIR: 'Short TI IR — 磁場不均一に最強。造影後は不可',
  Dixon: '水脂肪分離 — 定量評価・造影ダイナミックに最適',
}

// ── MT比 (Magnetization Transfer Ratio) 可視化 ────────────────────────────────
// MTRを組織別に表示。MRA/造影後のMTCの効果を定量的に示す
function MTRatioDisplay() {
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

export function ContrastTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Common')

  // local state
  const [dynamicMode, setDynamicMode] = useState('Standard')
  const [dynMeasurements, setDynMeasurements] = useState(1)
  const [multipleSeries, setMultipleSeries] = useState('Each Measurement')
  const [contrastAgent, setContrastAgent] = useState('None')
  const [darkBlood, setDarkBlood] = useState(false)
  const [flipAngleMode, setFlipAngleMode] = useState('Constant')
  const [fatWaterContrast, setFatWaterContrast] = useState('Standard')
  const [magnPrep, setMagnPrep] = useState('None')
  const [contrasts, setContrasts] = useState(1)
  const [reconstruction, setReconstruction] = useState('Magnitude')

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Common', 'Dynamic'] as SubTab[]).map(t => (
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
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Dynamic Settings</div>
          <ParamField label="Dynamic Mode" value={dynamicMode} type="select"
            options={['Standard', 'ACS', 'CARE Dynamic']}
            onChange={v => setDynamicMode(v as string)} />
          <ParamField label="Measurements" value={dynMeasurements} type="number"
            min={1} max={20} step={1}
            onChange={v => setDynMeasurements(v as number)} />
          <ParamField label="Multiple Series" value={multipleSeries} type="select"
            options={['Each Measurement', 'Combined']}
            onChange={v => setMultipleSeries(v as string)} />
          <ParamField label="Contrast Agent" value={contrastAgent} type="select"
            options={['None', 'Magnescope', 'Primovist']}
            onChange={v => setContrastAgent(v as string)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Fat Suppression</div>
          <ParamField label="Fat Saturation" hintKey="fatSat" value={params.fatSat} type="select"
            options={['None', 'CHESS', 'SPAIR', 'STIR', 'Dixon']}
            onChange={v => setParam('fatSat', v as typeof params.fatSat)} highlight={hl('fatSat')} />
          <div className="mx-3 mt-1 mb-2 p-2 rounded text-xs" style={{ background: '#111111', color: '#9ca3af', border: '1px solid #252525' }}>
            {fatSatDesc[params.fatSat]}
          </div>

          {/* Fat suppression B0 sensitivity chart */}
          <VizSection><FatSatB0Chart /></VizSection>

          {/* Dixon in/out-of-phase TE calculator */}
          <VizSection><DixonTECalculator /></VizSection>

          {/* T1/T2 contrast guide */}
          <VizSection>
          <div className="mx-3 mt-3 p-3 rounded" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: '#e88b00' }}>コントラスト重み付けの目安</div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: '#6b7280' }}>
                  <th className="text-left pb-1">重み付け</th>
                  <th className="pb-1">TR</th>
                  <th className="pb-1">TE</th>
                  <th className="text-left pb-1">高信号</th>
                </tr>
              </thead>
              <tbody style={{ color: '#9ca3af' }}>
                <tr><td className="py-0.5 text-blue-400 font-medium">T1強調</td><td className="text-center">400-600</td><td className="text-center">10-20</td><td>脂肪・出血・Gd造影部</td></tr>
                <tr><td className="py-0.5 text-cyan-400 font-medium">T2強調</td><td className="text-center">≥2000</td><td className="text-center">80-120</td><td>水・浮腫・腫瘍・嚢胞</td></tr>
                <tr><td className="py-0.5 text-purple-400 font-medium">PD強調</td><td className="text-center">≥2000</td><td className="text-center">20-30</td><td>軟骨・半月板・白質</td></tr>
                <tr><td className="py-0.5 text-green-400 font-medium">FLAIR</td><td className="text-center">≥8000</td><td className="text-center">120</td><td>T2+水抑制（TI=2200）</td></tr>
              </tbody>
            </table>
          </div>
          </VizSection>

          {/* Current contrast estimate */}
          <div className="mx-3 mt-2 p-2 rounded text-xs" style={{ background: '#1e2435', border: '1px solid #374151' }}>
            <span style={{ color: '#9ca3af' }}>現在の推定コントラスト: </span>
            <span style={{ color: '#fbbf24' }}>
              {params.TR < 800 && params.TE < 30 ? 'T1強調' :
               params.TR > 2000 && params.TE > 60 ? (params.TI > 1000 ? 'FLAIR（水抑制T2）' : params.TI > 100 ? 'STIR（脂肪抑制T2）' : 'T2強調') :
               params.TR > 2000 && params.TE < 40 ? 'PD強調' :
               'Mixed / 特殊'}
            </span>
          </div>

          {/* Gadolinium T1-shortening / enhancement */}
          <VizSection><GadoliniumEnhancement /></VizSection>

          {/* TI 自動計算器 */}
          <VizSection><TICalculator /></VizSection>

          {/* IR signal evolution — only shown when TI > 0 */}
          <VizSection><IRSignalEvolution /></VizSection>

          {/* T2* decay chart — always visible as TE reference */}
          <VizSection>
          <div className="mx-3 mt-2">
            <T2StarDecayChart fieldStrength={params.fieldStrength} TE={params.TE} />
            <div className="mt-1 p-1.5 rounded text-xs" style={{ background: '#111', border: '1px solid #252525', color: '#374151' }}>
              T2* ≈ 組織の磁化率差による信号損失速度。3Tでは1.5Tの約1/2に短縮。GRE/EPI/SWIのTE設計に重要。
            </div>
          </div>
          </VizSection>

          {/* ¹H MRS metabolite spectrum */}
          <VizSection><MRSSpectrum /></VizSection>

          {/* Live tissue signal bars */}
          <VizSection><LiveTissueSignalBar /></VizSection>
        </div>
      )}

      {subTab === 'Dynamic' && (

        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Timing</div>
          <div className="mx-3 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="flex justify-between">
              <span style={{ color: '#9ca3af' }}>TR:</span>
              <span className="font-mono text-white">{params.TR} ms</span>
            </div>
            <div className="flex justify-between mt-1">
              <span style={{ color: '#9ca3af' }}>TE:</span>
              <span className="font-mono text-white">{params.TE} ms</span>
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Contrast Options</div>
          <ParamField label="MTC" value={params.mt} type="toggle"
            onChange={v => setParam('mt', v as boolean)} />
          {params.mt && <VizSection><MTRatioDisplay /></VizSection>}
          <ParamField label="Dark Blood" value={darkBlood} type="toggle"
            onChange={v => setDarkBlood(v as boolean)} />
          <ParamField label="Flip Angle Mode" value={flipAngleMode} type="select"
            options={['Constant', 'Sweep']}
            onChange={v => setFlipAngleMode(v as string)} />
          <ParamField label="Flip Angle" hintKey="flipAngle" value={params.flipAngle} type="range"
            min={5} max={180} step={5} unit="°"
            onChange={v => setParam('flipAngle', v as number)} highlight={hl('flipAngle')} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Fat-Water / Reconstruction</div>
          <ParamField label="Fat-Water Contrast" value={fatWaterContrast} type="select"
            options={['Standard', 'Water Only', 'Fat Only', 'Opp-Phase', 'In-Phase']}
            onChange={v => setFatWaterContrast(v as string)} />
          {(fatWaterContrast === 'Opp-Phase' || fatWaterContrast === 'In-Phase') && (
            <div className="mx-3 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #3a1a00', color: '#e88b00' }}>
              {fatWaterContrast === 'Opp-Phase'
                ? 'Opposed-Phase: 水・脂肪が逆位相。脂肪含有病変（副腎腺腫・脂肪肝）の検出に有効。TE≈2.3ms(3T)/4.6ms(1.5T)'
                : 'In-Phase: 水・脂肪が同位相。解剖学的コントラスト基準。TE≈4.6ms(3T)/9.2ms(1.5T)'}
            </div>
          )}
          <ParamField label="Magn.Preparation" value={magnPrep} type="select"
            options={['None', 'IR', 'DIR']}
            onChange={v => setMagnPrep(v as string)} />
          <ParamField label="Contrasts" value={contrasts} type="number"
            min={1} max={10} step={1}
            onChange={v => setContrasts(v as number)} />
          <ParamField label="Reconstruction" value={reconstruction} type="select"
            options={['Magnitude', 'Phase', 'Real', 'Imaginary']}
            onChange={v => setReconstruction(v as string)} />
        </div>
      )}
    </div>
  )
}

// ── IR Mz 回復カーブ ──────────────────────────────────────────────────────────
function IRCurveChart({ fieldStrength, TI }: { fieldStrength: number; TI: number }) {
  const W = 310, H = 110
  const PAD = { l: 28, r: 10, t: 10, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxT = 5000  // ms

  const tx = (t: number) => PAD.l + (t / maxT) * innerW
  // Y: Mz range -1 to +1 — map 1 → top, -1 → bottom
  const ty = (mz: number) => PAD.t + ((1 - mz) / 2) * innerH

  // Tissues to show in IR chart
  const SHOW = ['CSF', 'Fat', 'WM', 'GM', 'Liver']
  const tissues = TISSUES.filter(t => SHOW.includes(t.label))

  const curves = useMemo(() => {
    const N = 120
    return tissues.map(tissue => {
      const T1 = fieldStrength >= 2.5 ? tissue.T1_30 : tissue.T1_15
      const nullTI = Math.round(T1 * Math.log(2))
      const pts = Array.from({ length: N + 1 }, (_, i) => {
        const t = (i / N) * maxT
        const mz = 1 - 2 * Math.exp(-t / T1)
        return { t, mz }
      })
      return { tissue, T1, nullTI, pts }
    })
  }, [fieldStrength])

  const zeroY = ty(0)
  const tiX = tx(Math.min(TI, maxT))

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="px-2 pt-1.5 text-xs font-semibold" style={{ color: '#4b5563' }}>Mz 回復曲線 (反転回復)</div>
      <svg width={W} height={H}>
        {/* Y=0 line */}
        <line x1={PAD.l} y1={zeroY} x2={PAD.l + innerW} y2={zeroY} stroke="#252525" strokeWidth={1} />
        {/* Y-axis labels */}
        <text x={PAD.l - 3} y={ty(1) + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+1</text>
        <text x={PAD.l - 3} y={zeroY + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
        <text x={PAD.l - 3} y={ty(-1) + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>-1</text>

        {/* Tissue curves */}
        {curves.map(({ tissue, pts, nullTI }) => {
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${tx(p.t).toFixed(1)},${ty(p.mz).toFixed(1)}`).join(' ')
          return (
            <g key={tissue.label}>
              <path d={d} fill="none" stroke={tissue.color} strokeWidth={1} opacity={0.7} />
              {/* Null point dot */}
              {nullTI < maxT && (
                <circle cx={tx(nullTI)} cy={zeroY} r={2} fill={tissue.color} />
              )}
            </g>
          )
        })}

        {/* Current TI marker */}
        {TI > 0 && TI <= maxT && (
          <>
            <line x1={tiX} y1={PAD.t} x2={tiX} y2={H - PAD.b} stroke="#e88b00" strokeWidth={1} strokeDasharray="3,2" />
            <text x={tiX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TI={TI}</text>
          </>
        )}

        {/* X-axis labels */}
        {[0, 1000, 2000, 3000, 4000, 5000].map(t => (
          <text key={t} x={tx(t)} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{t}</text>
        ))}
        <text x={PAD.l + innerW / 2} y={H - 0} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>Time (ms)</text>
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-2 px-2 pb-1.5" style={{ fontSize: '7px' }}>
        {curves.map(({ tissue, nullTI }) => (
          <span key={tissue.label} style={{ color: tissue.color }}>
            {tissue.label} null={nullTI}ms
          </span>
        ))}
      </div>
    </div>
  )
}

// ── IR 磁化回復カーブ (Inversion Recovery Mz evolution) ──────────────────────
// TI に対する各組織の縦磁化 Mz(TI) = M0 × |1 - 2·exp(-TI/T1)| を可視化
// 現在のTIでの各組織の信号強度をリアルタイム表示
function IRSignalEvolution() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Only show when TI > 0 (IR sequence)
  if (params.TI <= 0) return null

  const W = 290, H = 100
  const PAD = { l: 28, r: 10, t: 8, b: 20 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const maxTI = Math.min(Math.max(params.TR, 8000), 12000)
  const nPts = 100

  const tx = (t: number) => PAD.l + (t / maxTI) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, (s + 1) / 2))) * innerH  // s in [-1, 1]

  const irSignal = (TI: number, T1: number, showMagnitude: boolean) => {
    const s = 1 - 2 * Math.exp(-TI / T1)
    return showMagnitude ? Math.abs(s) : s
  }

  // Use magnitude (STIR/FLAIR) or phase-sensitive
  const isMagnitude = true

  const tissues = TISSUES.filter(t => ['GM', 'WM', 'CSF', 'Fat'].includes(t.label))

  const paths = useMemo(() => tissues.map(t => {
    const T1 = is3T ? t.T1_30 : t.T1_15
    const d = Array.from({ length: nPts + 1 }, (_, i) => {
      const ti = (i / nPts) * maxTI
      const s = irSignal(ti, T1, isMagnitude)
      return `${i === 0 ? 'M' : 'L'}${tx(ti).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    const nullTI = Math.round(T1 * Math.log(2))
    const sigAtCurrentTI = irSignal(params.TI, T1, isMagnitude)
    return { ...t, T1, d, nullTI, sigAtCurrentTI }
  }), [is3T, maxTI, params.TI, isMagnitude])

  const currentTIx = tx(params.TI)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a1a2a' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px' }}>IR 磁化回復 Mz(TI) — {params.fieldStrength}T</span>
        <span style={{ color: '#374151', fontSize: '8px' }}>TI={params.TI}ms</span>
      </div>
      <svg width={W} height={H} style={{ cursor: 'ew-resize' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left - PAD.l
          const newTI = Math.max(0, Math.min(maxTI, Math.round(x / innerW * maxTI / 10) * 10))
          if (e.buttons === 1) setParam('TI', newTI)
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left - PAD.l
          const newTI = Math.max(0, Math.min(maxTI, Math.round(x / innerW * maxTI / 10) * 10))
          setParam('TI', newTI)
        }}>

        {/* Zero line */}
        <line x1={PAD.l} y1={ty(0)} x2={PAD.l + innerW} y2={ty(0)}
          stroke="#252525" strokeWidth={1} />

        {/* Grid */}
        {[500, 1000, 2000, 4000, 6000].filter(v => v < maxTI).map(v => (
          <line key={v} x1={tx(v)} y1={PAD.t} x2={tx(v)} y2={PAD.t + innerH}
            stroke="#1a1a1a" strokeWidth={1} />
        ))}

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
        <text x={PAD.l - 2} y={ty(0) + 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>

        {/* Tissue curves */}
        {paths.map(p => (
          <g key={p.label}>
            <path d={p.d} fill="none" stroke={p.color} strokeWidth={1.2} opacity={0.75} />
            {/* Null point marker */}
            <circle cx={tx(p.nullTI)} cy={ty(0)} r={2}
              fill={p.color} opacity={0.6} />
          </g>
        ))}

        {/* Current TI indicator */}
        <line x1={currentTIx} y1={PAD.t} x2={currentTIx} y2={PAD.t + innerH}
          stroke="#e88b00" strokeWidth={1} strokeDasharray="2,2" opacity={0.8} />
        <text x={currentTIx + 2} y={PAD.t + 9} fill="#e88b00" style={{ fontSize: '7px' }}>
          TI={params.TI}
        </text>

        {/* Signal dots at current TI */}
        {paths.map(p => (
          <circle key={p.label}
            cx={currentTIx}
            cy={ty(p.sigAtCurrentTI)}
            r={3}
            fill={p.color}
            stroke="#000"
            strokeWidth={0.5}
          />
        ))}

        {/* X axis */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l + innerW / 2} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TI (ms)</text>
        {[0, 1000, 2000, 4000].filter(v => v <= maxTI).map(v => (
          <text key={v} x={tx(v)} y={H - 4} textAnchor="middle" fill="#252525" style={{ fontSize: '6px' }}>{v}</text>
        ))}
      </svg>

      {/* Legend + current signals */}
      <div className="flex gap-2 flex-wrap mt-1" style={{ fontSize: '7px' }}>
        {paths.map(p => (
          <div key={p.label} className="flex items-center gap-1">
            <span style={{ color: p.color }}>●</span>
            <span style={{ color: p.color }}>{p.label}</span>
            <span style={{ color: '#374151' }}>null:{p.nullTI}ms</span>
          </div>
        ))}
      </div>
      <div style={{ color: '#374151', fontSize: '7px', marginTop: 2 }}>
        ドラッグ/クリックで TI を変更 · ● = 現在TIの信号
      </div>
    </div>
  )
}

// ── T2* 減衰カーブ ─────────────────────────────────────────────────────────────
function T2StarDecayChart({ fieldStrength, TE }: { fieldStrength: number; TE: number }) {
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
function MRSSpectrum() {
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

// TI 自動計算器コンポーネント
function TICalculator() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // 組織別 null point TI 計算: TI_null = T1 × ln2
  const tissueNullTI = TISSUES.map(t => {
    const T1 = is3T ? t.T1_30 : t.T1_15
    return {
      label: t.label,
      color: t.color,
      TI: Math.round(T1 * Math.log(2)),
    }
  })

  const presets = [
    { label: 'FLAIR 1.5T', TI: 2200, hint: '水(CSF)をnull。白質病変・MS' },
    { label: 'FLAIR 3T', TI: 2500, hint: '3T用FLAIR。TI延長が必要' },
    { label: 'STIR 1.5T', TI: 150, hint: '脂肪をnull。関節・金属周囲' },
    { label: 'STIR 3T', TI: 180, hint: '3T用STIR。SPAIR推奨' },
    { label: 'DIR 1.5T', TI: 3400, hint: 'Double IR: WM+CSF同時抑制。GM病変' },
    { label: 'PSIR 1.5T', TI: 400, hint: 'Phase Sensitive IR: 心筋T1マッピング' },
  ]

  return (
    <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111', border: '1px solid #1a1a2a' }}>
      <div className="font-semibold mb-2" style={{ color: '#a78bfa' }}>TI 自動計算機 (IR/FLAIR/STIR)</div>

      {/* 組織別 null point */}
      <div className="mb-2">
        <div className="text-xs mb-1" style={{ color: '#4b5563' }}>組織 Null Point TI ({params.fieldStrength}T)</div>
        <div className="flex flex-wrap gap-1">
          {tissueNullTI.map(({ label, color, TI }) => (
            <button
              key={label}
              onClick={() => setParam('TI', TI)}
              className="px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: Math.abs(params.TI - TI) < 20 ? color + '28' : '#151515',
                color: Math.abs(params.TI - TI) < 20 ? color : '#6b7280',
                border: `1px solid ${Math.abs(params.TI - TI) < 20 ? color + '60' : '#252525'}`,
                fontSize: '9px',
              }}
              title={`TI=${TI}ms で ${label} の信号がnullになります`}
            >
              {label} ≈{TI}ms
            </button>
          ))}
        </div>
      </div>

      {/* 臨床プリセット */}
      <div>
        <div className="text-xs mb-1" style={{ color: '#4b5563' }}>臨床 TI プリセット</div>
        <div className="space-y-1">
          {presets.map(({ label, TI, hint }) => (
            <button
              key={label}
              onClick={() => setParam('TI', TI)}
              className="flex items-center justify-between w-full px-2 py-1 rounded transition-colors"
              style={{
                background: params.TI === TI ? '#2a1200' : '#151515',
                color: params.TI === TI ? '#e88b00' : '#9ca3af',
                border: `1px solid ${params.TI === TI ? '#c47400' : '#252525'}`,
              }}
            >
              <span className="font-semibold" style={{ fontSize: '10px' }}>{label}</span>
              <span className="font-mono" style={{ fontSize: '9px' }}>TI={TI}ms</span>
              <span style={{ fontSize: '8px', color: params.TI === TI ? '#c47400' : '#4b5563' }}>{hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* IR Signal Evolution curve */}
      <IRCurveChart fieldStrength={params.fieldStrength} TI={params.TI} />

      {params.TI > 0 && (
        <div className="mt-2 pt-1.5 flex justify-between items-center" style={{ borderTop: '1px solid #252525' }}>
          <span style={{ color: '#6b7280' }}>現在のTI: </span>
          <span className="font-mono font-semibold" style={{ color: '#a78bfa' }}>{params.TI}ms</span>
          <button
            onClick={() => setParam('TI', 0)}
            className="px-1.5 py-0.5 rounded"
            style={{ background: '#1a0505', color: '#f87171', border: '1px solid #7f1d1d', fontSize: '9px' }}
          >
            TI=0 にリセット
          </button>
        </div>
      )}
    </div>
  )
}
