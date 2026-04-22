import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { VizSection } from '../VizSection'
import { ScannerBoreDiagram, GradientMonitor, GradientTempMonitor } from '../system/ScannerHardware'
import { B1FieldMap, B0FieldMap2D } from '../system/FieldVisualization'
import { CoilElementMap, CoilReferenceTable } from '../system/CoilSystem'
import { SARBreakdown, SARAccumulationMonitor, PNSMonitor, MRSafetyChecker } from '../system/SafetyMonitors'
import { GFactorChart } from '../system/GFactorChart'
import { PrescanStatusPanel } from '../system/PrescanStatusPanel'
import { CryoMonitor, RFAmplifierMonitor, ReceiverChainMonitor } from '../system/HardwareMonitors'

type SubTab = 'Misc' | 'Adjustments' | 'Adj.Volume' | 'pTx' | 'Tx-Rx'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#4a7a9a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function SystemTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Misc')

  // local state
  const [coilCombination, setCoilCombination] = useState('Sum of Squares')
  const [msma, setMsma] = useState('S-C-T')
  const [matrixOpt, setMatrixOpt] = useState('Off')
  const [coilFocus, setCoilFocus] = useState('Flat')
  const [adjStrategy, setAdjStrategy] = useState('Standard')
  const [b0Shim, setB0Shim] = useState('Standard')
  const [b1Shim, setB1Shim] = useState('TrueForm')
  const [adjTolerance, setAdjTolerance] = useState('Auto')
  const [confirmFreq, setConfirmFreq] = useState('Never')
  const [adjPosAP, setAdjPosAP] = useState(0)
  const [adjPosRL, setAdjPosRL] = useState(0)
  const [adjPosFH, setAdjPosFH] = useState(0)
  const [adjOrientation, setAdjOrientation] = useState('Iso-Center')
  const [txRefAmp, setTxRefAmp] = useState(200)
  const [imageScaling, setImageScaling] = useState(1.0)
  const [trueForm, setTrueForm] = useState(true)
  const [b1ShimMode, setB1ShimMode] = useState('TrueForm')
  const [rfShim, setRfShim] = useState(false)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Misc', 'Adjustments', 'Adj.Volume', 'pTx', 'Tx-Rx'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="px-3 py-1.5 text-xs transition-colors"
            style={subTabStyle(subTab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'Misc' && (
        <div className="space-y-0.5">
          {/* Field strength */}
          <div className="px-3 py-2">
            <div className="text-xs mb-2" style={{ color: '#6b7280' }}>Field Strength</div>
            <div className="flex gap-2">
              {([1.5, 3.0] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setParam('fieldStrength', f)}
                  className="px-4 py-1.5 rounded text-sm font-bold transition-all"
                  style={{
                    background: params.fieldStrength === f ? '#8a4400' : '#1a1a1a',
                    color: params.fieldStrength === f ? '#fff' : '#6b7280',
                    border: `1px solid ${params.fieldStrength === f ? '#c47400' : '#374151'}`,
                  }}
                >
                  {f}T
                </button>
              ))}
            </div>
            {params.fieldStrength === 3.0 && (
              <div className="mt-2 p-2 rounded text-xs" style={{ background: '#141414', border: '1px solid #7c3aed', color: '#a78bfa' }}>
                ⚠ 3T注意: SAR≈4倍・化学シフト2倍・Dielectric Effect・SNR↑（理論値√2倍）
              </div>
            )}
          </div>

          <div className="border-t my-1" style={{ borderColor: '#252525' }} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Coil</div>
          <ParamField label="Coil Selection" value={params.coilType ?? 'Body'} type="select"
            options={['Head_64', 'Head_20', 'Spine_32', 'Body', 'Knee', 'Shoulder', 'Flex']}
            onChange={v => setParam('coilType', v as typeof params.coilType)} />
          <ParamField label="Coil Combination" value={coilCombination} type="select"
            options={['Sum of Squares', 'Adaptive']}
            onChange={v => setCoilCombination(v as string)} />
          <ParamField label="MSMA" value={msma} type="select"
            options={['S-C-T', 'T-C-S']}
            onChange={v => setMsma(v as string)} />
          <ParamField label="Matrix Optimization" value={matrixOpt} type="select"
            options={['Off', 'On', 'Adaptive']}
            onChange={v => setMatrixOpt(v as string)} />
          <ParamField label="Coil Focus" value={coilFocus} type="select"
            options={['Flat', 'Center']}
            onChange={v => setCoilFocus(v as string)} />

          {/* Coil element visualization */}
          <VizSection><CoilElementMap /></VizSection>

          <div className="border-t my-1" style={{ borderColor: '#252525' }} />

          <ParamField label="Gradient Mode" hintKey="gradientMode" value={params.gradientMode} type="select"
            options={['Fast', 'Normal', 'Whisper']}
            onChange={v => setParam('gradientMode', v as typeof params.gradientMode)} />
          <ParamField label="Shim Mode" value={params.shim} type="select"
            options={['Auto', 'Manual']}
            onChange={v => setParam('shim', v as typeof params.shim)} />

          {/* Gradient mode guide */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>Gradient Mode</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">Fast: </span>最速・最大騒音・PNS（末梢神経刺激）↑ → 心臓シネ/EPI</div>
              <div><span className="text-white">Normal: </span>標準バランス → 通常検査</div>
              <div><span className="text-white">Whisper: </span>低騒音(約-10dB)・低PNS → 小児/聴覚過敏・鎮静</div>
            </div>
          </div>

          {/* Gradient Performance Monitor */}
          <VizSection><GradientMonitor /></VizSection>

          {/* Gradient Thermal Monitor */}
          <VizSection><GradientTempMonitor /></VizSection>

          {/* PNS Monitor */}
          <VizSection><PNSMonitor /></VizSection>

          {/* MR Safety / Implant Check */}
          <VizSection><MRSafetyChecker /></VizSection>

          {/* Cryo System Monitor */}
          <VizSection><CryoMonitor /></VizSection>

          {/* Scanner Bore Cross-Section Diagram */}
          <VizSection><ScannerBoreDiagram /></VizSection>

          {/* SAR Breakdown */}
          <VizSection><SARBreakdown /></VizSection>

          {/* SAR Accumulation Monitor */}
          <VizSection><SARAccumulationMonitor /></VizSection>

          {/* Coil Reference Table */}
          <VizSection><CoilReferenceTable /></VizSection>
        </div>
      )}

      {subTab === 'Adjustments' && (
        <div className="space-y-0.5">
          {/* Prescan / shimming status */}
          <VizSection><PrescanStatusPanel /></VizSection>

          {/* 2D B0 field map */}
          <VizSection><B0FieldMap2D /></VizSection>

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Adjustment Strategy</div>
          <ParamField label="Adjustment Strategy" value={adjStrategy} type="select"
            options={['Standard', 'FastAdjust', 'Advanced']}
            onChange={v => setAdjStrategy(v as string)} />
          <ParamField label="B0 Shim" value={b0Shim} type="select"
            options={['Standard', 'Advanced', 'TuneUp']}
            onChange={v => setB0Shim(v as string)} />
          <ParamField label="B1 Shim" value={b1Shim} type="select"
            options={['TrueForm', 'CP Mode', 'Dual Drive']}
            onChange={v => setB1Shim(v as string)} />
          <ParamField label="Adjustment Tolerance" value={adjTolerance} type="select"
            options={['Auto', 'Custom']}
            onChange={v => setAdjTolerance(v as string)} />
          <ParamField label="Confirm Frequency" value={confirmFreq} type="select"
            options={['Never', 'Always', 'When Changed']}
            onChange={v => setConfirmFreq(v as string)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>iPAT（並列撮像）設定</div>
            <ParamField label="iPAT Mode" hintKey="iPAT" value={params.ipatMode} type="select"
              options={['Off', 'GRAPPA', 'CAIPIRINHA']}
              onChange={v => setParam('ipatMode', v as typeof params.ipatMode)} highlight={hl('ipatMode')} />
            {params.ipatMode !== 'Off' && (
              <>
                <ParamField label="Acceleration Factor" value={params.ipatFactor} type="select"
                  options={['2', '3', '4']}
                  onChange={v => setParam('ipatFactor', parseInt(v as string))} />
                <div className="mt-2 space-y-1 text-xs" style={{ color: '#9ca3af' }}>
                  <div>撮像時間: <span className="text-white">約 1/{params.ipatFactor} に短縮</span></div>
                  <div>SNR低下: <span className="text-yellow-400">約 {(100 / Math.sqrt(params.ipatFactor)).toFixed(0)}% に低下</span></div>
                  {params.ipatFactor >= 3 && (
                    <div className="text-orange-400">⚠ AF≥3はg-factor（残留アーチファクト）に注意</div>
                  )}
                </div>
                <VizSection><GFactorChart /></VizSection>
              </>
            )}
          </div>
        </div>
      )}

      {subTab === 'Adj.Volume' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Adjustment Volume Position</div>
          <ParamField label="Position A>>P" value={adjPosAP} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosAP(v as number)} />
          <ParamField label="Position R>>L" value={adjPosRL} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosRL(v as number)} />
          <ParamField label="Position F>>H" value={adjPosFH} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosFH(v as number)} />
          <ParamField label="Orientation" value={adjOrientation} type="select"
            options={['Iso-Center', 'Custom']}
            onChange={v => setAdjOrientation(v as string)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div style={{ color: '#9ca3af' }}>
              Adjustment Volumeは磁場均一性の調整（シム）を行う領域を定義します。
              撮像部位に合わせてサイズ・位置を最適化することでシム精度が向上します。
            </div>
          </div>
        </div>
      )}

      {subTab === 'pTx' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Parallel Transmit</div>
          <ParamField label="Tx Ref Amplitude" value={txRefAmp} type="number"
            min={50} max={500} step={10} unit="V"
            onChange={v => setTxRefAmp(v as number)} />
          <ParamField label="Image Scaling" value={imageScaling} type="number"
            min={0.1} max={5.0} step={0.01}
            onChange={v => setImageScaling(v as number)} />
          <ParamField label="TrueForm" value={trueForm} type="toggle"
            onChange={v => setTrueForm(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>pTx (parallel Transmit)</div>
            <div style={{ color: '#9ca3af' }}>
              複数の送信チャンネルを使用してB1フィールドを均一化します。3Tでの腹部・骨盤撮像でのDielectric Effect対策に有効。
              TrueFormは標準的なCP送信モードでB1均一性を最適化します。
            </div>
          </div>
          <VizSection><B1FieldMap fieldStrength={params.fieldStrength} trueForm={trueForm} /></VizSection>
        </div>
      )}

      {subTab === 'Tx-Rx' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Transmit / Receive</div>
          <ParamField label="B1 Shim Mode" value={b1ShimMode} type="select"
            options={['TrueForm', 'CP Mode']}
            onChange={v => setB1ShimMode(v as string)} />
          <ParamField label="RF Shim" value={rfShim} type="toggle"
            onChange={v => setRfShim(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>B1 Shim Mode</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">TrueForm: </span>位相・振幅最適化で均一なB1分布を実現（推奨）</div>
              <div><span className="text-white">CP Mode: </span>従来のCircular Polarized送信モード</div>
            </div>
          </div>

          {/* RF Amplifier Monitor */}
          <VizSection><RFAmplifierMonitor /></VizSection>

          {/* Receiver Chain Noise Figure */}
          <VizSection><ReceiverChainMonitor /></VizSection>
        </div>
      )}
    </div>
  )
}
