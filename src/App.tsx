import { useState, useEffect, lazy, Suspense } from 'react'
import { useProtocolStore } from './store/protocolStore'
import { StatusBar } from './components/StatusBar'
import { ProtocolTree } from './components/ProtocolTree'
import { presets } from './data/presets'
import { GraduationCap } from 'lucide-react'
import { SequenceQueue } from './components/SequenceQueue'
import { validateProtocol } from './utils/protocolValidator'
import { ConsoleParamStrip } from './components/ConsoleParamStrip'
import { SystemEventLog } from './components/SystemEventLog'
import { ActiveSequenceBar } from './components/ActiveSequenceBar'

const RoutineTab    = lazy(() => import('./components/tabs/RoutineTab').then(m => ({ default: m.RoutineTab })))
const ContrastTab   = lazy(() => import('./components/tabs/ContrastTab').then(m => ({ default: m.ContrastTab })))
const ResolutionTab = lazy(() => import('./components/tabs/ResolutionTab').then(m => ({ default: m.ResolutionTab })))
const GeometryTab   = lazy(() => import('./components/tabs/GeometryTab').then(m => ({ default: m.GeometryTab })))
const SystemTab     = lazy(() => import('./components/tabs/SystemTab').then(m => ({ default: m.SystemTab })))
const PhysioTab     = lazy(() => import('./components/tabs/PhysioTab').then(m => ({ default: m.PhysioTab })))
const InlineTab     = lazy(() => import('./components/tabs/InlineTab').then(m => ({ default: m.InlineTab })))
const SequenceTab   = lazy(() => import('./components/tabs/SequenceTab').then(m => ({ default: m.SequenceTab })))
const QuizPanel              = lazy(() => import('./components/QuizPanel').then(m => ({ default: m.QuizPanel })))
const KSpaceVisualizer       = lazy(() => import('./components/KSpaceVisualizer').then(m => ({ default: m.KSpaceVisualizer })))
const TissueContrastPanel    = lazy(() => import('./components/TissueContrastPanel').then(m => ({ default: m.TissueContrastPanel })))
const ArtifactSimPanel       = lazy(() => import('./components/ArtifactSimPanel').then(m => ({ default: m.ArtifactSimPanel })))
const WhatIfPanel            = lazy(() => import('./components/WhatIfPanel').then(m => ({ default: m.WhatIfPanel })))
const SNRMapPanel            = lazy(() => import('./components/SNRMapPanel').then(m => ({ default: m.SNRMapPanel })))
const ProtocolOptimizerPanel = lazy(() => import('./components/ProtocolOptimizerPanel').then(m => ({ default: m.ProtocolOptimizerPanel })))
const QuantitativeMRIPanel   = lazy(() => import('./components/QuantitativeMRIPanel').then(m => ({ default: m.QuantitativeMRIPanel })))
const ClinicalIndicationPanel = lazy(() => import('./components/ClinicalIndicationPanel').then(m => ({ default: m.ClinicalIndicationPanel })))

const EXTENDED_PANELS = [
  { id: 'kspace',    label: 'k-Space' },
  { id: 'contrast',  label: 'Tissue' },
  { id: 'artifact',  label: 'Artifact' },
  { id: 'whatif',    label: 'What-If' },
  { id: 'snrmap',    label: 'SNR Map' },
  { id: 'optimizer', label: 'Optimize' },
  { id: 'qmri',      label: 'qMRI' },
  { id: 'clinical',  label: 'Clinical' },
] as const
type ExtendedPanelId = typeof EXTENDED_PANELS[number]['id']

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
  const [extendedPanel, setExtendedPanel] = useState<ExtendedPanelId>('kspace')

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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1e1e1e', color: '#c8ccd6' }}>
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

        {/* Center: Protocol Parameters */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active sequence indicator */}
          <ActiveSequenceBar />

          {/* Tab bar */}
          <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #2a2a2a', background: '#161616' }}>
            {TABS.map(tab => {
              const sev = tabSeverity(tab)
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative flex items-center gap-1 whitespace-nowrap transition-colors shrink-0"
                  style={{
                    background: activeTab === tab ? '#1e2a30' : 'transparent',
                    color: activeTab === tab ? '#c8d8e0' : '#506070',
                    borderBottom: activeTab === tab ? '2px solid #5090b0' : '2px solid transparent',
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
          <div className="flex-1 overflow-y-auto" style={{ background: '#1a1a1a' }}>
            <Suspense fallback={<div className="flex items-center justify-center h-32" style={{ color: '#506070', fontSize: '11px' }}>Loading...</div>}>
              {activeTab === 'Routine' && <RoutineTab />}
              {activeTab === 'Contrast' && <ContrastTab />}
              {activeTab === 'Resolution' && <ResolutionTab />}
              {activeTab === 'Geometry' && <GeometryTab />}
              {activeTab === 'System' && <SystemTab />}
              {activeTab === 'Physio' && <PhysioTab />}
              {activeTab === 'Inline' && <InlineTab />}
              {activeTab === 'Sequence' && <SequenceTab />}
            </Suspense>
          </div>
        </div>

        {/* Right: Extended Visualization Panel */}
        {viewMode === 'extended' && (
          <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '360px', borderLeft: '1px solid #252525' }}>
            {/* Panel tab switcher */}
            <div className="flex shrink-0 overflow-x-auto" style={{ background: '#111', borderBottom: '1px solid #222' }}>
              {EXTENDED_PANELS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setExtendedPanel(p.id)}
                  className="whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    padding: '4px 8px',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.03em',
                    background: extendedPanel === p.id ? '#1e2a30' : 'transparent',
                    color: extendedPanel === p.id ? '#7aaac8' : '#374151',
                    borderBottom: extendedPanel === p.id ? '2px solid #5090b0' : '2px solid transparent',
                  }}
                >{p.label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<div className="flex items-center justify-center h-full" style={{ color: '#506070', fontSize: '11px' }}>Loading...</div>}>
                {extendedPanel === 'kspace'    && <KSpaceVisualizer />}
                {extendedPanel === 'contrast'  && <TissueContrastPanel />}
                {extendedPanel === 'artifact'  && <ArtifactSimPanel />}
                {extendedPanel === 'whatif'    && <WhatIfPanel />}
                {extendedPanel === 'snrmap'    && <SNRMapPanel />}
                {extendedPanel === 'optimizer' && <ProtocolOptimizerPanel />}
                {extendedPanel === 'qmri'      && <QuantitativeMRIPanel />}
                {extendedPanel === 'clinical'  && <ClinicalIndicationPanel />}
              </Suspense>
            </div>
          </div>
        )}

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
            <Suspense fallback={<div className="flex items-center justify-center h-32" style={{ color: '#a78bfa', fontSize: '11px' }}>Loading...</div>}>
              <QuizPanel />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}
