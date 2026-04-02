import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

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

  return (
    <div className="space-y-0.5">
      <ParamField label="Fat Saturation" hintKey="FatSat" value={params.fatSat} type="select"
        options={['None', 'CHESS', 'SPAIR', 'STIR', 'Dixon']}
        onChange={v => setParam('fatSat', v as typeof params.fatSat)} highlight={hl('fatSat')} />

      {/* Fat sat explanation */}
      <div className="mx-3 mt-1 mb-3 p-2 rounded text-xs" style={{ background: '#0f172a', color: '#9ca3af', border: '1px solid #1f2937' }}>
        {fatSatDesc[params.fatSat]}
      </div>

      <ParamField label="Flip Angle" hintKey="FlipAngle" value={params.flipAngle} type="range" min={5} max={180} step={5} unit="°"
        onChange={v => setParam('flipAngle', v as number)} highlight={hl('flipAngle')} />
      <ParamField label="Magnetization Transfer" value={params.mt} type="toggle"
        onChange={v => setParam('mt', v as boolean)} />

      {params.mt && (
        <div className="mx-3 p-2 rounded text-xs" style={{ background: '#0f172a', color: '#9ca3af', border: '1px solid #1f2937' }}>
          MT: 自由水の信号を抑制 → 造影増強効果を相対的に強調。MRAや脊髄造影後に有効。SAR↑に注意。
        </div>
      )}

      {/* T1/T2 contrast guide */}
      <div className="mx-3 mt-4 p-3 rounded" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: '#60a5fa' }}>コントラスト重み付けの目安</div>
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
            <tr><td className="py-0.5 text-blue-400 font-medium">T1強調</td><td className="text-center">短い（400-600）</td><td className="text-center">短い（10-20）</td><td>脂肪・出血・Gd造影部</td></tr>
            <tr><td className="py-0.5 text-cyan-400 font-medium">T2強調</td><td className="text-center">長い（≥2000）</td><td className="text-center">長い（80-120）</td><td>水・浮腫・腫瘍・嚢胞</td></tr>
            <tr><td className="py-0.5 text-purple-400 font-medium">PD強調</td><td className="text-center">長い（≥2000）</td><td className="text-center">短い（20-30）</td><td>軟骨・半月板・白質</td></tr>
            <tr><td className="py-0.5 text-green-400 font-medium">FLAIR</td><td className="text-center">長い（≥8000）</td><td className="text-center">長い（120）</td><td>T2+水抑制（TI=2200）</td></tr>
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
  )
}
