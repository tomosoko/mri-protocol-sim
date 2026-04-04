import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { TISSUES } from '../../store/calculators'

type SubTab = 'Common' | 'Dynamic'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

const fatSatDesc: Record<string, string> = {
  None: 'なし — 脂肪信号あり',
  CHESS: '化学シフト選択励起 — 均一磁場に最適（頭部・脊椎）',
  SPAIR: 'Spectral Adiabatic IR — 不均一磁場でも均一抑制（腹部・乳腺）',
  STIR: 'Short TI IR — 磁場不均一に最強。造影後は不可',
  Dixon: '水脂肪分離 — 定量評価・造影ダイナミックに最適',
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

          {/* T1/T2 contrast guide */}
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

          {/* TI 自動計算器 */}
          <TICalculator />

          {/* T2* decay chart — always visible as TE reference */}
          <div className="mx-3 mt-2">
            <T2StarDecayChart fieldStrength={params.fieldStrength} TE={params.TE} />
            <div className="mt-1 p-1.5 rounded text-xs" style={{ background: '#111', border: '1px solid #252525', color: '#374151' }}>
              T2* ≈ 組織の磁化率差による信号損失速度。3Tでは1.5Tの約1/2に短縮。GRE/EPI/SWIのTE設計に重要。
            </div>
          </div>
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
          {params.mt && (
            <div className="mx-3 p-2 rounded text-xs" style={{ background: '#111111', color: '#9ca3af', border: '1px solid #252525' }}>
              MT: 自由水の信号を抑制 → 造影増強効果を相対的に強調。MRAや脊髄造影後に有効。SAR↑に注意。
            </div>
          )}
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
