import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField, SectionHeader as SH } from '../ParamField'

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
