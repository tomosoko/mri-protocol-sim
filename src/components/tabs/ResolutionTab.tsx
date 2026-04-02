import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { chemShift } from '../../store/calculators'

type SubTab = 'Common' | 'Acceleration' | 'Filter'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e3a5f' : 'transparent',
  color: active ? '#93c5fd' : '#6b7280',
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function ResolutionTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Common')

  // local state for Acceleration / Filter params not in ProtocolParams
  const [accelMode, setAccelMode] = useState('Off')
  const [deepResolve, setDeepResolve] = useState(false)
  const [phasePartialFourier, setPhasePartialFourier] = useState('Off')
  const [refScans, setRefScans] = useState('GRE')
  const [accelFactorPE, setAccelFactorPE] = useState(1)
  const [refLinesPE, setRefLinesPE] = useState(24)
  const [rawFilter, setRawFilter] = useState(false)
  const [ellipticalFilter, setEllipticalFilter] = useState(false)
  const [imageFilter, setImageFilter] = useState(false)
  const [normalize, setNormalize] = useState(false)
  const [distortionCorr, setDistortionCorr] = useState('Off')

  const readPx = (params.fov / params.matrixFreq).toFixed(2)
  const phasePx = (params.fov / params.matrixPhase * (100 / params.phaseResolution)).toFixed(2)
  const cs = chemShift(params)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#1f2937' }}>
        {(['Common', 'Acceleration', 'Filter'] as SubTab[]).map(t => (
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

      {subTab === 'Common' && (
        <div className="space-y-0.5">
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
          <ParamField label="FOV Phase%" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} highlight={hl('phaseResolution')} />
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range" min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />
          <ParamField label="Base Resolution" hintKey="matrix" value={params.matrixFreq} type="select"
            options={['64','96','128','192','256','320','384','512']}
            onChange={v => setParam('matrixFreq', parseInt(v as string))} highlight={hl('matrixFreq')} />
          <ParamField label="Phase Resolution%" value={params.matrixPhase} type="select"
            options={['64','96','128','192','256','320','384','512']}
            onChange={v => setParam('matrixPhase', parseInt(v as string))} highlight={hl('matrixPhase')} />
          <ParamField label="Interpolation" value={params.interpolation} type="toggle"
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

          {/* Chemical shift */}
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
      )}

      {subTab === 'Acceleration' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Parallel Imaging</div>
          <ParamField label="Acceleration Mode" value={accelMode} type="select"
            options={['Off', 'GRAPPA', 'CAIPIRINHA']}
            onChange={v => setAccelMode(v as string)} />
          <ParamField label="Deep Resolve" value={deepResolve} type="toggle"
            onChange={v => setDeepResolve(v as boolean)} />
          <ParamField label="Phase Partial Fourier" hintKey="partialFourier" value={phasePartialFourier} type="select"
            options={['Off', '4/8', '5/8', '6/8', '7/8']}
            onChange={v => setPhasePartialFourier(v as string)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Reference</div>
          <ParamField label="Reference Scans" value={refScans} type="select"
            options={['GRE', 'Sep', 'EPI']}
            onChange={v => setRefScans(v as string)} />
          <ParamField label="Acceleration Factor PE" value={accelFactorPE} type="number"
            min={1} max={4} step={1}
            onChange={v => setAccelFactorPE(v as number)} />
          <ParamField label="Reference Lines PE" value={refLinesPE} type="number"
            min={8} max={64} step={4}
            onChange={v => setRefLinesPE(v as number)} />
        </div>
      )}

      {subTab === 'Filter' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Raw Data Filter</div>
          <ParamField label="Raw Filter" value={rawFilter} type="toggle"
            onChange={v => setRawFilter(v as boolean)} />
          <ParamField label="Elliptical Filter" value={ellipticalFilter} type="toggle"
            onChange={v => setEllipticalFilter(v as boolean)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Image Filter</div>
          <ParamField label="Image Filter" value={imageFilter} type="toggle"
            onChange={v => setImageFilter(v as boolean)} />
          <ParamField label="Normalize" value={normalize} type="toggle"
            onChange={v => setNormalize(v as boolean)} />
          <ParamField label="Distortion Correction" value={distortionCorr} type="select"
            options={['Off', '2D', '3D']}
            onChange={v => setDistortionCorr(v as string)} />
        </div>
      )}
    </div>
  )
}
