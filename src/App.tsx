import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useProtocolStore } from './store/protocolStore'
import { StatusBar } from './components/StatusBar'
import { ProtocolTree } from './components/ProtocolTree'
import { RoutineTab } from './components/tabs/RoutineTab'
import { ContrastTab } from './components/tabs/ContrastTab'
import { ResolutionTab } from './components/tabs/ResolutionTab'
import { GeometryTab } from './components/tabs/GeometryTab'
import { SystemTab } from './components/tabs/SystemTab'
import { PhysioTab } from './components/tabs/PhysioTab'
import { InlineTab } from './components/tabs/InlineTab'
import { SequenceTab } from './components/tabs/SequenceTab'
import { presets } from './data/presets'
import { GraduationCap } from 'lucide-react'
import { SequenceQueue } from './components/SequenceQueue'
import { QuizPanel } from './components/QuizPanel'
import { validateProtocol } from './utils/protocolValidator'
import { calcTEmin, calcTRmin, calcScanTime, identifySequence, calcSARLevel } from './store/calculators'

const TABS = ['Routine', 'Contrast', 'Resolution', 'Geometry', 'System', 'Physio', 'Inline', 'Sequence'] as const

// タブ → 関連パラメータ名のマッピング
const TAB_PARAMS: Record<string, string[]> = {
  Routine:    ['TR', 'TE', 'TI', 'flipAngle', 'slices', 'sliceThickness', 'sliceGap', 'averages'],
  Contrast:   ['fatSat', 'mt'],
  Resolution: ['matrixFreq', 'matrixPhase', 'fov', 'phaseResolution', 'bandwidth'],
  Geometry:   ['orientation', 'phaseEncDir', 'satBands', 'sliceGap'],
  System:     ['coil', 'coilType', 'ipatMode', 'ipatFactor', 'gradientMode', 'shim', 'fieldStrength'],
  Physio:     ['ecgTrigger', 'respTrigger', 'triggerDelay', 'triggerWindow'],
  Inline:     ['inlineADC', 'inlineMIP', 'inlineMPR', 'inlineSubtraction'],
  Sequence:   ['turboFactor', 'echoSpacing', 'partialFourier', 'bValues'],
}

export default function App() {
  const { activeTab, setActiveTab, activePresetId, params, undo, redo, viewMode, setViewMode, currentPage, setCurrentPage } = useProtocolStore()
  const [quizMode, setQuizMode] = useState(false)

  const activePreset = presets.find(p => p.id === activePresetId)
  const allIssues = validateProtocol(params)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      // Alt+1-8: switch tabs
      if (e.altKey && e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key) - 1
        if (idx < TABS.length) { e.preventDefault(); setActiveTab(TABS[idx]) }
      }
      // Alt+Q: toggle quiz
      if (e.altKey && e.key === 'q') { e.preventDefault(); setQuizMode(m => !m) }
      // Alt+D: toggle console/extended
      if (e.altKey && e.key === 'd') {
        e.preventDefault()
        const s = useProtocolStore.getState()
        s.setViewMode(s.viewMode === 'console' ? 'extended' : 'console')
      }
      // F5: start/stop scan (trigger ConsoleParamStrip scan button via custom event)
      if (e.key === 'F5') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('mri-scan-toggle'))
      }
      // Alt+B: switch to Browser page
      if (e.altKey && e.key === 'b') {
        e.preventDefault()
        const s = useProtocolStore.getState()
        s.setCurrentPage(s.currentPage === 'console' ? 'browser' : 'console')
      }
      // Cmd/Ctrl+Z: undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      // Cmd/Ctrl+Shift+Z or Ctrl+Y: redo
      if (((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey) && e.key === 'y')) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveTab, undo, redo])

  // タブごとの最大severity ('error' | 'warning' | null)
  const tabSeverity = (tab: string): 'error' | 'warning' | null => {
    const tabParams = TAB_PARAMS[tab] ?? []
    const relatedIssues = allIssues.filter(i =>
      !i.params || i.params.some(p => tabParams.includes(p))
    )
    if (relatedIssues.some(i => i.severity === 'error')) return 'error'
    if (relatedIssues.some(i => i.severity === 'warning')) return 'warning'
    return null
  }

  // Live clock
  const [liveTime, setLiveTime] = useState(() => new Date().toTimeString().slice(0, 8))
  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date().toTimeString().slice(0, 8)), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#141414', color: '#c8ccd6' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0"
        style={{ background: '#0e0e0e', borderBottom: '1px solid #242424' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          {/* Page navigation */}
          <div className="flex items-center" style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
            <button
              onClick={() => setCurrentPage('console')}
              className="px-2 py-0.5 text-xs transition-colors"
              style={{
                background: currentPage === 'console' ? '#1e1200' : '#141414',
                color: currentPage === 'console' ? '#e88b00' : '#374151',
                borderRight: '1px solid #2a2a2a',
                fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.04em',
              }}
            >Console</button>
            <button
              onClick={() => setCurrentPage('browser')}
              className="px-2 py-0.5 text-xs transition-colors"
              style={{
                background: currentPage === 'browser' ? '#0f1a2e' : '#141414',
                color: currentPage === 'browser' ? '#60a5fa' : '#374151',
                fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.04em',
              }}
            >Browser</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold" style={{ color: '#e88b00', fontSize: '11px', letterSpacing: '0.08em' }}>MAGNETOM</span>
            <span className="font-mono font-semibold" style={{ color: '#c8d8e8', fontSize: '11px' }}>
              {params.fieldStrength >= 2.5 ? 'Prisma 3T' : 'Aera 1.5T'}
            </span>
            <span style={{ color: '#4a7a9a', fontSize: '9px', letterSpacing: '0.04em' }}>syngo MR E11</span>
            <span className="font-mono" style={{ color: '#2a5a3a', fontSize: '9.5px', letterSpacing: '0.08em' }}>{liveTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode(viewMode === 'console' ? 'extended' : 'console')}
              title="Console / Extended (Alt+D)"
              className="px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: viewMode === 'extended' ? '#1a1200' : '#1a1a1a',
                color: viewMode === 'extended' ? '#e88b00' : '#374151',
                border: `1px solid ${viewMode === 'extended' ? '#c47400' : '#2a2a2a'}`,
                fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.04em',
              }}
            >{viewMode === 'console' ? 'Console' : 'Extended'}</button>
            <button onClick={undo} title="Undo (⌘Z)"
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: '#1a1a1a', color: '#4b5563', border: '1px solid #2a2a2a', fontSize: '10px' }}
            >↩</button>
            <button onClick={redo} title="Redo (⌘⇧Z)"
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: '#1a1a1a', color: '#4b5563', border: '1px solid #2a2a2a', fontSize: '10px' }}
            >↪</button>
          </div>
          <span style={{ color: '#252525', fontSize: '9px', cursor: 'default' }}
            title={'Alt+1〜8: タブ切替 / F5: SCAN / Alt+B: Browser / Alt+D: Extended / Alt+Q: クイズ / ⌘Z: Undo'}
          >⌨</span>
          {activePreset && (
            <span className="text-xs" style={{ color: '#6b7280' }}>
              {activePreset.category} › {activePreset.label}
            </span>
          )}
        </div>
        <button
          onClick={() => setQuizMode(m => !m)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
          style={{
            background: quizMode ? '#2d1f5e' : '#252525',
            color: quizMode ? '#a78bfa' : '#6b7280',
            border: `1px solid ${quizMode ? '#7c3aed' : '#374151'}`,
            fontSize: '10px',
          }}
        >
          <GraduationCap size={10} />
          クイズ
        </button>
      </div>

      {/* Patient Information Banner — syngo MR patient header */}
      <div className="flex items-center shrink-0 overflow-x-auto"
        style={{ background: '#060c14', borderBottom: '1px solid #0f1e30', height: '22px', gap: 0 }}>
        {/* Patient ID / Name */}
        <div className="flex items-center gap-1.5 px-3 shrink-0" style={{ borderRight: '1px solid #0f1e30' }}>
          <span style={{ color: '#2a5a80', fontSize: '8.5px', letterSpacing: '0.05em' }}>PAT</span>
          <span className="font-mono font-semibold" style={{ color: '#7aaac8', fontSize: '8.5px' }}>DEMO_PATIENT_001</span>
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #0f1e30' }}>
          <span style={{ color: '#2a5a80', fontSize: '8.5px' }}>D.O.B</span>
          <span className="font-mono" style={{ color: '#5a8aaa', fontSize: '8.5px' }}>1975-08-15</span>
          <span style={{ color: '#2a5a80', fontSize: '8.5px' }}>M</span>
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #0f1e30' }}>
          <span style={{ color: '#2a5a80', fontSize: '8.5px' }}>Wt</span>
          <span className="font-mono" style={{ color: params.fieldStrength >= 2.5 ? '#fbbf24' : '#5a8aaa', fontSize: '8.5px' }}>
            70kg
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #0f1e30' }}>
          <span style={{ color: '#2a5a80', fontSize: '8.5px' }}>Exam</span>
          <span className="font-mono" style={{ color: '#5a8aaa', fontSize: '8.5px' }}>MRI_BRAIN_ROUTINE</span>
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #0f1e30' }}>
          <span style={{ color: '#2a5a80', fontSize: '8.5px' }}>Date</span>
          <span className="font-mono" style={{ color: '#5a8aaa', fontSize: '8.5px' }}>
            {new Date().toISOString().split('T')[0]}
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #0f1e30' }}>
          <span style={{ color: '#2a5a80', fontSize: '8.5px' }}>COIL</span>
          <span className="font-mono font-semibold" style={{ color: '#e88b00', fontSize: '8.5px' }}>{params.coilType}</span>
        </div>
        <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #0f1e30' }}>
          <span style={{ color: '#2a5a80', fontSize: '8.5px' }}>TABLE</span>
          <span className="font-mono" style={{ color: '#5a8aaa', fontSize: '8.5px' }}>0.0/0.0/60.0 mm</span>
        </div>
        {/* System status */}
        <div className="flex items-center gap-1 px-2 ml-auto shrink-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
          <span style={{ color: '#3a6a50', fontSize: '8.5px' }}>SYSTEM READY</span>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Browser Page ─────────────────────────────────────────────────── */}
        {currentPage === 'browser' && (
          <div className="flex flex-1 overflow-hidden">
            {/* Protocol Tree — wider in browser mode */}
            <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '260px', borderRight: '1px solid #252525' }}>
              <ProtocolTree />
            </div>
            {/* Sequence Queue — takes remaining space */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <SequenceQueue />
            </div>
          </div>
        )}

        {/* ── Console Page ──────────────────────────────────────────────────── */}
        {currentPage === 'console' && <>

        {/* Left: Protocol Tree */}
        <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '160px', borderRight: '1px solid #1e1e1e' }}>
          <ProtocolTree />
        </div>

        {/* Sequence Queue */}
        <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '200px', borderRight: '1px solid #1e1e1e' }}>
          <SequenceQueue />
        </div>

        {/* Center: Protocol Parameters */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active sequence indicator */}
          <ActiveSequenceBar />

          {/* Tab bar */}
          <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #252525', background: '#0e0e0e' }}>
            {TABS.map(tab => {
              const sev = tabSeverity(tab)
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative flex items-center gap-1 whitespace-nowrap transition-colors shrink-0"
                  style={{
                    background: activeTab === tab ? '#0e1820' : 'transparent',
                    color: activeTab === tab ? '#e88b00' : '#5a7a8a',
                    borderBottom: activeTab === tab ? '2px solid #e88b00' : '2px solid transparent',
                    fontSize: '11.5px',
                    padding: '6px 14px',
                  }}
                >
                  {tab}
                  {sev === 'error' && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  )}
                  {sev === 'warning' && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Console parameter strip — syngo MR style TE/TR/TA live display */}
          <ConsoleParamStrip />

          {/* Inline error banner */}
          {allIssues.filter(i => i.severity === 'error').length > 0 && (
            <div className="shrink-0 px-3 py-1.5 flex items-center gap-2"
              style={{ background: '#1a0505', borderBottom: '1px solid #7f1d1d' }}>
              <span style={{ color: '#f87171', fontSize: '9px', fontWeight: 700 }}>✕ エラー</span>
              <span style={{ color: '#fca5a5', fontSize: '9px' }}>
                {allIssues.filter(i => i.severity === 'error').map(i => i.title).join(' / ')}
              </span>
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#111111' }}>
            {activeTab === 'Routine' && <RoutineTab />}
            {activeTab === 'Contrast' && <ContrastTab />}
            {activeTab === 'Resolution' && <ResolutionTab />}
            {activeTab === 'Geometry' && <GeometryTab />}
            {activeTab === 'System' && <SystemTab />}
            {activeTab === 'Physio' && <PhysioTab />}
            {activeTab === 'Inline' && <InlineTab />}
            {activeTab === 'Sequence' && <SequenceTab />}
          </div>
        </div>

        </>}
      </div>

      {/* System Event Log — syngo MR style bottom message strip */}
      <SystemEventLog />

      {/* Quiz: fullscreen overlay */}
      {quizMode && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0e0e0e' }}>
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: '1px solid #252525' }}>
            <span className="text-sm font-semibold" style={{ color: '#a78bfa' }}>MRI Quiz</span>
            <button
              onClick={() => setQuizMode(false)}
              className="text-xs px-3 py-1 rounded"
              style={{ background: '#252525', color: '#9ca3af', border: '1px solid #374151' }}
            >
              ✕ 閉じる
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <QuizPanel />
          </div>
        </div>
      )}
    </div>
  )
}

// ── System Event Log ─────────────────────────────────────────────────────────
// syngo MR コンソール下部の時刻付きシステムメッセージログ
// 実際の syngo では Logbook ウィンドウに相当するメッセージストリップ
function SystemEventLog() {
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

// ── K-space fill order ───────────────────────────────────────────────────────
function kFillOrder(n: number, centric: boolean): number[] {
  if (!centric) return Array.from({ length: n }, (_, i) => i)
  const order: number[] = []
  const c = Math.floor(n / 2)
  order.push(c)
  for (let d = 1; order.length < n; d++) {
    if (c + d < n) order.push(c + d)
    if (c - d >= 0) order.push(c - d)
  }
  return order
}

// K-space fill canvas (animated during scan)
function KSpaceFillCanvas({ progress, centric }: { progress: number; centric: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = 80, H = 22, N = 32
    ctx.fillStyle = '#03080c'
    ctx.fillRect(0, 0, W, H)
    // Vertical k-space grid lines
    ctx.strokeStyle = '#081518'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 4, 0); ctx.lineTo(i * W / 4, H); ctx.stroke()
    }
    const order = kFillOrder(N, centric)
    const filledCount = Math.floor(progress / 100 * N)
    const rowH = H / N
    for (let i = 0; i < filledCount && i < N; i++) {
      const row = order[i]
      const y = (row / N) * H
      const dist = Math.abs(row - N / 2) / (N / 2)
      const bright = 0.2 + (1 - dist) * 0.8
      ctx.fillStyle = `rgba(52,211,153,${bright})`
      ctx.fillRect(0, y, W, Math.max(1, rowH - 0.3))
    }
    // Active acquisition line (bright cursor)
    if (filledCount < N) {
      const row = order[filledCount] ?? 0
      const y = (row / N) * H
      ctx.save()
      ctx.shadowBlur = 6; ctx.shadowColor = '#34d399'
      ctx.fillStyle = '#a7f3d0'
      ctx.fillRect(0, y, W, Math.max(1.5, rowH))
      ctx.restore()
    }
  }, [progress, centric])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} width={80} height={22}
        style={{ display: 'block', borderRadius: 2, border: '1px solid #0a1e18' }} />
      <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: '5px', color: '#0a2018', lineHeight: 1 }}>kx→</span>
      <span style={{ position: 'absolute', top: 1, left: 2, fontSize: '5px', color: '#0a2018', lineHeight: 1 }}>ky</span>
    </div>
  )
}

// ── Frequency Scout spectrum (shown after prescan step 0 completes) ──────────
function FrequencyScoutSpectrum({ visible, fieldStrength }: { visible: boolean; fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5
  const W = 120, H = 30
  // Water peak centered at 0Hz, fat peak at -csFatHz
  const csFatHz = is3T ? 447 : 224
  const nPts = 120

  const spectrum = useMemo(() => {
    return Array.from({ length: nPts }, (_, i) => {
      const hz = (i / (nPts - 1) - 0.5) * 1200  // -600 to +600 Hz
      // Water peak (main): Lorentzian, centered at ~+10Hz offset
      const water = 1.0 / (1 + ((hz - 12) / 18) ** 2)
      // Fat peak: smaller, shifted by csFatHz
      const fat = 0.18 / (1 + ((hz + csFatHz - 12) / 15) ** 2)
      // Noise floor
      const noise = 0.015 * (Math.random() * 0.5 + 0.75)
      return Math.min(1, water + fat + noise)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldStrength])

  if (!visible) return null

  const pts = spectrum.map((v, i) =>
    `${(i / (nPts - 1)) * W},${H - 2 - v * (H - 4)}`
  ).join(' ')

  return (
    <div style={{ position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block', background: '#030608', borderRadius: 2, border: '1px solid #0a1820' }}>
        {/* Baseline */}
        <line x1={0} y1={H - 2} x2={W} y2={H - 2} stroke="#0a1820" strokeWidth={0.5} />
        {/* Spectrum */}
        <polyline points={pts} fill="none" stroke="#34d399" strokeWidth={0.8} opacity={0.8} />
        {/* Water peak marker */}
        <line x1={W / 2 + 1} y1={0} x2={W / 2 + 1} y2={H - 2} stroke="#1a4a30" strokeWidth={0.5} strokeDasharray="1.5,2" />
        {/* Fat peak marker */}
        {(() => {
          const fatX = (W / 2) - (csFatHz / 1200) * W
          return fatX > 0 && <line x1={fatX} y1={0} x2={fatX} y2={H - 2} stroke="#3a2a00" strokeWidth={0.5} strokeDasharray="1.5,2" />
        })()}
        <text x={W / 2 + 2} y={7} fontSize="5" fill="#1a4a30" fontFamily="monospace">H₂O</text>
        <text x={W - 2} y={H - 3} textAnchor="end" fontSize="5" fill="#1a2a18" fontFamily="monospace">+600Hz</text>
        <text x={2} y={H - 3} fontSize="5" fill="#1a2a18" fontFamily="monospace">-600</text>
      </svg>
    </div>
  )
}

// ── Console Parameter Strip ──────────────────────────────────────────────────
// syngo MR コンソール風の生パラメータ表示ストリップ
// TE_min/TR_min を物理計算し、設定値が不正な場合はリアルタイムで警告する
// ── Prescan steps (auto-prescan sequence) ────────────────────────────────────
// syngo MR の自動プリスキャンは毎回スキャン前に自動実行される
// Frequency Scout → B0 Shim → Flip Angle Cal → Noise Cal → SAR Check
const PRESCAN_STEPS = [
  { label: 'Frequency Scout',    dur: 380 },
  { label: 'B0 Shim Optimize',   dur: 480 },
  { label: 'Tx Ref Cal',         dur: 320 },
  { label: 'Noise Calibration',  dur: 220 },
  { label: 'SAR Pre-Check',      dur: 100 },
] as const

function ConsoleParamStrip() {
  const { params, setParam } = useProtocolStore()

  const teMin = calcTEmin(params)
  const trMin = calcTRmin(params)
  const teOk = params.TE >= teMin
  const trOk = params.TR >= trMin
  const scanTime = calcScanTime(params)
  const seqId = identifySequence(params)

  // Scan simulation state
  const [scanState, setScanState] = useState<'idle' | 'preparing' | 'scanning' | 'recon' | 'done'>('idle')
  const [scanProgress, setScanProgress] = useState(0)  // 0-100
  const [scanElapsed, setScanElapsed] = useState(0)    // seconds
  const [prescanStep, setPrescanStep] = useState(-1)   // -1=not started, 0-4=step index
  const [prescanDone, setPrescanDone] = useState<boolean[]>([])
  const [reconStep, setReconStep] = useState(-1)       // index into recon steps
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanStartRef = useRef<number>(0)

  // Gradient coil temperature — heats during scanning, cools when idle
  const [gradTemp, setGradTemp] = useState(28.5)
  useEffect(() => {
    const heatRate = scanState === 'scanning'
      ? (params.gradientMode === 'Fast' ? 0.12 : params.gradientMode === 'Whisper' ? 0.04 : 0.07)
      : -0.02
    const id = setInterval(() => {
      setGradTemp(t => {
        const next = t + heatRate
        return Math.max(28.5, Math.min(55, next))
      })
    }, 1000)
    return () => clearInterval(id)
  }, [scanState, params.gradientMode])

  // Larmor frequency (MHz) — 42.577 MHz/T for ¹H
  const larmorMHz = (params.fieldStrength * 42.577).toFixed(2)

  // B1rms in µT — approximation based on flip angle, TR, pulse duration
  // pulse duration ≈ 3ms for sinc, duty cycle = pulseDur/TR
  const pulseDurMs = 3 // ms, typical sinc pulse
  const dutyCycle = pulseDurMs / params.TR
  const b1Peak = params.flipAngle / 180 * Math.PI / (pulseDurMs * 1e-3 * 2 * Math.PI * 42.577e6) * 1e6 // µT
  const b1Rms = Math.round(b1Peak * Math.sqrt(dutyCycle) * 10) / 10

  // Estimated acoustic noise level (dB SPL)
  const noiseDb = useMemo(() => {
    const isEPI = params.bValues.length > 1 && params.turboFactor <= 2
    const isTSE = params.turboFactor > 1
    const isSSFP = params.TR < 8 && params.TE < 3
    let db = isEPI ? 120 : isSSFP ? 103 : isTSE ? (90 + Math.min(params.turboFactor, 8)) : 84
    if (params.gradientMode === 'Fast') db += 7
    else if (params.gradientMode === 'Whisper') db -= 15
    return Math.round(db)
  }, [params.bValues.length, params.turboFactor, params.TR, params.TE, params.gradientMode])

  // Gradient duty cycle (%)
  const gdc = useMemo(() => {
    const isEPI = params.bValues.length > 1 && params.turboFactor <= 2
    const isTSE = params.turboFactor > 1
    const isSSFP = params.TR < 8
    let pct = isEPI ? 78 : isSSFP ? 85 : isTSE ? Math.min(20 + params.turboFactor * 2, 65) : 30
    if (params.gradientMode === 'Fast') pct = Math.min(pct * 1.15, 95)
    return Math.round(pct)
  }, [params.bValues.length, params.turboFactor, params.TR, params.gradientMode])

  // K-space fill mode: centric for TSE/IR, linear for EPI/SE/GRE
  const kCentric = params.turboFactor > 1 || params.TI > 0

  // Prescan results — computed once from current params
  const prescanResults = useMemo(() => {
    const is3T = params.fieldStrength >= 2.5
    const b0Offset = 12 + Math.floor(Math.random() * 18)  // 12-29 Hz
    const b0Residual = 2 + Math.floor(Math.random() * 6)  // 2-7 Hz rms
    const txVoltage = is3T ? (180 + Math.floor(Math.random() * 40)) : (310 + Math.floor(Math.random() * 60))
    const snrEst = 40 + Math.floor(Math.random() * 20)
    const sarPct = Math.round((params.TR > 0 ? (params.flipAngle / 90) ** 2 * (params.slices / 20) * 50 : 30))
    return [
      `Δf₀: +${b0Offset}Hz → 0Hz`,
      `ΔB0: ${b0Residual}Hz rms`,
      `Tx: ${txVoltage}V`,
      `SNR est: ${snrEst}`,
      `SAR: ${Math.min(sarPct, 95)}%  OK`,
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState])

  const stopScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }
  }, [])

  const startScan = useCallback(() => {
    stopScan()
    setScanState('preparing')
    setScanProgress(0)
    setScanElapsed(0)
    setPrescanStep(0)
    setPrescanDone([])

    // Step through prescan steps
    let elapsed = 0
    PRESCAN_STEPS.forEach((step, idx) => {
      elapsed += step.dur
      setTimeout(() => {
        setPrescanStep(idx + 1)
        setPrescanDone(prev => { const next = [...prev]; next[idx] = true; return next })
      }, elapsed)
    })

    // After all prescan steps, start actual scanning
    const totalPrescanMs = PRESCAN_STEPS.reduce((s, st) => s + st.dur, 0)
    setTimeout(() => {
      setScanState('scanning')
      setPrescanStep(-1)
      scanStartRef.current = Date.now()
      const displayDuration = Math.min(scanTime * 1000, 30000)
      scanTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - scanStartRef.current) / 1000
        const progress = Math.min(100, (elapsed / (displayDuration / 1000)) * 100)
        setScanProgress(progress)
        setScanElapsed(elapsed)
        if (progress >= 100) {
          stopScan()
          setScanState('recon')
          setReconStep(0)
          // Build inline recon steps based on sequence type
          const isDWISeq = params.bValues.length > 1 && params.turboFactor <= 2
          const hasInlineMIP = params.inlineMIP
          const reconSteps = [
            { label: 'Image Reconstruction', dur: 350 },
            { label: 'Phase Correction',     dur: 180 },
            ...(isDWISeq ? [{ label: 'Inline ADC Map', dur: 280 }, { label: 'Inline Trace', dur: 220 }] : []),
            ...(hasInlineMIP ? [{ label: 'Inline MIP', dur: 240 }] : []),
            { label: 'Sending → PACS',       dur: 160 },
          ]
          let reconElapsed = 0
          reconSteps.forEach((_, idx) => {
            reconElapsed += reconSteps[idx].dur
            setTimeout(() => setReconStep(idx + 1), reconElapsed)
          })
          const totalReconMs = reconSteps.reduce((s, r) => s + r.dur, 0)
          setTimeout(() => {
            setScanState('done')
            setReconStep(-1)
            setTimeout(() => setScanState('idle'), 2500)
          }, totalReconMs + 100)
        }
      }, 50)
    }, totalPrescanMs + 100)
  }, [scanTime, stopScan, params.bValues.length, params.inlineMIP, params.turboFactor])

  // Cleanup on unmount
  useEffect(() => () => stopScan(), [stopScan])

  // F5 global shortcut → toggle scan
  useEffect(() => {
    const handler = () => {
      if (scanState === 'idle' || scanState === 'done') startScan()
      else if (scanState === 'scanning') stopScan()
    }
    window.addEventListener('mri-scan-toggle', handler)
    return () => window.removeEventListener('mri-scan-toggle', handler)
  }, [scanState, startScan, stopScan])

  const isTSE = params.turboFactor > 1
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2
  const isIR = params.TI > 0

  // TE_eff for TSE
  const teEff = isTSE
    ? Math.round(params.TE + Math.floor(params.turboFactor / 2) * params.echoSpacing)
    : null

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex items-center shrink-0 overflow-x-auto select-none"
      style={{ background: '#070b10', borderBottom: '1px solid #0f1a24', height: '28px', gap: 0 }}>

      {/* Sequence type badge */}
      <div className="flex items-center px-2 gap-1.5 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span className="font-mono font-bold px-1.5 rounded"
          style={{ background: seqId.color + '18', color: seqId.color, border: `1px solid ${seqId.color}30`, fontSize: '9px' }}>
          {seqId.type}
        </span>
      </div>

      {/* TR */}
      <ChipParam
        label="TR"
        value={`${params.TR}`}
        unit="ms"
        ok={trOk}
        warnMsg={trOk ? undefined : `min ${trMin}`}
        onFix={trOk ? undefined : () => setParam('TR', trMin)}
      />
      <ChipDiv />

      {/* TE / TE_eff */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px', letterSpacing: '0.06em' }}>TE</span>
        <button
          className="font-mono font-semibold"
          style={{
            color: teOk ? '#dde4ec' : '#fca5a5',
            fontSize: '11px',
            background: teOk ? 'transparent' : '#1a0505',
            border: teOk ? 'none' : '1px solid #7f1d1d30',
            borderRadius: 3,
            padding: '0 2px',
            cursor: teOk ? 'default' : 'pointer',
          }}
          title={teOk ? `TE_min = ${teMin}ms` : `⚠ TE < TE_min (${teMin}ms) — クリックで自動修正`}
          onClick={teOk ? undefined : () => setParam('TE', teMin)}
        >
          {params.TE}
        </button>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>ms</span>
        {/* TE_min indicator */}
        <span style={{
          color: teOk ? '#1f4a2f' : '#f87171',
          fontSize: '8px',
          fontFamily: 'monospace',
        }}>
          {teOk ? `(min ${teMin})` : `⚠min:${teMin}`}
        </span>
        {!teOk && (
          <button
            onClick={() => setParam('TE', teMin)}
            style={{
              color: '#34d399', fontSize: '8px', background: '#0a1f16',
              border: '1px solid #14532d', borderRadius: 2, padding: '0 3px',
              cursor: 'pointer', lineHeight: '14px',
            }}
          >→{teMin}</button>
        )}
        {/* TE_eff for TSE */}
        {teEff !== null && teEff !== params.TE && (
          <span style={{ color: '#4b5563', fontSize: '8px' }}>eff:{teEff}ms</span>
        )}
      </div>
      <ChipDiv />

      {/* TI (IR sequences) */}
      {isIR && (
        <>
          <ChipParam label="TI" value={`${params.TI}`} unit="ms" ok={true} />
          <ChipDiv />
        </>
      )}

      {/* FA */}
      <ChipParam label="FA" value={`${params.flipAngle}°`} unit="" ok={true} />
      <ChipDiv />

      {/* ETL (TSE) */}
      {isTSE && (
        <>
          <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
            <span style={{ color: '#374151', fontSize: '8px', letterSpacing: '0.06em' }}>ETL</span>
            <span className="font-mono font-semibold" style={{ color: '#a78bfa', fontSize: '10px' }}>{params.turboFactor}</span>
            <span style={{ color: '#374151', fontSize: '8px' }}>ES:{params.echoSpacing}ms</span>
          </div>
          <ChipDiv />
        </>
      )}

      {/* b-values (DWI) */}
      {isDWI && (
        <>
          <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
            <span style={{ color: '#374151', fontSize: '8px' }}>b=</span>
            <span className="font-mono font-semibold" style={{ color: '#f87171', fontSize: '9px' }}>
              {params.bValues.join('/')}
            </span>
          </div>
          <ChipDiv />
        </>
      )}

      {/* iPAT */}
      {params.ipatMode !== 'Off' && (
        <>
          <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
            <span style={{ color: '#374151', fontSize: '8px' }}>iPAT</span>
            <span className="font-mono font-semibold" style={{ color: '#34d399', fontSize: '9px' }}>×{params.ipatFactor}</span>
          </div>
          <ChipDiv />
        </>
      )}

      {/* Scan time */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27', background: '#050d18' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px', letterSpacing: '0.08em' }}>TA</span>
        <span className="font-mono font-bold" style={{ color: '#f0f4f8', fontSize: '13px', letterSpacing: '0.02em' }}>{fmt(scanTime)}</span>
      </div>
      <ChipDiv />

      {/* Matrix + slices */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>Mtx</span>
        <span className="font-mono" style={{ color: '#9ab0c0', fontSize: '10px' }}>
          {params.matrixFreq}×{params.matrixPhase}
        </span>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>/{params.slices}sl</span>
      </div>
      <ChipDiv />

      {/* Pixel resolution */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>px</span>
        <span className="font-mono" style={{ color: '#7a9ab0', fontSize: '9.5px' }}>
          {(params.fov / params.matrixFreq).toFixed(1)}×{(params.fov * (params.phaseResolution ?? 100) / 100 / params.matrixPhase).toFixed(1)}mm
        </span>
      </div>

      {/* Bandwidth per pixel */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '9px' }}>BW</span>
        <span className="font-mono" style={{ color: '#7a9ab0', fontSize: '9.5px' }}>
          {Math.round(params.bandwidth * 2 / params.matrixFreq * 1000)}Hz/px
        </span>
      </div>

      {/* Field strength + Larmor freq */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span className="font-mono font-semibold" style={{ color: '#e88b00', fontSize: '10px' }}>{params.fieldStrength}T</span>
        <span className="font-mono" style={{ color: '#5a4010', fontSize: '9px' }}>{larmorMHz}MHz</span>
      </div>

      {/* B1 RMS */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>B1</span>
        <span className="font-mono" style={{
          color: b1Rms > 3 ? '#f87171' : b1Rms > 2 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{b1Rms}µT</span>
      </div>

      {/* Gradient duty cycle */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>GDC</span>
        <span className="font-mono" style={{
          color: gdc > 70 ? '#f87171' : gdc > 45 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{gdc}%</span>
      </div>

      {/* Acoustic noise */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>dB</span>
        <span className="font-mono" style={{
          color: noiseDb >= 115 ? '#f87171' : noiseDb >= 95 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{noiseDb}</span>
      </div>

      {/* Gradient coil temperature */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#4a7a9a', fontSize: '8.5px' }}>GC</span>
        <span className="font-mono" style={{
          color: gradTemp > 45 ? '#f87171' : gradTemp > 38 ? '#fbbf24' : '#5a7a90',
          fontSize: '9.5px'
        }}>{gradTemp.toFixed(1)}°C</span>
        {gradTemp > 38 && (
          <span style={{ fontSize: '7px', color: gradTemp > 45 ? '#f87171' : '#fbbf24' }}>▲</span>
        )}
      </div>

      {/* SAR Operating Mode (IEC 60601-2-33) */}
      <SARModeChip />

      {/* Scan simulation button + progress */}
      <div className="flex items-center gap-1.5 px-2 ml-auto shrink-0">

        {/* Frequency scout spectrum (appears after first prescan step) */}
        {scanState === 'preparing' && prescanDone[0] && (
          <FrequencyScoutSpectrum visible={true} fieldStrength={params.fieldStrength} />
        )}

        {/* Prescan step indicators */}
        {scanState === 'preparing' && (
          <div className="flex items-center gap-0" style={{ borderRight: '1px solid #111d27', paddingRight: 6, marginRight: 2 }}>
            {PRESCAN_STEPS.map((step, i) => {
              const done = prescanDone[i]
              const active = prescanStep === i
              return (
                <div key={i} className="flex items-center gap-1 px-1.5" style={{ borderRight: i < PRESCAN_STEPS.length - 1 ? '1px solid #0f1a24' : 'none' }}>
                  <span style={{
                    fontSize: '7px',
                    color: done ? '#34d399' : active ? '#e88b00' : '#1f3020',
                    transition: 'color 0.2s',
                  }}>
                    {done ? '●' : active ? '◉' : '○'}
                  </span>
                  <span style={{
                    fontSize: '7px',
                    color: done ? '#1f4a2f' : active ? '#c8ccd6' : '#1a2520',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                    transition: 'color 0.2s',
                  }}>
                    {step.label}
                  </span>
                  {done && (
                    <span className="font-mono" style={{ fontSize: '6.5px', color: '#1a4a30' }}>
                      {prescanResults[i]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Scanning progress — k-space fill canvas + stats */}
        {scanState === 'scanning' && (
          <div className="flex items-center gap-1.5">
            <KSpaceFillCanvas progress={scanProgress} centric={kCentric} />
            <div className="flex flex-col gap-0.5">
              <span className="font-mono" style={{ color: '#34d399', fontSize: '8px' }}>
                {scanProgress.toFixed(0)}%
              </span>
              <span className="font-mono" style={{ color: '#1d4a34', fontSize: '7px' }}>
                SL {Math.min(params.slices, Math.max(1, Math.ceil(scanProgress / 100 * params.slices)))}/{params.slices}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span style={{ color: '#374151', fontSize: '7px' }}>{scanElapsed.toFixed(0)}s / {fmt(scanTime)}</span>
              <span style={{ color: '#1a2a1a', fontSize: '6.5px', fontFamily: 'monospace' }}>
                {kCentric ? 'CENTRIC' : 'LINEAR'} k-fill
              </span>
            </div>
          </div>
        )}

        {/* Inline recon steps */}
        {scanState === 'recon' && (() => {
          const isDWISeq = params.bValues.length > 1 && params.turboFactor <= 2
          const hasInlineMIP = params.inlineMIP
          const steps = [
            'Image Recon', 'Phase Corr',
            ...(isDWISeq ? ['ADC Map', 'Trace'] : []),
            ...(hasInlineMIP ? ['MIP'] : []),
            '→ PACS',
          ]
          return (
            <div className="flex items-center gap-0" style={{ borderRight: '1px solid #111d27', paddingRight: 6, marginRight: 2 }}>
              {steps.map((label, i) => (
                <div key={i} className="flex items-center gap-1 px-1.5" style={{ borderRight: i < steps.length - 1 ? '1px solid #0f1a24' : 'none' }}>
                  <span style={{ fontSize: '7px', color: i < reconStep ? '#60a5fa' : i === reconStep ? '#a78bfa' : '#1a1f40' }}>
                    {i < reconStep ? '●' : i === reconStep ? '◉' : '○'}
                  </span>
                  <span style={{ fontSize: '7px', color: i < reconStep ? '#1a2a4a' : i === reconStep ? '#c8ccd6' : '#1a1f40', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )
        })()}

        {scanState === 'done' && (
          <span className="font-mono" style={{ color: '#60a5fa', fontSize: '8px' }}>✓ IMAGES STORED</span>
        )}

        <button
          onClick={scanState === 'idle' || scanState === 'done' ? startScan : stopScan}
          style={{
            background: scanState === 'scanning' ? '#2a0505' : scanState === 'recon' ? '#0a0f1f' : scanState === 'done' ? '#0a0f1f' : '#0a2d1a',
            color: scanState === 'scanning' ? '#f87171' : scanState === 'recon' ? '#60a5fa' : scanState === 'done' ? '#60a5fa' : '#34d399',
            border: `1px solid ${scanState === 'scanning' ? '#7f1d1d' : (scanState === 'recon' || scanState === 'done') ? '#1d3d7f' : '#14532d'}`,
            borderRadius: 4,
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 16px',
            cursor: 'pointer',
            letterSpacing: '0.08em',
            fontFamily: 'monospace',
            boxShadow: (scanState === 'idle' || scanState === 'done') ? '0 0 8px #14532d80' : 'none',
            minWidth: '72px',
          }}
        >
          {scanState === 'scanning' ? '■ STOP' : scanState === 'preparing' ? '· · ·' : scanState === 'recon' ? 'RECON' : '▶ SCAN'}
        </button>
      </div>
    </div>
  )
}

// SAR operating mode chip (IEC 60601-2-33 levels)
function SARModeChip() {
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

function ChipParam({ label, value, unit, ok, warnMsg, onFix }: {
  label: string; value: string; unit: string; ok: boolean; warnMsg?: string; onFix?: () => void
}) {
  return (
    <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
      <span style={{ color: '#4a7a9a', fontSize: '9px', letterSpacing: '0.06em' }}>{label}</span>
      <span
        className="font-mono font-semibold"
        style={{ color: ok ? '#dde4ec' : '#fca5a5', fontSize: '11px' }}
        title={warnMsg}
      >
        {value}
      </span>
      {unit && <span style={{ color: '#4a7a9a', fontSize: '9px' }}>{unit}</span>}
      {!ok && warnMsg && (
        <>
          <span style={{ color: '#f87171', fontSize: '8px' }}>⚠{warnMsg}</span>
          {onFix && (
            <button onClick={onFix}
              style={{ color: '#34d399', fontSize: '8px', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, padding: '0 2px', cursor: 'pointer' }}>
              fix
            </button>
          )}
        </>
      )}
    </div>
  )
}

function ChipDiv() {
  return null  // separator handled via borderRight on each chip
}

function ActiveSequenceBar() {
  const { activeSequenceName, activePresetId } = useProtocolStore()
  if (!activeSequenceName) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0 text-xs"
      style={{ background: '#1a0e00', borderBottom: '1px solid #3a1a00' }}>
      <span style={{ color: '#e88b00' }}>▶</span>
      <span className="font-mono font-semibold" style={{ color: '#e88b00' }}>{activeSequenceName}</span>
      {activePresetId && (
        <>
          <span style={{ color: '#2a1200' }}>|</span>
          <span style={{ color: '#4b5563' }}>preset: </span>
          <span style={{ color: '#e88b00' }}>{activePresetId}</span>
        </>
      )}
    </div>
  )
}
