import { useProtocolStore } from '../../../store/protocolStore'

// ── 3面ローカライザー表示 ────────────────────────────────────────────────────
// syngo MR の患者ポジショニング画面: 矢状面・冠状面・横断面のスカウト像に
// スライス計画線をリアルタイムオーバーレイ表示
export function LocalizerView() {
  const { params } = useProtocolStore()
  const isHead = (params.coilType ?? 'Body').toLowerCase().includes('head')
  const isSpine = (params.coilType ?? '').toLowerCase().includes('spine')
  const slices = Math.min(params.slices, 30)
  const ori = params.orientation

  // Panel dimensions
  const PW = 86, PH = 86
  const CX = PW / 2, CY = PH / 2

  // Anatomy colors (very dark, low contrast like an actual scout scan)
  const bgCol = '#050a0a'
  const tissueCol = '#1a2525'
  const tissueHi = '#253030'
  const boneCol = '#2a3535'

  // Slice line color by orientation
  const sliceLineCol = ori === 'Tra' ? '#e88b00' : ori === 'Cor' ? '#34d399' : '#60a5fa'
  const sliceLineOpacity = 0.7

  // Number of visible slice lines (max 12 for readability)
  const nLines = Math.min(slices, 12)

  // Helper: draw N evenly-spaced horizontal lines across a panel
  const hLines = (yCenter: number, span: number) =>
    Array.from({ length: nLines }, (_, i) => {
      const y = yCenter - span / 2 + (i / Math.max(nLines - 1, 1)) * span
      return <line key={i} x1={4} y1={y} x2={PW - 4} y2={y}
        stroke={sliceLineCol} strokeWidth="0.6" opacity={sliceLineOpacity} />
    })

  const vLines = (xCenter: number, span: number) =>
    Array.from({ length: nLines }, (_, i) => {
      const x = xCenter - span / 2 + (i / Math.max(nLines - 1, 1)) * span
      return <line key={i} x1={x} y1={4} x2={x} y2={PH - 4}
        stroke={sliceLineCol} strokeWidth="0.6" opacity={sliceLineOpacity} />
    })

  // Sagittal scout SVG
  const sagScout = (
    <svg width={PW} height={PH} style={{ display: 'block', background: bgCol }}>
      {/* Body silhouette */}
      {isHead ? (
        <>
          {/* Head: ellipse */}
          <ellipse cx={CX} cy={CY - 18} rx={22} ry={26} fill={tissueCol} stroke={tissueHi} strokeWidth="0.5" />
          {/* Brain interior */}
          <ellipse cx={CX} cy={CY - 20} rx={16} ry={19} fill={tissueHi} />
          {/* Neck */}
          <rect x={CX - 8} y={CY + 8} width={16} height={15} fill={tissueCol} />
          {/* Cervical spine curve */}
          <path d={`M${CX - 3},${CY + 8} Q${CX + 6},${CY + 20} ${CX - 3},${CY + 23}`}
            fill="none" stroke={boneCol} strokeWidth="2.5" strokeLinecap="round" />
          {/* Nose */}
          <path d={`M${CX + 20},${CY - 14} Q${CX + 27},${CY - 10} ${CX + 22},${CY - 5}`}
            fill={tissueHi} stroke={tissueHi} strokeWidth="1" />
        </>
      ) : isSpine ? (
        <>
          {/* Spine: cervical/thoracic/lumbar curve */}
          <path d={`M${CX},10 Q${CX + 8},30 ${CX},50 Q${CX - 8},70 ${CX},80`}
            fill="none" stroke={boneCol} strokeWidth="4" strokeLinecap="round" />
          {/* Vertebrae */}
          {Array.from({ length: 7 }, (_, i) => (
            <ellipse key={i} cx={CX + (i % 2 === 0 ? 1 : -1)} cy={12 + i * 10} rx={4} ry={3}
              fill={boneCol} stroke={tissueHi} strokeWidth="0.3" />
          ))}
          {/* Spinal canal */}
          <path d={`M${CX - 2},8 Q${CX + 5},28 ${CX - 2},48 Q${CX - 7},68 ${CX - 2},78`}
            fill="none" stroke={tissueHi} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Torso sagittal */}
          <ellipse cx={CX} cy={CY + 5} rx={28} ry={36} fill={tissueCol} stroke={tissueHi} strokeWidth="0.5" />
          {/* Spine */}
          <path d={`M${CX + 18},${CY - 30} Q${CX + 20},${CY} Q${CX + 18},${CY + 36}`}
            fill="none" stroke={boneCol} strokeWidth="3" />
          {/* Sternum */}
          <rect x={CX - 22} y={CY - 25} width={6} height={28} rx={2} fill={boneCol} />
          {/* Diaphragm dome */}
          <path d={`M${CX - 24},${CY - 5} Q${CX},${CY - 18} ${CX + 22},${CY - 5}`}
            fill="none" stroke={tissueHi} strokeWidth="1" strokeDasharray="2,2" />
        </>
      )}
      {/* Slice planning lines */}
      {ori === 'Tra' && hLines(CY + (isHead ? -18 : 5), isHead ? 44 : 60)}
      {ori === 'Cor' && vLines(CX, isHead ? 38 : 50)}
      {/* Center crosshair */}
      <line x1={CX} y1={2} x2={CX} y2={PH - 2} stroke="#1a3030" strokeWidth="0.4" />
      <line x1={2} y1={CY} x2={PW - 2} y2={CY} stroke="#1a3030" strokeWidth="0.4" />
      {/* Label */}
      <text x={3} y={9} fontSize="6" fill="#1a4040" fontFamily="monospace">SAG</text>
    </svg>
  )

  // Coronal scout SVG
  const corScout = (
    <svg width={PW} height={PH} style={{ display: 'block', background: bgCol }}>
      {isHead ? (
        <>
          {/* Head coronal */}
          <ellipse cx={CX} cy={CY - 8} rx={26} ry={30} fill={tissueCol} stroke={tissueHi} strokeWidth="0.5" />
          {/* Brain */}
          <ellipse cx={CX} cy={CY - 12} rx={19} ry={22} fill={tissueHi} />
          {/* Interhemispheric fissure */}
          <line x1={CX} y1={CY - 34} x2={CX} y2={CY + 10} stroke={bgCol} strokeWidth="1.2" />
          {/* Neck */}
          <rect x={CX - 12} y={CY + 22} width={24} height={14} rx={4} fill={tissueCol} />
          {/* Ears */}
          <ellipse cx={CX - 27} cy={CY - 8} rx={4} ry={7} fill={tissueCol} />
          <ellipse cx={CX + 27} cy={CY - 8} rx={4} ry={7} fill={tissueCol} />
        </>
      ) : isSpine ? (
        <>
          {/* Spine coronal: straight column */}
          <rect x={CX - 5} y={8} width={10} height={70} rx={3} fill={tissueCol} stroke={tissueHi} strokeWidth="0.3" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={CX - 7} y={10 + i * 9} width={14} height={6} rx={2}
              fill={boneCol} stroke={bgCol} strokeWidth="0.5" />
          ))}
        </>
      ) : (
        <>
          {/* Torso coronal */}
          <ellipse cx={CX} cy={CY + 8} rx={34} ry={38} fill={tissueCol} stroke={tissueHi} strokeWidth="0.5" />
          {/* Lungs */}
          <ellipse cx={CX - 14} cy={CY - 8} rx={10} ry={18} fill={bgCol + 'cc'} stroke={tissueHi} strokeWidth="0.5" />
          <ellipse cx={CX + 14} cy={CY - 8} rx={10} ry={18} fill={bgCol + 'cc'} stroke={tissueHi} strokeWidth="0.5" />
          {/* Heart */}
          <ellipse cx={CX - 4} cy={CY + 5} rx={8} ry={10} fill={tissueHi} />
          {/* Shoulders */}
          <ellipse cx={CX - 38} cy={CY - 22} rx={10} ry={12} fill={tissueCol} />
          <ellipse cx={CX + 38} cy={CY - 22} rx={10} ry={12} fill={tissueCol} />
        </>
      )}
      {ori === 'Tra' && hLines(CY + (isHead ? -8 : 8), isHead ? 50 : 62)}
      {ori === 'Sag' && vLines(CX, isHead ? 44 : 60)}
      <line x1={CX} y1={2} x2={CX} y2={PH - 2} stroke="#1a3030" strokeWidth="0.4" />
      <line x1={2} y1={CY} x2={PW - 2} y2={CY} stroke="#1a3030" strokeWidth="0.4" />
      <text x={3} y={9} fontSize="6" fill="#1a4040" fontFamily="monospace">COR</text>
    </svg>
  )

  // Transaxial scout SVG
  const traScout = (
    <svg width={PW} height={PH} style={{ display: 'block', background: bgCol }}>
      {isHead ? (
        <>
          {/* Brain axial */}
          <ellipse cx={CX} cy={CY} rx={30} ry={26} fill={tissueCol} stroke={tissueHi} strokeWidth="0.5" />
          {/* Gray matter ring */}
          <ellipse cx={CX} cy={CY} rx={26} ry={22} fill={tissueHi} />
          {/* White matter */}
          <ellipse cx={CX} cy={CY} rx={20} ry={17} fill={tissueCol} />
          {/* Ventricles (approximate) */}
          <ellipse cx={CX - 5} cy={CY} rx={3} ry={5} fill={bgCol} opacity="0.8" />
          <ellipse cx={CX + 5} cy={CY} rx={3} ry={5} fill={bgCol} opacity="0.8" />
          {/* Interhemispheric fissure */}
          <line x1={CX} y1={CY - 26} x2={CX} y2={CY + 26} stroke={bgCol} strokeWidth="1" />
          {/* Falx */}
          <line x1={CX} y1={CY - 24} x2={CX} y2={CY + 24} stroke={boneCol} strokeWidth="0.5" />
        </>
      ) : isSpine ? (
        <>
          {/* Spine axial cross-section */}
          <ellipse cx={CX} cy={CY + 8} rx={32} ry={22} fill={tissueCol} stroke={tissueHi} strokeWidth="0.5" />
          {/* Vertebral body */}
          <ellipse cx={CX} cy={CY + 10} rx={14} ry={12} fill={boneCol} />
          {/* Spinal canal */}
          <ellipse cx={CX} cy={CY - 2} rx={7} ry={6} fill={tissueHi} />
          {/* Spinal cord */}
          <ellipse cx={CX} cy={CY - 2} rx={4} ry={3} fill={bgCol + 'cc'} />
          {/* Pedicles */}
          <ellipse cx={CX - 16} cy={CY + 4} rx={5} ry={4} fill={boneCol} />
          <ellipse cx={CX + 16} cy={CY + 4} rx={5} ry={4} fill={boneCol} />
        </>
      ) : (
        <>
          {/* Chest/abdomen axial */}
          <ellipse cx={CX} cy={CY} rx={36} ry={28} fill={tissueCol} stroke={tissueHi} strokeWidth="0.5" />
          {/* Lungs */}
          <ellipse cx={CX - 14} cy={CY - 4} rx={12} ry={14} fill={bgCol + 'dd'} stroke={tissueHi} strokeWidth="0.4" />
          <ellipse cx={CX + 14} cy={CY - 4} rx={12} ry={14} fill={bgCol + 'dd'} stroke={tissueHi} strokeWidth="0.4" />
          {/* Heart / aorta */}
          <ellipse cx={CX - 3} cy={CY + 3} rx={10} ry={9} fill={tissueHi} />
          {/* Spine posterior */}
          <ellipse cx={CX} cy={CY + 22} rx={8} ry={6} fill={boneCol} />
          {/* Aorta */}
          <circle cx={CX - 8} cy={CY + 14} r={3} fill={tissueHi} stroke={boneCol} strokeWidth="0.5" />
        </>
      )}
      {ori === 'Cor' && hLines(CY, isHead ? 40 : 48)}
      {ori === 'Sag' && vLines(CX, isHead ? 48 : 64)}
      <line x1={CX} y1={2} x2={CX} y2={PH - 2} stroke="#1a3030" strokeWidth="0.4" />
      <line x1={2} y1={CY} x2={PW - 2} y2={CY} stroke="#1a3030" strokeWidth="0.4" />
      <text x={3} y={9} fontSize="6" fill="#1a4040" fontFamily="monospace">TRA</text>
    </svg>
  )

  const oriColors: Record<string, string> = { Tra: '#e88b00', Cor: '#34d399', Sag: '#60a5fa' }

  return (
    <div className="mx-3 mt-2 p-1.5 rounded" style={{ background: '#03080a', border: '1px solid #0f1e20' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: '#1a4a4a', fontSize: '8px', letterSpacing: '0.06em', fontWeight: 600 }}>
          LOCALIZER / SCOUT
        </span>
        <div className="flex items-center gap-1.5">
          <span style={{
            fontSize: '7px', fontFamily: 'monospace', fontWeight: 700,
            color: oriColors[ori] ?? '#e88b00',
            background: (oriColors[ori] ?? '#e88b00') + '15',
            border: `1px solid ${(oriColors[ori] ?? '#e88b00')}30`,
            padding: '0 4px', borderRadius: 2,
          }}>{ori}</span>
          <span style={{ fontSize: '7px', color: '#1a3a3a', fontFamily: 'monospace' }}>
            {slices}sl · {params.sliceThickness}mm · {params.coilType}
          </span>
        </div>
      </div>
      <div className="flex gap-1">
        <div style={{ border: `1px solid ${ori === 'Sag' ? (oriColors.Sag + '60') : '#0f1e20'}`, borderRadius: 2 }}>
          {sagScout}
        </div>
        <div style={{ border: `1px solid ${ori === 'Cor' ? (oriColors.Cor + '60') : '#0f1e20'}`, borderRadius: 2 }}>
          {corScout}
        </div>
        <div style={{ border: `1px solid ${ori === 'Tra' ? (oriColors.Tra + '60') : '#0f1e20'}`, borderRadius: 2 }}>
          {traScout}
        </div>
        {/* Slice count / coverage info */}
        <div className="flex flex-col justify-between pl-1" style={{ fontSize: '7px', color: '#1a3a3a' }}>
          <div className="font-mono">{slices} slices</div>
          <div className="font-mono">{(slices * (params.sliceThickness + (params.sliceGap ?? 0))).toFixed(0)}mm</div>
          <div className="font-mono">{params.phaseEncDir}</div>
          <div className="font-mono" style={{ color: sliceLineCol }}>{ori}</div>
        </div>
      </div>
    </div>
  )
}
