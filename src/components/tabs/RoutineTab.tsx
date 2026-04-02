import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

export function RoutineTab() {
  const { params, setParam, activeRoutineTab, setActiveRoutineTab, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#1f2937' }}>
        {(['Part1', 'Part2', 'Assistant'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveRoutineTab(t)}
            className="px-4 py-1.5 text-xs transition-colors"
            style={{
              background: activeRoutineTab === t ? '#1e2d4a' : 'transparent',
              color: activeRoutineTab === t ? '#93c5fd' : '#6b7280',
              borderBottom: activeRoutineTab === t ? '2px solid #3b82f6' : '2px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {activeRoutineTab === 'Part1' && (
        <div className="space-y-0.5">
          <ParamField label="TR" hintKey="TR" value={params.TR} type="number" min={100} max={15000} step={100} unit="ms"
            onChange={v => setParam('TR', v as number)} highlight={hl('TR')} />
          <ParamField label="TE" hintKey="TE" value={params.TE} type="number" min={1} max={1000} step={1} unit="ms"
            onChange={v => setParam('TE', v as number)} highlight={hl('TE')} />
          <ParamField label="TI (反転回復時間)" hintKey="TI" value={params.TI} type="number" min={0} max={5000} step={10} unit="ms"
            onChange={v => setParam('TI', v as number)} highlight={hl('TI')} />
          <ParamField label="Flip Angle" hintKey="FlipAngle" value={params.flipAngle} type="range" min={5} max={180} step={5} unit="°"
            onChange={v => setParam('flipAngle', v as number)} highlight={hl('flipAngle')} />
          <ParamField label="Slices（枚数）" value={params.slices} type="number" min={1} max={200} step={1}
            onChange={v => setParam('slices', v as number)} />
          <ParamField label="Slice Thickness" hintKey="SliceThickness" value={params.sliceThickness} type="range" min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />
          <ParamField label="Slice Gap" hintKey="SliceGap" value={params.sliceGap} type="number" min={0} max={100} step={5} unit="%"
            onChange={v => setParam('sliceGap', v as number)} highlight={hl('sliceGap')} />
        </div>
      )}

      {activeRoutineTab === 'Part2' && (
        <div className="space-y-0.5">
          <ParamField label="Averages（加算回数）" hintKey="Averages" value={params.averages} type="number" min={1} max={8} step={1}
            onChange={v => setParam('averages', v as number)} highlight={hl('averages')} />
          <ParamField label="Phase Oversampling" hintKey="PhaseOversampling" value={params.phaseOversampling} type="range" min={0} max={100} step={10} unit="%"
            onChange={v => setParam('phaseOversampling', v as number)} highlight={hl('phaseOversampling')} />
          <ParamField label="Fat Suppression" hintKey="FatSat" value={params.fatSat} type="select"
            options={['None', 'CHESS', 'SPAIR', 'STIR', 'Dixon']}
            onChange={v => setParam('fatSat', v as typeof params.fatSat)} highlight={hl('fatSat')} />
        </div>
      )}

      {activeRoutineTab === 'Assistant' && (
        <div className="space-y-0.5">
          <ParamField label="SAR Assistant" hintKey="SAR" value={params.sarAssistant} type="select"
            options={['Off', 'Normal', 'Advanced']}
            onChange={v => setParam('sarAssistant', v as typeof params.sarAssistant)} />
          <ParamField label="Allowed Delay" value={params.allowedDelay} type="number" min={0} max={120} step={10} unit="s"
            onChange={v => setParam('allowedDelay', v as number)} />

          {/* SAR info */}
          <div className="mt-4 p-3 rounded text-xs space-y-1" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
            <div className="font-semibold mb-2" style={{ color: '#60a5fa' }}>SAR規制値（IEC基準）</div>
            <div style={{ color: '#9ca3af' }}>全身平均: <span className="text-white">4 W/kg</span> / 15分</div>
            <div style={{ color: '#9ca3af' }}>頭部: <span className="text-white">3.2 W/kg</span> / 10分</div>
            <div style={{ color: '#9ca3af' }}>局所体幹: <span className="text-white">10 W/kg</span> / 5分</div>
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid #1f2937', color: '#6b7280' }}>
              ↑ SAR対策: TR延長・Flip Angle↓・ETL短縮・3T→1.5T変更
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
