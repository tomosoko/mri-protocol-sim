import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField, SectionHeader as SH } from '../ParamField'
import { calcTEmin, calcTRmin } from '../../store/calculators'
import { SequencePresetBar } from './routine/SequencePresetBar'
import {
  ErnstAngleIndicator,
  SignalCurveChart,
  SliceOrderViz,
  ScanTimeBreakdown,
  SteadyStateConvergence,
  BrainPhantomPreview,
  ContrastHeatmap,
} from './routine/RoutineVisuals'
import { SequenceTimingDiagram } from './routine/SequenceTimingDiagram'

export {
  ErnstAngleIndicator,
  SignalCurveChart,
  SliceOrderViz,
  ScanTimeBreakdown,
  SteadyStateConvergence,
  BrainPhantomPreview,
  ContrastHeatmap,
  SequenceTimingDiagram,
}

function Cell({ children, left }: { children: React.ReactNode; left?: boolean }) {
  return (
    <div style={{ borderRight: left ? '1px solid #1e1e1e' : undefined }}>
      {children}
    </div>
  )
}

export function BlankRow() {
  return (
    <>
      <div style={{ height: '22px', borderRight: '1px solid #1e1e1e', borderBottom: '1px solid #1e1e1e' }} />
      <div style={{ height: '22px', borderBottom: '1px solid #1e1e1e' }} />
    </>
  )
}

export function FullWidthSH({ label }: { label: string }) {
  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <SH label={label} />
    </div>
  )
}

export function RoutineTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const [autoAlign, setAutoAlign] = useState(false)
  const [concatenations, setConcatenations] = useState(1)
  const [posL, setPosL] = useState(0.0)
  const [posP, setPosP] = useState(60.0)
  const [posH, setPosH] = useState(0.0)
  const [sliceGroup, setSliceGroup] = useState(1)

  const phaseEncOptions: typeof params.phaseEncDir[] = ['A>>P', 'P>>A', 'R>>L', 'L>>R', 'H>>F', 'F>>H']
  const trMin = calcTRmin(params)
  const teMin = calcTEmin(params)

  return (
    <>
      {/* Sequence preset bar — one-click loading of common protocols */}
      <SequencePresetBar />

      {/* Parameter grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

        {/* ── Row: Slice Group | FOV Read ── */}
        <Cell left>
          <div className="flex items-center" style={{ height: '22px', borderBottom: '1px solid #1e1e1e' }}>
            <span className="shrink-0 text-right" style={{ width: '48%', paddingRight: '8px', paddingLeft: '8px', color: '#8090a0', fontSize: '11px' }}>
              Slice Group
            </span>
            <div className="flex items-center gap-1">
              <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 2, display: 'flex', alignItems: 'center', height: '20px' }}>
                <span className="font-mono" style={{ width: '28px', padding: '0 4px', color: '#dde4ec', fontSize: '11.5px', textAlign: 'right' }}>
                  {sliceGroup}
                </span>
              </div>
              <button onMouseDown={e => { e.preventDefault(); setSliceGroup(g => Math.max(1, g - 1)) }}
                style={{ background: '#252525', color: '#808080', border: '1px solid #2a2a2a', borderRadius: 2, width: '16px', height: '20px', fontSize: '10px', cursor: 'pointer', lineHeight: 1 }}>−</button>
              <button onMouseDown={e => { e.preventDefault(); setSliceGroup(g => Math.min(8, g + 1)) }}
                style={{ background: '#252525', color: '#808080', border: '1px solid #2a2a2a', borderRadius: 2, width: '16px', height: '20px', fontSize: '10px', cursor: 'pointer', lineHeight: 1 }}>+</button>
            </div>
          </div>
        </Cell>
        <Cell>
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
        </Cell>

        {/* ── Row: Slices | FOV Phase ── */}
        <Cell left>
          <ParamField label="Slices" value={params.slices} type="number" min={1} max={256} step={1}
            onChange={v => setParam('slices', v as number)} />
        </Cell>
        <Cell>
          <ParamField label="FOV Phase" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} />
        </Cell>

        {/* ── Row: (blank) | Slice Thickness ── */}
        <Cell left>
          <div style={{ height: '22px', borderBottom: '1px solid #1e1e1e' }} />
        </Cell>
        <Cell>
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range"
            min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />
        </Cell>

        {/* ── Row: Dist. Factor | TR ── */}
        <Cell left>
          <ParamField label="Dist. Factor" value={params.sliceGap} type="number" min={0} max={100} step={5} unit="%"
            onChange={v => setParam('sliceGap', v as number)} />
        </Cell>
        <Cell>
          <ParamField label="TR" hintKey="TR" value={params.TR} type="number" min={100} max={15000} step={100} unit="ms"
            onChange={v => setParam('TR', v as number)} highlight={hl('TR')}
            warn={params.TR < trMin} warnMsg={`TR < TR_min (${trMin}ms)`} />
          {params.TR < trMin && (
            <div className="flex items-center gap-1 px-1 py-0.5" style={{ background: '#1a0505', borderBottom: '1px solid #7f1d1d20' }}>
              <span style={{ color: '#f87171', fontSize: '8px' }}>⚠ TR_min {trMin}ms</span>
              <button onClick={() => setParam('TR', trMin)}
                style={{ color: '#34d399', fontSize: '7px', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, padding: '0 3px', cursor: 'pointer' }}>Fix</button>
            </div>
          )}
        </Cell>

        {/* ── Row: Position | TE ── */}
        <Cell left>
          <div className="flex items-center" style={{ height: '22px', borderBottom: '1px solid #1e1e1e' }}>
            <span className="shrink-0 text-right" style={{ width: '48%', paddingRight: '8px', paddingLeft: '8px', color: '#8090a0', fontSize: '11px' }}>
              Position
            </span>
            <div className="flex items-center gap-0.5">
              {([['L', posL, setPosL], ['P', posP, setPosP], ['H', posH, setPosH]] as const).map(([lbl, val, fn]) => (
                <div key={lbl} className="flex items-center gap-0.5">
                  <span style={{ color: '#4b5563', fontSize: '9px' }}>{lbl}</span>
                  <input type="number" value={val} step={1}
                    onChange={e => fn(parseFloat(e.target.value) || 0)}
                    className="outline-none text-right font-mono"
                    style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 2, color: '#dde4ec', width: '32px', height: '18px', fontSize: '9.5px', padding: '0 2px' }} />
                </div>
              ))}
            </div>
          </div>
        </Cell>
        <Cell>
          <ParamField label="TE" hintKey="TE" value={params.TE} type="number" min={1} max={1000} step={1} unit="ms"
            onChange={v => setParam('TE', v as number)} highlight={hl('TE')}
            warn={params.TE < teMin} warnMsg={`TE < TE_min (${teMin}ms)`} />
          {params.TE < teMin && (
            <div className="flex items-center gap-1 px-1 py-0.5" style={{ background: '#1a0505', borderBottom: '1px solid #7f1d1d20' }}>
              <span style={{ color: '#f87171', fontSize: '8px' }}>⚠ TE_min {teMin}ms</span>
              <button onClick={() => setParam('TE', teMin)}
                style={{ color: '#34d399', fontSize: '7px', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, padding: '0 3px', cursor: 'pointer' }}>Fix</button>
            </div>
          )}
        </Cell>

        {/* ── Row: Orientation | Averages ── */}
        <Cell left>
          <ParamField label="Orientation" value={params.orientation} type="select"
            options={['Tra', 'Cor', 'Sag']}
            onChange={v => setParam('orientation', v as typeof params.orientation)} />
        </Cell>
        <Cell>
          <ParamField label="Averages" hintKey="averages" value={params.averages} type="number" min={1} max={8} step={1}
            onChange={v => setParam('averages', v as number)} highlight={hl('averages')} />
        </Cell>

        {/* ── Row: Phase Enc Dir. | Concatenations ── */}
        <Cell left>
          <ParamField label="Phase Enc Dir." hintKey="phaseEncDir" value={params.phaseEncDir} type="select"
            options={phaseEncOptions}
            onChange={v => setParam('phaseEncDir', v as typeof params.phaseEncDir)} highlight={hl('phaseEncDir')} />
        </Cell>
        <Cell>
          <ParamField label="Concatenations" value={concatenations} type="number" min={1} max={16} step={1}
            onChange={v => setConcatenations(v as number)} />
        </Cell>

        {/* ── Row: Phase Oversampling | AutoAlign ── */}
        <Cell left>
          <ParamField label="Phase Oversampling" hintKey="phaseOversampling" value={params.phaseOversampling} type="range"
            min={0} max={100} step={10} unit="%"
            onChange={v => setParam('phaseOversampling', v as number)} highlight={hl('phaseOversampling')} />
        </Cell>
        <Cell>
          <ParamField label="AutoAlign" value={autoAlign} type="toggle"
            onChange={v => setAutoAlign(v as boolean)} />
        </Cell>

      </div>

      {/* Visualization panels */}
      <div className="pb-3">
        <ErnstAngleIndicator />
        <SequenceTimingDiagram />
        <SteadyStateConvergence />
        <SignalCurveChart />
        <BrainPhantomPreview />
        <ContrastHeatmap />
        <ScanTimeBreakdown />
        <SliceOrderViz />
      </div>
    </>
  )
}
