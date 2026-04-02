import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

export function PhysioTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  return (
    <div className="space-y-0.5">
      {/* Respiratory */}
      <div className="px-3 pt-2 pb-1 text-xs font-semibold" style={{ color: '#9ca3af' }}>呼吸補正</div>
      <div className="px-3 pb-2">
        <div className="flex gap-2 flex-wrap">
          {(['Off', 'BH', 'RT', 'PACE'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setParam('respTrigger', mode)}
              className="px-3 py-1 rounded text-xs font-semibold transition-all"
              style={{
                background: params.respTrigger === mode ? '#1e3a5f' : '#1f2937',
                color: params.respTrigger === mode ? '#93c5fd' : '#6b7280',
                border: `1px solid ${params.respTrigger === mode ? '#2563eb' : '#374151'}`,
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        {/* Resp mode description */}
        <div className="mt-2 p-2 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937', color: '#9ca3af' }}>
          {params.respTrigger === 'Off' && '同期なし — 自由呼吸。短時間撮像か非腹部に限定。'}
          {params.respTrigger === 'BH' && '息止め — 最短時間・最高品質。患者の協力が必要。1回15-20秒程度。'}
          {params.respTrigger === 'RT' && '呼吸トリガー（ベローズ） — 腹部の動きを間接検出。自由呼吸可。撮像時間2-4倍延長。'}
          {params.respTrigger === 'PACE' && 'ナビゲーターエコー — 横隔膜を直接追跡。精度最高。自由呼吸可。効率50-60%。冠動脈MRA・高精度腹部DWIに最適。'}
        </div>
      </div>

      <div className="border-t my-1" style={{ borderColor: '#1f2937' }} />

      {/* ECG */}
      <div className="px-3 pt-1 pb-1 text-xs font-semibold" style={{ color: '#9ca3af' }}>心電図同期</div>
      <ParamField label="ECG Triggering" hintKey="ECGTrigger" value={params.ecgTrigger} type="toggle"
        onChange={v => setParam('ecgTrigger', v as boolean)} highlight={hl('ecgTrigger')} />
      {params.ecgTrigger && (
        <>
          <ParamField label="Trigger Delay" hintKey="TriggerDelay" value={params.triggerDelay} type="range"
            min={0} max={800} step={10} unit="ms"
            onChange={v => setParam('triggerDelay', v as number)} />
          <ParamField label="Trigger Window" value={params.triggerWindow} type="number"
            min={1} max={50} step={1} unit="ms"
            onChange={v => setParam('triggerWindow', v as number)} />

          {/* Trigger delay guide */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
            <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>Trigger Delay の目安</div>
            <table className="w-full">
              <tbody style={{ color: '#9ca3af' }}>
                <tr><td className="py-0.5 text-white">心筋（収縮末期）</td><td>350-400 ms</td></tr>
                <tr><td className="py-0.5 text-white">冠動脈（拡張中期）</td><td>RR間隔×70-80%</td></tr>
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

      {params.respTrigger === 'PACE' && (
        <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
          <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>PACE収集効率の目安</div>
          <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
            <div>ナビゲーターウィンドウ <span className="text-white">±2.5mm:</span> 効率50-60%、精度◎</div>
            <div>ナビゲーターウィンドウ <span className="text-white">±5mm:</span> 効率70-80%、精度○</div>
            <div>ナビゲーターウィンドウ <span className="text-white">±10mm:</span> 効率90%+、精度△</div>
            <div className="mt-1" style={{ color: '#6b7280' }}>撮像時間 = 基準時間 ÷ 収集効率</div>
          </div>
        </div>
      )}
    </div>
  )
}
