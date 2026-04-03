import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

export function SequenceTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1

  return (
    <div className="space-y-0.5">
      <ParamField label="Turbo Factor / ETL" hintKey="TurboFactor" value={params.turboFactor} type="range"
        min={1} max={200} step={1}
        onChange={v => setParam('turboFactor', v as number)} highlight={hl('turboFactor')} />
      <ParamField label="Echo Spacing" value={params.echoSpacing} type="number"
        min={2} max={10} step={0.1} unit="ms"
        onChange={v => setParam('echoSpacing', v as number)} />
      <ParamField label="Partial Fourier" hintKey="PartialFourier" value={params.partialFourier} type="select"
        options={['Off', '7/8', '6/8', '5/8', '4/8']}
        onChange={v => setParam('partialFourier', v as typeof params.partialFourier)} highlight={hl('partialFourier')} />

      {/* ETL guide */}
      <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
        <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>Turbo Factor（ETL）の使い分け</div>
        <table className="w-full">
          <tbody style={{ color: '#9ca3af' }}>
            <tr><td className="py-0.5 text-white w-36">T2 TSE 頭部</td><td>ETL 15-25</td><td style={{ color: '#6b7280' }}>高コントラスト</td></tr>
            <tr><td className="py-0.5 text-white">T2 TSE 腹部</td><td>ETL 25-40</td><td style={{ color: '#6b7280' }}>速度重視</td></tr>
            <tr><td className="py-0.5 text-white">T2 TSE 関節</td><td>ETL 10-15</td><td style={{ color: '#6b7280' }}>精細描出</td></tr>
            <tr><td className="py-0.5 text-white">HASTE</td><td>ETL 100+</td><td style={{ color: '#6b7280' }}>1ショット</td></tr>
            <tr><td className="py-0.5 text-white">MRCP</td><td>ETL 150+</td><td style={{ color: '#6b7280' }}>重T2</td></tr>
          </tbody>
        </table>
      </div>

      {/* DWI b-values */}
      <div className="border-t mt-2 pt-2 mx-3" style={{ borderColor: '#252525' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: '#9ca3af' }}>b値設定（DWI）</div>
        <div className="flex flex-wrap gap-1 mb-2">
          {params.bValues.map((b, i) => (
            <span key={i} className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #c47400' }}>
              b={b}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          {[0, 50, 500, 800, 1000, 1500, 2000].filter(b => !params.bValues.includes(b)).map(b => (
            <button
              key={b}
              onClick={() => setParam('bValues', [...params.bValues, b].sort((a, z) => a - z))}
              className="px-2 py-0.5 rounded text-xs font-mono transition-colors"
              style={{ background: '#252525', color: '#6b7280', border: '1px solid #374151' }}
            >
              +b{b}
            </button>
          ))}
          {params.bValues.length > 2 && (
            <button
              onClick={() => setParam('bValues', params.bValues.slice(0, -1))}
              className="px-2 py-0.5 rounded text-xs transition-colors"
              style={{ background: '#2d1515', color: '#f87171', border: '1px solid #7f1d1d' }}
            >
              最後を削除
            </button>
          )}
        </div>

        {isDWI && (
          <div className="mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>b値の臨床ガイド</div>
            <table className="w-full">
              <tbody style={{ color: '#9ca3af' }}>
                <tr><td className="py-0.5 text-white w-24">b=0</td><td>実質T2画像。ADC算出の基準点。</td></tr>
                <tr><td className="py-0.5 text-white">b=50</td><td>灌流効果(IVIM)の評価。低b値成分の分離。</td></tr>
                <tr><td className="py-0.5 text-white">b=500-800</td><td>腹部・肝臓の標準。悪性病変検出。</td></tr>
                <tr><td className="py-0.5 text-white">b=1000</td><td>脳梗塞・前立腺の標準。急性期梗塞で高信号。</td></tr>
                <tr><td className="py-0.5 text-white">b≥1500</td><td>前立腺高b値（PI-RADS v2.1推奨）。超高b値。</td></tr>
              </tbody>
            </table>
            <div className="mt-2" style={{ color: '#6b7280' }}>
              ADC算出には最低2点（b=0とb≥500）が必要。精度向上には3点以上推奨。
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
