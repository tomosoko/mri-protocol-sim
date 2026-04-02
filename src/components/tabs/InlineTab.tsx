import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

type SubTab = 'Subtraction' | 'MIP' | 'Composing'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e3a5f' : 'transparent',
  color: active ? '#93c5fd' : '#6b7280',
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function InlineTab() {
  const { params, setParam } = useProtocolStore()
  const [subTab, setSubTab] = useState<SubTab>('Subtraction')

  // local state
  const [stdDev, setStdDev] = useState(false)
  const [measurements, setMeasurements] = useState(2)
  const [motionCorr, setMotionCorr] = useState('None')
  const [saveOriginal, setSaveOriginal] = useState(true)
  const [mipSagittal, setMipSagittal] = useState(false)
  const [mipCoronal, setMipCoronal] = useState(false)
  const [mipTransversal, setMipTransversal] = useState(false)
  const [mipTimeSeries, setMipTimeSeries] = useState(false)
  const [mipRadial, setMipRadial] = useState(false)
  const [mprSagittal, setMprSagittal] = useState(false)
  const [mprCoronal, setMprCoronal] = useState(false)
  const [mprTransversal, setMprTransversal] = useState(false)
  const [saveMipOriginal, setSaveMipOriginal] = useState(true)
  const [inlineComposing, setInlineComposing] = useState(false)
  const [mosaicImages, setMosaicImages] = useState(false)
  const [tileSize, setTileSize] = useState(4)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Subtraction', 'MIP', 'Composing'] as SubTab[]).map(t => (
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

      {subTab === 'Subtraction' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Subtraction</div>
          <ParamField label="Subtract" hintKey="inlineMIP" value={params.inlineSubtraction} type="toggle"
            onChange={v => setParam('inlineSubtraction', v as boolean)} />
          {params.inlineSubtraction && (
            <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #065f46', color: '#6ee7b7' }}>
              造影前後を自動減算。CE-MRA・乳腺・骨盤造影で造影増強部位を強調表示。
            </div>
          )}
          <ParamField label="StdDev" value={stdDev} type="toggle"
            onChange={v => setStdDev(v as boolean)} />
          <ParamField label="Measurements" value={measurements} type="number"
            min={1} max={20} step={1}
            onChange={v => setMeasurements(v as number)} />
          <ParamField label="Motion Correction" value={motionCorr} type="select"
            options={['None', 'Phase', 'Frequency']}
            onChange={v => setMotionCorr(v as string)} />
          <ParamField label="Save Original Images" value={saveOriginal} type="toggle"
            onChange={v => setSaveOriginal(v as boolean)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>Subtraction の使いどころ</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div>• CE-MRA: 造影前後差分で血管のみを抽出</div>
              <div>• 乳腺造影: 動的撮像での増強パターン評価</div>
              <div>• 骨盤造影: 背景信号を除去し造影効果を強調</div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'MIP' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>MIP (Maximum Intensity Projection)</div>
          <ParamField label="MIP Sagittal" hintKey="inlineMIP" value={mipSagittal} type="toggle"
            onChange={v => setMipSagittal(v as boolean)} />
          <ParamField label="MIP Coronal" value={mipCoronal} type="toggle"
            onChange={v => setMipCoronal(v as boolean)} />
          <ParamField label="MIP Transversal" value={mipTransversal} type="toggle"
            onChange={v => setMipTransversal(v as boolean)} />
          <ParamField label="MIP Time Series" value={mipTimeSeries} type="toggle"
            onChange={v => setMipTimeSeries(v as boolean)} />
          <ParamField label="MIP Radial" value={mipRadial} type="toggle"
            onChange={v => setMipRadial(v as boolean)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>MPR (Multi-Planar Reconstruction)</div>
          <ParamField label="MPR Sagittal" value={mprSagittal} type="toggle"
            onChange={v => setMprSagittal(v as boolean)} />
          <ParamField label="MPR Coronal" value={mprCoronal} type="toggle"
            onChange={v => setMprCoronal(v as boolean)} />
          <ParamField label="MPR Transversal" value={mprTransversal} type="toggle"
            onChange={v => setMprTransversal(v as boolean)} />
          <ParamField label="Save Original" value={saveMipOriginal} type="toggle"
            onChange={v => setSaveMipOriginal(v as boolean)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>MIP/MPR の使い分け</div>
            <table className="w-full">
              <tbody style={{ color: '#9ca3af' }}>
                <tr><td className="py-0.5 text-white w-28">MIP</td><td>TOF-MRA / PC-MRA / CE-MRA</td></tr>
                <tr><td className="py-0.5 text-white">MPR</td><td>3D VIBE / MPRAGE / CISS / 3D FIESTA</td></tr>
                <tr><td className="py-0.5 text-white">ADC Map</td><td>全てのDWI（脳・腹部・前立腺）</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'Composing' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Image Composing</div>
          <ParamField label="Inline Composing" value={inlineComposing} type="toggle"
            onChange={v => setInlineComposing(v as boolean)} />
          <ParamField label="Mosaic Images" value={mosaicImages} type="toggle"
            onChange={v => setMosaicImages(v as boolean)} />
          <ParamField label="Tile Size" value={tileSize} type="number"
            min={2} max={16} step={1}
            onChange={v => setTileSize(v as number)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>ADC / MPR</div>
          <ParamField label="ADC Map" hintKey="inlineADC" value={params.inlineADC} type="toggle"
            onChange={v => setParam('inlineADC', v as boolean)} />
          {params.inlineADC && (
            <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #065f46', color: '#6ee7b7' }}>
              DWI終了後に自動でADCマップを再構成・保存します。T2シャインスルーの鑑別に必須。
            </div>
          )}
          <ParamField label="MPR" value={params.inlineMPR} type="toggle"
            onChange={v => setParam('inlineMPR', v as boolean)} />
          {params.inlineMPR && (
            <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #065f46', color: '#6ee7b7' }}>
              3D収集後にTra/Cor/Sag断面を自動再構成。VIBEやMPRAGEで有用。
            </div>
          )}

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div style={{ color: '#9ca3af' }}>
              Inline Composing: 複数シリーズを自動合成して1シリーズに統合。読影ワークフローを効率化します。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
