import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

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
