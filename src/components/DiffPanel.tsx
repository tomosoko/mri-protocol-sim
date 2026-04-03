import { useState } from 'react'
import { GitCompare, Undo2, Redo2, RotateCcw } from 'lucide-react'
import { useProtocolStore } from '../store/protocolStore'
import { presets } from '../data/presets'
import type { ProtocolParams } from '../data/presets'

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

type DiffMode = 'baseline' | 'preset'

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
        {(['baseline', 'preset'] as DiffMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: mode === m ? '#1e1e1e' : 'transparent',
              color: mode === m ? '#e88b00' : '#6b7280',
              borderBottom: mode === m ? '2px solid #e88b00' : '2px solid transparent',
            }}
          >
            {m === 'baseline' ? 'ベースライン差分' : 'プリセット比較'}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'baseline' ? (
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
                          <span style={{ color: '#60a5fa' }}>{formatValue(comp)}</span>
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
