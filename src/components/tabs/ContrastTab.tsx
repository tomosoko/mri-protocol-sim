import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
// Re-export sub-components for consumers that import directly from ContrastTab
export { DixonTECalculator } from './contrast/DixonPanel'
export { GadoliniumEnhancement, LiveTissueSignalBar } from './contrast/GadoliniumPanel'
export { FatSatB0Chart, fatSatDesc, MTRatioDisplay } from './contrast/FatSatPanel'
export { IRSignalEvolution, TICalculator } from './contrast/IRPanel'
export { T2StarDecayChart, MRSSpectrum } from './contrast/T2StarPanel'

type SubTab = 'Common' | 'Dynamic'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#4a7a9a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

export const sectionHeader = { color: '#4b5563' }

export function ContrastTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Common')

  const [darkBlood, setDarkBlood] = useState(false)
  const [flipAngleMode, setFlipAngleMode] = useState('Constant')
  const [fatWaterContrast, setFatWaterContrast] = useState('Standard')
  const [magnPrep, setMagnPrep] = useState('None')
  const [contrasts, setContrasts] = useState(1)
  const [reconstruction, setReconstruction] = useState('Magnitude')
  const [wrapupMagn, setWrapupMagn] = useState('Restore')
  const [dynamicMode, setDynamicMode] = useState('Standard')
  const [dynMeasurements, setDynMeasurements] = useState(1)
  const [multipleSeries, setMultipleSeries] = useState('Each Measurement')
  const [contrastAgent, setContrastAgent] = useState('None')

  // Spacer row matching ParamField height
  const Spacer = () => <div style={{ height: 22 }} />

  return (
    <div>
      {/* Sub-tabs: Common | Dynamic */}
      <div className="flex" style={{ background: '#161616', borderBottom: '1px solid #252525' }}>
        {(['Common', 'Dynamic'] as SubTab[]).map(t => (
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {/* Left column */}
          <div style={{ borderRight: '1px solid #1a1a1a' }}>
            <ParamField label="TR" hintKey="TR" value={params.TR} type="number"
              min={100} max={15000} step={100} unit="ms"
              onChange={v => setParam('TR', v as number)} highlight={hl('TR')} />
            <ParamField label="TE" hintKey="TE" value={params.TE} type="number"
              min={1} max={1000} step={1} unit="ms"
              onChange={v => setParam('TE', v as number)} highlight={hl('TE')} />
            <Spacer />
            <ParamField label="MTC" value={params.mt} type="toggle"
              onChange={v => setParam('mt', v as boolean)} />
            <ParamField label="Magn. Preparation" value={magnPrep} type="select"
              options={['None', 'IR', 'DIR']}
              onChange={v => setMagnPrep(v as string)} />
            <Spacer />
            <ParamField label="Flip Angle Mode" value={flipAngleMode} type="select"
              options={['Constant', 'Sweep']}
              onChange={v => setFlipAngleMode(v as string)} />
            <ParamField label="Flip Angle" hintKey="flipAngle" value={params.flipAngle} type="number"
              min={5} max={180} step={5} unit="°"
              onChange={v => setParam('flipAngle', v as number)} highlight={hl('flipAngle')} />
          </div>

          {/* Right column */}
          <div>
            <ParamField label="Fat-Water Contrast" value={fatWaterContrast} type="select"
              options={['Standard', 'Water Only', 'Fat Only', 'Opp-Phase', 'In-Phase']}
              onChange={v => setFatWaterContrast(v as string)} />
            <ParamField label="Dark Blood" value={darkBlood} type="toggle"
              onChange={v => setDarkBlood(v as boolean)} />
            <Spacer />
            <ParamField label="Contrasts" value={contrasts} type="number"
              min={1} max={10} step={1}
              onChange={v => setContrasts(v as number)} />
            <ParamField label="Wrap-up Magn." value={wrapupMagn} type="select"
              options={['Restore', 'Store']}
              onChange={v => setWrapupMagn(v as string)} />
            <Spacer />
            <ParamField label="Reconstruction" value={reconstruction} type="select"
              options={['Magnitude', 'Phase', 'Real', 'Imaginary']}
              onChange={v => setReconstruction(v as string)} />
          </div>
        </div>
      )}

      {subTab === 'Dynamic' && (
        <div className="space-y-0">
          <ParamField label="Dynamic Mode" value={dynamicMode} type="select"
            options={['Standard', 'ACS', 'CARE Dynamic']}
            onChange={v => setDynamicMode(v as string)} />
          <ParamField label="Measurements" value={dynMeasurements} type="number"
            min={1} max={20} step={1}
            onChange={v => setDynMeasurements(v as number)} />
          <ParamField label="Multiple Series" value={multipleSeries} type="select"
            options={['Each Measurement', 'Combined']}
            onChange={v => setMultipleSeries(v as string)} />
          <ParamField label="Contrast Agent" value={contrastAgent} type="select"
            options={['None', 'Magnescope', 'Primovist']}
            onChange={v => setContrastAgent(v as string)} />
          <ParamField label="Fat Saturation" hintKey="fatSat" value={params.fatSat} type="select"
            options={['None', 'CHESS', 'SPAIR', 'STIR', 'Dixon']}
            onChange={v => setParam('fatSat', v as typeof params.fatSat)} highlight={hl('fatSat')} />
          <ParamField label="MTC" value={params.mt} type="toggle"
            onChange={v => setParam('mt', v as boolean)} />
          <ParamField label="Dark Blood" value={darkBlood} type="toggle"
            onChange={v => setDarkBlood(v as boolean)} />
        </div>
      )}
    </div>
  )
}

