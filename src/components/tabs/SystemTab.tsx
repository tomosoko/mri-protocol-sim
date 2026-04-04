import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { calcSARLevel } from '../../store/calculators'

// ── g-factor SNR 損失チャート ─────────────────────────────────────────────────
function GFactorChart() {
  const { params } = useProtocolStore()

  if (params.ipatMode === 'Off') return null

  const W = 290, H = 90
  const PAD = { l: 32, r: 10, t: 10, b: 22 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxR = 4

  // g-factor model per coil type: g(R) ≈ 1 + k*(R-1)^exp
  const COIL_G: Record<string, { k: number; e: number; label: string; color: string }> = {
    Head_64:  { k: 0.05, e: 1.5, label: 'Head 64ch', color: '#34d399' },
    Head_20:  { k: 0.08, e: 1.5, label: 'Head 20ch', color: '#60a5fa' },
    Spine_32: { k: 0.10, e: 1.5, label: 'Spine 32ch', color: '#a78bfa' },
    Body:     { k: 0.15, e: 1.8, label: 'Body',      color: '#fb923c' },
    Knee:     { k: 0.18, e: 2.0, label: 'Knee',      color: '#fbbf24' },
    Shoulder: { k: 0.20, e: 2.0, label: 'Shoulder',  color: '#f87171' },
    Flex:     { k: 0.25, e: 2.0, label: 'Flex',      color: '#e88b00' },
  }

  const coilKey = params.coilType ?? 'Body'
  const gCfg = COIL_G[coilKey] ?? COIL_G.Body

  // SNR efficiency = 1 / (sqrt(R) * g(R))  normalized to R=1 → 1.0
  const gFn = (r: number) => 1 + gCfg.k * Math.pow(r - 1, gCfg.e)
  const snrEff = (r: number) => 1 / (Math.sqrt(r) * gFn(r))

  const nPts = 60
  const rVals = Array.from({ length: nPts + 1 }, (_, i) => 1 + (i / nPts) * (maxR - 1))

  const tx = (r: number) => PAD.l + ((r - 1) / (maxR - 1)) * innerW
  const ty = (snr: number) => PAD.t + (1 - snr) * innerH

  const currentR = params.ipatFactor
  const currentG = gFn(currentR)
  const currentSNREff = snrEff(currentR)
  const snrLoss = Math.round((1 - currentSNREff) * 100)

  const dotX = tx(currentR)
  const dotY = ty(currentSNREff)

  // All coil curves for comparison (dimmed)
  const allCurves = useMemo(() => {
    return Object.entries(COIL_G).map(([id, cfg]) => {
      const gf = (r: number) => 1 + cfg.k * Math.pow(r - 1, cfg.e)
      const se = (r: number) => 1 / (Math.sqrt(r) * gf(r))
      const d = rVals.map((r, i) => {
        return `${i === 0 ? 'M' : 'L'}${tx(r).toFixed(1)},${ty(se(r)).toFixed(1)}`
      }).join(' ')
      return { id, d, color: cfg.color, active: id === coilKey }
    })
  }, [coilKey])

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span style={{ color: '#4b5563', fontSize: '9px', fontWeight: 600 }}>g-factor SNR損失 ({gCfg.label})</span>
        <div className="flex items-center gap-2" style={{ fontSize: '9px' }}>
          <span style={{ color: '#6b7280' }}>g={currentG.toFixed(2)}</span>
          <span style={{ color: snrLoss > 40 ? '#f87171' : snrLoss > 25 ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
            SNR -{snrLoss}%
          </span>
        </div>
      </div>
      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#141414" strokeWidth={v === 0.5 ? 1 : 0.5} />
        ))}
        {/* Y-axis labels */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <text key={v} x={PAD.l - 3} y={ty(v) + 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {Math.round(v * 100)}%
          </text>
        ))}

        {/* All coil curves (dimmed) */}
        {allCurves.map(c => (
          <path key={c.id} d={c.d} fill="none"
            stroke={c.color} strokeWidth={c.active ? 1.5 : 0.5}
            opacity={c.active ? 0.85 : 0.2} />
        ))}

        {/* Current R marker */}
        <line x1={dotX} y1={PAD.t} x2={dotX} y2={PAD.t + innerH}
          stroke="#e88b00" strokeWidth={0.8} strokeDasharray="2,2" />
        <circle cx={dotX} cy={dotY} r={3.5} fill="#e88b00" />
        <text x={dotX + 3} y={dotY - 3} fill="#e88b00" style={{ fontSize: '7px' }}>R={currentR}</text>

        {/* X-axis labels */}
        {[1, 2, 3, 4].map(r => (
          <text key={r} x={tx(r)} y={H - 5} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>R={r}</text>
        ))}
        <text x={PAD.l - 2} y={PAD.t + innerH / 2} textAnchor="end" fill="#374151"
          transform={`rotate(-90, ${PAD.l - 12}, ${PAD.t + innerH / 2})`}
          style={{ fontSize: '7px' }}>SNR効率</text>
      </svg>
      <div className="px-2 pb-1.5 flex flex-wrap gap-x-2" style={{ fontSize: '7px' }}>
        {allCurves.map(c => (
          <span key={c.id} style={{ color: c.active ? c.color : '#252525' }}>{c.id.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  )
}

type SubTab = 'Misc' | 'Adjustments' | 'Adj.Volume' | 'pTx' | 'Tx-Rx'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function SystemTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Misc')

  // local state
  const [coilCombination, setCoilCombination] = useState('Sum of Squares')
  const [msma, setMsma] = useState('S-C-T')
  const [matrixOpt, setMatrixOpt] = useState('Off')
  const [coilFocus, setCoilFocus] = useState('Flat')
  const [adjStrategy, setAdjStrategy] = useState('Standard')
  const [b0Shim, setB0Shim] = useState('Standard')
  const [b1Shim, setB1Shim] = useState('TrueForm')
  const [adjTolerance, setAdjTolerance] = useState('Auto')
  const [confirmFreq, setConfirmFreq] = useState('Never')
  const [adjPosAP, setAdjPosAP] = useState(0)
  const [adjPosRL, setAdjPosRL] = useState(0)
  const [adjPosFH, setAdjPosFH] = useState(0)
  const [adjOrientation, setAdjOrientation] = useState('Iso-Center')
  const [txRefAmp, setTxRefAmp] = useState(200)
  const [imageScaling, setImageScaling] = useState(1.0)
  const [trueForm, setTrueForm] = useState(true)
  const [b1ShimMode, setB1ShimMode] = useState('TrueForm')
  const [rfShim, setRfShim] = useState(false)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Misc', 'Adjustments', 'Adj.Volume', 'pTx', 'Tx-Rx'] as SubTab[]).map(t => (
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

      {subTab === 'Misc' && (
        <div className="space-y-0.5">
          {/* Field strength */}
          <div className="px-3 py-2">
            <div className="text-xs mb-2" style={{ color: '#6b7280' }}>Field Strength</div>
            <div className="flex gap-2">
              {([1.5, 3.0] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setParam('fieldStrength', f)}
                  className="px-4 py-1.5 rounded text-sm font-bold transition-all"
                  style={{
                    background: params.fieldStrength === f ? '#8a4400' : '#1a1a1a',
                    color: params.fieldStrength === f ? '#fff' : '#6b7280',
                    border: `1px solid ${params.fieldStrength === f ? '#c47400' : '#374151'}`,
                  }}
                >
                  {f}T
                </button>
              ))}
            </div>
            {params.fieldStrength === 3.0 && (
              <div className="mt-2 p-2 rounded text-xs" style={{ background: '#141414', border: '1px solid #7c3aed', color: '#a78bfa' }}>
                ⚠ 3T注意: SAR≈4倍・化学シフト2倍・Dielectric Effect・SNR↑（理論値√2倍）
              </div>
            )}
          </div>

          <div className="border-t my-1" style={{ borderColor: '#252525' }} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Coil</div>
          <ParamField label="Coil Selection" value={params.coilType ?? 'Body'} type="select"
            options={['Head_64', 'Head_20', 'Spine_32', 'Body', 'Knee', 'Shoulder', 'Flex']}
            onChange={v => setParam('coilType', v as typeof params.coilType)} />
          <ParamField label="Coil Combination" value={coilCombination} type="select"
            options={['Sum of Squares', 'Adaptive']}
            onChange={v => setCoilCombination(v as string)} />
          <ParamField label="MSMA" value={msma} type="select"
            options={['S-C-T', 'T-C-S']}
            onChange={v => setMsma(v as string)} />
          <ParamField label="Matrix Optimization" value={matrixOpt} type="select"
            options={['Off', 'On', 'Adaptive']}
            onChange={v => setMatrixOpt(v as string)} />
          <ParamField label="Coil Focus" value={coilFocus} type="select"
            options={['Flat', 'Center']}
            onChange={v => setCoilFocus(v as string)} />

          <div className="border-t my-1" style={{ borderColor: '#252525' }} />

          <ParamField label="Gradient Mode" hintKey="gradientMode" value={params.gradientMode} type="select"
            options={['Fast', 'Normal', 'Whisper']}
            onChange={v => setParam('gradientMode', v as typeof params.gradientMode)} />
          <ParamField label="Shim Mode" value={params.shim} type="select"
            options={['Auto', 'Manual']}
            onChange={v => setParam('shim', v as typeof params.shim)} />

          {/* Gradient mode guide */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>Gradient Mode</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">Fast: </span>最速・最大騒音・PNS（末梢神経刺激）↑ → 心臓シネ/EPI</div>
              <div><span className="text-white">Normal: </span>標準バランス → 通常検査</div>
              <div><span className="text-white">Whisper: </span>低騒音(約-10dB)・低PNS → 小児/聴覚過敏・鎮静</div>
            </div>
          </div>

          {/* SAR Breakdown */}
          <SARBreakdown />

          {/* Coil Reference Table */}
          <CoilReferenceTable />
        </div>
      )}

      {subTab === 'Adjustments' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Adjustment Strategy</div>
          <ParamField label="Adjustment Strategy" value={adjStrategy} type="select"
            options={['Standard', 'FastAdjust', 'Advanced']}
            onChange={v => setAdjStrategy(v as string)} />
          <ParamField label="B0 Shim" value={b0Shim} type="select"
            options={['Standard', 'Advanced', 'TuneUp']}
            onChange={v => setB0Shim(v as string)} />
          <ParamField label="B1 Shim" value={b1Shim} type="select"
            options={['TrueForm', 'CP Mode', 'Dual Drive']}
            onChange={v => setB1Shim(v as string)} />
          <ParamField label="Adjustment Tolerance" value={adjTolerance} type="select"
            options={['Auto', 'Custom']}
            onChange={v => setAdjTolerance(v as string)} />
          <ParamField label="Confirm Frequency" value={confirmFreq} type="select"
            options={['Never', 'Always', 'When Changed']}
            onChange={v => setConfirmFreq(v as string)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>iPAT（並列撮像）設定</div>
            <ParamField label="iPAT Mode" hintKey="iPAT" value={params.ipatMode} type="select"
              options={['Off', 'GRAPPA', 'CAIPIRINHA']}
              onChange={v => setParam('ipatMode', v as typeof params.ipatMode)} highlight={hl('ipatMode')} />
            {params.ipatMode !== 'Off' && (
              <>
                <ParamField label="Acceleration Factor" value={params.ipatFactor} type="select"
                  options={['2', '3', '4']}
                  onChange={v => setParam('ipatFactor', parseInt(v as string))} />
                <div className="mt-2 space-y-1 text-xs" style={{ color: '#9ca3af' }}>
                  <div>撮像時間: <span className="text-white">約 1/{params.ipatFactor} に短縮</span></div>
                  <div>SNR低下: <span className="text-yellow-400">約 {(100 / Math.sqrt(params.ipatFactor)).toFixed(0)}% に低下</span></div>
                  {params.ipatFactor >= 3 && (
                    <div className="text-orange-400">⚠ AF≥3はg-factor（残留アーチファクト）に注意</div>
                  )}
                </div>
                <GFactorChart />
              </>
            )}
          </div>
        </div>
      )}

      {subTab === 'Adj.Volume' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Adjustment Volume Position</div>
          <ParamField label="Position A>>P" value={adjPosAP} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosAP(v as number)} />
          <ParamField label="Position R>>L" value={adjPosRL} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosRL(v as number)} />
          <ParamField label="Position F>>H" value={adjPosFH} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosFH(v as number)} />
          <ParamField label="Orientation" value={adjOrientation} type="select"
            options={['Iso-Center', 'Custom']}
            onChange={v => setAdjOrientation(v as string)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div style={{ color: '#9ca3af' }}>
              Adjustment Volumeは磁場均一性の調整（シム）を行う領域を定義します。
              撮像部位に合わせてサイズ・位置を最適化することでシム精度が向上します。
            </div>
          </div>
        </div>
      )}

      {subTab === 'pTx' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Parallel Transmit</div>
          <ParamField label="Tx Ref Amplitude" value={txRefAmp} type="number"
            min={50} max={500} step={10} unit="V"
            onChange={v => setTxRefAmp(v as number)} />
          <ParamField label="Image Scaling" value={imageScaling} type="number"
            min={0.1} max={5.0} step={0.01}
            onChange={v => setImageScaling(v as number)} />
          <ParamField label="TrueForm" value={trueForm} type="toggle"
            onChange={v => setTrueForm(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>pTx (parallel Transmit)</div>
            <div style={{ color: '#9ca3af' }}>
              複数の送信チャンネルを使用してB1フィールドを均一化します。3Tでの腹部・骨盤撮像でのDielectric Effect対策に有効。
              TrueFormは標準的なCP送信モードでB1均一性を最適化します。
            </div>
          </div>
        </div>
      )}

      {subTab === 'Tx-Rx' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Transmit / Receive</div>
          <ParamField label="B1 Shim Mode" value={b1ShimMode} type="select"
            options={['TrueForm', 'CP Mode']}
            onChange={v => setB1ShimMode(v as string)} />
          <ParamField label="RF Shim" value={rfShim} type="toggle"
            onChange={v => setRfShim(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>B1 Shim Mode</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">TrueForm: </span>位相・振幅最適化で均一なB1分布を実現（推奨）</div>
              <div><span className="text-white">CP Mode: </span>従来のCircular Polarized送信モード</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SAR内訳チャート ──────────────────────────────────────────────────────────
function SARBreakdown() {
  const { params } = useProtocolStore()
  const totalSAR = calcSARLevel(params)

  // 各因子の寄与比率（正規化）
  const faNorm     = (params.flipAngle / 90) ** 2
  const trNorm     = 2000 / Math.max(params.TR, 100)
  const etlNorm    = Math.min(params.turboFactor, 200) / 50
  const fieldNorm  = (params.fieldStrength / 1.5) ** 2
  const fatPenalty = params.fatSat === 'CHESS' ? 0.15 : params.fatSat === 'SPAIR' ? 0.25 : params.fatSat === 'STIR' ? 0.35 : 0
  const mtPenalty  = params.mt ? 0.20 : 0
  const coilPen    = (!params.coilType || params.coilType === 'Body') ? 0.30 : 0

  const baseContrib = faNorm * trNorm * etlNorm * fieldNorm

  const factors = [
    { label: 'FA²',    value: faNorm,    color: '#f87171', note: `${params.flipAngle}°` },
    { label: '1/TR',   value: trNorm,    color: '#fb923c', note: `${params.TR}ms` },
    { label: 'ETL',    value: etlNorm,   color: '#fbbf24', note: `×${params.turboFactor}` },
    { label: 'B0²',    value: fieldNorm, color: '#a78bfa', note: `${params.fieldStrength}T` },
    { label: 'FatSat', value: fatPenalty * baseContrib, color: '#60a5fa', note: params.fatSat },
    { label: 'MT',     value: mtPenalty  * baseContrib, color: '#38bdf8', note: params.mt ? 'On' : 'Off' },
    { label: 'Coil',   value: coilPen   * baseContrib, color: '#4ade80', note: params.coilType || 'Body' },
  ].filter(f => f.value > 0.01)

  const total = factors.reduce((s, f) => s + f.value, 0)

  const sarColor = totalSAR >= 90 ? '#ef4444' : totalSAR >= 70 ? '#f59e0b' : totalSAR >= 40 ? '#e88b00' : '#34d399'
  const sarLabel = totalSAR >= 90 ? 'OVER' : totalSAR >= 70 ? 'High' : totalSAR >= 40 ? 'Med' : 'Low'

  return (
    <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" style={{ color: '#e88b00' }}>SAR 内訳</div>
        <div className="flex items-center gap-2">
          <span style={{ color: sarColor, fontWeight: 700 }}>{sarLabel}</span>
          <span className="font-mono font-bold" style={{ color: sarColor }}>{totalSAR}%</span>
        </div>
      </div>

      {/* 全体バー */}
      <div className="h-2.5 rounded overflow-hidden mb-3" style={{ background: '#1a1a1a' }}>
        <div
          className="h-full rounded transition-all"
          style={{
            width: `${totalSAR}%`,
            background: `linear-gradient(90deg, #34d399, ${sarColor})`,
          }}
        />
      </div>

      {/* 因子別内訳バー */}
      <div className="space-y-1.5">
        {factors.map(f => {
          const pct = total > 0 ? Math.round((f.value / total) * 100) : 0
          return (
            <div key={f.label}>
              <div className="flex justify-between items-center mb-0.5">
                <span style={{ color: f.color }}>{f.label}</span>
                <span style={{ color: '#6b7280', fontSize: '9px' }}>{f.note}</span>
                <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '9px' }}>{pct}%</span>
              </div>
              <div className="h-1 rounded overflow-hidden" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-full rounded"
                  style={{ width: `${pct}%`, background: f.color + '80' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* IEC limits */}
      <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid #252525', color: '#4b5563' }}>
        IEC limit: 頭部 3.2 W/kg / 体部 2.0 W/kg (全体平均)
      </div>
    </div>
  )
}

// ── コイル参照テーブル ─────────────────────────────────────────────────────────
const COIL_DATA = [
  { id: 'Head_64',  label: 'Head 64ch',  snr: 100, channels: 64, fovMax: 230, use: '脳・頭頸部', note: 'fMRI/DWI標準' },
  { id: 'Head_20',  label: 'Head 20ch',  snr: 75,  channels: 20, fovMax: 250, use: '脳・頸椎',   note: '旧世代コイル' },
  { id: 'Spine_32', label: 'Spine 32ch', snr: 85,  channels: 32, fovMax: 350, use: '脊椎全長',   note: 'Spine+Body組合せ' },
  { id: 'Body',     label: 'Body',       snr: 55,  channels: 18, fovMax: 500, use: '腹部・骨盤', note: 'SAR注意・大FOV向け' },
  { id: 'Knee',     label: 'Knee',       snr: 80,  channels: 15, fovMax: 200, use: '膝関節',     note: 'FOV≤200mm推奨' },
  { id: 'Shoulder', label: 'Shoulder',   snr: 72,  channels: 12, fovMax: 220, use: '肩関節・肘', note: 'FOV≤200mm推奨' },
  { id: 'Flex',     label: 'Flex',       snr: 60,  channels: 4,  fovMax: 200, use: '四肢・小部位', note: '可搬型・汎用' },
]

function CoilReferenceTable() {
  const { params, setParam } = useProtocolStore()

  return (
    <div className="mx-3 mt-2 p-2.5 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
      <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>コイル 参照テーブル</div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '280px' }}>
          <thead>
            <tr style={{ color: '#4b5563', fontSize: '8px' }}>
              <th className="text-left py-0.5 pr-1">コイル</th>
              <th className="text-center py-0.5 pr-1">SNR</th>
              <th className="text-center py-0.5 pr-1">ch</th>
              <th className="text-left py-0.5">適応</th>
            </tr>
          </thead>
          <tbody>
            {COIL_DATA.map(c => {
              const isActive = params.coilType === c.id
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  style={{ borderTop: '1px solid #1a1a1a', background: isActive ? '#2a1200' : 'transparent' }}
                  onClick={() => setParam('coilType', c.id as typeof params.coilType)}
                >
                  <td className="py-0.5 pr-1" style={{ color: isActive ? '#e88b00' : '#9ca3af', fontSize: '9px', fontWeight: isActive ? 600 : 400 }}>
                    {c.label}
                  </td>
                  <td className="text-center py-0.5 pr-1 font-mono" style={{
                    color: c.snr >= 90 ? '#34d399' : c.snr >= 70 ? '#fbbf24' : '#f87171',
                    fontSize: '9px',
                  }}>
                    {c.snr}%
                  </td>
                  <td className="text-center py-0.5 pr-1 font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>
                    {c.channels}
                  </td>
                  <td className="py-0.5" style={{ color: '#4b5563', fontSize: '8px' }}>{c.use}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5" style={{ color: '#374151', fontSize: '8px' }}>
        行をクリックでコイルを変更。SNR は Head64ch を基準100として相対評価。
      </div>
    </div>
  )
}
