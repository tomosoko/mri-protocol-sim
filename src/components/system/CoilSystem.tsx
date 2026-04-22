import { useProtocolStore } from '../../store/protocolStore'

// ── コイル素子マップ ──────────────────────────────────────────────────────────
// 選択されたコイルのチャンネル数・配置を視覚化（syngo MR コイル設定UIに相当）
export function CoilElementMap() {
  const { params } = useProtocolStore()
  const coil = params.coilType ?? 'Body'

  // Coil element topology definitions
  type CoilDef = {
    channels: number
    rows: number
    cols: number
    label: string
    coverage: string
    color: string
    elements: { x: number; y: number; w: number; h: number; active: boolean }[]
  }

  const COIL_DEFS: Record<string, CoilDef> = {
    Head_64: {
      channels: 64, rows: 4, cols: 8, label: 'Head 64ch', coverage: '頭部全域',
      color: '#34d399',
      elements: Array.from({ length: 32 }, (_, i) => ({ x: (i % 8), y: Math.floor(i / 8), w: 1, h: 1, active: true })),
    },
    Head_20: {
      channels: 20, rows: 4, cols: 5, label: 'Head/Neck 20ch', coverage: '頭部+頸部',
      color: '#60a5fa',
      elements: Array.from({ length: 20 }, (_, i) => ({ x: (i % 5), y: Math.floor(i / 5), w: 1, h: 1, active: true })),
    },
    Spine_32: {
      channels: 32, rows: 2, cols: 8, label: 'Spine 32ch', coverage: '頸椎→腰椎',
      color: '#a78bfa',
      elements: Array.from({ length: 16 }, (_, i) => ({ x: (i % 8), y: Math.floor(i / 8), w: 1, h: 1, active: true })),
    },
    Body: {
      channels: 18, rows: 3, cols: 6, label: 'Body 18ch', coverage: '胸腹部',
      color: '#fb923c',
      elements: Array.from({ length: 18 }, (_, i) => ({ x: (i % 6), y: Math.floor(i / 6), w: 1, h: 1, active: i < 12 })),
    },
    Knee: {
      channels: 15, rows: 5, cols: 3, label: 'Knee 15ch', coverage: '膝関節',
      color: '#fbbf24',
      elements: Array.from({ length: 15 }, (_, i) => ({ x: (i % 3), y: Math.floor(i / 3), w: 1, h: 1, active: true })),
    },
    Shoulder: {
      channels: 16, rows: 4, cols: 4, label: 'Shoulder 16ch', coverage: '肩関節',
      color: '#f87171',
      elements: Array.from({ length: 16 }, (_, i) => ({ x: (i % 4), y: Math.floor(i / 4), w: 1, h: 1, active: i < 14 })),
    },
    Flex: {
      channels: 4, rows: 2, cols: 2, label: 'Flex 4ch', coverage: '四肢・小部位',
      color: '#e88b00',
      elements: Array.from({ length: 4 }, (_, i) => ({ x: (i % 2), y: Math.floor(i / 2), w: 1, h: 1, active: true })),
    },
  }

  const def = COIL_DEFS[coil] ?? COIL_DEFS.Body
  const activeCount = def.elements.filter(e => e.active).length

  const W = 120, H = 60
  const cols = Math.max(def.cols, ...def.elements.map(e => e.x + 1))
  const rows = Math.max(def.rows, ...def.elements.map(e => e.y + 1))
  const cellW = Math.min((W - 4) / cols, 14)
  const cellH = Math.min((H - 4) / rows, 14)
  const gap = 1

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: def.color, fontSize: '9px', letterSpacing: '0.05em' }}>
          COIL — {def.label}
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: def.color }}>{activeCount}ch active</span>
          <span style={{ color: '#374151' }}>/ {def.channels}ch total</span>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        {/* Element grid visualization */}
        <svg width={W} height={H}>
          {def.elements.map((el, i) => {
            const x = 2 + el.x * (cellW + gap)
            const y = 2 + el.y * (cellH + gap)
            return (
              <g key={i}>
                <rect x={x} y={y} width={cellW} height={cellH} rx={1}
                  fill={el.active ? def.color + '30' : '#111'}
                  stroke={el.active ? def.color : '#2a2a2a'}
                  strokeWidth={el.active ? 0.8 : 0.5}
                />
                {el.active && (
                  <text x={x + cellW / 2} y={y + cellH / 2 + 2.5}
                    textAnchor="middle" fill={def.color} opacity={0.8}
                    style={{ fontSize: '5px' }}>
                    {i + 1}
                  </text>
                )}
              </g>
            )
          })}
          {/* iPAT reference lines indicator */}
          {params.ipatMode !== 'Off' && (
            <text x={W - 2} y={H - 2} textAnchor="end" fill="#fbbf24" style={{ fontSize: '6px' }}>
              iPAT×{params.ipatFactor}
            </text>
          )}
        </svg>

        {/* Coil stats */}
        <div className="flex flex-col gap-1 flex-1">
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Coverage</div>
            <div style={{ color: '#9ca3af', fontSize: '8px' }}>{def.coverage}</div>
          </div>
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Channels</div>
            <div className="font-mono" style={{ color: def.color, fontSize: '9px' }}>{def.channels} ch</div>
          </div>
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Array Type</div>
            <div style={{ color: '#4b5563', fontSize: '8px' }}>Phased Array</div>
          </div>
          {params.ipatMode !== 'Off' && (
            <div>
              <div style={{ color: '#fbbf24', fontSize: '7px' }}>iPAT factor</div>
              <div className="font-mono" style={{ color: '#fbbf24', fontSize: '9px' }}>×{params.ipatFactor}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── コイル参照テーブル ─────────────────────────────────────────────────────────
const COIL_DATA = [
  { id: 'Head_64',  label: 'Head 64ch',  snr: 100, channels: 64, fovMax: 230, use: '脳・頭頸部', note: 'fMRI/DWI標準' },
  { id: 'Head_20',  label: 'Head 20ch',  snr: 75,  channels: 20, fovMax: 250, use: '脳・頸椎',   note: '旧世代コイル' },
  { id: 'Spine_32', label: 'Spine 32ch', snr: 85,  channels: 32, fovMax: 350, use: '脊椎全長',   note: 'Spine+Body組合せ' },
  { id: 'Body',     label: 'Body',       snr: 55,  channels: 18, fovMax: 500, use: '腹部・骨盤', note: 'SAR注意・大FOV向け' },
  { id: 'Knee',     label: 'Knee',       snr: 80,  channels: 15, fovMax: 200, use: '膝関節',     note: 'FOV≤200mm推奨' },
  { id: 'Shoulder', label: 'Shoulder',   snr: 72,  channels: 12, fovMax: 220, use: '肩関節・肘', note: 'FOV≤200mm推奨' },
  { id: 'Flex',     label: 'Flex',       snr: 60,  channels: 4,  fovMax: 200, use: '四肢・小部位', note: '可搬型・汎用' },
]

export function CoilReferenceTable() {
  const { params, setParam } = useProtocolStore()

  return (
    <div className="mx-3 mt-2 p-2.5 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
      <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>コイル 参照テーブル</div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '280px' }}>
          <thead>
            <tr style={{ color: '#4b5563', fontSize: '8px' }}>
              <th className="text-left py-0.5 pr-1">コイル</th>
              <th className="text-center py-0.5 pr-1">SNR</th>
              <th className="text-center py-0.5 pr-1">ch</th>
              <th className="text-left py-0.5">適応</th>
            </tr>
          </thead>
          <tbody>
            {COIL_DATA.map(c => {
              const isActive = params.coilType === c.id
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  style={{ borderTop: '1px solid #1a1a1a', background: isActive ? '#2a1200' : 'transparent' }}
                  onClick={() => setParam('coilType', c.id as typeof params.coilType)}
                >
                  <td className="py-0.5 pr-1" style={{ color: isActive ? '#e88b00' : '#9ca3af', fontSize: '9px', fontWeight: isActive ? 600 : 400 }}>
                    {c.label}
                  </td>
                  <td className="text-center py-0.5 pr-1 font-mono" style={{
                    color: c.snr >= 90 ? '#34d399' : c.snr >= 70 ? '#fbbf24' : '#f87171',
                    fontSize: '9px',
                  }}>
                    {c.snr}%
                  </td>
                  <td className="text-center py-0.5 pr-1 font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>
                    {c.channels}
                  </td>
                  <td className="py-0.5" style={{ color: '#4b5563', fontSize: '8px' }}>{c.use}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5" style={{ color: '#374151', fontSize: '8px' }}>
        行をクリックでコイルを変更。SNR は Head64ch を基準100として相対評価。
      </div>
    </div>
  )
}
