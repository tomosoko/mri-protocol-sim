import { useMemo } from 'react'
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

        {/* Sequence optimization tips */}
        <SequenceOptimizationTips
          contrastLabel={contrastLabel}
          isGRE={isGRE}
          isIR={isIR}
          isFLAIR={isFLAIR}
          isDWI={isDWI}
          TR={params.TR}
          TE={params.TE}
          FA={params.flipAngle}
          fieldStrength={params.fieldStrength}
          turboFactor={params.turboFactor}
        />

        {/* Tissue reference */}
        <TissueReference fieldStrength={params.fieldStrength} />

      </div>
    </div>
  )
}

// コントラスト比 + CNR の計算・表示（CNRバーチャート付き）
function ContrastRatios({ signals, snr }: { signals: ReturnType<typeof calcTissueContrast>; snr: number }) {
  const find = (label: string) => signals.find(s => s.tissue.label === label)
  const gm = find('GM')?.signal ?? 0
  const wm = find('WM')?.signal ?? 0
  const csf = find('CSF')?.signal ?? 0
  const fat = find('Fat')?.signal ?? 0
  const liver = find('Liver')?.signal ?? 0
  const muscle = find('Muscle')?.signal ?? 0

  const cnr = (a: number, b: number) => Math.round(Math.abs(a - b) * snr * 10) / 10

  const pairs: { a: string; b: string; sigA: number; sigB: number; category: string }[] = [
    { a: 'GM',    b: 'WM',     sigA: gm,    sigB: wm,     category: '脳' },
    { a: 'CSF',   b: 'GM',     sigA: csf,   sigB: gm,     category: '脳' },
    { a: 'Fat',   b: 'GM',     sigA: fat,   sigB: gm,     category: '脂肪' },
    { a: 'Liver', b: 'Muscle', sigA: liver, sigB: muscle, category: '腹部' },
  ]

  const cnrValues = pairs.map(p => cnr(p.sigA, p.sigB))
  const maxCNR = Math.max(...cnrValues, 1)

  // SVG bar chart dimensions
  const W = 240, H = 64, barH = 10, gap = 6, padL = 52, padR = 8

  return (
    <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #1a1520' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#a78bfa' }}>コントラスト比 / CNR</span>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>CNR = ΔS × SNR</span>
      </div>

      {/* CNR mini bar chart */}
      <svg width={W} height={H} style={{ display: 'block', margin: '0 auto 6px' }}>
        {pairs.map(({ a, b, sigA, sigB }, i) => {
          const aT = TISSUES.find(t => t.label === a)
          const bT = TISSUES.find(t => t.label === b)
          const cnrVal = cnr(sigA, sigB)
          const barW = Math.max(2, ((cnrVal / maxCNR) * (W - padL - padR)))
          const y = i * (barH + gap) + 4
          const color = cnrVal > 15 ? '#34d399' : cnrVal > 5 ? '#fbbf24' : '#f87171'
          return (
            <g key={`${a}${b}`}>
              {/* Label */}
              <text x={padL - 4} y={y + barH - 2} textAnchor="end" fontSize={8} fill={aT?.color ?? '#9ca3af'}>
                {a}
              </text>
              <text x={padL - 4 - 18} y={y + barH - 2} textAnchor="end" fontSize={7} fill={bT?.color ?? '#6b7280'}>
                /{b}
              </text>
              {/* Track */}
              <rect x={padL} y={y} width={W - padL - padR} height={barH} rx={2} fill="#1e1e1e" />
              {/* Bar */}
              <rect x={padL} y={y} width={barW} height={barH} rx={2} fill={color} opacity={0.85} />
              {/* Value */}
              <text x={padL + barW + 3} y={y + barH - 2} fontSize={8} fill={color}>{cnrVal}</text>
            </g>
          )
        })}
        {/* Reference lines at 5 and 15 */}
        {[5, 15].map(ref => {
          const x = padL + (ref / maxCNR) * (W - padL - padR)
          if (x > W - padR) return null
          return (
            <g key={ref}>
              <line x1={x} y1={0} x2={x} y2={H - 2} stroke="#333" strokeWidth={1} strokeDasharray="2,2" />
              <text x={x} y={H - 1} textAnchor="middle" fontSize={7} fill="#374151">{ref}</text>
            </g>
          )
        })}
      </svg>

      {/* Ratio table */}
      <div className="grid gap-px" style={{ gridTemplateColumns: '1fr auto auto' }}>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>組織ペア</span>
        <span className="text-center" style={{ color: '#4b5563', fontSize: '8px' }}>比率</span>
        <span className="text-center" style={{ color: '#4b5563', fontSize: '8px' }}>分類</span>
        {pairs.map(({ a, b, sigA, sigB, category }) => {
          const aT = TISSUES.find(t => t.label === a)
          const bT = TISSUES.find(t => t.label === b)
          const ratio = sigB > 0.01 ? sigA / sigB : 0
          return [
            <div key={`${a}${b}_label`} className="flex items-center gap-0.5 py-0.5">
              <span style={{ color: aT?.color, fontSize: '9px' }}>{a}</span>
              <span style={{ color: '#374151', fontSize: '8px' }}>/</span>
              <span style={{ color: bT?.color, fontSize: '9px' }}>{b}</span>
            </div>,
            <span key={`${a}${b}_ratio`} className="font-mono text-center py-0.5" style={{
              color: ratio > 1.2 ? '#34d399' : ratio > 0.8 ? '#fbbf24' : '#f87171',
              fontSize: '9px',
            }}>
              {ratio.toFixed(2)}
            </span>,
            <span key={`${a}${b}_cat`} className="text-center py-0.5" style={{ color: '#374151', fontSize: '8px' }}>
              {category}
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

// シーケンス最適化のヒント
function SequenceOptimizationTips({
  contrastLabel, isGRE, isIR, isFLAIR, isDWI,
  TR, TE, FA, fieldStrength, turboFactor
}: {
  contrastLabel: string; isGRE: boolean; isIR: boolean; isFLAIR: boolean; isDWI: boolean
  TR: number; TE: number; FA: number; fieldStrength: number; turboFactor: number
}) {
  const is3T = fieldStrength >= 2.5

  const tips = useMemo(() => {
    const result: { icon: string; color: string; text: string }[] = []

    if (isDWI) {
      result.push({ icon: '◆', color: '#60a5fa', text: 'b=0とb=1000の2点でADC計算可能。b値追加で精度向上。' })
      if (is3T) result.push({ icon: '⚠', color: '#fbbf24', text: '3T DWI: 幾何歪み増大。iPAT R=2またはリバースPEで補正を。' })
    } else if (isFLAIR) {
      result.push({ icon: '◆', color: '#60a5fa', text: `FLAIR最適TI(1.5T:3400ms 3T:2500ms頃)で水を完全抑制。` })
      result.push({ icon: '◆', color: '#60a5fa', text: 'FLAIR+MPRAGE組合せでMS病巣評価に有効。' })
      if (TE < 90) result.push({ icon: '△', color: '#fbbf24', text: `TE ${TE}ms → T2強調不十分。90ms以上を推奨。` })
    } else if (isIR) {
      result.push({ icon: '◆', color: '#4ade80', text: `STIR: TI ${Math.round((is3T ? 220 : 160))}ms付近で脂肪抑制最大。フィールド非依存性が強み。` })
    } else if (isGRE) {
      const ernstWM = Math.round((Math.acos(Math.exp(-TR / (is3T ? 1084 : 1080))) * 180) / Math.PI)
      if (Math.abs(FA - ernstWM) > 15) {
        result.push({ icon: '△', color: '#fbbf24', text: `現在FA ${FA}°、WM Ernst角 ${ernstWM}°。SNR最大化にはErnst角付近を推奨。` })
      } else {
        result.push({ icon: '✓', color: '#34d399', text: `FA ${FA}° ≈ Ernst角 ${ernstWM}°。WM SNR最適化済み。` })
      }
      if (is3T && TE > 20) result.push({ icon: '⚠', color: '#f87171', text: '3T GRE: TE長すぎるとT2*ぼけ増大。TE<15ms推奨。' })
    } else if (TR < 1500 && TE < 30) {
      // T1 SE
      if (TR > 800) result.push({ icon: '△', color: '#fbbf24', text: `T1強調: TR ${TR}ms → T1コントラスト弱め。600ms以下推奨。` })
      if (turboFactor > 4) result.push({ icon: '◆', color: '#60a5fa', text: `TSE T1: TF ${turboFactor}は脂肪ハイシグナルに注意。TF低減推奨。` })
    } else if (TR >= 2500 && TE >= 60) {
      // T2
      if (TE > 120) result.push({ icon: '△', color: '#fbbf24', text: `TE ${TE}ms → 長すぎてSNR低下。90-100ms推奨。` })
      if (turboFactor < 8) result.push({ icon: '◆', color: '#60a5fa', text: `T2強調: TF ${turboFactor}低め。16以上でスキャン時間短縮可。` })
    }

    // 3T共通
    if (is3T && !isDWI) {
      result.push({ icon: '◆', color: '#818cf8', text: '3T: B1不均一性対策にAdFlip/TrueFormを使用推奨。' })
    }

    // turboFactor
    if (turboFactor > 20 && !isDWI) {
      result.push({ icon: '⚠', color: '#f87171', text: `TF ${turboFactor} → T2ぼけ増大リスク。エコースペーシング確認を。` })
    }

    return result.slice(0, 4) // max 4 tips
  }, [isDWI, isFLAIR, isIR, isGRE, TR, TE, FA, fieldStrength, turboFactor, is3T, contrastLabel])

  if (tips.length === 0) return null

  return (
    <div className="p-2 rounded" style={{ background: '#0e1218', border: '1px solid #1a2030' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.06em' }}>
        OPTIMIZATION TIPS — {contrastLabel}
      </div>
      <div className="space-y-1">
        {tips.map((tip, i) => (
          <div key={i} className="flex gap-1.5" style={{ fontSize: '9px' }}>
            <span style={{ color: tip.color, flexShrink: 0, width: '10px' }}>{tip.icon}</span>
            <span style={{ color: '#9ca3af', lineHeight: 1.4 }}>{tip.text}</span>
          </div>
        ))}
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
