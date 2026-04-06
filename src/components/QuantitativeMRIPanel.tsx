import { useState, useMemo } from 'react'
import { useProtocolStore } from '../store/protocolStore'

// ── T1 mapping: VFA (Variable Flip Angle) シミュレーション ──────────────────
function T1MappingVFA({ fieldStrength }: { fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5

  // Interactive sliders
  const [fa1, setFa1] = useState(5)    // deg
  const [fa2, setFa2] = useState(20)   // deg
  const [tr, setTr] = useState(800)    // ms

  const tissues = [
    { label: 'WM',  T1: is3T ? 1080 : 780,  color: '#60a5fa' },
    { label: 'GM',  T1: is3T ? 1600 : 1300, color: '#a78bfa' },
    { label: 'Fat', T1: is3T ? 380  : 260,  color: '#fbbf24' },
  ]

  // VFA: S(FA) = M0 * sin(FA) * (1-E1) / (1-cos(FA)*E1)  where E1 = exp(-TR/T1)
  // Linearized: S/sin(FA) = S/tan(FA) * E1 + M0*(1-E1)  → slope = E1
  const angles = useMemo(() => {
    // Use the two user-selected FAs plus 4 interpolated points
    const step = (fa2 - fa1) / 3
    const pts = [fa1, fa1 + step, fa1 + step * 2, fa2]
    return [...new Set(pts.map(v => Math.max(1, Math.round(v))))]
  }, [fa1, fa2])

  const W = 280, H = 110
  const PAD = { l: 30, r: 8, t: 8, b: 20 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const tissueData = useMemo(() => tissues.map(t => {
    const E1 = Math.exp(-tr / t.T1)
    const M0 = 1.0
    const pts = angles.map(a => {
      const rad = a * Math.PI / 180
      const S = M0 * Math.sin(rad) * (1 - E1) / (1 - Math.cos(rad) * E1)
      const x = S / Math.tan(rad)   // S/tan(FA)
      const y = S / Math.sin(rad)   // S/sin(FA)
      return { fa: a, S, x, y }
    })
    // Linear regression to get E1_fit
    const n = pts.length
    const sumX = pts.reduce((s, p) => s + p.x, 0)
    const sumY = pts.reduce((s, p) => s + p.y, 0)
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
    const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const T1_est = -tr / Math.log(Math.max(0.001, slope))
    return { ...t, pts, slope, T1_est }
  }), [fieldStrength, tr, fa1, fa2])

  const allX = tissueData.flatMap(t => t.pts.map(p => p.x))
  const allY = tissueData.flatMap(t => t.pts.map(p => p.y))
  const maxX = Math.max(...allX) * 1.1
  const maxY = Math.max(...allY) * 1.1

  const tx = (v: number) => PAD.l + (v / maxX) * innerW
  const ty = (v: number) => PAD.t + (1 - v / maxY) * innerH

  const sliderCls = 'w-full h-1 rounded appearance-none cursor-pointer'
  const sliderStyle = { accentColor: '#60a5fa' }

  return (
    <div className="p-2 rounded" style={{ background: '#080808', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px' }}>
          VFA T1 Mapping (Deoni法) — TR={tr}ms / {fieldStrength}T
        </span>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-3 gap-x-3 mb-2" style={{ fontSize: '7px', color: '#6b7280' }}>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>FA1</span><span style={{ color: '#60a5fa' }}>{fa1}°</span>
          </div>
          <input
            type="range" min={5} max={20} step={1} value={fa1}
            onChange={e => setFa1(Number(e.target.value))}
            className={sliderCls} style={sliderStyle}
          />
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>FA2</span><span style={{ color: '#60a5fa' }}>{fa2}°</span>
          </div>
          <input
            type="range" min={20} max={70} step={1} value={fa2}
            onChange={e => setFa2(Number(e.target.value))}
            className={sliderCls} style={sliderStyle}
          />
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>TR</span><span style={{ color: '#60a5fa' }}>{tr}ms</span>
          </div>
          <input
            type="range" min={50} max={2000} step={50} value={tr}
            onChange={e => setTr(Number(e.target.value))}
            className={sliderCls} style={sliderStyle}
          />
        </div>
      </div>

      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v * maxY)} x2={PAD.l + innerW} y2={ty(v * maxY)}
            stroke="#111" strokeWidth={0.5} />
        ))}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        {/* Axis labels */}
        <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>
          S/tan(FA) →
        </text>
        <text x={8} y={PAD.t + innerH / 2} textAnchor="middle" fill="#374151"
          transform={`rotate(-90, 8, ${PAD.t + innerH / 2})`} style={{ fontSize: '7px' }}>
          S/sin(FA)
        </text>
        {/* Tissue lines */}
        {tissueData.map(t => {
          const pts = t.pts
          const d = pts.map((p, i) =>
            `${i === 0 ? 'M' : 'L'}${tx(p.x).toFixed(1)},${ty(p.y).toFixed(1)}`
          ).join(' ')
          return (
            <g key={t.label}>
              <path d={d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.85} />
              {pts.map((p, i) => (
                <circle key={i} cx={tx(p.x)} cy={ty(p.y)} r={1.5} fill={t.color} opacity={0.7} />
              ))}
            </g>
          )
        })}
      </svg>
      {/* T1 estimates */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 mt-1" style={{ fontSize: '7px' }}>
        {tissueData.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <span style={{ color: t.color }}>■</span>
            <span style={{ color: '#6b7280' }}>{t.label}</span>
            <span className="font-mono" style={{ color: '#9ca3af' }}>{Math.round(t.T1_est)}ms</span>
          </div>
        ))}
      </div>
      <div className="mt-1 pt-1" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        VFA: 複数FA撮像 → S/sinFA vs S/tanFA 線形回帰 → slope=E1=exp(-TR/T1) → T1算出。B1補正が重要(3T)。
      </div>
    </div>
  )
}

// ── T2 mapping: Multi-Echo SE 減衰カーブ ──────────────────────────────────────
function T2MappingMSE({ fieldStrength }: { fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5

  // Interactive sliders
  const [maxTE, setMaxTE] = useState(200)  // ms
  const [etl, setEtl] = useState(8)         // echo train length

  // T2 values for key tissues (ms)
  const tissues = [
    { label: 'WM',    T2: is3T ? 69 : 80,   color: '#60a5fa' },
    { label: 'GM',    T2: is3T ? 83 : 90,   color: '#a78bfa' },
    { label: 'CSF',   T2: is3T ? 1500 : 1800, color: '#38bdf8' },
    { label: 'Liver', T2: is3T ? 34 : 35,   color: '#fb923c' },
  ]

  const W = 280, H = 100
  const PAD = { l: 28, r: 8, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const tx = (te: number) => PAD.l + (te / maxTE) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, s))) * innerH

  // Echo times derived from ETL
  const echos = useMemo(() =>
    Array.from({ length: etl }, (_, i) => (maxTE / etl) * (i + 1)),
    [maxTE, etl]
  )

  const tissueData = useMemo(() => tissues.map(t => {
    const pts = echos.map(te => ({ te, s: Math.exp(-te / t.T2) }))
    // Smooth curve
    const nPts = 80
    const d = Array.from({ length: nPts + 1 }, (_, i) => {
      const te = (i / nPts) * maxTE
      const s = Math.exp(-te / t.T2)
      return `${i === 0 ? 'M' : 'L'}${tx(te).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    return { ...t, pts, d }
  }), [fieldStrength, maxTE, etl])

  const sliderCls = 'w-full h-1 rounded appearance-none cursor-pointer'
  const sliderStyle = { accentColor: '#a78bfa' }

  return (
    <div className="p-2 rounded mt-2" style={{ background: '#080808', border: '1px solid #1a1a30' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px' }}>
          T2 Mapping (Multi-Echo SE) — {fieldStrength}T
        </span>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-x-3 mb-2" style={{ fontSize: '7px', color: '#6b7280' }}>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>Max TE</span><span style={{ color: '#a78bfa' }}>{maxTE}ms</span>
          </div>
          <input
            type="range" min={50} max={500} step={10} value={maxTE}
            onChange={e => setMaxTE(Number(e.target.value))}
            className={sliderCls} style={sliderStyle}
          />
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>ETL (エコー数)</span><span style={{ color: '#a78bfa' }}>{etl}</span>
          </div>
          <input
            type="range" min={4} max={16} step={1} value={etl}
            onChange={e => setEtl(Number(e.target.value))}
            className={sliderCls} style={sliderStyle}
          />
        </div>
      </div>

      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#111" strokeWidth={v === 0.5 ? 0.8 : 0.5} />
        ))}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        {/* Y labels */}
        {[0.5, 1.0].map(v => (
          <text key={v} x={PAD.l - 3} y={ty(v) + 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {v === 1.0 ? '1.0' : '0.5'}
          </text>
        ))}
        {/* Tissue curves */}
        {tissueData.map(t => (
          <g key={t.label}>
            <path d={t.d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.8} />
            {t.pts.map((p, i) => (
              <circle key={i} cx={tx(p.te)} cy={ty(p.s)} r={1.5} fill={t.color} opacity={0.7} />
            ))}
          </g>
        ))}
        {/* X labels */}
        {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
          const v = Math.round(f * maxTE)
          return (
            <text key={f} x={tx(v)} y={H - 3} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{v}</text>
          )
        })}
        <text x={PAD.l + innerW / 2} y={H} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>TE (ms)</text>
      </svg>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1" style={{ fontSize: '7px' }}>
        {tissueData.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <span style={{ color: t.color }}>—</span>
            <span style={{ color: '#6b7280' }}>{t.label}</span>
            <span className="font-mono" style={{ color: '#9ca3af' }}>T2={t.T2}ms</span>
          </div>
        ))}
      </div>
      <div className="mt-1 pt-1" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        MSME: 複数TEでS測定 → S=S0・exp(-TE/T2) 指数フィット → T2マップ生成。エコー数≥4で精度向上。
      </div>
    </div>
  )
}

// ── T2* mapping: マルチエコーGRE ─────────────────────────────────────────────
function T2StarMappingGRE({ fieldStrength }: { fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5

  const tissues = [
    { label: 'GM',     t2s: is3T ? 33 : 66, color: '#a78bfa' },
    { label: 'Liver',  t2s: is3T ? 12 : 23, color: '#fb923c' },
    { label: 'Muscle', t2s: is3T ? 18 : 35, color: '#fbbf24' },
    { label: 'Blood',  t2s: is3T ? 90 : 200, color: '#f87171' },
    { label: '出血',   t2s: is3T ? 4 : 8,   color: '#6b7280' },
  ]

  const echos = [2, 5, 10, 15, 20, 25, 30, 40]
  const W = 280, H = 80
  const PAD = { l: 28, r: 8, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxTE = 45

  const tx = (te: number) => PAD.l + (te / maxTE) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, s))) * innerH

  const tissueData = useMemo(() => tissues.map(t => {
    const nPts = 50
    const d = Array.from({ length: nPts + 1 }, (_, i) => {
      const te = (i / nPts) * maxTE
      const s = Math.exp(-te / t.t2s)
      return `${i === 0 ? 'M' : 'L'}${tx(te).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    const pts = echos.map(te => ({ te, s: Math.exp(-te / t.t2s) }))
    return { ...t, d, pts }
  }), [fieldStrength])

  return (
    <div className="p-2 rounded mt-2" style={{ background: '#080808', border: '1px solid #1a2520' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#4ade80', fontSize: '9px' }}>T2* Mapping (マルチエコーGRE) — {fieldStrength}T</span>
        {is3T && <span style={{ color: '#f87171', fontSize: '7px' }}>3T: T2*≈1/2 に短縮</span>}
      </div>
      <svg width={W} height={H}>
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#111" strokeWidth={0.5} />
        ))}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        {tissueData.map(t => (
          <g key={t.label}>
            <path d={t.d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.8} />
            {t.pts.map((p, i) => (
              <circle key={i} cx={tx(p.te)} cy={ty(p.s)} r={1.5} fill={t.color} opacity={0.7} />
            ))}
          </g>
        ))}
        {[0, 10, 20, 30, 40].map(t => (
          <text key={t} x={tx(t)} y={H - 3} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{t}</text>
        ))}
        <text x={PAD.l + innerW / 2} y={H} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>TE (ms)</text>
      </svg>
      <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 mt-1" style={{ fontSize: '7px' }}>
        {tissueData.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <span style={{ color: t.color }}>—</span>
            <span style={{ color: '#6b7280' }}>{t.label}</span>
            <span className="font-mono" style={{ color: '#9ca3af' }}>T2*={t.t2s}ms</span>
          </div>
        ))}
      </div>
      <div className="mt-1 pt-1" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        T2*マップ: 肝鉄沈着（ヘモクロマトーシス）・心筋鉄過剰の定量に使用。鉄↑→T2*↓。
      </div>
    </div>
  )
}

// ── 磁化率強調像 (SWI) フィルタ説明 ──────────────────────────────────────────
function SWIExplainer({ fieldStrength }: { fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5
  const t2starBrainVein = is3T ? 8 : 18
  const t2starGM = is3T ? 33 : 66

  return (
    <div className="p-2 rounded mt-2" style={{ background: '#0e0810', border: '1px solid #2a1a3a' }}>
      <div className="font-semibold mb-1" style={{ color: '#c084fc', fontSize: '9px' }}>SWI (磁化率強調像) パラメータ設計</div>
      <div className="space-y-0.5" style={{ fontSize: '8px' }}>
        <div className="flex justify-between">
          <span style={{ color: '#6b7280' }}>推奨TE ({fieldStrength}T):</span>
          <span className="font-mono" style={{ color: '#c084fc' }}>{is3T ? '20ms' : '40ms'} (T2*_vein≈{t2starBrainVein}ms)</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#6b7280' }}>GM T2*:</span>
          <span className="font-mono" style={{ color: '#a78bfa' }}>{t2starGM}ms</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#6b7280' }}>静脈血 T2*:</span>
          <span className="font-mono" style={{ color: '#6b7280' }}>{t2starBrainVein}ms（脱酸素化Hb↑）</span>
        </div>
        <div className="mt-1 pt-1 space-y-0.5" style={{ borderTop: '1px solid #1a1a1a', color: '#9ca3af' }}>
          <div>• 位相マスク（低域除去HPF）×4 で磁化率コントラスト強調</div>
          <div>• 3T推奨: BW=120Hz/px、echo spacing最小</div>
          <div>• 副鼻腔・気道周囲の磁化率アーチファクト要注意</div>
          <div style={{ color: '#7c3aed' }}>• mIP（最小強度投影）で静脈・出血・石灰化を描出</div>
        </div>
      </div>
    </div>
  )
}

// ── 磁気共鳴スペクトロスコピー（MRS）基礎 ──────────────────────────────────
function MRSExplainer({ fieldStrength }: { fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5
  const peaks = [
    { label: 'NAA', ppm: 2.02, height: 1.0, color: '#60a5fa', desc: '神経細胞マーカー（低下→神経死）' },
    { label: 'Cho', ppm: 3.22, height: 0.6, color: '#f87171', desc: '細胞膜代謝（↑→腫瘍/脱髄）' },
    { label: 'Cr',  ppm: 3.02, height: 0.5, color: '#4ade80', desc: '内部参照（比較的安定）' },
    { label: 'Lac', ppm: 1.33, height: is3T ? 0.35 : 0.25, color: '#fbbf24', desc: '嫌気性代謝（腫瘍・梗塞で↑）' },
    { label: 'Lip', ppm: 0.9,  height: is3T ? 0.2 : 0.3, color: '#f59e0b', desc: '細胞壊死（高悪性腫瘍で↑）' },
  ]

  const W = 280, H = 70
  const PAD = { l: 20, r: 10, t: 8, b: 16 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const ppmMin = 0.5, ppmMax = 4.5

  const tx = (ppm: number) => PAD.l + ((ppmMax - ppm) / (ppmMax - ppmMin)) * innerW
  const ty = (h: number) => PAD.t + (1 - h) * innerH

  return (
    <div className="p-2 rounded mt-2" style={{ background: '#080808', border: '1px solid #1a2530' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#38bdf8', fontSize: '9px' }}>¹H MRS スペクトル ({fieldStrength}T)</span>
        {is3T && <span style={{ color: '#4ade80', fontSize: '7px' }}>3T: Cr/Cho 分離能↑</span>}
      </div>
      <svg width={W} height={H}>
        {/* Baseline */}
        <line x1={PAD.l} y1={ty(0)} x2={PAD.l + innerW} y2={ty(0)} stroke="#252525" strokeWidth={1} />
        {/* Peaks (Lorentzian approximation) */}
        {peaks.map(p => {
          const nPts = 100
          const sigma = is3T ? 0.06 : 0.10  // linewidth (3T better separation)
          const d = Array.from({ length: nPts + 1 }, (_, i) => {
            const ppm = ppmMin + (i / nPts) * (ppmMax - ppmMin)
            const h = p.height / (1 + ((ppm - p.ppm) / sigma) ** 2)
            return `${i === 0 ? 'M' : 'L'}${tx(ppm).toFixed(1)},${ty(h).toFixed(1)}`
          }).join(' ')
          return (
            <g key={p.label}>
              <path d={d} fill="none" stroke={p.color} strokeWidth={1.2} opacity={0.85} />
              <text x={tx(p.ppm)} y={ty(p.height) - 2} textAnchor="middle" fill={p.color}
                style={{ fontSize: '7px', fontWeight: 600 }}>{p.label}</text>
            </g>
          )
        })}
        {/* X axis: ppm labels (right to left) */}
        {[4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0].map(v => (
          <text key={v} x={tx(v)} y={H - 3} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{v}</text>
        ))}
        <text x={PAD.l + innerW / 2} y={H} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>ppm</text>
      </svg>
      <div className="mt-1 space-y-0.5" style={{ fontSize: '7px' }}>
        {peaks.map(p => (
          <div key={p.label} className="flex items-center gap-1">
            <span style={{ color: p.color, fontWeight: 700 }}>{p.label}</span>
            <span style={{ color: '#374151' }}>{p.ppm}ppm</span>
            <span style={{ color: '#6b7280' }}>—</span>
            <span style={{ color: '#9ca3af' }}>{p.desc}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        Cho/Cr↑ + NAA/Cr↓: 悪性腫瘍。3T: 化学シフト分解能↑・NAA/Cho/Cr の分離精度↑。
      </div>
    </div>
  )
}

// ── 定量MRI まとめテーブル (常時表示) ────────────────────────────────────────
function QMRISummaryTable() {
  // Normal tissue T1/T2 values at 1.5T and 3T
  const rows: { tissue: string; t1_15: string; t2_15: string; t1_3: string; t2_3: string }[] = [
    { tissue: 'WM',        t1_15: '780',  t2_15: '80',   t1_3: '1080', t2_3: '69'   },
    { tissue: 'GM',        t1_15: '1300', t2_15: '90',   t1_3: '1600', t2_3: '83'   },
    { tissue: 'CSF',       t1_15: '4300', t2_15: '1800', t1_3: '4500', t2_3: '1500' },
    { tissue: 'Liver',     t1_15: '576',  t2_15: '40',   t1_3: '812',  t2_3: '34'   },
    { tissue: 'Muscle',    t1_15: '1008', t2_15: '38',   t1_3: '1412', t2_3: '30'   },
    { tissue: 'Fat',       t1_15: '260',  t2_15: '80',   t1_3: '380',  t2_3: '70'   },
    { tissue: 'Cartilage', t1_15: '1000', t2_15: '35',   t1_3: '1240', t2_3: '32'   },
  ]

  return (
    <div className="mt-3 p-2 rounded shrink-0" style={{ background: '#080808', border: '1px solid #252525' }}>
      <div className="font-semibold mb-1" style={{ color: '#e88b00', fontSize: '9px' }}>
        定量MRIまとめ — 正常組織 T1/T2 参照値 (ms)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse', fontSize: '7px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937' }}>
              <th className="text-left py-0.5 pr-2 font-semibold" style={{ color: '#6b7280' }}>組織</th>
              <th className="text-right py-0.5 px-1 font-semibold" style={{ color: '#38bdf8' }}>T1 (1.5T)</th>
              <th className="text-right py-0.5 px-1 font-semibold" style={{ color: '#a78bfa' }}>T2 (1.5T)</th>
              <th className="text-right py-0.5 px-1 font-semibold" style={{ color: '#60a5fa' }}>T1 (3T)</th>
              <th className="text-right py-0.5 pl-1 font-semibold" style={{ color: '#c084fc' }}>T2 (3T)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.tissue} style={{ borderTop: i > 0 ? '1px solid #111' : undefined }}>
                <td className="py-0.5 pr-2 font-semibold" style={{ color: '#9ca3af' }}>{r.tissue}</td>
                <td className="text-right py-0.5 px-1 font-mono" style={{ color: '#38bdf8' }}>{r.t1_15}</td>
                <td className="text-right py-0.5 px-1 font-mono" style={{ color: '#a78bfa' }}>{r.t2_15}</td>
                <td className="text-right py-0.5 px-1 font-mono" style={{ color: '#60a5fa' }}>{r.t1_3}</td>
                <td className="text-right py-0.5 pl-1 font-mono" style={{ color: '#c084fc' }}>{r.t2_3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1" style={{ fontSize: '6px', color: '#374151' }}>
        参考値: Stanisz et al. 2005, Bojorquez et al. 2017。個人差・測定法により変動あり。
      </div>
    </div>
  )
}

type QSubTab = 'T1map' | 'T2map' | 'SWI' | 'MRS'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

export function QuantitativeMRIPanel() {
  const { params } = useProtocolStore()
  const [subTab, setSubTab] = useState<QSubTab>('T1map')

  return (
    <div className="h-full flex flex-col" style={{ background: '#0e0e0e' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #252525' }}>
        <div className="text-xs font-semibold" style={{ color: '#e88b00' }}>定量MRI (qMRI) シミュレーター</div>
        <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '2px' }}>
          T1/T2/T2* mapping · SWI · MRS — 現在の磁場強度: {params.fieldStrength}T
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b shrink-0" style={{ borderColor: '#252525' }}>
        {(['T1map', 'T2map', 'SWI', 'MRS'] as QSubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="px-3 py-1.5 text-xs transition-colors"
            style={subTabStyle(subTab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {subTab === 'T1map' && (
          <div>
            <T1MappingVFA fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>T1 Mapping の臨床応用</div>
              <div className="space-y-0.5" style={{ color: '#9ca3af', fontSize: '8px' }}>
                <div>• <span className="text-white">MOLLI/ShMOLLI:</span> 心筋T1マッピング（心筋線維化・アミロイド・浮腫）</div>
                <div>• <span className="text-white">VIBE VFA:</span> 肝T1 native値でEOB造影前後の取り込み評価</div>
                <div>• <span className="text-white">Look-Locker:</span> 縦弛緩の時系列計測（T1-RASER）</div>
                <div>• <span className="text-white">MP2RAGE:</span> 3T頭部T1均一マップ（B1不均一補正）</div>
                <div>• <span className="text-white">3T T1値:</span> 1.5Tより延長（WM 780→1084ms，GM 1300→1820ms）</div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'T2map' && (
          <div>
            <T2MappingMSE fieldStrength={params.fieldStrength} />
            <T2StarMappingGRE fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#a78bfa' }}>T2/T2* Mapping の臨床応用</div>
              <div className="space-y-0.5" style={{ color: '#9ca3af', fontSize: '8px' }}>
                <div>• <span className="text-white">関節軟骨 T2 map:</span> 軟骨変性の早期検出（変性→T2↑）</div>
                <div>• <span className="text-white">T2* (肝鉄沈着):</span> T2* &lt;20ms(3T) → 肝鉄沈着（ヘモクロマトーシス）</div>
                <div>• <span className="text-white">心筋 T2 map:</span> 心筋浮腫・炎症（T2↑: 急性心筋炎・MINOCA）</div>
                <div>• <span className="text-white">心筋 T2* map:</span> 心筋鉄過剰（サラセミア・輸血後）</div>
                <div>• <span className="text-white">SWI/T2*map:</span> 脳微小出血・海綿状血管腫・石灰化</div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'SWI' && (
          <div>
            <SWIExplainer fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#c084fc' }}>SWI 臨床適応</div>
              <div className="space-y-1" style={{ fontSize: '8px' }}>
                {[
                  { label: '脳微小出血', color: '#f87171', desc: 'CMB: 高血圧性脳症・CAA。5mm未満の点状低信号。T2*/SWIのみ検出可能。' },
                  { label: '海綿状血管腫', color: '#fb923c', desc: 'ポップコーン状病変。周囲ヘモジデリン沈着リング（T2*低信号）。' },
                  { label: '深部静脈', color: '#38bdf8', desc: '脱酸素化血の磁化率差で静脈を描出。静脈奇形・DVT評価。' },
                  { label: '石灰化', color: '#9ca3af', desc: '3Tでは低信号（カルシウム）。位相像で出血と鑑別可能（逆位相）。' },
                  { label: '鉄沈着 (BG)', color: '#a78bfa', desc: 'Parkinson病: 黒質の低信号。MSA・CBD: 被殻・線条体の異常低信号。' },
                ].map(r => (
                  <div key={r.label} className="flex gap-1">
                    <span className="shrink-0 font-semibold" style={{ color: r.color, minWidth: '80px' }}>{r.label}</span>
                    <span style={{ color: '#9ca3af' }}>{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {subTab === 'MRS' && (
          <div>
            <MRSExplainer fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#38bdf8' }}>MRS TE の選び方</div>
              <div className="space-y-0.5" style={{ color: '#9ca3af', fontSize: '8px' }}>
                <div><span className="text-white">短TE（20-35ms）:</span> Lip/MM 基線ノイズあり。全代謝物を検出。腫瘍評価。</div>
                <div><span className="text-white">中TE（135-144ms）:</span> Lac逆位相（ダブレット↓）。出血・高悪性腫瘍の乳酸確認。</div>
                <div><span className="text-white">長TE（270ms）:</span> 基線平坦・Lac正位相。Cho/NAA/Cr のみ評価。</div>
              </div>
            </div>
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #1a2a1a' }}>
              <div className="font-semibold mb-1" style={{ color: '#4ade80' }}>代謝物比の臨床解釈</div>
              <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '8px' }}>
                <tbody>
                  {[
                    ['Cho/Cr ↑', '腫瘍・脱髄・白質脳症', '#f87171'],
                    ['NAA/Cr ↓', '神経細胞消失・軸索障害', '#6b7280'],
                    ['Lac ↑', '嫌気性代謝（腫瘍壊死・梗塞）', '#fbbf24'],
                    ['Cho/NAA ↑', '高悪性グリオーマの指標', '#fb923c'],
                    ['mI ↑ (3.56ppm)', 'アルツハイマー型認知症早期', '#38bdf8'],
                  ].map(([label, desc, color]) => (
                    <tr key={label as string} style={{ borderTop: '1px solid #1a1a1a' }}>
                      <td className="py-0.5 pr-2 font-mono font-semibold" style={{ color: color as string }}>{label}</td>
                      <td className="py-0.5" style={{ color: '#9ca3af' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Always-visible summary table */}
        <QMRISummaryTable />
      </div>
    </div>
  )
}
