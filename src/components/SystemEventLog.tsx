import { useState, useEffect, useRef, useMemo } from 'react'
import { useProtocolStore } from '../store/protocolStore'

// ── System Event Log ─────────────────────────────────────────────────────────
// syngo MR コンソール下部の時刻付きシステムメッセージログ
// 実際の syngo では Logbook ウィンドウに相当するメッセージストリップ
export function SystemEventLog() {
  const { params } = useProtocolStore()

  // Generate realistic-looking time-stamped system events based on current time
  const baseTime = useRef(0)
  if (baseTime.current === 0) baseTime.current = Date.now()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(id)
  }, [])

  const is3T = params.fieldStrength >= 2.5

  const events = useMemo(() => {
    const now = new Date(baseTime.current)
    const fmt = (d: Date) => d.toTimeString().slice(0, 8)
    const offset = (ms: number) => new Date(now.getTime() - ms)

    return [
      { time: fmt(offset(320000)), level: 'INFO',  text: 'System startup complete — syngo MR E11 initialized' },
      { time: fmt(offset(295000)), level: 'INFO',  text: `Field strength: ${params.fieldStrength}T — ${is3T ? 'Prisma' : 'Aera'} ready` },
      { time: fmt(offset(270000)), level: 'INFO',  text: 'Cryo system nominal — He level 98.2%, ZBO active' },
      { time: fmt(offset(240000)), level: 'OK',    text: 'Prescan complete — center freq adjusted, shim optimized' },
      { time: fmt(offset(210000)), level: 'INFO',  text: `Coil connected: ${params.coilType ?? 'Body'} — all channels active` },
      { time: fmt(offset(180000)), level: 'INFO',  text: 'Patient table at isocenter — interlock confirmed' },
      { time: fmt(offset(150000)), level: 'OK',    text: 'RF body transmitter calibrated — Tx ref amplitude set' },
      { time: fmt(offset(120000)), level: 'INFO',  text: `Gradient mode: ${params.gradientMode} — slew rate ${params.gradientMode === 'Fast' ? '170' : '100'} T/m/s` },
      { time: fmt(offset(90000)),  level: params.fieldStrength >= 2.5 ? 'WARN' : 'INFO',
        text: is3T ? '3T operation: SAR monitor active, patient weight logged' : '1.5T operation: standard SAR limits apply' },
      { time: fmt(offset(60000)),  level: 'INFO',  text: `Protocol loaded: TR=${params.TR}ms TE=${params.TE}ms FA=${params.flipAngle}° — TA calculated` },
      { time: fmt(offset(30000)),  level: 'OK',    text: 'System ready — awaiting scan command' },
      { time: fmt(offset(0)),      level: 'INFO',  text: '▸ Console active' },
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick triggers periodic refresh
  }, [params.fieldStrength, params.coilType, params.gradientMode, params.TR, params.TE, params.flipAngle, is3T, tick])

  const levelColor: Record<string, string> = {
    INFO: '#374151',
    OK:   '#166534',
    WARN: '#92400e',
    ERR:  '#7f1d1d',
  }
  const levelTextColor: Record<string, string> = {
    INFO: '#4b5563',
    OK:   '#34d399',
    WARN: '#fbbf24',
    ERR:  '#f87171',
  }

  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="shrink-0" style={{ background: '#070c0f', borderTop: '1px solid #0f1a20' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 cursor-pointer select-none"
        style={{ height: '14px', borderBottom: collapsed ? 'none' : '1px solid #0f1a20' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ color: '#1e3a4f', fontSize: '7px', letterSpacing: '0.08em' }}>SYSTEM LOG</span>
        <span style={{ color: '#1e3a4f', fontSize: '7px' }}>{collapsed ? '▸' : '▾'}</span>
        <div className="flex-1 overflow-hidden">
          {collapsed && (
            <span className="font-mono" style={{ color: '#374151', fontSize: '7px' }}>
              {events[events.length - 1]?.time} — {events[events.length - 1]?.text}
            </span>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="flex gap-0 overflow-x-auto" style={{ height: '14px' }}>
          {events.map((ev: { time: string; level: string; text: string }, i: number) => (
            <div
              key={i}
              className="flex items-center gap-1.5 shrink-0 px-2"
              style={{ borderRight: '1px solid #0f1a20', background: levelColor[ev.level] + '40' }}
            >
              <span className="font-mono" style={{ color: '#1e3a4f', fontSize: '7px' }}>{ev.time}</span>
              <span style={{ color: levelTextColor[ev.level], fontSize: '7px', fontWeight: ev.level !== 'INFO' ? 600 : 400 }}>
                [{ev.level}]
              </span>
              <span className="font-mono" style={{ color: '#374151', fontSize: '7px', whiteSpace: 'nowrap' }}>
                {ev.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
