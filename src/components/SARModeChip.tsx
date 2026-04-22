import { useProtocolStore } from '../store/protocolStore'
import { calcSARLevel } from '../store/calculators'

// SAR operating mode chip (IEC 60601-2-33 levels)
export function SARModeChip() {
  const { params } = useProtocolStore()
  const sarPct = calcSARLevel(params)
  // IEC 60601-2-33 operating modes based on SAR level
  // Normal: ≤2 W/kg (body), First Level Controlled: ≤4 W/kg, Second Level Controlled: >4 W/kg
  const mode = sarPct >= 85 ? '2nd Ctrl' : sarPct >= 55 ? '1st Ctrl' : 'Normal'
  const color = sarPct >= 85 ? '#f87171' : sarPct >= 55 ? '#fbbf24' : '#34d399'

  return (
    <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
      <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>SAR</span>
      <span className="font-mono font-bold" style={{ color, fontSize: '9.5px' }}>{mode}</span>
      <span className="font-mono" style={{ color: color + 'aa', fontSize: '9px' }}>{sarPct}%</span>
    </div>
  )
}
