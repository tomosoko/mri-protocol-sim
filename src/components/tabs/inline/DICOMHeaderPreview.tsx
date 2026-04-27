import { useProtocolStore } from '../../../store/protocolStore'

// ── DICOM ヘッダープレビュー ──────────────────────────────────────────────────
// 出力DICOMに埋め込まれる主要タグを syngo 風に表示
export function DICOMHeaderPreview() {
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
