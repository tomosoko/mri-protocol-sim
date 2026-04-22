import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { calcSARLevel, calcScanTime } from '../../store/calculators'

// ── SAR内訳チャート ──────────────────────────────────────────────────────────
export function SARBreakdown() {
  const { params } = useProtocolStore()
  const totalSAR = calcSARLevel(params)

  // 各因子の寄与比率（正規化）
  const faNorm     = (params.flipAngle / 90) ** 2
  const trNorm     = 2000 / Math.max(params.TR, 100)
  const etlNorm    = Math.min(params.turboFactor, 200) / 50
  const fieldNorm  = (params.fieldStrength / 1.5) ** 2
  const fatPenalty = params.fatSat === 'CHESS' ? 0.15 : params.fatSat === 'SPAIR' ? 0.25 : params.fatSat === 'STIR' ? 0.35 : 0
  const mtPenalty  = params.mt ? 0.20 : 0
  const coilPen    = (!params.coilType || params.coilType === 'Body') ? 0.30 : 0

  const baseContrib = faNorm * trNorm * etlNorm * fieldNorm

  const factors = [
    { label: 'FA²',    value: faNorm,    color: '#f87171', note: `${params.flipAngle}°` },
    { label: '1/TR',   value: trNorm,    color: '#fb923c', note: `${params.TR}ms` },
    { label: 'ETL',    value: etlNorm,   color: '#fbbf24', note: `×${params.turboFactor}` },
    { label: 'B0²',    value: fieldNorm, color: '#a78bfa', note: `${params.fieldStrength}T` },
    { label: 'FatSat', value: fatPenalty * baseContrib, color: '#60a5fa', note: params.fatSat },
    { label: 'MT',     value: mtPenalty  * baseContrib, color: '#38bdf8', note: params.mt ? 'On' : 'Off' },
    { label: 'Coil',   value: coilPen   * baseContrib, color: '#4ade80', note: params.coilType || 'Body' },
  ].filter(f => f.value > 0.01)

  const total = factors.reduce((s, f) => s + f.value, 0)

  const sarColor = totalSAR >= 90 ? '#ef4444' : totalSAR >= 70 ? '#f59e0b' : totalSAR >= 40 ? '#e88b00' : '#34d399'
  const sarLabel = totalSAR >= 90 ? 'OVER' : totalSAR >= 70 ? 'High' : totalSAR >= 40 ? 'Med' : 'Low'

  return (
    <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" style={{ color: '#e88b00' }}>SAR 内訳</div>
        <div className="flex items-center gap-2">
          <span style={{ color: sarColor, fontWeight: 700 }}>{sarLabel}</span>
          <span className="font-mono font-bold" style={{ color: sarColor }}>{totalSAR}%</span>
        </div>
      </div>

      {/* 全体バー */}
      <div className="h-2.5 rounded overflow-hidden mb-3" style={{ background: '#1a1a1a' }}>
        <div
          className="h-full rounded transition-all"
          style={{
            width: `${totalSAR}%`,
            background: `linear-gradient(90deg, #34d399, ${sarColor})`,
          }}
        />
      </div>

      {/* 因子別内訳バー */}
      <div className="space-y-1.5">
        {factors.map(f => {
          const pct = total > 0 ? Math.round((f.value / total) * 100) : 0
          return (
            <div key={f.label}>
              <div className="flex justify-between items-center mb-0.5">
                <span style={{ color: f.color }}>{f.label}</span>
                <span style={{ color: '#6b7280', fontSize: '9px' }}>{f.note}</span>
                <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '9px' }}>{pct}%</span>
              </div>
              <div className="h-1 rounded overflow-hidden" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-full rounded"
                  style={{ width: `${pct}%`, background: f.color + '80' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* IEC limits */}
      <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid #252525', color: '#4b5563' }}>
        IEC limit: 頭部 3.2 W/kg / 体部 2.0 W/kg (全体平均)
      </div>
    </div>
  )
}

// ── SAR 累積モニター ─────────────────────────────────────────────────────────
// リアルなスキャナーは 6分間のSAR積算を監視する (IEC 60601-2-33)
// 現在の SAR % × スキャン時間から「連続スキャン時にいつ制限超えるか」を計算
export function SARAccumulationMonitor() {
  const { params } = useProtocolStore()
  const sarPct = calcSARLevel(params)
  const scanTimeSec = calcScanTime(params)

  if (sarPct < 20) return null  // low SAR = not interesting to display

  // IEC: 6-minute averaging window. 100% = limit reached at 6 min
  // At sarPct%, continuous acquisition would reach limit in: 6min × (100/sarPct) min... no
  // Actually: if SAR rate = sarPct% (of limit), then to accumulate 100% takes:
  // t = 6min × (100 / sarPct)... but this is already rate-based
  //
  // More intuitive: "How many consecutive scans until limit?"
  // Assume IEC 6-min window: total allowed SAR over 6min = 100 units
  // Each scan contributes: sarPct × scanTimeSec / 360 (normalized to 6-min window)
  const scansUntilLimit = scanTimeSec > 0
    ? Math.floor(360 / scanTimeSec * (100 / sarPct))
    : 99

  const timeUntilLimit = scansUntilLimit * scanTimeSec  // seconds

  const sarColor = sarPct >= 90 ? '#ef4444' : sarPct >= 70 ? '#f59e0b' : sarPct >= 40 ? '#e88b00' : '#34d399'

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 > 0 ? String(s % 60).padStart(2, '0') + 's' : ''}`

  // Simulate 6-minute SAR accumulation timeline
  const N = 24  // 24 bars × 15sec = 6min
  const ratePerSlot = sarPct * (scanTimeSec / 15) / 100  // fraction of limit per 15sec slot

  return (
    <div className="mx-3 mt-2 p-2.5 rounded" style={{ background: '#100a05', border: `1px solid ${sarColor}30` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: sarColor, fontSize: '9px', letterSpacing: '0.06em' }}>
          SAR ACCUMULATION (IEC 6-min window)
        </span>
        <span className="font-mono font-bold" style={{ color: sarColor, fontSize: '9px' }}>{sarPct}% / rep</span>
      </div>

      {/* 6-minute accumulation bar chart */}
      <div className="flex gap-0.5 mb-1.5 items-end" style={{ height: 24 }}>
        {Array.from({ length: N }, (_, i) => {
          const cumulative = Math.min(ratePerSlot * (i + 1) * 100, 100)
          const barH = Math.max(2, (cumulative / 100) * 24)
          const isOver = cumulative >= 100
          const barColor = isOver ? '#ef4444' : cumulative >= 70 ? '#f59e0b' : '#34d399'
          return (
            <div key={i} style={{
              width: `${100 / N - 0.5}%`,
              height: barH,
              background: barColor,
              opacity: isOver ? 1 : 0.5 + (i / N) * 0.4,
              borderRadius: 1,
              alignSelf: 'flex-end',
            }} />
          )
        })}
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap" style={{ fontSize: '8px' }}>
        <div>
          <span style={{ color: '#4b5563' }}>連続収集上限: </span>
          <span className="font-mono font-semibold" style={{ color: scansUntilLimit <= 2 ? '#f87171' : '#c8ccd6' }}>
            {scansUntilLimit >= 99 ? '∞' : scansUntilLimit}回
          </span>
        </div>
        <div>
          <span style={{ color: '#4b5563' }}>制限まで: </span>
          <span className="font-mono font-semibold" style={{ color: timeUntilLimit < 60 ? '#f87171' : '#c8ccd6' }}>
            {scansUntilLimit >= 99 ? '> 6min' : fmt(timeUntilLimit)}
          </span>
        </div>
        <div>
          <span style={{ color: '#4b5563' }}>TA: </span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{fmt(scanTimeSec)}</span>
        </div>
      </div>

      <div className="mt-1.5 pt-1" style={{ borderTop: `1px solid ${sarColor}20`, fontSize: '7px', color: '#374151' }}>
        {sarPct >= 90
          ? '⚠ SAR超過。TR延長 / ETL削減 / FA低下 / 磁場強度低下のいずれかが必要'
          : sarPct >= 70
          ? '△ SAR高め。長時間連続撮像には注意'
          : 'IEC 6分窓平均. SAR rate = ' + sarPct + '% / rep × ' + fmt(scanTimeSec) + ' / rep'}
      </div>
    </div>
  )
}

// ── PNS（末梢神経刺激）モニター ───────────────────────────────────────────────
// IEC 60601-2-33 準拠の末梢神経刺激リスク評価
// dB/dt, スルーレート, および PNS 閾値の関係を可視化
export function PNSMonitor() {
  const { params } = useProtocolStore()

  // PNS モデル (IEC 60601-2-33 基準, Reilly モデル)
  // PNS threshold: TDS (rheobase × chronaxie)
  // Simplified: dB/dt_threshold ≈ rheobase × (1 + tc/t_rise)
  // where rheobase ≈ 20 T/s, tc = 0.36ms

  const GRAD_SPECS: Record<string, { maxAmp: number; slewRate: number }> = {
    Normal:    { maxAmp: 26, slewRate: 100 },
    Fast:      { maxAmp: 40, slewRate: 170 },
    Ultrafast: { maxAmp: 45, slewRate: 200 },
    Whisper:   { maxAmp: 26, slewRate: 80 },
  }
  const spec = GRAD_SPECS[params.gradientMode] ?? GRAD_SPECS.Normal

  const isDWI = params.bValues.length >= 2 && params.turboFactor <= 2
  const isEPI = isDWI

  // Estimate slew rate in use: proportional to gradient mode + sequence type
  // EPI uses near-max slew; TSE uses ~40-60%; SE ~20%
  const isTSE = params.turboFactor > 4
  const slewUsageFraction = isEPI ? 0.90 : isTSE ? 0.55 : 0.25
  const activeSlewRate = spec.slewRate * slewUsageFraction  // T/m/s in use

  // Gradient amplitude in use
  const readGradAmp = params.bandwidth / params.fov * 100  // mT/m estimate
  const activeAmp = Math.min(spec.maxAmp, readGradAmp)

  // Rise time (gradient hardware): amplitude / slew rate (ms)
  const riseTime = (activeAmp / spec.slewRate) * 1000  // ms

  // PNS threshold calculation (Reilly model simplified)
  const rheobase = 20   // T/s (reference threshold for long pulses)
  const chronaxie = 0.36  // ms
  const pnsThreshold = rheobase * (1 + chronaxie / Math.max(riseTime, 0.01))  // T/s

  // Current dB/dt (T/s) = slew rate × activeAmp
  const dbdt = activeSlewRate * (activeAmp / 1000)  // convert mT/m to T/m

  // PNS percentage of threshold
  const pnsPct = Math.min(150, Math.round(dbdt / pnsThreshold * 100 * 10) / 10)

  const color = pnsPct >= 100 ? '#f87171' : pnsPct >= 80 ? '#fbbf24' : pnsPct >= 60 ? '#fb923c' : '#34d399'
  const level = pnsPct >= 100 ? '⚠ ABOVE LIMIT' : pnsPct >= 80 ? '⚠ Near Limit' : pnsPct >= 60 ? 'Moderate' : 'Safe'

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c10', border: `1px solid ${pnsPct >= 80 ? '#7f1d1d30' : '#1a2030'}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: color, fontSize: '9px', letterSpacing: '0.06em' }}>
          PNS MONITOR — {level}
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>IEC 60601-2-33</span>
      </div>

      {/* Main PNS gauge */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span style={{ color: '#4b5563', fontSize: '8px' }}>PNS Level</span>
          <span className="font-mono font-bold" style={{ color, fontSize: '11px' }}>{pnsPct}%</span>
        </div>
        <div className="h-3 rounded overflow-hidden relative" style={{ background: '#111' }}>
          {/* Threshold zone markers */}
          <div className="absolute inset-0 flex">
            <div style={{ width: '80%', borderRight: '1px solid #fbbf2440' }} />
            <div style={{ width: '20%' }} />
          </div>
          {/* PNS bar */}
          <div className="h-full rounded transition-all duration-300"
            style={{ width: `${Math.min(pnsPct, 100)}%`, background: color, opacity: 0.8 }} />
          {/* Threshold line at 100% */}
          <div className="absolute top-0 bottom-0" style={{ left: '100%', width: '1px', background: '#f87171', opacity: 0.5 }} />
          {/* 80% warning line */}
          <div className="absolute top-0 bottom-0" style={{ left: '80%', width: '1px', background: '#fbbf24', opacity: 0.4 }} />
        </div>
        <div className="flex justify-between mt-0.5" style={{ fontSize: '6px', color: '#374151' }}>
          <span>0</span>
          <span style={{ color: '#fbbf24' }}>80%</span>
          <span style={{ color: '#f87171' }}>100% Limit</span>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ fontSize: '8px' }}>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Slew Rate</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{activeSlewRate.toFixed(0)} T/m/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Max SR</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{spec.slewRate} T/m/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>dB/dt</span>
          <span className="font-mono" style={{ color }}>{dbdt.toFixed(1)} T/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>PNS Threshold</span>
          <span className="font-mono" style={{ color: '#4b5563' }}>{pnsThreshold.toFixed(0)} T/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Rise Time</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{riseTime.toFixed(2)} ms</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Mode</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{params.gradientMode}</span>
        </div>
      </div>

      {pnsPct >= 80 && (
        <div className="mt-1.5 pt-1.5 text-xs" style={{ borderTop: '1px solid #1a0505', color: '#f87171', fontSize: '7px' }}>
          {pnsPct >= 100
            ? '⚠ PNS 閾値超過。傾斜磁場モードを Normal/Whisper に変更するか、スルーレート設定を下げてください。'
            : '末梢神経刺激のリスクが高くなっています。患者に刺激感がないか確認してください。'}
        </div>
      )}
    </div>
  )
}

// ── MR安全性 / インプラントチェッカー ─────────────────────────────────────────
// ASTM F2503 zone classification + 主要インプラントの MR 安全区分
export function MRSafetyChecker() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const [selectedImplant, setSelectedImplant] = useState<string | null>(null)

  type ImplantEntry = {
    id: string; name: string; safety: 'MR Safe' | 'MR Conditional' | 'MR Unsafe'
    conditions?: string; bMax?: number
  }

  const implants: ImplantEntry[] = [
    { id: 'cochlear',    name: '人工内耳', safety: 'MR Conditional',
      conditions: 'Cochlear CI5xx: 1.5T対応。3Tは機種依存。マグネット外科的固定必要な場合あり。', bMax: 1.5 },
    { id: 'pacemaker',   name: 'ペースメーカー', safety: 'MR Conditional',
      conditions: 'MR-conditional PM (Medtronic EV-ICD等): 1.5T/3T対応あり。事前プログラム変更必須。', bMax: 3.0 },
    { id: 'aneurysm_clip', name: '動脈瘤クリップ', safety: 'MR Conditional',
      conditions: 'チタン合金製: 通常MR Conditional。強磁性クリップは絶対禁忌。手術記録確認必須。', bMax: 3.0 },
    { id: 'joint',       name: '人工関節', safety: 'MR Safe',
      conditions: 'チタン/コバルトクロム: MR Safe。ただし金属アーチファクトに注意。', bMax: 3.0 },
    { id: 'stent_vascular', name: '血管ステント', safety: 'MR Conditional',
      conditions: '留置後6週間以上で通常MR Conditional。ニチノールステント: 低磁化率。', bMax: 3.0 },
    { id: 'deep_brain',  name: '脳深部刺激装置', safety: 'MR Conditional',
      conditions: 'DBS (Medtronic Percept): 1.5T全身/3T頭部のみ対応機種あり。専門施設対応。', bMax: 1.5 },
    { id: 'tattoo',      name: 'タトゥー/永久眉毛', safety: 'MR Conditional',
      conditions: '鉄含有インク: 発熱リスク(軽度)。検査前に患者に情報提供。多くは問題なし。', bMax: 3.0 },
    { id: 'iud',         name: 'IUD/子宮内避妊具', safety: 'MR Safe',
      conditions: '銅製IUD: MR Safe。全磁場強度で安全に使用可能。', bMax: 3.0 },
  ]

  const safetyColor = (s: ImplantEntry['safety']) =>
    s === 'MR Safe' ? '#34d399' : s === 'MR Conditional' ? '#fbbf24' : '#f87171'
  const safetyBg = (s: ImplantEntry['safety']) =>
    s === 'MR Safe' ? '#0a1a0a' : s === 'MR Conditional' ? '#1a1000' : '#1a0505'

  const selected = selectedImplant ? implants.find(i => i.id === selectedImplant) : null

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080a08', border: '1px solid #1a2a1a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#34d399', fontSize: '9px', letterSpacing: '0.05em' }}>
          MR SAFETY — IMPLANT CHECK
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>ASTM F2503</span>
      </div>

      {/* Implant grid */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        {implants.map(imp => {
          const isSafe = !imp.bMax || imp.bMax >= params.fieldStrength
          const color = safetyColor(imp.safety)
          return (
            <button
              key={imp.id}
              onClick={() => setSelectedImplant(selectedImplant === imp.id ? null : imp.id)}
              className="text-left p-1.5 rounded transition-all"
              style={{
                background: selectedImplant === imp.id ? safetyBg(imp.safety) : '#0a0a0a',
                border: `1px solid ${selectedImplant === imp.id ? color : (isSafe ? '#1a2a1a' : '#2a1010')}`,
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: '#9ca3af', fontSize: '8px' }}>{imp.name}</span>
                <span style={{ color, fontSize: '7px', fontWeight: 600 }}>{imp.safety.replace('MR ', '')}</span>
              </div>
              {!isSafe && (
                <div style={{ color: '#f87171', fontSize: '6px' }}>⚠ {is3T ? '3T' : '1.5T'}禁忌の場合あり</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="p-2 rounded" style={{ background: safetyBg(selected.safety), border: `1px solid ${safetyColor(selected.safety)}40` }}>
          <div className="font-semibold mb-1" style={{ color: safetyColor(selected.safety), fontSize: '8px' }}>
            {selected.name} — {selected.safety}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '7px', lineHeight: '1.4' }}>
            {selected.conditions}
          </div>
          {selected.bMax && selected.bMax < params.fieldStrength && (
            <div className="mt-1" style={{ color: '#f87171', fontSize: '7px' }}>
              ⚠ このインプラントは{selected.bMax}T制限 — 現在{params.fieldStrength}T。撮像可否を確認。
            </div>
          )}
        </div>
      )}

      <div className="mt-1.5 pt-1.5 flex flex-wrap gap-x-2" style={{ borderTop: '1px solid #1a2010', fontSize: '7px', color: '#374151' }}>
        <span style={{ color: '#34d399' }}>■ MR Safe</span>
        <span style={{ color: '#fbbf24' }}>■ MR Conditional</span>
        <span style={{ color: '#f87171' }}>■ MR Unsafe</span>
      </div>
    </div>
  )
}
