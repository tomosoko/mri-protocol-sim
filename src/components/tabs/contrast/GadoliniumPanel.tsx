import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'
import { calcTissueContrast } from '../../../store/calculators'

// ── ガドリニウム造影剤 T1 短縮計算機 ──────────────────────────────────────────
// Gd濃度 × 縦緩和率 r1 によるT1短縮と信号増強をシミュレーション
// 1/T1_post = 1/T1_pre + r1 × [Gd]
export function GadoliniumEnhancement() {
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
export function LiveTissueSignalBar() {
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
