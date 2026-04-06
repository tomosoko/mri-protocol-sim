import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

// ── 心拍タイミング図 ─────────────────────────────────────────────────────────
function CardiacTimingDiagram({ rrInterval, triggerDelay }: { rrInterval: number; triggerDelay: number }) {
  const W = 300, H = 72
  const PAD = { l: 8, r: 8, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const tx = (t: number) => PAD.l + (t / rrInterval) * innerW
  const baseY = PAD.t + innerH * 0.65

  // ECG waveform: simplified P-QRS-T complex
  const ecgPts = (rr: number) => {
    // Normalized 0-1 timepoints for key ECG features
    const pts: [number, number][] = [
      [0, 0],        // baseline start
      [0.08, 0.03],  // P wave start
      [0.12, 0.12],  // P wave peak
      [0.16, 0.03],  // P wave end
      [0.20, 0.01],  // PR segment
      [0.24, -0.08], // Q
      [0.26, 0.80],  // R peak
      [0.28, -0.15], // S
      [0.30, -0.01], // J point
      [0.38, 0.20],  // T wave
      [0.48, 0.18],
      [0.55, 0.02],  // T end
      [1.00, 0.00],  // next beat start
    ]
    return pts.map(([t, amp]) => {
      const x = PAD.l + (t * rr / rrInterval) * innerW
      const y = baseY - amp * innerH * 0.9
      return [x, y] as [number, number]
    })
  }

  const pts = ecgPts(rrInterval)
  const ecgPath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // Acquisition window at trigger delay (simplified ~100ms window)
  const acqStart = triggerDelay
  const acqEnd = Math.min(triggerDelay + 120, rrInterval * 0.95)
  const acqX1 = tx(acqStart)
  const acqX2 = tx(acqEnd)

  // Systole / Diastole regions (rough approximation)
  const systoleEnd = rrInterval * 0.35

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="px-2 pt-1" style={{ fontSize: '9px', color: '#4b5563' }}>
        心電図 タイミング (RR={rrInterval}ms)
      </div>
      <svg width={W} height={H}>
        {/* Systole / Diastole bands */}
        <rect x={PAD.l} y={PAD.t} width={tx(systoleEnd) - PAD.l} height={innerH}
          fill="#f8717108" />
        <rect x={tx(systoleEnd)} y={PAD.t} width={innerW - (tx(systoleEnd) - PAD.l)} height={innerH}
          fill="#34d39908" />
        <text x={PAD.l + (tx(systoleEnd) - PAD.l) / 2} y={PAD.t + 6}
          textAnchor="middle" fill="#f87171" style={{ fontSize: '7px' }}>収縮期</text>
        <text x={tx(systoleEnd) + (innerW - (tx(systoleEnd) - PAD.l)) / 2} y={PAD.t + 6}
          textAnchor="middle" fill="#34d399" style={{ fontSize: '7px' }}>拡張期</text>

        {/* Baseline */}
        <line x1={PAD.l} y1={baseY} x2={PAD.l + innerW} y2={baseY}
          stroke="#252525" strokeWidth={0.5} />

        {/* ECG trace */}
        <path d={ecgPath} fill="none" stroke="#34d399" strokeWidth={1.5} />

        {/* Trigger delay acquisition window */}
        <rect x={acqX1} y={PAD.t + 2} width={Math.max(0, acqX2 - acqX1)} height={innerH - 2}
          fill="#e88b0020" stroke="#e88b00" strokeWidth={0.8} strokeDasharray="2,2" />
        <text x={(acqX1 + acqX2) / 2} y={H - 5} textAnchor="middle"
          fill="#e88b00" style={{ fontSize: '7px' }}>TD={triggerDelay}ms</text>

        {/* RR markers */}
        <text x={PAD.l} y={H - 5} fill="#374151" style={{ fontSize: '7px' }}>R</text>
        <text x={PAD.l + innerW} y={H - 5} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>R</text>
      </svg>
    </div>
  )
}

// ── 呼吸波形ダイアグラム (PACE ナビゲーター) ────────────────────────────────
function RespWaveformDiagram({ acceptancePct }: { acceptancePct: number }) {
  const W = 300, H = 80
  const PAD = { l: 8, r: 8, t: 10, b: 20 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // Simulate 4 respiratory cycles
  const N = 200
  const pts = useMemo(() => Array.from({ length: N }, (_, i) => {
    const t = i / N
    // Irregular breathing: combination of 2 sine waves + slight variation
    const breath = Math.sin(t * Math.PI * 8) * 0.45 +
                   Math.sin(t * Math.PI * 8.3 + 0.5) * 0.08 +
                   Math.sin(t * Math.PI * 2.1) * 0.06
    return { t, y: breath }
  }), [])

  const yMin = Math.min(...pts.map(p => p.y))
  const yMax = Math.max(...pts.map(p => p.y))
  const yRange = yMax - yMin

  // End-expiration is near yMin (diaphragm highest position = patient end-exhale)
  const endExpiration = yMin + yRange * 0.15
  const windowHalfPct = acceptancePct / 100
  const windowTop = endExpiration + yRange * windowHalfPct * 0.4
  const windowBot = endExpiration - yRange * windowHalfPct * 0.15

  const toSVGY = (v: number) => PAD.t + innerH - ((v - yMin) / yRange) * innerH
  const toSVGX = (t: number) => PAD.l + t * innerW

  const path = pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${toSVGX(p.t).toFixed(1)},${toSVGY(p.y).toFixed(1)}`
  ).join(' ')

  const winY1 = toSVGY(windowTop)
  const winY2 = toSVGY(windowBot)
  const centerY = toSVGY(endExpiration)

  // Points inside acceptance window
  const acceptedPts = pts.filter(p => p.y >= windowBot && p.y <= windowTop)
  const efficiency = Math.round((acceptedPts.length / pts.length) * 100)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '9px', color: '#4b5563' }}>PACE ナビゲーター波形 (横隔膜位置)</span>
        <span className="font-mono" style={{ fontSize: '9px', color: efficiency > 65 ? '#34d399' : efficiency > 45 ? '#fbbf24' : '#f87171' }}>
          効率 ~{efficiency}%
        </span>
      </div>
      <svg width={W} height={H}>
        {/* Acceptance window */}
        <rect x={PAD.l} y={winY1} width={innerW} height={Math.max(0, winY2 - winY1)}
          fill="#34d39915" stroke="#34d39940" strokeWidth={0.5} />
        {/* Center line (end-expiration target) */}
        <line x1={PAD.l} y1={centerY} x2={PAD.l + innerW} y2={centerY}
          stroke="#34d399" strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6} />

        {/* Accepted segments (colored) */}
        {pts.map((p, i) => {
          if (i === 0) return null
          const inWindow = p.y >= windowBot && p.y <= windowTop
          const prevIn = pts[i-1].y >= windowBot && pts[i-1].y <= windowTop
          if (!inWindow && !prevIn) return null
          return (
            <line
              key={i}
              x1={toSVGX(pts[i-1].t)} y1={toSVGY(pts[i-1].y)}
              x2={toSVGX(p.t)} y2={toSVGY(p.y)}
              stroke="#34d399" strokeWidth={1.8} opacity={0.9}
            />
          )
        })}

        {/* Respiratory waveform (dimmed) */}
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth={1.2} opacity={0.5} />

        {/* Labels */}
        <text x={PAD.l + 2} y={winY1 - 2} fill="#34d399" style={{ fontSize: '7px' }}>ウィンドウ上限</text>
        <text x={PAD.l + 2} y={winY2 + 8} fill="#34d399" style={{ fontSize: '7px' }}>下限</text>
        <text x={PAD.l} y={H - 5} fill="#374151" style={{ fontSize: '7px' }}>呼吸周期 (時間→)</text>
        <text x={W - PAD.r} y={centerY - 3} textAnchor="end" fill="#34d39980" style={{ fontSize: '7px' }}>呼気末</text>
      </svg>
      <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '2px' }}>
        緑=収集ウィンドウ内（採用）/ 青=呼吸波形 / 収集効率={efficiency}%
      </div>
    </div>
  )
}

// ── 心臓シネ位相計算器 ────────────────────────────────────────────────────────
// 1 RRに収まる位相数・時間分解能・心筋運動追跡精度を計算
function CardiacCinePhases({ rrInterval }: { rrInterval: number }) {
  const { params } = useProtocolStore()

  // Typical cine parameters
  const phaseTime = params.TR  // ms per cardiac phase
  const nPhases = Math.floor(rrInterval / phaseTime)  // phases per RR
  const temporal = phaseTime  // ms temporal resolution
  const coverage = Math.round((nPhases * phaseTime / rrInterval) * 100)

  // Wall motion assessment: need ≥20 phases for adequate temporal resolution
  const qualityColor = nPhases >= 20 ? '#34d399' : nPhases >= 15 ? '#fbbf24' : '#f87171'
  const quality = nPhases >= 20 ? 'Excellent' : nPhases >= 15 ? 'Adequate' : 'Poor'

  const W = 280, H = 40
  const PAD = { l: 8, r: 8, t: 6, b: 6 }
  const innerW = W - PAD.l - PAD.r

  // Phase boxes across RR
  const boxW = Math.max(2, (innerW * phaseTime / rrInterval) - 0.5)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#f472b6', fontSize: '9px', letterSpacing: '0.05em' }}>
          CINE CARDIAC PHASES
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: qualityColor }}>{quality}</span>
          <span className="font-mono font-bold" style={{ color: qualityColor }}>{nPhases} phases</span>
        </div>
      </div>

      {/* Phase timeline across RR */}
      <svg width={W} height={H}>
        {/* RR bar */}
        <rect x={PAD.l} y={PAD.t} width={innerW} height={H - PAD.t - PAD.b}
          fill="#0a0a0a" rx={2} />
        {/* Phase boxes */}
        {Array.from({ length: nPhases }, (_, i) => (
          <rect key={i}
            x={PAD.l + (i / rrInterval) * innerW * phaseTime + 0.5}
            y={PAD.t + 2}
            width={Math.max(1, boxW - 0.5)}
            height={H - PAD.t - PAD.b - 4}
            fill="#f472b630"
            stroke="#f472b670"
            strokeWidth={0.5}
            rx={1}
          />
        ))}
        {/* RR boundary */}
        <rect x={PAD.l} y={PAD.t} width={innerW} height={H - PAD.t - PAD.b}
          fill="none" stroke="#252525" strokeWidth={1} rx={2} />
        {/* Phase label */}
        <text x={PAD.l + 3} y={PAD.t + 8} fill="#f472b6" style={{ fontSize: '7px' }}>
          {temporal}ms/phase
        </text>
        <text x={PAD.l + innerW - 2} y={PAD.t + 8} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
          RR={rrInterval}ms
        </text>
      </svg>

      <div className="flex gap-3 mt-1" style={{ fontSize: '8px' }}>
        <div><span style={{ color: '#4b5563' }}>Coverage: </span><span style={{ color: '#9ca3af' }}>{coverage}%</span></div>
        <div><span style={{ color: '#4b5563' }}>Temporal: </span><span style={{ color: '#9ca3af' }}>{temporal}ms</span></div>
        <div><span style={{ color: '#4b5563' }}>EF/WM viable: </span><span style={{ color: qualityColor }}>≥{nPhases >= 20 ? '20' : nPhases} req.</span></div>
      </div>
    </div>
  )
}

type SubTab = 'Signal' | 'Cardiac' | 'PACE'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function PhysioTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Signal')

  // local state
  const [signalMode, setSignalMode] = useState('None')
  const [sigConcatenations, setSigConcatenations] = useState(1)
  const [triggerPulse, setTriggerPulse] = useState('R-wave')
  const [multipleRR, setMultipleRR] = useState(false)
  const [respControl, setRespControl] = useState('Free Breath')
  const [paceAcceptance, setPaceAcceptance] = useState(50)
  const [pacePosition, setPacePosition] = useState('Diaphragm')
  const [respGate, setRespGate] = useState(false)
  const [gatingWindow, setGatingWindow] = useState(50)

  const [manualHR, setManualHR] = useState(70)
  const heartRate = params.ecgTrigger ? manualHR : (params.TR > 0 ? Math.round(60000 / params.TR) : 70)
  const rrInterval = Math.round(60000 / heartRate)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Signal', 'Cardiac', 'PACE'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="px-4 py-1.5 text-xs transition-colors"
            style={subTabStyle(subTab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'Signal' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Signal Source</div>
          <ParamField label="1st Signal/Mode" value={signalMode} type="select"
            options={['None', 'ECG', 'PULSE', 'EXT']}
            onChange={v => setSignalMode(v as string)} />
          <ParamField label="Concatenations" value={sigConcatenations} type="number"
            min={1} max={16} step={1}
            onChange={v => setSigConcatenations(v as number)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Current TR</div>
          <div className="mx-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="flex justify-between items-center">
              <span style={{ color: '#9ca3af' }}>TR:</span>
              <span className="font-mono text-white font-bold">{params.TR} ms</span>
            </div>
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid #252525', color: '#6b7280' }}>
              心電図同期では TR が RR 間隔に依存します（Cardiac タブ参照）
            </div>
          </div>

          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>信号源の選択</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">ECG: </span>心電図（最高精度・貼付電極が必要）</div>
              <div><span className="text-white">PULSE: </span>パルスオキシメータ（簡便・遅延あり）</div>
              <div><span className="text-white">EXT: </span>外部トリガー信号入力</div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'Cardiac' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>ECG Triggering</div>
          <ParamField label="ECG Trigger" hintKey="ECGTrigger" value={params.ecgTrigger} type="toggle"
            onChange={v => setParam('ecgTrigger', v as boolean)} highlight={hl('ecgTrigger')} />

          {params.ecgTrigger && (
            <>
              <ParamField label="Trigger Delay" hintKey="triggerDelay" value={params.triggerDelay} type="range"
                min={0} max={800} step={10} unit="ms"
                onChange={v => setParam('triggerDelay', v as number)} />
              <ParamField label="Trigger Window" value={params.triggerWindow} type="range"
                min={1} max={10} step={1}
                onChange={v => setParam('triggerWindow', v as number)} />
              <ParamField label="Trigger Pulse" value={triggerPulse} type="select"
                options={['R-wave', 'Peak']}
                onChange={v => setTriggerPulse(v as string)} />
              <ParamField label="Multiple RR" value={multipleRR} type="toggle"
                onChange={v => setMultipleRR(v as boolean)} />

              {/* Heart rate calculator */}
              <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
                <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>Trigger Delay 計算機</div>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: '#9ca3af' }}>心拍数</span>
                  <input
                    type="range" min={40} max={120} value={manualHR}
                    onChange={e => setManualHR(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-mono font-bold text-green-400 w-14 text-right">{manualHR} bpm</span>
                </div>
                <div className="mb-2 pb-2" style={{ borderBottom: '1px solid #252525' }}>
                  <div className="flex justify-between">
                    <span style={{ color: '#6b7280' }}>RR 間隔</span>
                    <span className="font-mono text-white">{rrInterval} ms</span>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr style={{ color: '#4b5563', fontSize: '9px' }}>
                      <th className="text-left py-0.5">対象</th>
                      <th className="text-center py-0.5">推奨 Delay</th>
                      <th className="text-left py-0.5 pl-1"></th>
                    </tr>
                  </thead>
                  <tbody style={{ color: '#9ca3af' }}>
                    {[
                      { label: '左室 (シネ)', delay: Math.round(rrInterval * 0.4), note: '拡張末期' },
                      { label: '冠動脈 右', delay: Math.round(rrInterval * 0.72), note: 'RR×72%' },
                      { label: '冠動脈 左', delay: Math.round(rrInterval * 0.76), note: 'RR×76%' },
                      { label: '大動脈弁', delay: 150, note: '収縮期' },
                      { label: '心筋灌流', delay: 200, note: '収縮末期' },
                      { label: '遅延造影', delay: Math.round(rrInterval * 0.85), note: 'RR×85%' },
                    ].map(({ label, delay, note }) => (
                      <tr key={label} style={{ borderTop: '1px solid #111' }}>
                        <td className="py-0.5 text-white">{label}</td>
                        <td className="text-center py-0.5">
                          <button
                            onClick={() => setParam('triggerDelay', delay)}
                            className="font-mono px-1.5 py-0.5 rounded transition-colors"
                            style={{
                              background: params.triggerDelay === delay ? '#2a1200' : '#1a1a1a',
                              color: params.triggerDelay === delay ? '#e88b00' : '#9ca3af',
                              border: `1px solid ${params.triggerDelay === delay ? '#c47400' : '#252525'}`,
                              fontSize: '9px',
                            }}
                          >
                            {delay}ms
                          </button>
                        </td>
                        <td className="pl-1" style={{ color: '#4b5563', fontSize: '8px' }}>{note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2" style={{ color: '#6b7280', fontSize: '9px' }}>
                  ※ 3T では vECG を使用するとR波検出精度が大幅に向上
                </div>
                <CardiacTimingDiagram rrInterval={rrInterval} triggerDelay={params.triggerDelay} />
              </div>
            </>
          )}
          {/* Cardiac Cine Phase Calculator */}
          {params.ecgTrigger && <CardiacCinePhases rrInterval={rrInterval} />}

          {/* VENC / Phase Contrast calculator */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0a0e14', border: '1px solid #1a2a3a' }}>
            <div className="font-semibold mb-2" style={{ color: '#60a5fa' }}>Phase Contrast VENC 設定</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                { label: '大動脈（収縮期）', venc: 150, note: '最大流速の1.2倍設定', color: '#f87171' },
                { label: '大動脈（拡張期）', venc: 80,  note: '低流速期は下げる',   color: '#fb923c' },
                { label: '肺動脈',           venc: 100, note: '右心系は大動脈より低', color: '#fbbf24' },
                { label: '冠動脈',           venc: 60,  note: '最大流速~40-50cm/s', color: '#34d399' },
                { label: '頸動脈',           venc: 120, note: '狭窄部は高VENC設定', color: '#60a5fa' },
                { label: '脳静脈洞',         venc: 40,  note: '静脈は低VENC',       color: '#a78bfa' },
              ].map(({ label, venc, note, color }) => (
                <div key={label} className="rounded p-1.5" style={{ background: '#080c10', border: '1px solid #1a2030' }}>
                  <div className="flex justify-between">
                    <span style={{ color, fontSize: '8px', fontWeight: 600 }}>{label}</span>
                    <span className="font-mono" style={{ color, fontSize: '9px' }}>{venc} cm/s</span>
                  </div>
                  <div style={{ color: '#374151', fontSize: '7px', marginTop: 1 }}>{note}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid #111', color: '#374151', fontSize: '7px' }}>
              VENC設定 = 測定したい最大流速より少し大きく。VENC小→速度分解能↑・エイリアシングリスク↑
            </div>
          </div>
        </div>
      )}

      {subTab === 'PACE' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Respiratory Control</div>
          <ParamField label="Resp.Control" hintKey="PACE" value={respControl} type="select"
            options={['Breath-hold', 'PACE', 'RT', 'Free Breath']}
            onChange={v => {
              setRespControl(v as string)
              const mode = v as string
              setParam('respTrigger', mode === 'Breath-hold' ? 'BH' : mode === 'PACE' ? 'PACE' : mode === 'RT' ? 'RT' : 'Off')
            }} />
          <ParamField label="PACE Acceptance" value={paceAcceptance} type="range"
            min={30} max={70} step={5} unit="%"
            onChange={v => setPaceAcceptance(v as number)} />
          <ParamField label="PACE Position" value={pacePosition} type="select"
            options={['Diaphragm', 'Fixed']}
            onChange={v => setPacePosition(v as string)} />
          <ParamField label="Respiratory Gate" value={respGate} type="toggle"
            onChange={v => setRespGate(v as boolean)} />
          <ParamField label="Gating Window" value={gatingWindow} type="number"
            min={10} max={100} step={5} unit="%"
            onChange={v => setGatingWindow(v as number)} />

          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>PACE収集効率の目安</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div>ナビゲーターウィンドウ <span className="text-white">±2.5mm:</span> 効率50-60%、精度◎</div>
              <div>ナビゲーターウィンドウ <span className="text-white">±5mm:</span> 効率70-80%、精度○</div>
              <div>ナビゲーターウィンドウ <span className="text-white">±10mm:</span> 効率90%+、精度△</div>
              <div className="mt-1" style={{ color: '#6b7280' }}>撮像時間 = 基準時間 ÷ 収集効率</div>
            </div>
          </div>

          <RespWaveformDiagram acceptancePct={paceAcceptance} />

          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>呼吸補正モードの比較</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">Breath-hold: </span>最短時間・最高品質。患者協力が必要。</div>
              <div><span className="text-white">PACE: </span>横隔膜直接追跡。自由呼吸可。効率50-60%。</div>
              <div><span className="text-white">RT: </span>ベローズ間接検出。自由呼吸可。時間2-4倍。</div>
              <div><span className="text-white">Free Breath: </span>同期なし。短時間撮像・非腹部限定。</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
