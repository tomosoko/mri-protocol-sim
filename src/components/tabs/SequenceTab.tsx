import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { calcT2Blur } from '../../store/calculators'
import { VizSection } from '../VizSection'
import { RFPulseSliceProfile, TrueFISPBandingViz } from './sequence/RFPhysicsViz'
import { MinTECalculator, TEBudgetChart, PulseSequenceDiagram } from './sequence/TEBudget'
import { KSpaceEchoTrainViz, KSpaceGrid2D, PSFBlurSimulator } from './sequence/KSpaceViz'
import { ADCSignalChart, SMSAccelerationPanel, DWIBValuesPanel } from './sequence/DWIPanel'

export function SequenceTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  const isHASTE = params.turboFactor >= 80
  const t2blur = calcT2Blur(params)
  const effTE = params.TE + params.echoSpacing * Math.floor(params.turboFactor / 2)
  const lastEchoTE = params.TE + params.echoSpacing * (params.turboFactor - 1)

  const pfRec = isHASTE ? '5/8 推奨' : params.turboFactor > 30 ? '6/8 推奨' : null

  return (
    <div className="space-y-0.5">
      <ParamField label="Turbo Factor / ETL" hintKey="TurboFactor" value={params.turboFactor} type="range"
        min={1} max={250} step={1}
        onChange={v => setParam('turboFactor', v as number)} highlight={hl('turboFactor')} />
      <ParamField label="Echo Spacing" value={params.echoSpacing} type="number"
        min={2} max={10} step={0.1} unit="ms"
        onChange={v => setParam('echoSpacing', v as number)} />
      <ParamField label="Partial Fourier" hintKey="PartialFourier" value={params.partialFourier} type="select"
        options={['Off', '7/8', '6/8', '5/8', '4/8']}
        onChange={v => setParam('partialFourier', v as typeof params.partialFourier)} highlight={hl('partialFourier')} />

      <VizSection><RFPulseSliceProfile /></VizSection>
      <VizSection><MinTECalculator /></VizSection>
      <VizSection><TEBudgetChart /></VizSection>
      <VizSection><PulseSequenceDiagram /></VizSection>
      <VizSection><KSpaceEchoTrainViz /></VizSection>
      <VizSection><KSpaceGrid2D /></VizSection>
      <VizSection><TrueFISPBandingViz /></VizSection>

      {/* ETL 計算インジケーター */}
      {params.turboFactor > 1 && (
        <div className="mx-3 mt-2 p-3 rounded text-xs space-y-1.5" style={{ background: '#111', border: '1px solid #252525' }}>
          <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>ETL 計算結果</div>
          <div className="flex justify-between">
            <span style={{ color: '#6b7280' }}>Effective TE (k中心)</span>
            <span className="font-mono text-white">{effTE.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#6b7280' }}>最終エコー TE</span>
            <span className="font-mono text-white">{lastEchoTE.toFixed(0)} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: '#6b7280' }}>T2 ぼけ係数 (PSF)</span>
            <span className="font-mono" style={{ color: t2blur > 0.7 ? '#34d399' : t2blur > 0.4 ? '#fbbf24' : '#f87171' }}>
              {t2blur.toFixed(2)} {t2blur < 0.5 ? '⚠ ぼけ大' : ''}
            </span>
          </div>
          <div className="w-full h-1.5 rounded overflow-hidden" style={{ background: '#1e1e1e' }}>
            <div className="h-full rounded" style={{
              width: `${t2blur * 100}%`,
              background: t2blur > 0.7 ? '#34d399' : t2blur > 0.4 ? '#fbbf24' : '#f87171',
            }} />
          </div>
          {pfRec && (
            <div style={{ color: '#fbbf24', fontSize: '9px' }}>💡 {pfRec}</div>
          )}
        </div>
      )}

      {/* ETL 臨床ガイド */}
      <VizSection>
        <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #1a1a1a' }}>
          <div className="font-semibold mb-1.5" style={{ color: '#e88b00' }}>Turbo Factor 臨床ガイド</div>
          <table className="w-full">
            <thead>
              <tr style={{ color: '#4b5563', fontSize: '9px' }}>
                <th className="text-left py-0.5 w-32">用途</th>
                <th className="text-center py-0.5">ETL</th>
                <th className="text-left py-0.5 pl-2">特性</th>
              </tr>
            </thead>
            <tbody style={{ color: '#9ca3af' }}>
              {[
                ['T2 TSE 頭部', '15-25', 'コントラスト良好'],
                ['T2 TSE 腹部', '25-40', '速度・ぼけのバランス'],
                ['T2 TSE 関節', '10-15', '精細描出・ぼけ最小'],
                ['PDw TSE',    '8-12',  'TE短縮・高SNR'],
                ['FLAIR',      '20-30', 'PF必須・SAR注意'],
                ['HASTE',      '100+',  'シングルショット'],
                ['MRCP',       '150+',  '重T2・PF必須'],
              ].map(([label, etl, note]) => (
                <tr key={label} style={{ borderTop: '1px solid #111' }}>
                  <td className="py-0.5 text-white">{label}</td>
                  <td className="text-center py-0.5 font-mono">{etl}</td>
                  <td className="py-0.5 pl-2" style={{ fontSize: '9px', color: '#6b7280' }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VizSection>

      <VizSection><PSFBlurSimulator /></VizSection>
      <VizSection><SMSAccelerationPanel /></VizSection>

      <DWIBValuesPanel />
      <VizSection><ADCSignalChart /></VizSection>
    </div>
  )
}
