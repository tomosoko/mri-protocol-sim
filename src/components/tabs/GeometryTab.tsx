import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

type SubTab = 'Common' | 'AutoAlign' | 'Navigator' | 'Saturation' | 'Tim'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e3a5f' : 'transparent',
  color: active ? '#93c5fd' : '#6b7280',
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function GeometryTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Common')

  // local state
  const [multiSliceMode, setMultiSliceMode] = useState('Interleaved')
  const [concatenations, setConcatenations] = useState(1)
  const [autoAlignInitPos, setAutoAlignInitPos] = useState(true)
  const [autoAlignInitOri, setAutoAlignInitOri] = useState(true)
  const [autoAlignInitRot, setAutoAlignInitRot] = useState(false)
  const [autoAlign3D, setAutoAlign3D] = useState(false)
  const [navigator, setNavigator] = useState(false)
  const [navAcceptance, setNavAcceptance] = useState(50)
  const [navPosition, setNavPosition] = useState('Auto')
  const [specialSat, setSpecialSat] = useState('None')
  const [satGap, setSatGap] = useState(10)
  const [satThickness, setSatThickness] = useState(40)
  const [setNGo, setSetNGo] = useState(false)
  const [inlineComposing, setInlineComposing] = useState(false)
  const [tablePosH, setTablePosH] = useState(0)

  const phaseEncOptions: typeof params.phaseEncDir[] = ['A>>P', 'P>>A', 'R>>L', 'L>>R', 'H>>F', 'F>>H']

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Common', 'AutoAlign', 'Navigator', 'Saturation', 'Tim'] as SubTab[]).map(t => (
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

      {subTab === 'Common' && (
        <div className="space-y-0.5">
          <ParamField label="Orientation" value={params.orientation} type="select"
            options={['Tra', 'Cor', 'Sag']}
            onChange={v => setParam('orientation', v as typeof params.orientation)} />
          <ParamField label="Phase Enc Dir" hintKey="phaseEncDir" value={params.phaseEncDir} type="select"
            options={phaseEncOptions}
            onChange={v => setParam('phaseEncDir', v as typeof params.phaseEncDir)} highlight={hl('phaseEncDir')} />
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
          <ParamField label="FOV Phase%" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} />
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range" min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />
          <ParamField label="Multi Slice Mode" value={multiSliceMode} type="select"
            options={['Single Shot', 'Interleaved']}
            onChange={v => setMultiSliceMode(v as string)} />
          <ParamField label="Concatenations" value={concatenations} type="number"
            min={1} max={16} step={1}
            onChange={v => setConcatenations(v as number)} />

          {/* Phase direction guide */}
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#60a5fa' }}>位相方向の選択ガイド</div>
            <table className="w-full">
              <thead>
                <tr style={{ color: '#6b7280' }}>
                  <th className="text-left pb-1">部位</th>
                  <th className="text-left pb-1">推奨</th>
                  <th className="text-left pb-1">理由</th>
                </tr>
              </thead>
              <tbody className="text-xs" style={{ color: '#9ca3af' }}>
                <tr><td className="py-0.5 text-white">頭部 Tra</td><td>A&gt;&gt;P</td><td>眼球運動アーチファクトを前後方向に</td></tr>
                <tr><td className="py-0.5 text-white">腹部 Tra</td><td>A&gt;&gt;P</td><td>呼吸アーチファクトを前後に</td></tr>
                <tr><td className="py-0.5 text-white">脊椎 Sag</td><td>H&gt;&gt;F</td><td>嚥下・心拍アーチファクトを縦方向に</td></tr>
                <tr><td className="py-0.5 text-white">乳腺</td><td>R&gt;&gt;L</td><td>心拍アーチファクトを乳腺外へ</td></tr>
                <tr><td className="py-0.5 text-white">膝関節 Sag</td><td>A&gt;&gt;P</td><td>体の短辺方向→エイリアシングリスク↓</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'AutoAlign' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>AutoAlign Settings</div>
          <ParamField label="Initial Position" value={autoAlignInitPos} type="toggle"
            onChange={v => setAutoAlignInitPos(v as boolean)} />
          <ParamField label="Initial Orientation" value={autoAlignInitOri} type="toggle"
            onChange={v => setAutoAlignInitOri(v as boolean)} />
          <ParamField label="Initial Rotation" value={autoAlignInitRot} type="toggle"
            onChange={v => setAutoAlignInitRot(v as boolean)} />
          <ParamField label="3D AutoAlign" value={autoAlign3D} type="toggle"
            onChange={v => setAutoAlign3D(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>AutoAlignについて</div>
            <div style={{ color: '#9ca3af' }}>
              自動的に解剖学的ランドマークを検出し、スライス位置・向きを最適化します。
              頭部・膝関節・脊椎プロトコルで特に有効。再現性の向上に貢献します。
            </div>
          </div>
        </div>
      )}

      {subTab === 'Navigator' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Navigator Echo</div>
          <ParamField label="Navigator" hintKey="PACE" value={navigator} type="toggle"
            onChange={v => setNavigator(v as boolean)} />
          {navigator && (
            <>
              <ParamField label="Navigator Acceptance%" value={navAcceptance} type="range"
                min={30} max={70} step={5} unit="%"
                onChange={v => setNavAcceptance(v as number)} />
              <ParamField label="Navigator Position" value={navPosition} type="select"
                options={['Auto', 'Manual']}
                onChange={v => setNavPosition(v as string)} />
              <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
                <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>PACE収集効率の目安</div>
                <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
                  <div>収集窓 <span className="text-white">±2.5mm:</span> 効率50-60%、精度◎</div>
                  <div>収集窓 <span className="text-white">±5mm:</span> 効率70-80%、精度○</div>
                  <div>収集窓 <span className="text-white">±10mm:</span> 効率90%+、精度△</div>
                  <div className="mt-1" style={{ color: '#6b7280' }}>撮像時間 = 基準時間 ÷ 収集効率</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {subTab === 'Saturation' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Saturation Bands</div>
          <ParamField label="Sat Bands" value={params.satBands} type="toggle"
            onChange={v => setParam('satBands', v as boolean)} />
          <ParamField label="Special Saturation" value={specialSat} type="select"
            options={['None', 'Parallel F/H', 'Parallel R/L']}
            onChange={v => setSpecialSat(v as string)} />
          <ParamField label="Sat Gap" value={satGap} type="number"
            min={0} max={100} step={5} unit="mm"
            onChange={v => setSatGap(v as number)} />
          <ParamField label="Sat Thickness" value={satThickness} type="number"
            min={10} max={150} step={5} unit="mm"
            onChange={v => setSatThickness(v as number)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>Saturation Bandの使いどころ</div>
            <ul className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <li>• 腹部動脈MRA: 静脈血の上流にSat Band → 静脈信号抑制</li>
              <li>• 腰椎矢状断: 腹部大動脈前方にSat Band → 拍動アーチファクト低減</li>
              <li>• 頚椎矢状断: 喉頭前方にSat Band → 嚥下アーチファクト低減</li>
              <li>• 骨盤: 直腸ガス・膀胱前方にSat Band → 化学シフト軽減</li>
            </ul>
          </div>
        </div>
      )}

      {subTab === 'Tim' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Tim Settings</div>
          <ParamField label="Set-n-Go Protocol" value={setNGo} type="toggle"
            onChange={v => setSetNGo(v as boolean)} />
          <ParamField label="Inline Composing" value={inlineComposing} type="toggle"
            onChange={v => setInlineComposing(v as boolean)} />
          <ParamField label="Table Position H" value={tablePosH} type="number"
            min={-500} max={500} step={10} unit="mm"
            onChange={v => setTablePosH(v as number)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>Tim (Total imaging matrix)</div>
            <div style={{ color: '#9ca3af' }}>
              複数のコイルを組み合わせて大FOV撮像を実現。脊椎全長・全身DWIなどで使用。
              Set-n-Go: テーブル移動を自動化し連続撮像を効率化します。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
