import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { calcT2Blur } from '../../store/calculators'

// 臨床用 b値プリセット
const B_VALUE_PRESETS: { label: string; values: number[]; hint: string }[] = [
  { label: '脳梗塞', values: [0, 1000], hint: 'b=0+1000 | 急性期梗塞の標準' },
  { label: '頭部標準', values: [0, 500, 1000], hint: 'b=0+500+1000 | ADC精度向上' },
  { label: '腹部', values: [0, 50, 800], hint: 'b=0+50+800 | IVIM+悪性判定' },
  { label: '肝臓', values: [0, 50, 400, 800], hint: 'b=0+50+400+800 | EOBプロトコル' },
  { label: '前立腺', values: [0, 50, 400, 800, 1500], hint: 'PI-RADS v2.1推奨' },
  { label: '前立腺高b', values: [0, 50, 400, 800, 2000], hint: 'b=2000 | 高感度癌検出' },
]

export function SequenceTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1
  const isHASTE = params.turboFactor >= 80
  const t2blur = calcT2Blur(params)
  const effTE = params.TE + params.echoSpacing * Math.floor(params.turboFactor / 2)
  const lastEchoTE = params.TE + params.echoSpacing * (params.turboFactor - 1)

  // PartialFourier の推奨
  const pfRec = isHASTE ? '5/8 推奨' : params.turboFactor > 30 ? '6/8 推奨' : null

  return (
    <div className="space-y-0.5">
      <ParamField label="Turbo Factor / ETL" hintKey="TurboFactor" value={params.turboFactor} type="range"
        min={1} max={250} step={1}
        onChange={v => setParam('turboFactor', v as number)} highlight={hl('turboFactor')} />
      <ParamField label="Echo Spacing" value={params.echoSpacing} type="number"
        min={2} max={10} step={0.1} unit="ms"
        onChange={v => setParam('echoSpacing', v as number)} />
      <ParamField label="Partial Fourier" hintKey="PartialFourier" value={params.partialFourier} type="select"
        options={['Off', '7/8', '6/8', '5/8', '4/8']}
        onChange={v => setParam('partialFourier', v as typeof params.partialFourier)} highlight={hl('partialFourier')} />

      {/* ETL 計算インジケーター */}
      {params.turboFactor > 1 && (
        <div className="mx-3 mt-2 p-3 rounded text-xs space-y-1.5" style={{ background: '#111', border: '1px solid #252525' }}>
          <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>ETL 計算結果</div>
          <div className="flex justify-between">
            <span style={{ color: '#6b7280' }}>Effective TE (k中心)</span>
            <span className="font-mono text-white">{effTE.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#6b7280' }}>最終エコー TE</span>
            <span className="font-mono text-white">{lastEchoTE.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: '#6b7280' }}>T2 ぼけ係数 (PSF)</span>
            <span className="font-mono" style={{ color: t2blur > 0.7 ? '#34d399' : t2blur > 0.4 ? '#fbbf24' : '#f87171' }}>
              {t2blur.toFixed(2)} {t2blur < 0.5 ? '⚠ ぼけ大' : ''}
            </span>
          </div>
          {/* T2 blur bar */}
          <div className="w-full h-1.5 rounded overflow-hidden" style={{ background: '#1e1e1e' }}>
            <div className="h-full rounded" style={{
              width: `${t2blur * 100}%`,
              background: t2blur > 0.7 ? '#34d399' : t2blur > 0.4 ? '#fbbf24' : '#f87171',
            }} />
          </div>
          {pfRec && (
            <div style={{ color: '#fbbf24', fontSize: '9px' }}>💡 {pfRec}</div>
          )}
        </div>
      )}

      {/* ETL guide */}
      <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #1a1a1a' }}>
        <div className="font-semibold mb-1.5" style={{ color: '#e88b00' }}>Turbo Factor 臨床ガイド</div>
        <table className="w-full">
          <thead>
            <tr style={{ color: '#4b5563', fontSize: '9px' }}>
              <th className="text-left py-0.5 w-32">用途</th>
              <th className="text-center py-0.5">ETL</th>
              <th className="text-left py-0.5 pl-2">特性</th>
            </tr>
          </thead>
          <tbody style={{ color: '#9ca3af' }}>
            {[
              ['T2 TSE 頭部', '15-25', 'コントラスト良好'],
              ['T2 TSE 腹部', '25-40', '速度・ぼけのバランス'],
              ['T2 TSE 関節', '10-15', '精細描出・ぼけ最小'],
              ['PDw TSE', '8-12', 'TE短縮・高SNR'],
              ['FLAIR', '20-30', 'PF必須・SAR注意'],
              ['HASTE', '100+', 'シングルショット'],
              ['MRCP', '150+', '重T2・PF必須'],
            ].map(([label, etl, note]) => (
              <tr key={label} style={{ borderTop: '1px solid #111' }}>
                <td className="py-0.5 text-white">{label}</td>
                <td className="text-center py-0.5 font-mono">{etl}</td>
                <td className="py-0.5 pl-2" style={{ fontSize: '9px', color: '#6b7280' }}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DWI b-values */}
      <div className="border-t mt-2 pt-2 mx-3" style={{ borderColor: '#252525' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: '#9ca3af' }}>b値設定（DWI）</div>

        {/* Current b values */}
        <div className="flex flex-wrap gap-1 mb-2">
          {params.bValues.sort((a, b) => a - b).map((b, i) => (
            <button
              key={i}
              onClick={() => {
                if (params.bValues.length > 1) {
                  setParam('bValues', params.bValues.filter((_, j) => j !== i))
                }
              }}
              className="px-2 py-0.5 rounded text-xs font-mono transition-colors group"
              style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #c47400' }}
              title="クリックで削除"
            >
              b={b}
            </button>
          ))}
        </div>

        {/* Add individual b value */}
        <div className="flex flex-wrap gap-1 mb-2">
          {[0, 50, 100, 400, 500, 800, 1000, 1500, 2000].filter(b => !params.bValues.includes(b)).map(b => (
            <button
              key={b}
              onClick={() => setParam('bValues', [...params.bValues, b].sort((a, z) => a - z))}
              className="px-1.5 py-0.5 rounded text-xs font-mono transition-colors"
              style={{ background: '#1a1a1a', color: '#6b7280', border: '1px solid #2a2a2a' }}
            >
              +{b}
            </button>
          ))}
        </div>

        {/* Clinical b-value presets */}
        <div className="mt-2">
          <div className="text-xs mb-1.5" style={{ color: '#4b5563' }}>臨床プリセット</div>
          <div className="grid grid-cols-2 gap-1">
            {B_VALUE_PRESETS.map(preset => {
              const isActive = JSON.stringify(preset.values.sort()) === JSON.stringify([...params.bValues].sort((a,b) => a-b))
              return (
                <button
                  key={preset.label}
                  onClick={() => setParam('bValues', preset.values)}
                  className="px-2 py-1 rounded text-left transition-colors"
                  style={{
                    background: isActive ? '#2a1200' : '#151515',
                    color: isActive ? '#e88b00' : '#9ca3af',
                    border: `1px solid ${isActive ? '#c47400' : '#252525'}`,
                    fontSize: '10px',
                  }}
                  title={preset.hint}
                >
                  <div className="font-semibold">{preset.label}</div>
                  <div className="font-mono" style={{ fontSize: '8px', color: isActive ? '#c47400' : '#4b5563' }}>
                    b={preset.values.join('+')}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {isDWI && (
          <div className="mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>b値 臨床ガイド</div>
            <table className="w-full">
              <tbody style={{ color: '#9ca3af' }}>
                {[
                  ['b=0', '実質T2画像。ADC算出の基準点'],
                  ['b=50', '灌流効果 (IVIM)。低b値成分の分離'],
                  ['b=400-500', '腹部・肝臓の悪性病変スクリーニング'],
                  ['b=800-1000', '脳梗塞・前立腺の標準'],
                  ['b≥1500', '前立腺高b値 (PI-RADS v2.1推奨)'],
                ].map(([bv, desc]) => (
                  <tr key={bv} style={{ borderTop: '1px solid #111' }}>
                    <td className="py-0.5 text-white w-24 font-mono" style={{ fontSize: '9px' }}>{bv}</td>
                    <td className="py-0.5" style={{ fontSize: '9px' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid #252525', color: '#6b7280', fontSize: '9px' }}>
              ADC算出には最低2点（b=0 + b≥500）が必要。精度向上には3点以上推奨。
              {params.bValues.length >= 3 && (
                <span className="text-green-400"> ✓ {params.bValues.length}点取得 — ADC精度良好</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
