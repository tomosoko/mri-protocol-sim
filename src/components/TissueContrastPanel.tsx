import { useMemo, useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { calcTissueContrast, ernstAngle, calcT2Blur, calcSNR } from '../store/calculators'
import { chemShift } from '../store/calculators'
import {
  PATHOLOGY_PRESETS,
  calcLesionSignal,
  PathologyDetectability,
  ContrastRatios,
  SequenceOptimizationTips,
  TissueReference,
} from './tissuecontrast/tissueContrastUtils'

export function TissueContrastPanel() {
  const { params } = useProtocolStore()
  const signals = calcTissueContrast(params)
  const cs = chemShift(params)
  const t2blur = calcT2Blur(params)
  const snr = calcSNR(params)

  const [selectedPathology, setSelectedPathology] = useState<string | null>(null)
  const activePreset = PATHOLOGY_PRESETS.find(p => p.id === selectedPathology) ?? null

  const detectabilityScore = useMemo(() => {
    if (!activePreset) return null
    const is3T = params.fieldStrength >= 2.5
    const T1 = is3T ? activePreset.T1_30 : activePreset.T1_15
    const T2 = is3T ? activePreset.T2_30 : activePreset.T2_15
    const lesionSig = calcLesionSignal(T1, T2, params)
    const bgSignal = signals.find(s => s.tissue.label === activePreset.backgroundLabel)?.signal ?? 0
    const maxSig = Math.max(...signals.map(s => s.signal), 0.001)
    const bgRaw = bgSignal * maxSig
    const noiseEstimate = 1 / Math.max(snr, 1)
    const cnr = Math.abs(lesionSig - bgRaw) / noiseEstimate
    return Math.min(100, Math.round(cnr * 20))
  }, [activePreset, params, signals, snr])

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

        <ContrastRatios signals={signals} snr={snr} />

        <PathologyDetectability
          selectedPathology={selectedPathology}
          onSelect={setSelectedPathology}
          activePreset={activePreset}
          detectabilityScore={detectabilityScore}
        />

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
          pathologyRecommendation={activePreset?.recommendation ?? null}
        />

        <TissueReference fieldStrength={params.fieldStrength} />

      </div>
    </div>
  )
}
