import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

// IVIM モデル計算機 (Intravoxel Incoherent Motion)
function IVIMCalculator({ bValues }: { bValues: number[] }) {
  const sortedB = [...bValues].sort((a, z) => a - z)
  const maxB = Math.max(...sortedB)
  const hasLowB = sortedB.some(b => b > 0 && b < 200)

  // Simulate tissue ADC values for different tissues at the given b-values
  const tissues = [
    { label: '正常肝', D: 1.1, Dstar: 12, f: 0.18, color: '#fb923c' },
    { label: 'HCC', D: 0.95, Dstar: 8, f: 0.12, color: '#f87171' },
    { label: '肝嚢胞', D: 2.8, Dstar: 20, f: 0.05, color: '#38bdf8' },
    { label: '前立腺PZ', D: 1.6, Dstar: 15, f: 0.20, color: '#a78bfa' },
    { label: '前立腺Ca', D: 0.75, Dstar: 6, f: 0.10, color: '#f43f5e' },
  ]

  // IVIM signal model: S(b)/S0 = f*exp(-b*(D+D*)) + (1-f)*exp(-b*D)
  const ivimSignal = (b: number, D: number, Dstar: number, f: number) =>
    f * Math.exp(-b * (D + Dstar) / 1000) + (1 - f) * Math.exp(-b * D / 1000)

  const W = 270, H = 80
  const PAD = { l: 28, r: 8, t: 6, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const bMax = Math.max(maxB, 1000)
  const nPts = 60
  const bPts = Array.from({ length: nPts }, (_, i) => (i / (nPts - 1)) * bMax)

  const tx = (b: number) => PAD.l + (b / bMax) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, s))) * innerH

  const paths = useMemo(() => tissues.map(t => {
    const d = bPts.map((b, i) => {
      const s = ivimSignal(b, t.D, t.Dstar, t.f)
      return `${i === 0 ? 'M' : 'L'}${tx(b).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    return { ...t, d }
  }), [bValues])

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0e14', border: '1px solid #1a2a3a' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px' }}>IVIM モデル (b値別信号予測)</span>
        {!hasLowB && <span style={{ color: '#f87171', fontSize: '8px' }}>⚠ 低b値(＜200)が必要</span>}
      </div>

      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#1a1a1a" strokeWidth={1} />
        ))}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
        <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
        <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>b値 (s/mm²)</text>

        {/* b-value markers */}
        {sortedB.map(b => (
          <line key={b} x1={tx(b)} y1={PAD.t} x2={tx(b)} y2={PAD.t + innerH}
            stroke="#e88b00" strokeWidth={1} strokeDasharray="2,2" opacity={0.5} />
        ))}

        {/* Tissue curves */}
        {paths.map(t => (
          <path key={t.label} d={t.d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.8} />
        ))}

        {/* b-axis labels */}
        {[0, 500, 1000].filter(b => b <= bMax).map(b => (
          <text key={b} x={tx(b)} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{b}</text>
        ))}
      </svg>

      {/* Legend + IVIM params */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1" style={{ fontSize: '7px' }}>
        {tissues.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <span style={{ color: t.color }}>—</span>
            <span style={{ color: '#6b7280' }}>{t.label}</span>
            <span className="font-mono" style={{ color: '#374151' }}>D={t.D}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        IVIM: S(b) = f·e^(-b(D+D*)) + (1-f)·e^(-bD) — D=真拡散, D*=擬似拡散, f=灌流分率
      </div>
    </div>
  )
}

// ── インライン再構成パイプライン ───────────────────────────────────────────────
// syngo Inline の再構成ワークフローを可視化
// 生データ → FFT → 画像補正 → インライン処理 → DICOM転送 の各ステップ
function ReconPipeline() {
  const { params } = useProtocolStore()
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  type Step = { id: string; label: string; desc: string; active: boolean; color: string; time: string }
  const steps: Step[] = [
    { id: 'acq', label: 'Acquisition', desc: 'k空間データ収集', active: true, color: '#60a5fa', time: '—' },
    { id: 'raw', label: 'Raw Filter', desc: 'ハンニング窓・Fermi', active: true, color: '#34d399', time: '<1ms' },
    { id: 'fft', label: 'iFFT', desc: '2D/3D 逆フーリエ変換', active: true, color: '#34d399', time: '~5ms' },
    { id: 'zf',  label: 'Zerofilling', desc: '補間・ゼロ充填', active: params.interpolation, color: '#fbbf24', time: '2ms' },
    { id: 'grappa', label: 'GRAPPA', desc: 'iPAT ACS補間', active: params.ipatMode !== 'Off', color: '#a78bfa', time: '10-50ms' },
    { id: 'pf',  label: 'Partial Fourier', desc: 'Homodyne / POCS', active: params.partialFourier !== 'Off', color: '#fb923c', time: '5ms' },
    { id: 'adc', label: 'ADC Map', desc: 'DWI定量マップ', active: isDWI && params.inlineADC, color: '#f87171', time: '100ms' },
    { id: 'mip', label: 'MIP/MPR', desc: '投影・多断面再構成', active: params.inlineMIP || params.inlineMPR, color: '#e879f9', time: '200ms' },
    { id: 'sub', label: 'Subtraction', desc: '造影前後差分', active: params.inlineSubtraction, color: '#38bdf8', time: '50ms' },
    { id: 'dcm', label: 'DICOM Send', desc: 'PACS転送', active: true, color: '#6b7280', time: '—' },
  ].filter(s => s.active || ['acq', 'raw', 'fft', 'dcm'].includes(s.id))

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060809', border: '1px solid #1a2030' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#e88b00', fontSize: '9px', letterSpacing: '0.05em' }}>
        RECONSTRUCTION PIPELINE
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div
              className="flex flex-col items-center px-1.5 py-1 rounded"
              style={{
                background: step.active ? step.color + '15' : '#111',
                border: `1px solid ${step.active ? step.color + '50' : '#1a1a1a'}`,
                minWidth: 52,
              }}
              title={step.desc + ' | ' + step.time}
            >
              <span style={{ color: step.active ? step.color : '#2a2a2a', fontSize: '8px', fontWeight: step.active ? 600 : 400 }}>
                {step.label}
              </span>
              <span style={{ color: step.active ? step.color + '80' : '#1a1a1a', fontSize: '6px' }}>
                {step.time}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ color: '#252525', fontSize: '8px', margin: '0 1px' }}>→</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ color: '#374151', fontSize: '7px', marginTop: 4 }}>
        有効なステップのみハイライト表示 · 推定処理時間はプロトコル依存
      </div>
    </div>
  )
}

type SubTab = 'Subtraction' | 'MIP' | 'Composing'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

// ── DICOM ヘッダープレビュー ──────────────────────────────────────────────────
// 出力DICOMに埋め込まれる主要タグを syngo 風に表示
function DICOMHeaderPreview() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2
  const isTSE = params.turboFactor > 1
  const isIR = params.TI > 0
  const isGRE = params.turboFactor <= 1 && params.TR < 200

  // Auto-generate protocol name from parameters
  const seqName = isDWI ? 'ep2d_diff' : isTSE && isIR ? 'tse_dark-fl' : isTSE ? 'tse2d1_16' : isGRE ? 'fl3d1' : 'tse2d1_3'
  const modSeqName = isIR ? (params.TR > 5000 ? 'FLAIR' : 'MPRAGE') : isDWI ? 'EPI_DWI' : isTSE ? 'TSE' : 'GRE'

  // Series description
  const ori = { Tra: 'tra', Cor: 'cor', Sag: 'sag' }[params.orientation] ?? 'tra'
  const contrast = params.TR < 800 && params.TE < 30 ? 'T1' : params.TR > 2000 && params.TE > 60 ? 'T2' : 'PD'
  const seriesDesc = `${ori}_${contrast}_${params.fieldStrength}T${params.fatSat !== 'None' ? '_' + params.fatSat : ''}`

  const tags: { tag: string; vr: string; name: string; value: string }[] = [
    { tag: '(0008,0060)', vr: 'CS', name: 'Modality',              value: 'MR' },
    { tag: '(0008,103e)', vr: 'LO', name: 'Series Description',    value: seriesDesc },
    { tag: '(0018,0023)', vr: 'CS', name: 'MR Acquisition Type',   value: 'SS' },
    { tag: '(0018,0020)', vr: 'CS', name: 'Scanning Sequence',     value: isDWI ? 'EP' : isTSE ? 'SE' : 'GR' },
    { tag: '(0018,0021)', vr: 'CS', name: 'Sequence Variant',      value: isDWI ? 'SK\\SS\\MP' : 'SK\\SP' },
    { tag: '(0018,0024)', vr: 'SH', name: 'Sequence Name',         value: seqName },
    { tag: '(0018,0087)', vr: 'DS', name: 'Magnetic Field Str.',   value: `${params.fieldStrength.toFixed(4)}` },
    { tag: '(0018,0080)', vr: 'DS', name: 'Repetition Time',       value: `${params.TR.toFixed(2)}` },
    { tag: '(0018,0081)', vr: 'DS', name: 'Echo Time',             value: `${params.TE.toFixed(2)}` },
    ...(isIR ? [{ tag: '(0018,0082)', vr: 'DS', name: 'Inversion Time', value: `${params.TI.toFixed(2)}` }] : []),
    { tag: '(0018,1314)', vr: 'DS', name: 'Flip Angle',            value: `${params.flipAngle}` },
    { tag: '(0018,0091)', vr: 'IS', name: 'Echo Train Length',     value: `${params.turboFactor}` },
    { tag: '(0018,0050)', vr: 'DS', name: 'Slice Thickness',       value: `${params.sliceThickness.toFixed(2)}` },
    { tag: '(0028,0010)', vr: 'US', name: 'Rows',                  value: `${params.matrixFreq}` },
    { tag: '(0028,0011)', vr: 'US', name: 'Columns',               value: `${params.matrixPhase}` },
    { tag: '(0018,0088)', vr: 'DS', name: 'Spacing Bet. Slices',   value: `${(params.sliceThickness + (params.sliceGap ?? 0)).toFixed(2)}` },
    { tag: '(0051,100a)', vr: 'SH', name: '[Siemens] Receiver BW', value: `${params.bandwidth} Hz/Px` },
    { tag: '(0018,1030)', vr: 'LO', name: 'Protocol Name',         value: `${modSeqName}_${params.fieldStrength}T` },
    { tag: '(0008,0070)', vr: 'LO', name: 'Manufacturer',          value: 'SIEMENS' },
    { tag: '(0008,1090)', vr: 'LO', name: 'Model Name',            value: is3T ? 'Prisma' : 'Aera' },
  ]

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060810', border: '1px solid #10182a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#38bdf8', fontSize: '9px', letterSpacing: '0.05em' }}>
          DICOM HEADER PREVIEW
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>MR image series</span>
      </div>
      <div className="space-y-0" style={{ fontFamily: 'monospace' }}>
        {tags.map(t => (
          <div key={t.tag} className="flex items-baseline gap-1.5 py-0.5" style={{ borderBottom: '1px solid #0f1520' }}>
            <span style={{ color: '#1e3a5f', fontSize: '7px', flexShrink: 0 }}>{t.tag}</span>
            <span style={{ color: '#374151', fontSize: '7px', flexShrink: 0, minWidth: 18 }}>{t.vr}</span>
            <span style={{ color: '#4b5563', fontSize: '7px', flexShrink: 0, minWidth: 120 }}>{t.name}</span>
            <span style={{ color: '#9ca3af', fontSize: '8px' }}>{t.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InlineTab() {
  const { params, setParam } = useProtocolStore()
  const [subTab, setSubTab] = useState<SubTab>('Subtraction')

  // local state
  const [stdDev, setStdDev] = useState(false)
  const [measurements, setMeasurements] = useState(2)
  const [motionCorr, setMotionCorr] = useState('None')
  const [saveOriginal, setSaveOriginal] = useState(true)
  const [mipSagittal, setMipSagittal] = useState(false)
  const [mipCoronal, setMipCoronal] = useState(false)
  const [mipTransversal, setMipTransversal] = useState(false)
  const [mipTimeSeries, setMipTimeSeries] = useState(false)
  const [mipRadial, setMipRadial] = useState(false)
  const [mprSagittal, setMprSagittal] = useState(false)
  const [mprCoronal, setMprCoronal] = useState(false)
  const [mprTransversal, setMprTransversal] = useState(false)
  const [saveMipOriginal, setSaveMipOriginal] = useState(true)
  const [inlineComposing, setInlineComposing] = useState(false)
  const [mosaicImages, setMosaicImages] = useState(false)
  const [tileSize, setTileSize] = useState(4)

  return (
    <div>
      {/* Reconstruction Pipeline */}
      <ReconPipeline />

      {/* DICOM Header Preview */}
      <DICOMHeaderPreview />

      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525', marginTop: 8 }}>
        {(['Subtraction', 'MIP', 'Composing'] as SubTab[]).map(t => (
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

      {subTab === 'Subtraction' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Subtraction</div>
          <ParamField label="Subtract" hintKey="inlineMIP" value={params.inlineSubtraction} type="toggle"
            onChange={v => setParam('inlineSubtraction', v as boolean)} />
          {params.inlineSubtraction && (
            <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #065f46', color: '#6ee7b7' }}>
              造影前後を自動減算。CE-MRA・乳腺・骨盤造影で造影増強部位を強調表示。
            </div>
          )}
          <ParamField label="StdDev" value={stdDev} type="toggle"
            onChange={v => setStdDev(v as boolean)} />
          <ParamField label="Measurements" value={measurements} type="number"
            min={1} max={20} step={1}
            onChange={v => setMeasurements(v as number)} />
          <ParamField label="Motion Correction" value={motionCorr} type="select"
            options={['None', 'Phase', 'Frequency']}
            onChange={v => setMotionCorr(v as string)} />
          <ParamField label="Save Original Images" value={saveOriginal} type="toggle"
            onChange={v => setSaveOriginal(v as boolean)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>Subtraction の使いどころ</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div>• CE-MRA: 造影前後差分で血管のみを抽出</div>
              <div>• 乳腺造影: 動的撮像での増強パターン評価</div>
              <div>• 骨盤造影: 背景信号を除去し造影効果を強調</div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'MIP' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>MIP (Maximum Intensity Projection)</div>
          <ParamField label="MIP Sagittal" hintKey="inlineMIP" value={mipSagittal} type="toggle"
            onChange={v => setMipSagittal(v as boolean)} />
          <ParamField label="MIP Coronal" value={mipCoronal} type="toggle"
            onChange={v => setMipCoronal(v as boolean)} />
          <ParamField label="MIP Transversal" value={mipTransversal} type="toggle"
            onChange={v => setMipTransversal(v as boolean)} />
          <ParamField label="MIP Time Series" value={mipTimeSeries} type="toggle"
            onChange={v => setMipTimeSeries(v as boolean)} />
          <ParamField label="MIP Radial" value={mipRadial} type="toggle"
            onChange={v => setMipRadial(v as boolean)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>MPR (Multi-Planar Reconstruction)</div>
          <ParamField label="MPR Sagittal" value={mprSagittal} type="toggle"
            onChange={v => setMprSagittal(v as boolean)} />
          <ParamField label="MPR Coronal" value={mprCoronal} type="toggle"
            onChange={v => setMprCoronal(v as boolean)} />
          <ParamField label="MPR Transversal" value={mprTransversal} type="toggle"
            onChange={v => setMprTransversal(v as boolean)} />
          <ParamField label="Save Original" value={saveMipOriginal} type="toggle"
            onChange={v => setSaveMipOriginal(v as boolean)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>MIP/MPR の使い分け</div>
            <table className="w-full">
              <tbody style={{ color: '#9ca3af' }}>
                <tr><td className="py-0.5 text-white w-28">MIP</td><td>TOF-MRA / PC-MRA / CE-MRA</td></tr>
                <tr><td className="py-0.5 text-white">MPR</td><td>3D VIBE / MPRAGE / CISS / 3D FIESTA</td></tr>
                <tr><td className="py-0.5 text-white">ADC Map</td><td>全てのDWI（脳・腹部・前立腺）</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'Composing' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Image Composing</div>
          <ParamField label="Inline Composing" value={inlineComposing} type="toggle"
            onChange={v => setInlineComposing(v as boolean)} />
          <ParamField label="Mosaic Images" value={mosaicImages} type="toggle"
            onChange={v => setMosaicImages(v as boolean)} />
          <ParamField label="Tile Size" value={tileSize} type="number"
            min={2} max={16} step={1}
            onChange={v => setTileSize(v as number)} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>ADC / MPR</div>
          <ParamField label="ADC Map" hintKey="inlineADC" value={params.inlineADC} type="toggle"
            onChange={v => setParam('inlineADC', v as boolean)} />
          {params.inlineADC && (
            <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #065f46', color: '#6ee7b7' }}>
              DWI終了後に自動でADCマップを再構成・保存します。T2シャインスルーの鑑別に必須。
            </div>
          )}
          <ParamField label="MPR" value={params.inlineMPR} type="toggle"
            onChange={v => setParam('inlineMPR', v as boolean)} />
          {params.inlineMPR && (
            <div className="mx-3 mb-2 p-2 rounded text-xs" style={{ background: '#111111', border: '1px solid #065f46', color: '#6ee7b7' }}>
              3D収集後にTra/Cor/Sag断面を自動再構成。VIBEやMPRAGEで有用。
            </div>
          )}

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div style={{ color: '#9ca3af' }}>
              Inline Composing: 複数シリーズを自動合成して1シリーズに統合。読影ワークフローを効率化します。
            </div>
          </div>

          {/* IVIM calculator */}
          {params.inlineADC && params.bValues.length >= 3 && (
            <IVIMCalculator bValues={params.bValues} />
          )}

          {/* ADC Reference table */}
          {params.inlineADC && (
            <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111', border: '1px solid #065f46' }}>
              <div className="font-semibold mb-2" style={{ color: '#6ee7b7' }}>ADC 参照値 (×10⁻³ mm²/s)</div>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#4b5563', fontSize: '9px' }}>
                    <th className="text-left pb-1">組織/疾患</th>
                    <th className="text-center pb-1">ADC</th>
                    <th className="text-left pb-1 pl-1">DWI</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['正常脳白質', '0.80-0.85', '等信号'],
                    ['正常脳灰質', '0.90-1.00', '等信号'],
                    ['CSF', '3.0-3.5', '低信号'],
                    ['急性脳梗塞 <24h', '<0.50', '高信号 ✓'],
                    ['亜急性梗塞', '0.50-0.80', '高→等'],
                    ['脳腫瘍 低悪性', '1.20-1.80', '低/等'],
                    ['脳腫瘍 高悪性', '0.80-1.10', '軽度高'],
                    ['膿瘍', '<0.50', '著明高'],
                    ['正常前立腺 PZ', '1.50-2.00', '低信号'],
                    ['前立腺癌', '<1.00', '高信号'],
                    ['正常肝', '1.00-1.20', '等信号'],
                    ['HCC 高分化', '1.20-1.80', '等/低'],
                    ['HCC 低分化', '0.80-1.10', '高信号'],
                    ['コレステロール嚢胞', '<0.70', '高信号'],
                  ].map(([label, adc, dwi]) => (
                    <tr key={label} style={{ borderTop: '1px solid #111' }}>
                      <td className="py-0.5" style={{ color: '#9ca3af' }}>{label}</td>
                      <td className="text-center py-0.5 font-mono" style={{ color: '#34d399', fontSize: '9px' }}>{adc}</td>
                      <td className="py-0.5 pl-1" style={{ color: '#4b5563', fontSize: '8px' }}>{dwi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid #1a1a1a', color: '#374151', fontSize: '8px' }}>
                ADC = -ln(S_high/S_low) / (b_high - b_low) | 拡散制限 → ADC低値 + DWI高信号
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
