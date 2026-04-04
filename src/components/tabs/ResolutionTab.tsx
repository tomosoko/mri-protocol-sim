import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { chemShift } from '../../store/calculators'

type SubTab = 'Common' | 'Acceleration' | 'Filter'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function ResolutionTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Common')

  // local state for Acceleration / Filter params not in ProtocolParams
  const [accelMode, setAccelMode] = useState('Off')
  const [deepResolve, setDeepResolve] = useState(false)
  const [phasePartialFourier, setPhasePartialFourier] = useState('Off')
  const [refScans, setRefScans] = useState('GRE')
  const [accelFactorPE, setAccelFactorPE] = useState(1)
  const [refLinesPE, setRefLinesPE] = useState(24)
  const [rawFilter, setRawFilter] = useState(false)
  const [ellipticalFilter, setEllipticalFilter] = useState(false)
  const [imageFilter, setImageFilter] = useState(false)
  const [normalize, setNormalize] = useState(false)
  const [distortionCorr, setDistortionCorr] = useState('Off')

  const readPx = (params.fov / params.matrixFreq).toFixed(2)
  const phasePx = (params.fov / params.matrixPhase * (100 / params.phaseResolution)).toFixed(2)
  const cs = chemShift(params)
  // BW変更時の SNR/CS 予測
  const bwOptions = [100, 150, 200, 300, 400, 500, 800, 1000, 1500, 2000]
  const bwImpact = bwOptions.map(bw => ({
    bw,
    snrRel: Math.round(Math.sqrt(params.bandwidth / bw) * 100),
    cs: Math.round((params.fieldStrength === 3.0 ? 440 : 220) / bw * 10) / 10,
  }))

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Common', 'Acceleration', 'Filter'] as SubTab[]).map(t => (
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
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
          <ParamField label="FOV Phase%" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} highlight={hl('phaseResolution')} />
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range" min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />
          <ParamField label="Base Resolution" hintKey="matrix" value={params.matrixFreq} type="select"
            options={['64','96','128','192','256','320','384','512']}
            onChange={v => setParam('matrixFreq', parseInt(v as string))} highlight={hl('matrixFreq')} />
          <ParamField label="Phase Resolution%" value={params.matrixPhase} type="select"
            options={['64','96','128','192','256','320','384','512']}
            onChange={v => setParam('matrixPhase', parseInt(v as string))} highlight={hl('matrixPhase')} />
          <ParamField label="Interpolation" value={params.interpolation} type="toggle"
            onChange={v => setParam('interpolation', v as boolean)} />

          {/* Voxel info */}
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>ボクセルサイズ計算</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ color: '#9ca3af' }}>
              <span>読み取り方向:</span>
              <span className="text-white font-mono">{readPx} mm</span>
              <span>位相方向:</span>
              <span className="text-white font-mono">{phasePx} mm</span>
              <span>スライス方向:</span>
              <span className="text-white font-mono">{params.sliceThickness.toFixed(1)} mm</span>
              <span>ボクセル体積:</span>
              <span className="text-white font-mono">{(parseFloat(readPx) * parseFloat(phasePx) * params.sliceThickness).toFixed(2)} mm³</span>
            </div>
          </div>

          {/* Chemical shift */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>
              化学シフト量 ({params.fieldStrength}T)
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded" style={{ background: '#252525' }}>
                <div className="h-full rounded" style={{
                  width: `${Math.min(cs * 20, 100)}%`,
                  background: cs < 1.5 ? '#34d399' : cs < 3 ? '#fbbf24' : '#f87171',
                }} />
              </div>
              <span className={`font-mono font-bold ${cs < 1.5 ? 'text-green-400' : cs < 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                {cs} px
              </span>
            </div>
            <div className="mt-1" style={{ color: '#6b7280' }}>
              水脂肪周波数差: {params.fieldStrength === 3.0 ? '440Hz (3T)' : '220Hz (1.5T)'} ÷ BW {params.bandwidth}Hz/Px
            </div>
            {cs >= 3 && (
              <div className="mt-1 text-red-400">⚠ 化学シフトアーチファクトが顕著です。BW増加か脂肪抑制を推奨。</div>
            )}
          </div>

          {/* Bandwidth トレードオフ表 */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #1a1520' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold" style={{ color: '#e88b00' }}>BW トレードオフ</div>
              <ParamField label="" value={params.bandwidth} type="number"
                min={50} max={3000} step={50} unit="Hz/px"
                onChange={v => setParam('bandwidth', v as number)} highlight={hl('bandwidth')} />
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#4b5563', fontSize: '9px' }}>
                  <th className="text-left py-0.5">BW</th>
                  <th className="text-center py-0.5">SNR 相対</th>
                  <th className="text-center py-0.5">化学シフト</th>
                  <th className="text-left py-0.5 pl-2">適用</th>
                </tr>
              </thead>
              <tbody>
                {bwImpact.map(({ bw, snrRel, cs: bwCs }) => {
                  const isCurrent = bw === params.bandwidth
                  return (
                    <tr
                      key={bw}
                      className="cursor-pointer"
                      style={{
                        borderTop: '1px solid #111',
                        background: isCurrent ? '#2a1200' : 'transparent',
                      }}
                      onClick={() => setParam('bandwidth', bw)}
                    >
                      <td className="py-0.5 font-mono" style={{ color: isCurrent ? '#e88b00' : '#9ca3af', fontSize: '9px' }}>
                        {bw}
                      </td>
                      <td className="text-center py-0.5 font-mono" style={{
                        color: snrRel >= 100 ? '#34d399' : snrRel >= 70 ? '#fbbf24' : '#f87171',
                        fontSize: '9px',
                      }}>
                        {snrRel}%
                      </td>
                      <td className="text-center py-0.5 font-mono" style={{
                        color: bwCs <= 1.5 ? '#34d399' : bwCs <= 3 ? '#fbbf24' : '#f87171',
                        fontSize: '9px',
                      }}>
                        {bwCs}px
                      </td>
                      <td className="py-0.5 pl-2" style={{ color: '#4b5563', fontSize: '8px' }}>
                        {bw <= 150 ? '高SNR・CS大' :
                         bw <= 300 ? '脳・脊椎標準' :
                         bw <= 500 ? '腹部・関節' :
                         bw <= 1000 ? '腹部高速' : 'EPI・DWI'}
                      </td>
                      {isCurrent && <td>←</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-1.5" style={{ color: '#374151', fontSize: '9px' }}>
              行をクリックで BW を変更。SNR∝1/√BW、CS=化学シフト量(px)
            </div>
          </div>
        </div>
      )}

      {subTab === 'Acceleration' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>iPAT（並列撮像）</div>
          <ParamField label="Acceleration Mode" hintKey="iPAT" value={accelMode} type="select"
            options={['Off', 'GRAPPA', 'CAIPIRINHA']}
            onChange={v => setAccelMode(v as string)} />
          <ParamField label="Deep Resolve" value={deepResolve} type="toggle"
            onChange={v => setDeepResolve(v as boolean)} />
          <ParamField label="Phase Partial Fourier" hintKey="partialFourier" value={phasePartialFourier} type="select"
            options={['Off', '4/8', '5/8', '6/8', '7/8']}
            onChange={v => setPhasePartialFourier(v as string)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Reference</div>
          <ParamField label="Reference Scans" value={refScans} type="select"
            options={['GRE', 'Sep', 'EPI']}
            onChange={v => setRefScans(v as string)} />
          <ParamField label="Acceleration Factor PE" value={accelFactorPE} type="number"
            min={1} max={4} step={1}
            onChange={v => setAccelFactorPE(v as number)} />
          <ParamField label="Reference Lines PE" value={refLinesPE} type="number"
            min={8} max={64} step={4}
            onChange={v => setRefLinesPE(v as number)} />

          {/* iPAT SNR calculation */}
          {accelMode !== 'Off' && (
            <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #3a1a00' }}>
              <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>
                iPAT SNR推定（AF={accelFactorPE}）
              </div>
              <div className="space-y-1" style={{ color: '#9ca3af' }}>
                <div>SNR低下: <span className="font-mono text-yellow-400">
                  {(100 / Math.sqrt(accelFactorPE)).toFixed(0)}%
                </span>（√{accelFactorPE}×g-factor分）</div>
                <div>撮像時間: <span className="font-mono text-green-400">約1/{accelFactorPE}に短縮</span></div>
                {accelMode === 'GRAPPA' && (
                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid #252525' }}>
                    <span className="text-blue-400">GRAPPA: </span>
                    k空間アンダーサンプリング→コイル感度で補間。ACS（Reference Lines）が精度の鍵。
                  </div>
                )}
                {accelMode === 'CAIPIRINHA' && (
                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid #252525' }}>
                    <span className="text-purple-400">CAIPIRINHA: </span>
                    SMS同時多断面励起+ブリップ傾斜でエイリアスをシフト。GRAPPAより68%のケースで画質優位。腹部3D撮像に最適。
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GRAPPA vs CAIPIRINHA comparison */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>GRAPPA vs CAIPIRINHA</div>
            <table className="w-full" style={{ color: '#9ca3af' }}>
              <thead>
                <tr style={{ color: '#6b7280', borderBottom: '1px solid #252525' }}>
                  <th className="text-left pb-1 text-xs">項目</th>
                  <th className="text-center pb-1 text-xs">GRAPPA</th>
                  <th className="text-center pb-1 text-xs">CAIPIRINHA</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-0.5">加速軸</td><td className="text-center">位相方向のみ</td><td className="text-center">位相+スライス</td></tr>
                <tr><td className="py-0.5">g-factor</td><td className="text-center text-yellow-400">高め</td><td className="text-center text-green-400">低い</td></tr>
                <tr><td className="py-0.5">適応</td><td className="text-center">2D/3D全般</td><td className="text-center">3D腹部・骨盤</td></tr>
                <tr><td className="py-0.5">1.5T</td><td className="text-center">AF≤2推奨</td><td className="text-center">AF≤2</td></tr>
                <tr><td className="py-0.5">3T</td><td className="text-center">AF≤3</td><td className="text-center">AF≤3</td></tr>
              </tbody>
            </table>
            <div className="mt-2 pt-1 text-xs" style={{ borderTop: '1px solid #252525', color: '#6b7280' }}>
              DWI(EPI)でAF=2使用→エコートレイン半分→磁化率歪み・EPI歪みが大幅改善（一石二鳥）
            </div>
          </div>
        </div>
      )}

      {subTab === 'Filter' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Raw Data Filter</div>
          <ParamField label="Raw Filter" value={rawFilter} type="toggle"
            onChange={v => setRawFilter(v as boolean)} />
          <ParamField label="Elliptical Filter" value={ellipticalFilter} type="toggle"
            onChange={v => setEllipticalFilter(v as boolean)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Image Filter</div>
          <ParamField label="Image Filter" value={imageFilter} type="toggle"
            onChange={v => setImageFilter(v as boolean)} />
          <ParamField label="Normalize" value={normalize} type="toggle"
            onChange={v => setNormalize(v as boolean)} />
          <ParamField label="Distortion Correction" value={distortionCorr} type="select"
            options={['Off', '2D', '3D']}
            onChange={v => setDistortionCorr(v as string)} />
        </div>
      )}
    </div>
  )
}
