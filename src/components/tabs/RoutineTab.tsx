import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField, SectionHeader as SH } from '../ParamField'
import { TISSUES } from '../../store/calculators'

// ── Ernst 角インジケーター ────────────────────────────────────────────────────
function ErnstAngleIndicator() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Only show for GRE-like sequences (short TR)
  const isGRE = params.turboFactor <= 2 && params.TR < 500

  const tissues = TISSUES.filter(t => ['WM', 'GM', 'Fat', 'Liver'].includes(t.label))

  const ernstAngles = tissues.map(t => {
    const T1 = is3T ? t.T1_30 : t.T1_15
    const ea = Math.round((Math.acos(Math.exp(-params.TR / T1)) * 180) / Math.PI)
    return { label: t.label, color: t.color, ea, T1 }
  })

  if (!isGRE) return null

  return (
    <div className="mx-3 mb-1 px-2 py-1.5 rounded" style={{ background: '#111', border: '1px solid #1a2820' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: '#34d399', fontSize: '9px', fontWeight: 600 }}>Ernst Angle (GRE最適FA)</span>
        <span style={{ color: '#374151', fontSize: '8px' }}>= arccos(e^(-TR/T1))</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {ernstAngles.map(({ label, color, ea }) => {
          const diff = Math.abs(params.flipAngle - ea)
          const close = diff <= 5
          return (
            <div key={label} className="flex items-center gap-1">
              <span style={{ color, fontSize: '8px' }}>{label}:</span>
              <span className="font-mono" style={{ color: close ? '#34d399' : diff <= 15 ? '#fbbf24' : '#6b7280', fontSize: '9px', fontWeight: 600 }}>
                {ea}°
              </span>
              {close && <span style={{ color: '#34d399', fontSize: '8px' }}>✓</span>}
            </div>
          )
        })}
        <span style={{ color: '#374151', fontSize: '8px' }}>現在={params.flipAngle}°</span>
      </div>
    </div>
  )
}

// ── T1/T2 信号曲線 ──────────────────────────────────────────────────────────
function SignalCurveChart() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const W = 340
  const H = 80
  const PAD = { l: 30, r: 8, t: 6, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // 3組織のみ (WM, GM, Fat) + CSF
  const tissues = TISSUES.filter(t => ['WM', 'GM', 'Fat', 'CSF'].includes(t.label))

  // T1 recovery: normalized to max = 1 at TR=10000ms
  const maxTR = 10000

  // T2 decay: normalized to max = 1 at TE=0
  const maxTE = 300

  const nPts = 80
  // log scale for TR (0-10000ms)
  const trPoints = Array.from({ length: nPts }, (_, i) => {
    const t = Math.exp(i / (nPts - 1) * Math.log(maxTR + 1)) - 1
    return t
  })
  const tePoints = Array.from({ length: nPts }, (_, i) => i / (nPts - 1) * maxTE)

  const trPathForTissue = (T1: number) => {
    return trPoints.map((t, i) => {
      const s = 1 - Math.exp(-t / T1)
      const x = PAD.l + (Math.log(t + 1) / Math.log(maxTR + 1)) * innerW
      const y = PAD.t + innerH - s * innerH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  const tePathForTissue = (T2: number) => {
    return tePoints.map((t, i) => {
      const s = Math.exp(-t / T2)
      const x = PAD.l + (t / maxTE) * innerW
      const y = PAD.t + innerH - s * innerH
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }

  // Current TR/TE marker positions
  const trMarkerX = PAD.l + (Math.log(params.TR + 1) / Math.log(maxTR + 1)) * innerW
  const teMarkerX = PAD.l + Math.min(1, params.TE / maxTE) * innerW

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>T1回復・T2減衰曲線</div>
      <div className="flex gap-2">
        {/* T1 Recovery */}
        <div className="flex-1">
          <div style={{ fontSize: '8px', color: '#374151', marginBottom: '2px' }}>T1 回復 (log TR)</div>
          <svg width={W / 2 - 4} height={H}>
            {/* Grid lines */}
            {[0, 0.5, 1].map(v => (
              <line key={v} x1={PAD.l} y1={PAD.t + innerH - v * innerH}
                x2={PAD.l + innerW} y2={PAD.t + innerH - v * innerH}
                stroke="#1a1a1a" strokeWidth={1} />
            ))}
            {/* Y-axis */}
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
            <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
            <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
            {/* X-axis label */}
            <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TR (ms)</text>

            {/* Tissue curves */}
            {tissues.map(t => {
              const T1 = is3T ? t.T1_30 : t.T1_15
              return (
                <path key={t.label} d={trPathForTissue(T1)} fill="none"
                  stroke={t.color} strokeWidth={1} opacity={0.7} />
              )
            })}

            {/* TR marker */}
            <line x1={trMarkerX} y1={PAD.t} x2={trMarkerX} y2={PAD.t + innerH}
              stroke="#e88b00" strokeWidth={1.5} strokeDasharray="3,2" />
            <text x={trMarkerX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TR</text>
          </svg>
        </div>

        {/* T2 Decay */}
        <div className="flex-1">
          <div style={{ fontSize: '8px', color: '#374151', marginBottom: '2px' }}>T2 減衰 (TE)</div>
          <svg width={W / 2 - 4} height={H}>
            {/* Grid lines */}
            {[0, 0.5, 1].map(v => (
              <line key={v} x1={PAD.l} y1={PAD.t + innerH - v * innerH}
                x2={PAD.l + innerW} y2={PAD.t + innerH - v * innerH}
                stroke="#1a1a1a" strokeWidth={1} />
            ))}
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
            <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
            <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
            <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TE (ms, 0-300)</text>

            {/* Tissue curves */}
            {tissues.map(t => {
              const T2 = is3T ? t.T2_30 : t.T2_15
              return (
                <path key={t.label} d={tePathForTissue(T2)} fill="none"
                  stroke={t.color} strokeWidth={1} opacity={0.7} />
              )
            })}

            {/* TE marker */}
            <line x1={teMarkerX} y1={PAD.t} x2={teMarkerX} y2={PAD.t + innerH}
              stroke="#e88b00" strokeWidth={1.5} strokeDasharray="3,2" />
            <text x={teMarkerX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TE</text>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-1 flex-wrap" style={{ fontSize: '8px' }}>
        {tissues.map(t => (
          <span key={t.label} style={{ color: t.color }}>● {t.label}</span>
        ))}
      </div>
    </div>
  )
}

// ── GM/WM コントラスト TR-TE ヒートマップ ────────────────────────────────────
function ContrastHeatmap() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const GM = TISSUES.find(t => t.label === 'GM')!
  const WM = TISSUES.find(t => t.label === 'WM')!
  const gmT1 = is3T ? GM.T1_30 : GM.T1_15
  const wmT1 = is3T ? WM.T1_30 : WM.T1_15
  const gmT2 = is3T ? GM.T2_30 : GM.T2_15
  const wmT2 = is3T ? WM.T2_30 : WM.T2_15

  const COLS = 16  // TR steps
  const ROWS = 12  // TE steps
  const trRange = [200, 6000]
  const teRange = [5, 200]

  const trVals = Array.from({ length: COLS }, (_, i) => Math.round(trRange[0] + (trRange[1] - trRange[0]) * (i / (COLS - 1))))
  const teVals = Array.from({ length: ROWS }, (_, i) => Math.round(teRange[0] + (teRange[1] - teRange[0]) * (i / (ROWS - 1))))

  // Compute GM-WM contrast at each TR/TE: |S_GM - S_WM|
  const grid = useMemo(() => {
    return teVals.map(te =>
      trVals.map(tr => {
        const sgm = (1 - Math.exp(-tr / gmT1)) * Math.exp(-te / gmT2)
        const swm = (1 - Math.exp(-tr / wmT1)) * Math.exp(-te / wmT2)
        return Math.abs(sgm - swm)
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3T, gmT1, wmT1, gmT2, wmT2])

  const maxContrast = Math.max(...grid.flat())
  const W = 340
  const H = 100
  const PAD = { l: 28, r: 4, t: 4, b: 20 }
  const cellW = (W - PAD.l - PAD.r) / COLS
  const cellH = (H - PAD.t - PAD.b) / ROWS

  // Current TR/TE cell
  const trIdx = trVals.reduce((best, tr, i) => Math.abs(tr - params.TR) < Math.abs(trVals[best] - params.TR) ? i : best, 0)
  const teIdx = teVals.reduce((best, te, i) => Math.abs(te - params.TE) < Math.abs(teVals[best] - params.TE) ? i : best, 0)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>
        GM/WM コントラスト マップ ({params.fieldStrength}T)
        <span className="ml-2 font-normal" style={{ color: '#374151', fontSize: '8px' }}>暗→高コントラスト</span>
      </div>
      <svg width={W} height={H} style={{ display: 'block', cursor: 'crosshair' }}
        onClick={(e) => {
          const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect()
          const x = e.clientX - rect.left - PAD.l
          const y = e.clientY - rect.top - PAD.t
          const ci = Math.max(0, Math.min(COLS - 1, Math.floor(x / cellW)))
          const ri = Math.max(0, Math.min(ROWS - 1, Math.floor(y / cellH)))
          setParam('TR', trVals[ci])
          setParam('TE', teVals[ri])
        }}>
        {/* Cells */}
        {grid.map((row, ri) =>
          row.map((val, ci) => {
            const t = val / maxContrast
            const isCurrent = ci === trIdx && ri === teIdx
            // Colormap: black → blue → cyan → green → yellow → white
            const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 255)
            const g = Math.round(t < 0.25 ? 0 : t < 0.75 ? (t - 0.25) * 2 * 255 : 255)
            const b = Math.round(t < 0.5 ? t * 2 * 255 : (1 - (t - 0.5) * 2) * 255)
            return (
              <rect
                key={`${ri}_${ci}`}
                x={PAD.l + ci * cellW}
                y={PAD.t + ri * cellH}
                width={cellW}
                height={cellH}
                fill={`rgb(${r},${g},${b})`}
                stroke={isCurrent ? '#e88b00' : 'none'}
                strokeWidth={isCurrent ? 1.5 : 0}
              />
            )
          })
        )}
        {/* Y axis labels */}
        {[0, ROWS - 1].map(ri => (
          <text key={ri} x={PAD.l - 2} y={PAD.t + ri * cellH + cellH / 2 + 3}
            textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {teVals[ri]}
          </text>
        ))}
        {/* Y axis label */}
        <text x={8} y={H / 2} textAnchor="middle" fill="#374151"
          transform={`rotate(-90, 8, ${H / 2})`} style={{ fontSize: '7px' }}>
          TE
        </text>
        {/* X axis labels */}
        {[0, Math.floor(COLS / 2), COLS - 1].map(ci => (
          <text key={ci} x={PAD.l + ci * cellW + cellW / 2} y={H - 4}
            textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>
            {trVals[ci] >= 1000 ? `${(trVals[ci] / 1000).toFixed(1)}k` : trVals[ci]}
          </text>
        ))}
        <text x={PAD.l + (W - PAD.l - PAD.r) / 2} y={H} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>
          TR (ms)
        </text>
      </svg>
      <div style={{ fontSize: '8px', color: '#374151', marginTop: '2px' }}>
        クリックで TR/TE を変更。現在: TR={params.TR}ms TE={params.TE}ms (オレンジ枠)
      </div>
    </div>
  )
}

export function RoutineTab() {
  const { params, setParam, activeRoutineTab, setActiveRoutineTab, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const [autoAlign, setAutoAlign] = useState(false)
  const [motionCorr, setMotionCorr] = useState('None')
  const [concatenations, setConcatenations] = useState(1)
  const [posL, setPosL] = useState(0.0)
  const [posP, setPosP] = useState(60.0)
  const [posH, setPosH] = useState(0.0)
  const [distFactor, setDistFactor] = useState(10)
  const [sliceGroup, setSliceGroup] = useState(1)

  const phaseEncOptions: typeof params.phaseEncDir[] = ['A>>P', 'P>>A', 'R>>L', 'L>>R', 'H>>F', 'F>>H']

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b" style={{ borderColor: '#252525', background: '#0e0e0e' }}>
        {(['Part1', 'Part2', 'Assistant'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveRoutineTab(t)}
            className="px-4 py-1.5 text-xs transition-colors"
            style={{
              background: activeRoutineTab === t ? '#1e1200' : 'transparent',
              color: activeRoutineTab === t ? '#e88b00' : '#5a5a5a',
              borderBottom: activeRoutineTab === t ? '2px solid #e88b00' : '2px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {activeRoutineTab === 'Part1' && (
        <div className="space-y-0">
          <SH label="Slice Group" />
          <ParamField label="Slice Group" value={sliceGroup} type="number" min={1} max={8}
            onChange={v => setSliceGroup(v as number)} />
          <ParamField label="Slices" value={params.slices} type="number" min={1} max={256} step={1}
            onChange={v => setParam('slices', v as number)} />
          <ParamField label="Distance Factor" value={distFactor} type="number" min={0} max={100} step={5} unit="%"
            onChange={v => setDistFactor(v as number)} />

          <SH label="Position" />
          <div className="flex items-center gap-1 px-3 py-0.5">
            <span className="text-xs w-40 shrink-0" style={{ color: '#9ca3af' }}>Position (L / P / H)</span>
            <div className="flex items-center gap-1 ml-auto">
              {[['L', posL, setPosL], ['P', posP, setPosP], ['H', posH, setPosH]].map(([lbl, val, fn]) => (
                <div key={lbl as string} className="flex items-center gap-0.5">
                  <span className="text-xs" style={{ color: '#4b5563' }}>{lbl as string}</span>
                  <input
                    type="number"
                    value={val as number}
                    step={1}
                    onChange={e => (fn as (v: number) => void)(parseFloat(e.target.value) || 0)}
                    className="px-1 py-0 rounded text-xs text-right font-mono outline-none"
                    style={{ background: '#0e0e0e', border: '1px solid #2a2a2a', color: '#d8d8d8', width: '46px', height: '18px' }}
                  />
                </div>
              ))}
            </div>
          </div>
          <ParamField label="Orientation" value={params.orientation} type="select"
            options={['Tra', 'Cor', 'Sag']}
            onChange={v => setParam('orientation', v as typeof params.orientation)} />
          <ParamField label="Phase Enc Dir" hintKey="phaseEncDir" value={params.phaseEncDir} type="select"
            options={phaseEncOptions}
            onChange={v => setParam('phaseEncDir', v as typeof params.phaseEncDir)} highlight={hl('phaseEncDir')} />
          <ParamField label="Phase Oversampling" hintKey="phaseOversampling" value={params.phaseOversampling} type="range"
            min={0} max={100} step={10} unit="%"
            onChange={v => setParam('phaseOversampling', v as number)} highlight={hl('phaseOversampling')} />

          <SH label="Resolution" />
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
          <ParamField label="FOV Phase%" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} />
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range"
            min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />

          <SH label="Timing" />
          <ParamField label="TR" hintKey="TR" value={params.TR} type="number" min={100} max={15000} step={100} unit="ms"
            onChange={v => setParam('TR', v as number)} highlight={hl('TR')} />
          <ParamField label="TE" hintKey="TE" value={params.TE} type="number" min={1} max={1000} step={1} unit="ms"
            onChange={v => setParam('TE', v as number)} highlight={hl('TE')} />
          <ParamField label="TI" hintKey="TI" value={params.TI} type="number" min={0} max={5000} step={10} unit="ms"
            onChange={v => setParam('TI', v as number)} highlight={hl('TI')} />
          <ParamField label="Flip Angle" hintKey="flipAngle" value={params.flipAngle} type="range"
            min={5} max={180} step={5} unit="°"
            onChange={v => setParam('flipAngle', v as number)} highlight={hl('flipAngle')} />
          <ErnstAngleIndicator />

          <SignalCurveChart />
          <ContrastHeatmap />

          <SH label="Averages" />
          <ParamField label="Averages" hintKey="averages" value={params.averages} type="number"
            min={1} max={8} step={1}
            onChange={v => setParam('averages', v as number)} highlight={hl('averages')} />
          <ParamField label="Concatenations" hintKey="Concatenations" value={concatenations} type="number"
            min={1} max={16} step={1}
            onChange={v => setConcatenations(v as number)} />

          <SH label="AutoAlign" />
          <ParamField label="AutoAlign" value={autoAlign} type="toggle"
            onChange={v => setAutoAlign(v as boolean)} />
          {autoAlign && (
            <div className="mx-3 mt-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #3a1a00', color: '#e88b00' }}>
              解剖ランドマーク自動検出でスライス位置・向きを最適化。頭部・膝・脊椎で有効。
            </div>
          )}
        </div>
      )}

      {activeRoutineTab === 'Part2' && (
        <div className="space-y-0">
          <SH label="Introduction" />
          <div className="mx-3 my-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525', color: '#6b7280' }}>
            プロトコル説明・適応メモを記載します。
          </div>

          <SH label="Motion" />
          <ParamField label="Motion Correction" value={motionCorr} type="select"
            options={['None', 'Phase', 'Frequency', 'Navigator']}
            onChange={v => setMotionCorr(v as string)} />
          {motionCorr !== 'None' && (
            <div className="mx-3 mt-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525', color: '#9ca3af' }}>
              {motionCorr === 'Phase' && 'Phase方向動き補正。周期的動き（呼吸・心拍）に有効。'}
              {motionCorr === 'Frequency' && 'Frequency方向の動き補正。'}
              {motionCorr === 'Navigator' && 'ナビゲーターエコーで呼吸を直接追跡・補正。'}
            </div>
          )}

          <SH label="Fat Suppression" />
          <ParamField label="Fat Saturation" hintKey="fatSat" value={params.fatSat} type="select"
            options={['None', 'CHESS', 'SPAIR', 'STIR', 'Dixon']}
            onChange={v => setParam('fatSat', v as typeof params.fatSat)} highlight={hl('fatSat')} />
          {params.fatSat !== 'None' && (
            <div className="mx-3 mt-1 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525', color: '#9ca3af' }}>
              {params.fatSat === 'CHESS' && 'CHESS: 周波数選択励起。頭部・脊椎（均一磁場）向け。'}
              {params.fatSat === 'SPAIR' && 'SPAIR: 断熱反転回復。磁場不均一でも安定（腹部・乳腺）。造影後も使用可。'}
              {params.fatSat === 'STIR' && '⚠ STIR: 造影後使用禁忌！GdのT1短縮もnullされる。関節・金属周囲向け。'}
              {params.fatSat === 'Dixon' && 'Dixon: 水脂肪分離。3Tダイナミック第一選択。定量脂肪評価も可。'}
            </div>
          )}

          <SH label="Resp Control" />
          <ParamField label="Resp.Control" hintKey="PACE" value={params.respTrigger} type="select"
            options={['Off', 'BH', 'RT', 'PACE']}
            onChange={v => setParam('respTrigger', v as typeof params.respTrigger)} />
        </div>
      )}

      {activeRoutineTab === 'Assistant' && (
        <div className="space-y-0">
          <SH label="SAR Control" />
          <ParamField label="SAR Assistant" hintKey="SAR" value={params.sarAssistant} type="select"
            options={['Off', 'Normal', 'Advanced']}
            onChange={v => setParam('sarAssistant', v as typeof params.sarAssistant)} />
          <ParamField label="Allowed Delay" value={params.allowedDelay} type="number"
            min={0} max={120} step={10} unit="s"
            onChange={v => setParam('allowedDelay', v as number)} />

          <div className="mt-3 mx-3 p-3 rounded text-xs space-y-1" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>SAR規制値（IEC 60601-2-33）</div>
            <div style={{ color: '#9ca3af' }}>全身平均: <span className="text-white">4 W/kg</span> / 15分</div>
            <div style={{ color: '#9ca3af' }}>頭部: <span className="text-white">3.2 W/kg</span> / 10分</div>
            <div style={{ color: '#9ca3af' }}>局所体幹: <span className="text-white">10 W/kg</span> / 5分</div>
            <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: '1px solid #252525', color: '#6b7280' }}>
              <div>3T は 1.5T の約 <span className="text-yellow-400">4倍</span> SAR</div>
              <div>対策: TR↑ / FA↓ / ETL↓ / iPAT ON</div>
              <div>FA 150°→120°で約 <span className="text-green-400">30% 削減</span></div>
            </div>
          </div>

          <SH label="Field Strength" />
          <div className="px-3 py-1 flex gap-2">
            {([1.5, 3.0] as const).map(f => (
              <button
                key={f}
                onClick={() => setParam('fieldStrength', f)}
                className="flex-1 py-1 rounded text-sm font-bold transition-all"
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
            <div className="mx-3 p-2 rounded text-xs" style={{ background: '#141414', border: '1px solid #7c3aed', color: '#a78bfa' }}>
              3T: SAR≈4倍 / 化学シフト2倍（BW2倍必要）/ Dielectric Effect / SNR理論値↑√2
            </div>
          )}
        </div>
      )}
    </div>
  )
}
