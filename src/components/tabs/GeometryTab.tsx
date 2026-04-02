import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

export function GeometryTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const phaseEncOptions: typeof params.phaseEncDir[] = ['A>>P', 'P>>A', 'R>>L', 'L>>R', 'H>>F', 'F>>H']

  return (
    <div className="space-y-0.5">
      <ParamField label="Orientation（断面方向）" value={params.orientation} type="select"
        options={['Tra', 'Cor', 'Sag']}
        onChange={v => setParam('orientation', v as typeof params.orientation)} />
      <ParamField label="Phase Enc. Direction" hintKey="PhaseEncDir" value={params.phaseEncDir} type="select"
        options={phaseEncOptions}
        onChange={v => setParam('phaseEncDir', v as typeof params.phaseEncDir)} highlight={hl('phaseEncDir')} />
      <ParamField label="Phase Oversampling" hintKey="PhaseOversampling" value={params.phaseOversampling} type="range"
        min={0} max={100} step={10} unit="%"
        onChange={v => setParam('phaseOversampling', v as number)} highlight={hl('phaseOversampling')} />
      <ParamField label="Saturation Bands" value={params.satBands} type="toggle"
        onChange={v => setParam('satBands', v as boolean)} highlight={hl('satBands')} />

      {/* Phase direction guide */}
      <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
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
            <tr><td className="py-0.5 text-white">腹部 Tra</td><td>A&gt;&gt;P</td><td>呼吸アーチファクトを前後に（左右は臓器と重なる）</td></tr>
            <tr><td className="py-0.5 text-white">脊椎 Sag</td><td>H&gt;&gt;F</td><td>嚥下・心拍アーチファクトを縦方向に</td></tr>
            <tr><td className="py-0.5 text-white">乳腺</td><td>R&gt;&gt;L</td><td>心拍アーチファクトを乳腺外へ</td></tr>
            <tr><td className="py-0.5 text-white">膝関節 Sag</td><td>A&gt;&gt;P</td><td>体の短辺方向→エイリアシングリスク↓</td></tr>
          </tbody>
        </table>
      </div>

      {/* Sat band guide */}
      <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
        <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>Saturation Bandの使いどころ</div>
        <ul className="space-y-0.5" style={{ color: '#9ca3af' }}>
          <li>• 腹部動脈MRA: 静脈血の上流にSat Band → 静脈信号抑制</li>
          <li>• 腰椎矢状断: 腹部大動脈前方にSat Band → 拍動アーチファクト低減</li>
          <li>• 頚椎矢状断: 喉頭（嚥下）前方にSat Band → 嚥下アーチファクト低減</li>
          <li>• 骨盤: 直腸ガス・膀胱前方にSat Band → 化学シフト軽減</li>
        </ul>
      </div>
    </div>
  )
}
