import { useState } from 'react'
import { GitCompare, Undo2, Redo2, RotateCcw, BarChart2 } from 'lucide-react'
import { useProtocolStore } from '../store/protocolStore'
import { presets } from '../data/presets'
import type { ProtocolParams } from '../data/presets'
import { calcSNR, calcSARLevel, calcScanTime, calcT2Blur, chemShift, identifySequence } from '../store/calculators'
import { validateProtocol, issueCount } from '../utils/protocolValidator'

const PARAM_LABELS: Record<string, string> = {
  TR: 'TR (ms)',
  TE: 'TE (ms)',
  TI: 'TI (ms)',
  flipAngle: 'FA (°)',
  slices: 'スライス数',
  sliceThickness: 'スライス厚 (mm)',
  sliceGap: 'スライス間隔 (%)',
  averages: '加算回数',
  phaseOversampling: '位相OS (%)',
  sarAssistant: 'SAR Assistant',
  allowedDelay: '許容遅延 (s)',
  fatSat: '脂肪抑制',
  mt: 'MT',
  matrixFreq: 'Matrix 周波数',
  matrixPhase: 'Matrix 位相',
  fov: 'FOV (mm)',
  phaseResolution: '位相分解能 (%)',
  bandwidth: 'BW (Hz/px)',
  interpolation: '補間',
  orientation: '断面方向',
  phaseEncDir: '位相方向',
  satBands: 'Sat バンド',
  coil: 'コイル',
  ipatMode: 'iPAT',
  ipatFactor: 'iPAT 加速係数',
  gradientMode: 'グラジエントモード',
  shim: 'Shim',
  ecgTrigger: 'ECG トリガー',
  respTrigger: '呼吸補正',
  triggerDelay: 'トリガー遅延 (ms)',
  triggerWindow: 'トリガーウィンドウ (ms)',
  inlineADC: 'inline ADC',
  inlineMIP: 'inline MIP',
  inlineMPR: 'inline MPR',
  inlineSubtraction: 'inline Subtraction',
  turboFactor: 'Turbo Factor (ETL)',
  echoSpacing: 'Echo Spacing (ms)',
  partialFourier: 'Partial Fourier',
  bValues: 'b値',
  fieldStrength: '磁場強度',
}

function formatValue(value: ProtocolParams[keyof ProtocolParams]): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  return String(value)
}

function getChangeColor(prev: ProtocolParams[keyof ProtocolParams], curr: ProtocolParams[keyof ProtocolParams]): string {
  if (typeof prev === 'number' && typeof curr === 'number') {
    if (curr > prev) return '#4ade80'
    if (curr < prev) return '#f87171'
  }
  return '#fbbf24'
}

type DiffMode = 'baseline' | 'preset' | 'metrics'

interface MetricRow {
  label: string
  current: string
  compare: string
  delta: number   // positive = current is better or higher
  unit: string
  lowerIsBetter: boolean
}

function buildMetricRows(current: ProtocolParams, compare: ProtocolParams): MetricRow[] {
  const fmt = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60); const sec = s % 60
    return sec === 0 ? `${m}min` : `${m}m${sec}s`
  }
  const snrC = calcSNR(current), snrP = calcSNR(compare)
  const sarC = calcSARLevel(current), sarP = calcSARLevel(compare)
  const timeC = calcScanTime(current), timeP = calcScanTime(compare)
  const blurC = calcT2Blur(current), blurP = calcT2Blur(compare)
  const csC = chemShift(current), csP = chemShift(compare)
  const issC = issueCount(validateProtocol(current)), issP = issueCount(validateProtocol(compare))
  const seqC = identifySequence(current), seqP = identifySequence(compare)

  return [
    { label: 'シーケンス', current: seqC.type, compare: seqP.type, delta: 0, unit: '', lowerIsBetter: false },
    { label: 'SNR', current: String(snrC), compare: String(snrP), delta: snrC - snrP, unit: '', lowerIsBetter: false },
    { label: 'SAR', current: `${sarC}%`, compare: `${sarP}%`, delta: sarP - sarC, unit: '', lowerIsBetter: true },
    { label: 'スキャン時間', current: fmt(timeC), compare: fmt(timeP), delta: timeP - timeC, unit: '', lowerIsBetter: true },
    { label: 'T2ブラー', current: blurC.toFixed(2), compare: blurP.toFixed(2), delta: blurC - blurP, unit: '', lowerIsBetter: false },
    { label: '化学シフト', current: `${csC}px`, compare: `${csP}px`, delta: csP - csC, unit: '', lowerIsBetter: true },
    { label: 'エラー数', current: String(issC.errors), compare: String(issP.errors), delta: issP.errors - issC.errors, unit: '', lowerIsBetter: true },
    { label: '警告数', current: String(issC.warnings), compare: String(issP.warnings), delta: issP.warnings - issC.warnings, unit: '', lowerIsBetter: true },
  ]
}

function MetricComparison({ current, compare }: { current: ProtocolParams; compare: { label: string; params: ProtocolParams } }) {
  const rows = buildMetricRows(current, compare.params)
  return (
    <div className="p-2 space-y-1">
      <div className="grid grid-cols-3 gap-1 px-1 pb-1" style={{ borderBottom: '1px solid #252525' }}>
        <span style={{ color: '#4b5563', fontSize: '9px' }}>指標</span>
        <span style={{ color: '#fbbf24', fontSize: '9px' }}>現在</span>
        <span style={{ color: '#9ca3af', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={compare.label}>{compare.label.slice(0, 12)}</span>
      </div>
      {rows.map(row => {
        const better = row.delta > 0
        const neutral = row.delta === 0 || row.label === 'シーケンス'
        const currentColor = neutral ? '#e2e8f0' : better ? '#4ade80' : '#f87171'
        return (
          <div key={row.label} className="grid grid-cols-3 gap-1 px-1 py-0.5 rounded" style={{ background: '#1a1a1a' }}>
            <span style={{ color: '#6b7280', fontSize: '9px' }}>{row.label}</span>
            <span className="font-mono" style={{ color: currentColor, fontSize: '9px' }}>{row.current}</span>
            <span className="font-mono" style={{ color: '#9ca3af', fontSize: '9px' }}>{row.compare}</span>
          </div>
        )
      })}
      <p style={{ color: '#374151', fontSize: '8px', paddingTop: '4px' }}>
        緑 = 現在のプロトコルが優位、赤 = 比較先が優位
      </p>
    </div>
  )
}

export function DiffPanel() {
  const [mode, setMode] = useState<DiffMode>('baseline')
  const {
    params,
    baseline,
    history,
    historyIndex,
    comparePresetId,
    undo,
    redo,
    resetToBaseline,
    setComparePreset,
  } = useProtocolStore()

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  // ベースライン差分
  const baselineDiffs = (Object.keys(params) as (keyof ProtocolParams)[]).filter((key) => {
    const a = params[key]
    const b = baseline[key]
    if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(a) !== JSON.stringify(b)
    return a !== b
  })

  // プリセット比較
  const comparePreset = presets.find(p => p.id === comparePresetId)
  const presetDiffs = comparePreset
    ? (Object.keys(params) as (keyof ProtocolParams)[]).filter((key) => {
        const a = params[key]
        const b = comparePreset.params[key]
        if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(a) !== JSON.stringify(b)
        return a !== b
      })
    : []

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ width: 300, background: '#141414', borderLeft: '1px solid #252525' }}>
      {/* ヘッダー */}
      <div className="px-3 py-2 flex items-center gap-1.5 flex-shrink-0"
        style={{ borderBottom: '1px solid #252525' }}>
        <GitCompare size={11} style={{ color: '#4b5563' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>
          変更履歴 / 比較
        </span>
      </div>

      {/* タブ切替 */}
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid #252525' }}>
        {([['baseline', 'ベースライン'], ['preset', 'パラメータ比較'], ['metrics', 'メトリクス比較']] as [DiffMode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-1.5 font-medium transition-colors"
            style={{
              background: mode === m ? '#1e1e1e' : 'transparent',
              color: mode === m ? '#e88b00' : '#6b7280',
              borderBottom: mode === m ? '2px solid #e88b00' : '2px solid transparent',
              fontSize: '9px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'metrics' ? (
          <div>
            {!comparePreset ? (
              <div className="p-2 space-y-2">
                <p className="text-xs text-center py-6" style={{ color: '#4b5563' }}>
                  比較先プリセットを選択してください
                </p>
                <select
                  value={comparePresetId ?? ''}
                  onChange={(e) => setComparePreset(e.target.value || null)}
                  className="w-full px-2 py-1.5 rounded text-xs"
                  style={{ background: '#252525', color: '#d1d5db', border: '1px solid #3a3a3a', outline: 'none' }}
                >
                  <option value="">比較先を選択...</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <div className="px-2 pt-2 pb-1">
                  <select
                    value={comparePresetId ?? ''}
                    onChange={(e) => setComparePreset(e.target.value || null)}
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{ background: '#252525', color: '#d1d5db', border: '1px solid #3a3a3a', outline: 'none', fontSize: '10px' }}
                  >
                    <option value="">比較先を選択...</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 px-2 pb-2">
                  <BarChart2 size={10} style={{ color: '#60a5fa' }} />
                  <span style={{ color: '#60a5fa', fontSize: '9px' }}>主要指標の比較</span>
                </div>
                <MetricComparison current={params} compare={comparePreset} />
              </div>
            )}
          </div>
        ) : mode === 'baseline' ? (
          <div className="p-2 space-y-2">
            {/* Undo/Redo/Reset ボタン */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                title="元に戻す"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-30"
                style={{ background: '#252525', color: '#9ca3af' }}
              >
                <Undo2 size={11} />
                Undo
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                title="やり直す"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-30"
                style={{ background: '#252525', color: '#9ca3af' }}
              >
                <Redo2 size={11} />
                Redo
              </button>
              <button
                onClick={resetToBaseline}
                disabled={baselineDiffs.length === 0}
                title="ベースラインに戻す"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-30 ml-auto"
                style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #3d1f00' }}
              >
                <RotateCcw size={11} />
                リセット
              </button>
            </div>

            {/* 差分リスト */}
            {baselineDiffs.length === 0 ? (
              <div className="text-center py-6 text-xs" style={{ color: '#4b5563' }}>
                変更なし
              </div>
            ) : (
              <div className="space-y-1">
                {baselineDiffs.map((key) => {
                  const prev = baseline[key]
                  const curr = params[key]
                  const color = getChangeColor(prev, curr)
                  return (
                    <div key={key} className="p-2 rounded" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
                      <div className="text-xs mb-1" style={{ color: '#6b7280' }}>
                        {PARAM_LABELS[key] ?? key}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span style={{ color: '#9ca3af' }}>{formatValue(prev)}</span>
                        <span style={{ color: '#4b5563' }}>→</span>
                        <span style={{ color }}>{formatValue(curr)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {/* プリセット選択 */}
            <select
              value={comparePresetId ?? ''}
              onChange={(e) => setComparePreset(e.target.value || null)}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{
                background: '#252525',
                color: '#d1d5db',
                border: '1px solid #3a3a3a',
                outline: 'none',
              }}
            >
              <option value="">比較先を選択...</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>

            {/* 差分リスト */}
            {!comparePreset ? (
              <div className="text-center py-6 text-xs" style={{ color: '#4b5563' }}>
                比較先プリセットを選択してください
              </div>
            ) : presetDiffs.length === 0 ? (
              <div className="text-center py-6 text-xs" style={{ color: '#4b5563' }}>
                差分なし
              </div>
            ) : (
              <>
                {/* 列ヘッダー */}
                <div className="grid grid-cols-2 gap-1 px-2 text-xs" style={{ color: '#4b5563' }}>
                  <span>現在値</span>
                  <span>{comparePreset.label}</span>
                </div>
                <div className="space-y-1">
                  {presetDiffs.map((key) => {
                    const curr = params[key]
                    const comp = comparePreset.params[key]
                    return (
                      <div key={key} className="p-2 rounded" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
                        <div className="text-xs mb-1" style={{ color: '#6b7280' }}>
                          {PARAM_LABELS[key] ?? key}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                          <span style={{ color: '#fbbf24' }}>{formatValue(curr)}</span>
                          <span style={{ color: '#9ca3af' }}>{formatValue(comp)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
