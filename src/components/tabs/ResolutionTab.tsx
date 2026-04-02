import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { chemShift } from '../../store/calculators'

export function ResolutionTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const readPx = (params.fov / params.matrixFreq).toFixed(2)
  const phasePx = (params.fov / params.matrixPhase * (100 / params.phaseResolution)).toFixed(2)
  const cs = chemShift(params)

  return (
    <div className="space-y-0.5">
      <ParamField label="Base Resolution（周波数）" hintKey="Matrix" value={params.matrixFreq} type="select"
        options={['64','96','128','192','256','320','384','512'].map(String)}
        onChange={v => setParam('matrixFreq', parseInt(v as string))} highlight={hl('matrixFreq')} />
      <ParamField label="Phase Resolution（位相）" value={params.matrixPhase} type="select"
        options={['64','96','128','192','256','320','384','512'].map(String)}
        onChange={v => setParam('matrixPhase', parseInt(v as string))} highlight={hl('matrixPhase')} />
      <ParamField label="FOV" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
        onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
      <ParamField label="Phase Resolution（%）" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
        onChange={v => setParam('phaseResolution', v as number)} highlight={hl('phaseResolution')} />
      <ParamField label="Bandwidth" hintKey="Bandwidth" value={params.bandwidth} type="range" min={50} max={2000} step={50} unit="Hz/Px"
        onChange={v => setParam('bandwidth', v as number)} highlight={hl('bandwidth')} />
      <ParamField label="Interpolation（ゼロ補間）" value={params.interpolation} type="toggle"
        onChange={v => setParam('interpolation', v as boolean)} />

      {/* Voxel info */}
      <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
        <div className="font-semibold mb-2" style={{ color: '#60a5fa' }}>ボクセルサイズ計算</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ color: '#9ca3af' }}>
          <span>読み取り方向:</span>
          <span className="text-white font-mono">{readPx} mm</span>
          <span>位相方向:</span>
          <span className="text-white font-mono">{phasePx} mm</span>
          <span>スライス方向:</span>
          <span className="text-white font-mono">{params.sliceThickness.toFixed(1)} mm</span>
          <span>ボクセル体積:</span>
          <span className="text-white font-mono">{(parseFloat(readPx) * parseFloat(phasePx) * params.sliceThickness).toFixed(2)} mm³</span>
        </div>
      </div>

      {/* Bandwidth / Chemical shift */}
      <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
        <div className="font-semibold mb-2" style={{ color: '#60a5fa' }}>
          化学シフト量 ({params.fieldStrength}T)
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded" style={{ background: '#1f2937' }}>
            <div className="h-full rounded" style={{
              width: `${Math.min(cs * 20, 100)}%`,
              background: cs < 1.5 ? '#34d399' : cs < 3 ? '#fbbf24' : '#f87171',
            }} />
          </div>
          <span className={`font-mono font-bold ${cs < 1.5 ? 'text-green-400' : cs < 3 ? 'text-yellow-400' : 'text-red-400'}`}>
            {cs} px
          </span>
        </div>
        <div className="mt-1" style={{ color: '#6b7280' }}>
          水脂肪周波数差: {params.fieldStrength === 3.0 ? '440Hz (3T)' : '220Hz (1.5T)'} ÷ BW {params.bandwidth}Hz/Px
        </div>
        {cs >= 3 && (
          <div className="mt-1 text-red-400">⚠ 化学シフトアーチファクトが顕著です。BW増加か脂肪抑制を推奨。</div>
        )}
      </div>
    </div>
  )
}
