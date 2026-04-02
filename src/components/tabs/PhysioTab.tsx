import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

type SubTab = 'Signal' | 'Cardiac' | 'PACE'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e3a5f' : 'transparent',
  color: active ? '#93c5fd' : '#6b7280',
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
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

  const heartRate = params.TR > 0 ? Math.round(60000 / params.TR) : 0

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#1f2937' }}>
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
          <div className="mx-3 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
            <div className="flex justify-between items-center">
              <span style={{ color: '#9ca3af' }}>TR:</span>
              <span className="font-mono text-white font-bold">{params.TR} ms</span>
            </div>
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid #1f2937', color: '#6b7280' }}>
              心電図同期では TR が RR 間隔に依存します（Cardiac タブ参照）
            </div>
          </div>

          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>信号源の選択</div>
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

              {/* Heart rate display */}
              <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
                <div className="flex justify-between items-center mb-2">
                  <span style={{ color: '#9ca3af' }}>推定心拍数 (60000/TR):</span>
                  <span className="font-mono font-bold text-green-400">{heartRate} bpm</span>
                </div>
                <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>Trigger Delay の目安</div>
                <table className="w-full">
                  <tbody style={{ color: '#9ca3af' }}>
                    <tr><td className="py-0.5 text-white">心筋（収縮末期）</td><td>350-400 ms</td></tr>
                    <tr><td className="py-0.5 text-white">冠動脈（拡張中期）</td><td>RR×70-80%</td></tr>
                    <tr><td className="py-0.5 text-white">大動脈弁</td><td>100-200 ms（収縮期）</td></tr>
                    <tr><td className="py-0.5 text-white">僧帽弁</td><td>700-800 ms（拡張期）</td></tr>
                  </tbody>
                </table>
                <div className="mt-1" style={{ color: '#6b7280' }}>
                  ※ 3TではvECG（ベクターECG）を使用するとR波検出精度が大幅に向上
                </div>
              </div>
            </>
          )}
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

          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>PACE収集効率の目安</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div>ナビゲーターウィンドウ <span className="text-white">±2.5mm:</span> 効率50-60%、精度◎</div>
              <div>ナビゲーターウィンドウ <span className="text-white">±5mm:</span> 効率70-80%、精度○</div>
              <div>ナビゲーターウィンドウ <span className="text-white">±10mm:</span> 効率90%+、精度△</div>
              <div className="mt-1" style={{ color: '#6b7280' }}>撮像時間 = 基準時間 ÷ 収集効率</div>
            </div>
          </div>

          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>呼吸補正モードの比較</div>
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
