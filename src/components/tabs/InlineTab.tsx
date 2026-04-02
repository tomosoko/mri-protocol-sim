import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

export function InlineTab() {
  const { params, setParam } = useProtocolStore()

  return (
    <div className="space-y-0.5">
      <ParamField label="ADC Map（拡散係数マップ）" hintKey="InlineADC" value={params.inlineADC} type="toggle"
        onChange={v => setParam('inlineADC', v as boolean)} />
      {params.inlineADC && (
        <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #065f46', color: '#6ee7b7' }}>
          ✓ DWI終了後に自動でADCマップを再構成・保存します。T2シャインスルーの鑑別に必須。
        </div>
      )}

      <ParamField label="MIP（最大値投影）" hintKey="InlineMIP" value={params.inlineMIP} type="toggle"
        onChange={v => setParam('inlineMIP', v as boolean)} />
      {params.inlineMIP && (
        <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #065f46', color: '#6ee7b7' }}>
          ✓ MRA終了後に自動でMIPを生成。Axial/Cor/Sag+回転MIPが作成されます。
        </div>
      )}

      <ParamField label="MPR（多断面再構成）" value={params.inlineMPR} type="toggle"
        onChange={v => setParam('inlineMPR', v as boolean)} />
      {params.inlineMPR && (
        <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #065f46', color: '#6ee7b7' }}>
          ✓ 3D収集後にTra/Cor/Sag断面を自動再構成。VIBEやMPRAGEで有用。
        </div>
      )}

      <ParamField label="Subtraction（差分画像）" value={params.inlineSubtraction} type="toggle"
        onChange={v => setParam('inlineSubtraction', v as boolean)} />
      {params.inlineSubtraction && (
        <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #065f46', color: '#6ee7b7' }}>
          ✓ 造影前後を自動減算。CE-MRA・乳腺・骨盤造影で造影増強部位を強調表示。
        </div>
      )}

      {/* Inline usage guide */}
      <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
        <div className="font-semibold mb-2" style={{ color: '#60a5fa' }}>Inline処理の使い分け</div>
        <table className="w-full">
          <thead>
            <tr style={{ color: '#6b7280' }}>
              <th className="text-left pb-1">処理</th>
              <th className="text-left pb-1">使う検査</th>
            </tr>
          </thead>
          <tbody className="text-xs" style={{ color: '#9ca3af' }}>
            <tr><td className="py-0.5 text-white">ADC Map</td><td>全てのDWI（脳・腹部・前立腺）</td></tr>
            <tr><td className="py-0.5 text-white">MIP</td><td>TOF-MRA / PC-MRA / CE-MRA</td></tr>
            <tr><td className="py-0.5 text-white">MPR</td><td>3D VIBE / MPRAGE / CISS / 3D FIESTA</td></tr>
            <tr><td className="py-0.5 text-white">Subtraction</td><td>CE-MRA / 乳腺造影 / 骨盤CE</td></tr>
          </tbody>
        </table>
        <div className="mt-2" style={{ color: '#6b7280' }}>
          ★ ONにしておくと撮像終了と同時に診断用画像が自動生成 → 読影待ち時間の短縮
        </div>
      </div>
    </div>
  )
}
