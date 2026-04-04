import { useProtocolStore } from '../store/protocolStore'
import { calcTissueContrast, ernstAngle, calcT2Blur, TISSUES, calcSNR } from '../store/calculators'
import { chemShift } from '../store/calculators'

export function TissueContrastPanel() {
  const { params } = useProtocolStore()
  const signals = calcTissueContrast(params)
  const cs = chemShift(params)
  const t2blur = calcT2Blur(params)
  const snr = calcSNR(params)

  // コントラスト種別の推定
  const isIR = params.TI > 0
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2
  const isGRE = params.turboFactor <= 2 && params.flipAngle < 60
  const isT1 = params.TR < 1500 && params.TE < 30
  const isT2 = params.TR >= 2500 && params.TE >= 60
  const isFLAIR = isIR && params.TI > 1500

  let contrastLabel = '混合'
  if (isDWI) contrastLabel = 'DWI (拡散強調)'
  else if (isFLAIR) contrastLabel = 'FLAIR (水抑制T2)'
  else if (isIR && !isFLAIR) contrastLabel = 'IR / STIR'
  else if (isGRE) contrastLabel = 'GRE (T2*/T1)'
  else if (isT1) contrastLabel = 'T1 強調'
  else if (isT2) contrastLabel = 'T2 強調'

  // Ernst 角計算 (代表 T1: WM 1.5T=1080ms, 3T=1084ms)
  const wmT1 = params.fieldStrength === 3.0 ? 1084 : 1080
  const gmT1 = params.fieldStrength === 3.0 ? 1820 : 1470
  const wmErnst = ernstAngle(wmT1, params.TR)
  const gmErnst = ernstAngle(gmT1, params.TR)

  return (
    <div className="flex flex-col h-full overflow-y-auto text-xs" style={{ background: '#0a0a0a', color: '#c8ccd6' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ background: '#111', borderBottom: '1px solid #252525' }}>
        <div className="font-semibold" style={{ color: '#34d399' }}>Tissue Contrast Predictor</div>
        <div style={{ color: '#4b5563' }}>Bloch方程式による理論的信号強度</div>
      </div>

      <div className="px-3 py-2 space-y-3">

        {/* Contrast type indicator */}
        <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #252525' }}>
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: '#6b7280' }}>推定コントラスト</span>
            <span className="font-semibold px-2 py-0.5 rounded" style={{ background: '#14432a', color: '#34d399', border: '1px solid #166534' }}>
              {contrastLabel}
            </span>
          </div>
          <div className="flex gap-4 mt-2" style={{ color: '#6b7280' }}>
            <div>TR <span className="text-white font-mono">{params.TR}ms</span></div>
            <div>TE <span className="text-white font-mono">{params.TE}ms</span></div>
            {params.TI > 0 && <div>TI <span className="text-white font-mono">{params.TI}ms</span></div>}
            <div>FA <span className="text-white font-mono">{params.flipAngle}°</span></div>
          </div>
        </div>

        {/* Signal bars */}
        <div style={{ borderBottom: '1px solid #1a1a1a' }} className="pb-3">
          <div className="font-semibold mb-2" style={{ color: '#9ca3af' }}>組織別 相対信号強度</div>
          {signals.map(({ tissue, signal, nulled }) => (
            <div key={tissue.label} className="mb-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono w-14" style={{ color: tissue.color }}>{tissue.label}</span>
                {nulled ? (
                  <span style={{ color: '#ef4444' }} className="text-xs">NULL</span>
                ) : (
                  <span style={{ color: '#6b7280' }}>{(signal * 100).toFixed(0)}%</span>
                )}
              </div>
              <div className="w-full h-3 rounded overflow-hidden" style={{ background: '#1a1a1a' }}>
                {nulled ? (
                  <div className="h-full w-full opacity-20 rounded" style={{ background: '#ef4444', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)' }} />
                ) : (
                  <div
                    className="h-full rounded transition-all duration-300"
                    style={{ width: `${signal * 100}%`, background: tissue.color, opacity: 0.85 }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Contrast ratios + CNR */}
        <ContrastRatios signals={signals} snr={snr} />

        {/* Ernst angle */}
        {isGRE && (
          <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #1a2010' }}>
            <div className="font-semibold mb-1" style={{ color: '#86efac' }}>Ernst 角</div>
            <div className="space-y-1" style={{ color: '#9ca3af' }}>
              <div className="flex justify-between">
                <span>WM (T1={params.fieldStrength === 3.0 ? '1084' : '1080'}ms)</span>
                <span className={`font-mono ${Math.abs(params.flipAngle - wmErnst) < 5 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {wmErnst.toFixed(0)}° {Math.abs(params.flipAngle - wmErnst) < 5 ? '✓' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GM (T1={params.fieldStrength === 3.0 ? '1820' : '1470'}ms)</span>
                <span className={`font-mono ${Math.abs(params.flipAngle - gmErnst) < 5 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {gmErnst.toFixed(0)}°
                </span>
              </div>
              <div className="flex justify-between mt-1 pt-1 border-t" style={{ borderColor: '#252525' }}>
                <span>現在のFA</span>
                <span className="font-mono text-white">{params.flipAngle}°</span>
              </div>
            </div>
          </div>
        )}

        {/* T2 blurring */}
        {params.turboFactor > 1 && (
          <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #1a1800' }}>
            <div className="font-semibold mb-1" style={{ color: '#fde047' }}>T2 ぼけ (TSE)</div>
            <div className="flex items-center gap-2" style={{ color: '#9ca3af' }}>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span>最終エコーTE</span>
                  <span className="font-mono text-white">
                    {(params.TE + params.echoSpacing * (params.turboFactor - 1)).toFixed(0)}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>PSF blur 係数</span>
                  <span className={`font-mono ${t2blur > 0.7 ? 'text-green-400' : t2blur > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {t2blur.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            {t2blur < 0.5 && (
              <div className="mt-1 text-xs" style={{ color: '#f87171' }}>
                ⚠ ETL が長すぎます。TF低減またはTE短縮を検討。
              </div>
            )}
          </div>
        )}

        {/* Chemical shift */}
        <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #1a1015' }}>
          <div className="font-semibold mb-1" style={{ color: '#f0abfc' }}>化学シフト</div>
          <div className="flex justify-between" style={{ color: '#9ca3af' }}>
            <span>水脂肪シフト量</span>
            <span className={`font-mono ${cs <= 1.5 ? 'text-green-400' : cs <= 3.0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {cs} pixel
            </span>
          </div>
          <div className="flex justify-between mt-0.5" style={{ color: '#6b7280' }}>
            <span>帯域幅</span>
            <span className="font-mono text-white">{params.bandwidth} Hz/px</span>
          </div>
          {cs > 3.0 && (
            <div className="mt-1 text-xs" style={{ color: '#f87171' }}>
              ⚠ 化学シフトアーチファクトが顕著。BW増加または脂肪抑制を推奨。
            </div>
          )}
        </div>

        {/* Tissue reference */}
        <TissueReference fieldStrength={params.fieldStrength} />

      </div>
    </div>
  )
}

// コントラスト比 + CNR の計算・表示
function ContrastRatios({ signals, snr }: { signals: ReturnType<typeof calcTissueContrast>; snr: number }) {
  const find = (label: string) => signals.find(s => s.tissue.label === label)
  const gm = find('GM')?.signal ?? 0
  const wm = find('WM')?.signal ?? 0
  const csf = find('CSF')?.signal ?? 0
  const fat = find('Fat')?.signal ?? 0
  const liver = find('Liver')?.signal ?? 0
  const muscle = find('Muscle')?.signal ?? 0

  // CNR = |S_A - S_B| × SNR_relative (normalized)
  const cnr = (a: number, b: number) => Math.round(Math.abs(a - b) * snr * 10) / 10

  const pairs: { a: string; b: string; sigA: number; sigB: number; ideal: string }[] = [
    { a: 'GM',     b: 'WM',     sigA: gm,    sigB: wm,     ideal: 'T2: >1.0' },
    { a: 'CSF',    b: 'GM',     sigA: csf,   sigB: gm,     ideal: 'T2: >>1.0' },
    { a: 'Fat',    b: 'GM',     sigA: fat,   sigB: gm,     ideal: 'T1: >1.0' },
    { a: 'Liver',  b: 'Muscle', sigA: liver, sigB: muscle, ideal: '腹部' },
  ]

  return (
    <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #1a1520' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#a78bfa' }}>コントラスト比 / CNR</span>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>CNR = ΔS × SNR</span>
      </div>
      <div className="grid gap-px" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
        {/* Header */}
        <span style={{ color: '#4b5563', fontSize: '8px' }}>組織ペア</span>
        <span className="text-center" style={{ color: '#4b5563', fontSize: '8px' }}>比</span>
        <span className="text-center" style={{ color: '#4b5563', fontSize: '8px' }}>CNR</span>
        <span className="text-center" style={{ color: '#4b5563', fontSize: '8px' }}>参考</span>
        {pairs.map(({ a, b, sigA, sigB, ideal }) => {
          const aT = TISSUES.find(t => t.label === a)
          const bT = TISSUES.find(t => t.label === b)
          const ratio = sigB > 0.01 ? sigA / sigB : 0
          const cnrVal = cnr(sigA, sigB)
          const cnrColor = cnrVal > 15 ? '#34d399' : cnrVal > 5 ? '#fbbf24' : '#f87171'
          return [
            <div key={`${a}${b}_label`} className="flex items-center gap-0.5 py-0.5">
              <span style={{ color: aT?.color, fontSize: '9px' }}>{a}</span>
              <span style={{ color: '#374151', fontSize: '8px' }}>/</span>
              <span style={{ color: bT?.color, fontSize: '9px' }}>{b}</span>
            </div>,
            <span key={`${a}${b}_ratio`} className="font-mono text-center py-0.5" style={{
              color: ratio > 1.2 ? '#34d399' : ratio < 0.8 ? '#f87171' : '#fbbf24',
              fontSize: '9px',
            }}>
              {ratio.toFixed(2)}
            </span>,
            <span key={`${a}${b}_cnr`} className="font-mono text-center py-0.5" style={{ color: cnrColor, fontSize: '9px' }}>
              {cnrVal}
            </span>,
            <span key={`${a}${b}_ideal`} className="text-center py-0.5" style={{ color: '#374151', fontSize: '8px' }}>
              {ideal}
            </span>,
          ]
        })}
      </div>
      <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex justify-between" style={{ color: '#4b5563', fontSize: '8px' }}>
          <span>CNR基準: &gt;15◎ &gt;5○ &lt;5△</span>
          <span>SNR: {snr}</span>
        </div>
      </div>
    </div>
  )
}

// 組織T1/T2参照テーブル
function TissueReference({ fieldStrength }: { fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5
  return (
    <div className="p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#6b7280' }}>
        組織 T1/T2 参照 ({fieldStrength}T)
      </div>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#4b5563' }}>
            <th className="text-left py-0.5">組織</th>
            <th className="text-right py-0.5">T1 (ms)</th>
            <th className="text-right py-0.5">T2 (ms)</th>
            <th className="text-right py-0.5">T2* (ms)</th>
          </tr>
        </thead>
        <tbody>
          {TISSUES.map(t => (
            <tr key={t.label} style={{ borderTop: '1px solid #111' }}>
              <td className="py-0.5 font-mono" style={{ color: t.color }}>{t.label}</td>
              <td className="text-right py-0.5 font-mono" style={{ color: '#9ca3af' }}>
                {is3T ? t.T1_30 : t.T1_15}
              </td>
              <td className="text-right py-0.5 font-mono" style={{ color: '#9ca3af' }}>
                {is3T ? t.T2_30 : t.T2_15}
              </td>
              <td className="text-right py-0.5 font-mono" style={{ color: '#6b7280' }}>
                {is3T ? t.T2star_30 : t.T2star_15}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
