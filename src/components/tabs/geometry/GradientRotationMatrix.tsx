import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'

// ── 傾斜磁場ロテーション行列 ──────────────────────────────────────────────────
// 論理座標 (Slice / Phase / Freq) → 物理 (X/Y/Z) の変換
// syngo の "Gradient Rotation" / "Grad.System" 表示に相当
export function GradientRotationMatrix() {
  const { params } = useProtocolStore()
  const { orientation, phaseEncDir } = params

  // Physical axes: X=L/R, Y=A/P, Z=H/F
  // Returns [Gx, Gy, Gz] amplitude weights for each logical gradient
  const matrix = useMemo(() => {
    type Row = [number, number, number]
    let gss: Row, gpe: Row, gfe: Row

    if (orientation === 'Tra') {
      gss = [0, 0, 1]  // Slice = Z (H/F)
      if (phaseEncDir === 'A>>P' || phaseEncDir === 'P>>A') {
        gpe = [0, 1, 0];  gfe = [1, 0, 0]
      } else {
        gpe = [1, 0, 0];  gfe = [0, 1, 0]
      }
    } else if (orientation === 'Cor') {
      gss = [0, 1, 0]  // Slice = Y (A/P)
      if (phaseEncDir === 'H>>F' || phaseEncDir === 'F>>H') {
        gpe = [0, 0, 1];  gfe = [1, 0, 0]
      } else {
        gpe = [1, 0, 0];  gfe = [0, 0, 1]
      }
    } else {  // Sag
      gss = [1, 0, 0]  // Slice = X (L/R)
      if (phaseEncDir === 'H>>F' || phaseEncDir === 'F>>H') {
        gpe = [0, 0, 1];  gfe = [0, 1, 0]
      } else {
        gpe = [0, 1, 0];  gfe = [0, 0, 1]
      }
    }
    return [gss, gpe, gfe]
  }, [orientation, phaseEncDir])

  const logicalLabels = ['Gss', 'Gpe', 'Gfe']
  const logicalDescs  = ['Slice Sel', 'Phase Enc', 'Freq Enc']
  const physLabels    = ['Gx (L/R)', 'Gy (A/P)', 'Gz (H/F)']
  const physColors    = ['#f87171', '#34d399', '#60a5fa']

  // Dominant physical axis per logical gradient
  const dominant = matrix.map(row => {
    const absRow = row.map(Math.abs)
    const maxIdx = absRow.indexOf(Math.max(...absRow))
    return { idx: maxIdx, sign: row[maxIdx] >= 0 ? '+' : '−' }
  })

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.05em' }}>
          GRADIENT ROTATION
        </span>
        <span style={{ fontSize: '8px', color: '#374151' }}>
          {orientation} / PE:{phaseEncDir}
        </span>
      </div>

      {/* Matrix visualization */}
      <div className="overflow-x-auto">
        <table style={{ fontSize: '8px', borderCollapse: 'separate', borderSpacing: '2px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ color: '#4b5563', textAlign: 'left', paddingBottom: 2, fontSize: '7px' }}>Logical</th>
              {physLabels.map((l, j) => (
                <th key={l} style={{ color: physColors[j], textAlign: 'center', paddingBottom: 2, fontSize: '7px', minWidth: 50 }}>{l}</th>
              ))}
              <th style={{ color: '#4b5563', textAlign: 'left', fontSize: '7px', paddingBottom: 2, paddingLeft: 4 }}>→ maps to</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td style={{ color: '#9ca3af', paddingRight: 4, whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{logicalLabels[i]}</span>
                  <span style={{ color: '#374151', marginLeft: 3 }}>{logicalDescs[i]}</span>
                </td>
                {row.map((v, j) => (
                  <td key={j} style={{
                    textAlign: 'center',
                    background: v !== 0 ? physColors[j] + '18' : '#0a0a0a',
                    border: `1px solid ${v !== 0 ? physColors[j] + '40' : '#111'}`,
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    fontWeight: v !== 0 ? 700 : 400,
                    color: v !== 0 ? physColors[j] : '#252525',
                    padding: '1px 4px',
                  }}>
                    {v !== 0 ? (v > 0 ? '+1' : '−1') : '·'}
                  </td>
                ))}
                <td style={{ paddingLeft: 4, color: physColors[dominant[i].idx], fontSize: '7px', fontFamily: 'monospace' }}>
                  {dominant[i].sign}{physLabels[dominant[i].idx].split(' ')[0]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '7px', color: '#374151', marginTop: 4 }}>
        勾配コイル冷却・PNS評価は実際の勾配振幅（物理軸）に基づく。
        複合スライス角では回転行列の全要素が非ゼロになる。
      </div>
    </div>
  )
}
