import { useState, useEffect, useRef, useCallback } from 'react'
import { useProtocolStore } from './store/protocolStore'
import { StatusBar } from './components/StatusBar'
import { ProtocolTree } from './components/ProtocolTree'
import { ArtifactGuide } from './components/ArtifactGuide'
import { RoutineTab } from './components/tabs/RoutineTab'
import { ContrastTab } from './components/tabs/ContrastTab'
import { ResolutionTab } from './components/tabs/ResolutionTab'
import { GeometryTab } from './components/tabs/GeometryTab'
import { SystemTab } from './components/tabs/SystemTab'
import { PhysioTab } from './components/tabs/PhysioTab'
import { InlineTab } from './components/tabs/InlineTab'
import { SequenceTab } from './components/tabs/SequenceTab'
import { presets } from './data/presets'
import { Zap, BookOpen, ChevronDown, GraduationCap, GitCompare, Stethoscope } from 'lucide-react'
import { SequenceQueue } from './components/SequenceQueue'
import { getSeqClinical } from './data/sequenceClinicalData'
import { QuizPanel } from './components/QuizPanel'
import { DiffPanel } from './components/DiffPanel'
import { ScenarioExercisePanel } from './components/ScenarioExercisePanel'
import { SNRMapPanel } from './components/SNRMapPanel'
import { ArtifactSimPanel } from './components/ArtifactSimPanel'
import { CaseTrainingPanel } from './components/CaseTrainingPanel'
import { KSpaceVisualizer } from './components/KSpaceVisualizer'
import { TissueContrastPanel } from './components/TissueContrastPanel'
import { ValidationPanel } from './components/ValidationPanel'
import { ProtocolSummaryPanel } from './components/ProtocolSummaryPanel'
import { ClinicalIndicationPanel } from './components/ClinicalIndicationPanel'
import { WhatIfPanel } from './components/WhatIfPanel'
import { ProtocolOptimizerPanel } from './components/ProtocolOptimizerPanel'
import { ProtocolExportPanel } from './components/ProtocolExportPanel'
import { QuantitativeMRIPanel } from './components/QuantitativeMRIPanel'
import { PulseSequenceDiagramPanel } from './components/PulseSequenceDiagramPanel'
import { validateProtocol } from './utils/protocolValidator'
import { calcTEmin, calcTRmin, calcScanTime, identifySequence } from './store/calculators'

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
  const { activeTab, setActiveTab, activePresetId, params, undo, redo } = useProtocolStore()
  const [rightPanel, setRightPanel] = useState<'artifact' | 'learn' | 'diff' | 'scenario' | 'snrmap' | 'artifactsim' | 'case' | 'kspace' | 'tissue' | 'validate' | 'summary' | 'clinical' | 'whatif' | 'optimizer' | 'export' | 'qmri' | 'psd' | null>('learn')
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
      // Escape: close right panel
      if (e.key === 'Escape') { e.preventDefault(); setRightPanel(null) }
      // Alt+Q: toggle quiz
      if (e.altKey && e.key === 'q') { e.preventDefault(); setQuizMode(m => !m) }
      // Alt+T: tissue contrast
      if (e.altKey && e.key === 't') { e.preventDefault(); setRightPanel(p => p === 'tissue' ? null : 'tissue') }
      // Alt+V: validate
      if (e.altKey && e.key === 'v') { e.preventDefault(); setRightPanel(p => p === 'validate' ? null : 'validate') }
      // Alt+O: optimizer
      if (e.altKey && e.key === 'o') { e.preventDefault(); setRightPanel(p => p === 'optimizer' ? null : 'optimizer') }
      // Alt+E: export
      if (e.altKey && e.key === 'e') { e.preventDefault(); setRightPanel(p => p === 'export' ? null : 'export') }
      // Alt+K: k-space
      if (e.altKey && e.key === 'k') { e.preventDefault(); setRightPanel(p => p === 'kspace' ? null : 'kspace') }
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
          <div className="flex items-center gap-2">
          <span className="font-mono font-bold" style={{ color: '#e88b00', fontSize: '10px', letterSpacing: '0.05em' }}>
            MAGNETOM
          </span>
          <span className="font-mono" style={{ color: '#9ca3af', fontSize: '10px' }}>
            {params.fieldStrength >= 2.5 ? 'Prisma 3T' : 'Aera 1.5T'}
          </span>
          <span style={{ color: '#374151', fontSize: '9px' }}>syngo MR E11</span>
        </div>
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              title="Undo (⌘Z)"
              className="px-1.5 py-0.5 rounded text-xs transition-colors"
              style={{ background: '#1a1a1a', color: '#4b5563', border: '1px solid #2a2a2a', fontSize: '10px' }}
            >↩</button>
            <button
              onClick={redo}
              title="Redo (⌘⇧Z)"
              className="px-1.5 py-0.5 rounded text-xs transition-colors"
              style={{ background: '#1a1a1a', color: '#4b5563', border: '1px solid #2a2a2a', fontSize: '10px' }}
            >↪</button>
          </div>
          <span
            style={{ color: '#252525', fontSize: '9px', cursor: 'default' }}
            title={'キーボードショートカット:\nAlt+1〜8: タブ切替\nAlt+T: Tissue\nAlt+V: Validate\nAlt+O: Optimizer\nAlt+E: Export\nAlt+K: k空間\nAlt+Q: クイズ\nEsc: パネル閉じる\n⌘Z: Undo / ⌘⇧Z: Redo'}
          >⌨</span>
          {activePreset && (
            <>
              <span style={{ color: '#374151' }}>›</span>
              <span className="text-xs" style={{ color: '#9ca3af' }}>USER » {activePreset.category} » {activePreset.label}</span>
            </>
          )}
        </div>
        {/* ヘッダーボタン: 2行グループ */}
        <div className="flex flex-col gap-1">
          {/* 学習系 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightPanel(rightPanel === 'learn' ? null : 'learn')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'learn' ? '#2a1200' : '#252525',
                color: rightPanel === 'learn' ? '#e88b00' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'learn' ? '#c47400' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              <BookOpen size={10} />
              学習ガイド
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'artifact' ? null : 'artifact')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'artifact' ? '#2a1200' : '#252525',
                color: rightPanel === 'artifact' ? '#e88b00' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'artifact' ? '#c47400' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              <Zap size={10} />
              対策
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'case' ? null : 'case')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'case' ? '#0f1a0f' : '#252525',
                color: rightPanel === 'case' ? '#86efac' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'case' ? '#15803d' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              症例訓練
            </button>
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
          {/* 解析系 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightPanel(rightPanel === 'whatif' ? null : 'whatif')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'whatif' ? '#1a1500' : '#252525',
                color: rightPanel === 'whatif' ? '#fde047' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'whatif' ? '#a16207' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              What-if
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'optimizer' ? null : 'optimizer')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'optimizer' ? '#1a1500' : '#252525',
                color: rightPanel === 'optimizer' ? '#fbbf24' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'optimizer' ? '#a16207' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              <Zap size={10} />
              Optimize
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'clinical' ? null : 'clinical')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'clinical' ? '#0f1a2e' : '#252525',
                color: rightPanel === 'clinical' ? '#60a5fa' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'clinical' ? '#1d4ed8' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              Clinical
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'validate' ? null : 'validate')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'validate' ? '#1a0505' : '#252525',
                color: rightPanel === 'validate' ? '#f87171' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'validate' ? '#7f1d1d' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              Validate
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'tissue' ? null : 'tissue')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'tissue' ? '#0d1f0d' : '#252525',
                color: rightPanel === 'tissue' ? '#34d399' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'tissue' ? '#166534' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              Tissue
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'summary' ? null : 'summary')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'summary' ? '#1a0e00' : '#252525',
                color: rightPanel === 'summary' ? '#e88b00' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'summary' ? '#c47400' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              Summary
            </button>
          </div>
          {/* ビジュアル系 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRightPanel(rightPanel === 'kspace' ? null : 'kspace')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'kspace' ? '#1a1500' : '#252525',
                color: rightPanel === 'kspace' ? '#fde047' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'kspace' ? '#a16207' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              k空間
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'artifactsim' ? null : 'artifactsim')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'artifactsim' ? '#1f0a0a' : '#252525',
                color: rightPanel === 'artifactsim' ? '#f87171' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'artifactsim' ? '#991b1b' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              ArtSim
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'snrmap' ? null : 'snrmap')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'snrmap' ? '#0f1e2e' : '#252525',
                color: rightPanel === 'snrmap' ? '#38bdf8' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'snrmap' ? '#0369a1' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              SNR
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'diff' ? null : 'diff')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'diff' ? '#0a1f0a' : '#252525',
                color: rightPanel === 'diff' ? '#4ade80' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'diff' ? '#166534' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              <GitCompare size={10} />
              Diff
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'scenario' ? null : 'scenario')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'scenario' ? '#0f172a' : '#252525',
                color: rightPanel === 'scenario' ? '#60a5fa' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'scenario' ? '#1d4ed8' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              <Stethoscope size={10} />
              シナリオ
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'qmri' ? null : 'qmri')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'qmri' ? '#0d1520' : '#252525',
                color: rightPanel === 'qmri' ? '#38bdf8' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'qmri' ? '#0369a1' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              qMRI
            </button>
            <button onClick={() => setRightPanel(rightPanel === 'psd' ? null : 'psd')}
              style={{ background: rightPanel === 'psd' ? '#1a0a1a' : '#252525', color: rightPanel === 'psd' ? '#c084fc' : '#5a5a5a', border: `1px solid ${rightPanel === 'psd' ? '#7c3aed' : '#374151'}`, fontSize: '10px' }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
            >PSD</button>
            <button
              onClick={() => setRightPanel(rightPanel === 'export' ? null : 'export')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: rightPanel === 'export' ? '#0d1520' : '#252525',
                color: rightPanel === 'export' ? '#60a5fa' : '#5a5a5a',
                border: `1px solid ${rightPanel === 'export' ? '#1d4ed8' : '#374151'}`,
                fontSize: '10px',
              }}
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Protocol Tree */}
        <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '160px', borderRight: '1px solid #252525' }}>
          <ProtocolTree />
        </div>

        {/* Sequence Queue — vertical panel next to tree */}
        <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '200px', borderRight: '1px solid #252525' }}>
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
                    background: activeTab === tab ? '#1e1200' : 'transparent',
                    color: activeTab === tab ? '#e88b00' : '#5a5a5a',
                    borderBottom: activeTab === tab ? '2px solid #e88b00' : '2px solid transparent',
                    fontSize: '11px',
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

        {/* Right: Panel */}
        {rightPanel && (
          <div className="shrink-0 overflow-hidden" style={{ width: '400px', borderLeft: '1px solid #252525' }}>
            {rightPanel === 'artifact' && <ArtifactGuide />}
            {rightPanel === 'learn' && <LearnPanel />}
            {rightPanel === 'diff' && <DiffPanel />}
            {rightPanel === 'scenario' && <ScenarioExercisePanel />}
            {rightPanel === 'snrmap' && <SNRMapPanel />}
            {rightPanel === 'artifactsim' && <ArtifactSimPanel onShowArtifactGuide={() => setRightPanel('artifact')} />}
            {rightPanel === 'case' && <CaseTrainingPanel />}
            {rightPanel === 'kspace' && <KSpaceVisualizer />}
            {rightPanel === 'tissue' && <TissueContrastPanel />}
            {rightPanel === 'validate' && <ValidationPanel />}
            {rightPanel === 'summary' && <ProtocolSummaryPanel />}
            {rightPanel === 'clinical' && <ClinicalIndicationPanel />}
            {rightPanel === 'whatif' && <WhatIfPanel />}
            {rightPanel === 'optimizer' && <ProtocolOptimizerPanel />}
            {rightPanel === 'export' && <ProtocolExportPanel />}
            {rightPanel === 'qmri' && <QuantitativeMRIPanel />}
            {rightPanel === 'psd' && <PulseSequenceDiagramPanel />}
          </div>
        )}
      </div>

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

// ── Console Parameter Strip ──────────────────────────────────────────────────
// syngo MR コンソール風の生パラメータ表示ストリップ
// TE_min/TR_min を物理計算し、設定値が不正な場合はリアルタイムで警告する
function ConsoleParamStrip() {
  const { params, setParam } = useProtocolStore()

  const teMin = calcTEmin(params)
  const trMin = calcTRmin(params)
  const teOk = params.TE >= teMin
  const trOk = params.TR >= trMin
  const scanTime = calcScanTime(params)
  const seqId = identifySequence(params)

  // Scan simulation state
  const [scanState, setScanState] = useState<'idle' | 'preparing' | 'scanning' | 'done'>('idle')
  const [scanProgress, setScanProgress] = useState(0)  // 0-100
  const [scanElapsed, setScanElapsed] = useState(0)    // seconds
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanStartRef = useRef<number>(0)

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
    // Preparation phase (1.5s)
    setTimeout(() => {
      setScanState('scanning')
      scanStartRef.current = Date.now()
      // Simulate real-time scan progress
      // Use real scanTime but speed up for UI (max 30s display)
      const displayDuration = Math.min(scanTime * 1000, 30000)
      scanTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - scanStartRef.current) / 1000
        const progress = Math.min(100, (elapsed / (displayDuration / 1000)) * 100)
        setScanProgress(progress)
        setScanElapsed(elapsed)
        if (progress >= 100) {
          stopScan()
          setScanState('done')
          setTimeout(() => setScanState('idle'), 3000)
        }
      }, 50)
    }, 1500)
  }, [scanTime, stopScan])

  // Cleanup on unmount
  useEffect(() => () => stopScan(), [stopScan])

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
      style={{ background: '#070b10', borderBottom: '1px solid #0f1a24', height: '24px', gap: 0 }}>

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
        <span style={{ color: '#374151', fontSize: '8px', letterSpacing: '0.06em' }}>TE</span>
        <button
          className="font-mono font-semibold"
          style={{
            color: teOk ? '#c8ccd6' : '#fca5a5',
            fontSize: '10px',
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
        <span style={{ color: '#374151', fontSize: '8px' }}>ms</span>
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
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span style={{ color: '#374151', fontSize: '8px', letterSpacing: '0.06em' }}>TA</span>
        <span className="font-mono font-bold" style={{ color: '#e2e8f0', fontSize: '10px' }}>{fmt(scanTime)}</span>
      </div>
      <ChipDiv />

      {/* Matrix + slices */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span className="font-mono" style={{ color: '#4b5563', fontSize: '9px' }}>
          {params.matrixFreq}×{params.matrixPhase}×{params.slices}
        </span>
      </div>
      <ChipDiv />

      {/* Field strength */}
      <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
        <span className="font-mono font-semibold" style={{ color: '#e88b00', fontSize: '9px' }}>{params.fieldStrength}T</span>
      </div>

      {/* Scan simulation button + progress */}
      <div className="flex items-center gap-1.5 px-2 ml-auto shrink-0">
        {(scanState === 'scanning' || scanState === 'preparing') && (
          <div className="flex items-center gap-1.5">
            {/* k-space fill progress bar */}
            <div className="relative overflow-hidden rounded" style={{ width: 80, height: 12, background: '#111' }}>
              <div className="h-full transition-none rounded"
                style={{
                  width: `${scanProgress}%`,
                  background: `linear-gradient(90deg, #1a2a1a, #34d399)`,
                }}
              />
              {/* Scanning line */}
              {scanState === 'scanning' && (
                <div className="absolute top-0 bottom-0" style={{
                  left: `${scanProgress}%`,
                  width: 1,
                  background: '#34d399',
                  boxShadow: '0 0 4px #34d399',
                }} />
              )}
            </div>
            <span className="font-mono" style={{ color: '#34d399', fontSize: '8px', minWidth: 28 }}>
              {scanState === 'preparing' ? 'PREP' : `${scanProgress.toFixed(0)}%`}
            </span>
            <span style={{ color: '#374151', fontSize: '7px' }}>
              {scanState === 'scanning' ? `${scanElapsed.toFixed(0)}s` : ''}
            </span>
          </div>
        )}
        {scanState === 'done' && (
          <span className="font-mono" style={{ color: '#34d399', fontSize: '8px' }}>✓ COMPLETE</span>
        )}
        <button
          onClick={scanState === 'idle' || scanState === 'done' ? startScan : stopScan}
          style={{
            background: scanState === 'scanning' ? '#1a0505' : scanState === 'done' ? '#0a1208' : '#0a1f16',
            color: scanState === 'scanning' ? '#f87171' : scanState === 'done' ? '#34d399' : '#34d399',
            border: `1px solid ${scanState === 'scanning' ? '#7f1d1d' : scanState === 'done' ? '#14532d' : '#14532d'}`,
            borderRadius: 3,
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 8px',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            fontFamily: 'monospace',
          }}
        >
          {scanState === 'scanning' ? '■ STOP' : scanState === 'preparing' ? '...' : '▶ SCAN'}
        </button>
      </div>
    </div>
  )
}

function ChipParam({ label, value, unit, ok, warnMsg, onFix }: {
  label: string; value: string; unit: string; ok: boolean; warnMsg?: string; onFix?: () => void
}) {
  return (
    <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
      <span style={{ color: '#374151', fontSize: '8px', letterSpacing: '0.06em' }}>{label}</span>
      <span
        className="font-mono font-semibold"
        style={{ color: ok ? '#c8ccd6' : '#fca5a5', fontSize: '10px' }}
        title={warnMsg}
      >
        {value}
      </span>
      {unit && <span style={{ color: '#374151', fontSize: '8px' }}>{unit}</span>}
      {!ok && warnMsg && (
        <>
          <span style={{ color: '#f87171', fontSize: '7px' }}>⚠{warnMsg}</span>
          {onFix && (
            <button onClick={onFix}
              style={{ color: '#34d399', fontSize: '7px', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, padding: '0 2px', cursor: 'pointer' }}>
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

function LearnPanel() {
  const { params, activeTab, activeSequenceName, activeBodyPartId } = useProtocolStore()
  const [innerTab, setInnerTab] = useState<'seq' | 'check' | 'ref'>('seq')
  const [paramRefOpen, setParamRefOpen] = useState(false)

  const seqClinical = activeSequenceName ? getSeqClinical(activeSequenceName, activeBodyPartId) : null

  const tips: Record<string, { title: string; items: string[] }> = {
    Routine: {
      title: 'Routineタブ — 基本パラメータ',
      items: [
        'T1強調: 短TR（400-600ms）短TE（10-20ms）。脂肪・Gd造影・亜急性血腫が高信号',
        'T2強調: 長TR（≥2000ms）長TE（80-120ms）。水・浮腫・腫瘍が高信号',
        'STIR TI: 150ms@1.5T / 220ms@3T。FLAIR TI: 2200ms@1.5T / 2500ms@3T',
        'FA 150°→120°でSAR約30%削減。ETL・TR延長も有効なSAR対策',
        '3T: SAR≈4倍。HASTE+3T+体格大が最高リスク。SAR Assistant=Normal必須',
        'Concatenations↑→スライス間クロストーク↓だが撮像時間が延長する',
      ],
    },
    Contrast: {
      title: 'Contrastタブ — 脂肪抑制と造影',
      items: [
        'CHESS: 均一磁場（頭部・脊椎）向け。スペクトル選択励起で脂肪のみ抑制',
        'SPAIR: 腹部・乳腺の標準。Spectral Adiabatic IR→磁場不均一でも安定',
        'STIR: 造影後絶対NG。GdでT1短縮→STIRでnull→信号消失の落とし穴',
        'Dixon: 3T造影ダイナミック第一選択。water/fat/opp/in-phase 4画像同時取得',
        'Opp-Phase: 副腎腺腫判別に必須（IP比で20%以上低下→腺腫 感度87%/特異度97%）',
        'プリモビスト(EOB): 15分後に肝細胞相。悪性腫瘍は低信号で検出',
      ],
    },
    Resolution: {
      title: 'Resolutionタブ — SNR・iPAT',
      items: [
        'SNR式: ボクセル体積 × √(Averages×ETL×TR) ÷ √BW',
        'SNR改善効率: Thickness↑ > FOV↑ > Matrix↓ > Averages↑（時間対効果順）',
        '3T: BW2倍必要（220Hz→440Hz差）。同BWだと化学シフトが1.5Tの2倍',
        'iPAT(GRAPPA) AF=2: 時間1/2・SNR≈70%（1/√2）・g-factor考慮で実際は低下大きい',
        'CAIPIRINHA: SMS励起+Gz傾斜ブリップ。GRAPPAより68%で画質優位（腹部3D）',
        'DWI+GRAPPA AF=2: エコートレイン半分→EPIの幾何学的歪みが大幅改善（一石二鳥）',
      ],
    },
    Geometry: {
      title: 'Geometryタブ — アーチファクト制御',
      items: [
        '腹部Tra: 必ずA>>P。R>>Lにすると呼吸ゴーストが脊椎・臓器に重なる',
        '脊椎Sag: H>>F。A>>Pだと嚥下アーチファクトが椎体前方に重なる',
        '乳腺: R>>Lが推奨（心拍ゴーストを乳腺外へ）',
        'Phase Oversampling 100%: FOVを2倍にして切り捨て→エイリアシング完全排除',
        'Sat Band位置: 動く構造（大動脈・腸管・眼球）の上流/直前に設置',
        'Set-n-Go: テーブル自動移動で脊椎全長・全身撮像を効率化（Tim Planning Suite）',
      ],
    },
    System: {
      title: 'Systemタブ — iPAT・コイル・3T設定',
      items: [
        'iPAT = integrated Parallel Acquisition Techniques。GRAPPA/CAIPIRINHAの総称',
        'GRAPPA: k空間アンダーサンプリング→ACS（Reference Lines）からカーネル推定して補間',
        'AF=2: SNR≈70%・時間1/2｜AF=3: SNR≈58%・時間1/3（g-factor追加ペナルティあり）',
        'g-factor noise: 並列撮像でk空間補間時にノイズが局所増幅（画像中央で最大）。32ch以上コイルでg-factor低減',
        '1.5T AF≤2推奨。3T AF≤3まで許容（g-factorがSNR低下の主因）',
        'TrueForm B1 Shim: 2ch位相制御でB1均一化。3T腹部のDielectric Effect（定在波）対策',
        'Whisper モード: 騒音約-10dB（qtseと組み合わせると最大-97%）。小児・閉所恐怖症患者に',
        'ジッパーアーチファクト: ファラデーシールド不良でRF干渉→画像中央に明線。シールド点検・干渉源除去',
      ],
    },
    Physio: {
      title: 'Physioタブ — 生体信号同期',
      items: [
        'BH（息止め）: 最短時間・最高品質。患者協力が必要。1回15秒以内が目安',
        'RT（ベローズ）: 腹部の動きを間接検出。精度はPACEより低い。時間2-4倍',
        'PACE: 横隔膜エコーで直接追跡。効率50-60%（5mmウィンドウ時）。精度◎',
        '冠動脈Trigger Delay = RR×70-80%（拡張中期=最小運動期）',
        '3T ECG: T波がBCGと重複しR波誤認しやすい→vECG（ベクターECG）を必ず使用',
        '心臓Af（心房細動）: Retrospective ECGゲーティング使用。R-R不規則でも全位相データ収集後再構成',
        '心臓シネ: prospective trigger（整数RR）かretrospective（全位相取得）を用途で選択',
      ],
    },
    Inline: {
      title: 'Inlineタブ — 自動後処理',
      items: [
        'DWI: ADC Map ON必須。T2シャインスルー（T2の長い構造が拡散を模倣）の鑑別',
        'ADC値目安: 急性梗塞 0.3-0.4 / 悪性腫瘍 0.6-1.2 / 正常脳 0.8 (×10⁻³mm²/s)',
        'DWIBS（全身DWI）: Inverted MIP → PET様画像。悪性リンパ腫staging・治療効果判定に',
        'MIP前提: 背景を暗くする脂肪抑制が必須。明るい背景は最大値投影でMIPに紛れる',
        'Subtraction: 乳腺・骨盤造影で造影前後を自動差分→増強部位を強調表示',
        'CE-MRA inline MIP: 撮像直後にMIP血管像を確認→造影タイミング評価と再撮像判断の迅速化',
        'MPR: VIBE/MPRAGE等3D収集後にTra/Cor/Sag自動再構成。読影ワークフロー改善',
      ],
    },
    Sequence: {
      title: 'Sequenceタブ — シーケンス技術',
      items: [
        'HASTE: Single-shot TSE（ETL>100）。HAとはHalf-Fourier Acquired Single-shot TurboSpin Echo',
        'CE-MRA: TR≈3ms, TE≈1ms, FA=20-30°。k空間中心収集タイミングをGdピークに合わせる',
        'Bolus Tracking: ROIの閾値・ディレイ設定が重要。Test bolus法で循環時間を個別計測',
        'RESOLVE DWI: readout-segment EPI。k空間を3-6分割→EPI歪み大幅軽減。前立腺必須',
        'qtse (Quiet TSE): QuietX技術で傾斜slew rate最適化→最大97%騒音低減。3T脊椎標準',
        'starVIBE: Stack-of-Stars放射状k空間→全スポークがk空間中心を通過→体動averaging',
        'BLADE: PROPELLER法。ブレードを回転→面内並進・回転を retrospective補正',
        'mobiDiff: 胸部用ECG+呼吸同期DWI。肺・縦隔ADC値を体動なく測定可能',
      ],
    },
  }

  const tip = tips[activeTab] || tips['Routine']

  const { TR, TE, TI, flipAngle, sliceThickness, matrixFreq, matrixPhase, phaseResolution, fov, bandwidth,
    averages, turboFactor, ipatFactor, ipatMode, slices, fieldStrength, bValues, fatSat } = params

  const contrast = (() => {
    if (TI > 1500) return { label: 'FLAIR系', color: '#a78bfa', note: 'CSF抑制T2' }
    if (TI > 0 && TI < 300) return { label: 'STIR系', color: '#f43f5e', note: '脂肪抑制T2' }
    if (bValues && bValues.some(b => b >= 500)) return { label: 'DWI', color: '#06b6d4', note: `b=${Math.max(...bValues)}` }
    if (TR < 800 && TE < 30) return { label: 'T1強調', color: '#f59e0b', note: `TR=${TR} TE=${TE}` }
    if (TR > 2000 && TE > 70) return { label: 'T2強調', color: '#e88b00', note: `TR=${TR} TE=${TE}` }
    if (TR > 2000 && TE < 40) return { label: 'PD強調', color: '#10b981', note: `TR=${TR} TE=${TE}` }
    return { label: '混合/GRE', color: '#9ca3af', note: `TR=${TR} TE=${TE}` }
  })()

  const voxelVol = (fov / matrixFreq) * (fov * phaseResolution / 100 / matrixPhase) * sliceThickness
  const accelFactor = ipatMode !== 'Off' ? ipatFactor : 1
  const snrRel = voxelVol * Math.sqrt(turboFactor * averages / accelFactor) / Math.sqrt(bandwidth || 1)
  const snrNorm = Math.min(100, Math.round(snrRel * 8))
  const phaseLines = Math.round(matrixPhase * (phaseResolution / 100))
  const linesPerTR = Math.max(1, turboFactor / accelFactor)
  const estTimeSec = Math.round((TR / 1000) * (phaseLines / linesPerTR) * averages * Math.ceil(slices / Math.max(1, linesPerTR)))
  const estTimeMin = (estTimeSec / 60).toFixed(1)
  const sarRel = Math.round(Math.min(100, (flipAngle * flipAngle) / (TR || 1) * (fieldStrength === 3.0 ? 4 : 1) * 0.02))
  const sarColor = sarRel > 70 ? '#f87171' : sarRel > 40 ? '#fbbf24' : '#4ade80'

  const warnings: { text: string; style: React.CSSProperties }[] = []
  if (params.sarAssistant === 'Off')
    warnings.push({ text: '⚠ SAR Assistant OFF — 超過時にスキャンが停止します', style: { background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' } })
  if (params.fieldStrength === 3.0 && params.sarAssistant !== 'Normal' && params.sarAssistant !== 'Advanced')
    warnings.push({ text: '⚠ 3TはSAR Assistantの使用を推奨', style: { background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' } })
  if (params.respTrigger === 'Off' && params.slices > 15)
    warnings.push({ text: '💡 腹部多スライスなら呼吸同期（BH/RT/PACE）を検討', style: { background: '#111111', border: '1px solid #7c3aed', color: '#c4b5fd' } })
  if (params.fatSat === 'STIR')
    warnings.push({ text: '⚠ STIR — 造影後は使用不可（Gd信号もnullされます）', style: { background: '#111111', border: '1px solid #d97706', color: '#fcd34d' } })
  if (params.bandwidth < 100 && params.fieldStrength === 3.0)
    warnings.push({ text: '⚠ 3TでBW低い → 化学シフトアーチファクトが顕著になります', style: { background: '#111111', border: '1px solid #d97706', color: '#fcd34d' } })
  if (params.ipatFactor >= 3 && params.fieldStrength === 1.5)
    warnings.push({ text: '⚠ AF=3 @1.5T — g-factorアーチファクトに注意', style: { background: '#111111', border: '1px solid #d97706', color: '#fcd34d' } })

  const INNER_TABS = [
    { id: 'seq' as const, label: '解説' },
    { id: 'check' as const, label: 'チェック' },
    { id: 'ref' as const, label: '参照' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#141414' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid #252525' }}>
        <div className="px-3 py-2 flex items-center gap-1.5">
          <BookOpen size={11} style={{ color: '#4b5563' }} />
          <span className="text-xs font-semibold" style={{ color: '#4b5563' }}>学習ガイド</span>
          {activeSequenceName && (
            <span className="ml-auto font-mono text-xs truncate max-w-[140px]" style={{ color: '#e88b00' }}>
              {activeSequenceName}
            </span>
          )}
        </div>
        {/* Inner tab nav */}
        <div className="flex px-2 pb-1.5 gap-1">
          {INNER_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setInnerTab(t.id)}
              className="flex-1 py-1 rounded text-xs transition-colors"
              style={{
                background: innerTab === t.id ? '#252525' : 'transparent',
                color: innerTab === t.id ? '#e5e7eb' : '#4b5563',
                border: `1px solid ${innerTab === t.id ? '#374151' : 'transparent'}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ===== 解説 tab ===== */}
        {innerTab === 'seq' && (
          <div className="p-3 space-y-2.5">
            {seqClinical ? (
              <>
                <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #3a1a00' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#e88b00' }}>目的</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>{seqClinical.reason}</div>
                </div>
                <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#a78bfa' }}>臨床的意義</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#c4b5fd' }}>{seqClinical.clinical}</div>
                </div>
                {seqClinical.findings && (
                  <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#34d399' }}>典型所見</div>
                    <div className="text-xs leading-relaxed" style={{ color: '#6ee7b7' }}>{seqClinical.findings}</div>
                  </div>
                )}
                {seqClinical.params && (
                  <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>パラメータポイント</div>
                    <div className="text-xs leading-relaxed" style={{ color: '#fde68a' }}>{seqClinical.params}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-xs" style={{ color: '#374151' }}>
                <BookOpen size={20} style={{ color: '#252525' }} />
                シーケンスをクリックすると臨床解説が表示されます
              </div>
            )}
          </div>
        )}

        {/* ===== チェック tab ===== */}
        {innerTab === 'check' && (
          <div className="p-3 space-y-3">
            {/* Settings check */}
            <div className="space-y-1.5 text-xs">
              {warnings.length === 0 ? (
                <div className="p-2 rounded" style={{ background: '#052e16', border: '1px solid #166534', color: '#86efac' }}>
                  ✓ 現在の設定に問題は検出されていません
                </div>
              ) : (
                warnings.map((w, i) => (
                  <div key={i} className="p-2 rounded" style={w.style}>{w.text}</div>
                ))
              )}
            </div>

            {/* Compact simulator */}
            <div className="space-y-2">
              {/* コントラスト予測 */}
              <div className="p-2 rounded flex items-center justify-between gap-2" style={{ background: '#0e0e0e', border: `1px solid ${contrast.color}33` }}>
                <span className="text-xs shrink-0" style={{ color: '#4b5563' }}>コントラスト</span>
                <div className="text-right leading-tight">
                  <span className="text-xs font-bold" style={{ color: contrast.color }}>{contrast.label}</span>
                  <span className="text-xs ml-1.5" style={{ color: '#4b5563' }}>{contrast.note}{fatSat !== 'None' ? ` +${fatSat}` : ''}</span>
                </div>
              </div>

              {/* SNR / SAR / Time */}
              <div className="grid grid-cols-3 gap-1">
                <div className="p-1.5 rounded text-center" style={{ background: '#0e0e0e', border: '1px solid #1f1f1f' }}>
                  <div className="text-xs mb-1" style={{ color: '#4b5563' }}>相対SNR</div>
                  <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: '#1f1f1f' }}>
                    <div className="h-full rounded-full" style={{ width: `${snrNorm}%`, background: snrNorm > 60 ? '#4ade80' : snrNorm > 30 ? '#fbbf24' : '#f87171' }} />
                  </div>
                  <div className="text-xs font-mono font-bold" style={{ color: '#e5e7eb' }}>{snrNorm}%</div>
                </div>
                <div className="p-1.5 rounded text-center" style={{ background: '#0e0e0e', border: '1px solid #1f1f1f' }}>
                  <div className="text-xs mb-1" style={{ color: '#4b5563' }}>SAR目安</div>
                  <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: '#1f1f1f' }}>
                    <div className="h-full rounded-full" style={{ width: `${sarRel}%`, background: sarColor }} />
                  </div>
                  <div className="text-xs font-mono font-bold" style={{ color: sarColor }}>{sarRel}%</div>
                </div>
                <div className="p-1.5 rounded text-center" style={{ background: '#0e0e0e', border: '1px solid #1f1f1f' }}>
                  <div className="text-xs mb-1" style={{ color: '#4b5563' }}>推定時間</div>
                  <div className="text-xs font-mono font-bold mt-2" style={{ color: '#e88b00' }}>{estTimeMin}m</div>
                </div>
              </div>

              {/* ボクセルサイズ */}
              <div className="px-2 py-1.5 rounded text-xs flex items-center gap-1.5" style={{ background: '#0e0e0e' }}>
                <span style={{ color: '#4b5563' }}>ボクセル</span>
                <span className="font-mono" style={{ color: '#9ca3af' }}>
                  {(fov / matrixFreq).toFixed(1)}×{(fov * (phaseResolution / 100) / matrixPhase).toFixed(1)}×{sliceThickness}mm
                </span>
                <span className="ml-auto font-mono font-semibold" style={{ color: '#fbbf24' }}>{voxelVol.toFixed(2)}mm³</span>
              </div>

              {/* 組織信号予測 */}
              {(() => {
                const is3T = fieldStrength === 3.0
                const FArad = flipAngle * Math.PI / 180
                const cosFA = Math.cos(FArad)
                const sinFA = Math.sin(FArad)
                const isGRE = TR < 500 && flipAngle < 90
                const hasIR = TI > 0

                const TISSUES = [
                  { name: '白質', T1: is3T ? 1080 : 680,  T2: is3T ? 80  : 90,  T2s: is3T ? 55 : 65, PD: 0.70, color: '#d1d5db' },
                  { name: '灰白質', T1: is3T ? 1600 : 950,  T2: is3T ? 90  : 100, T2s: is3T ? 60 : 75, PD: 0.80, color: '#9ca3af' },
                  { name: '脂肪',   T1: is3T ? 380  : 260,  T2: is3T ? 70  : 80,  T2s: is3T ? 50 : 60, PD: 0.85, color: '#fbbf24' },
                  { name: 'CSF',    T1: is3T ? 4800 : 4200, T2: is3T ? 1800: 2000,T2s: is3T ?1200:1500, PD: 1.00, color: '#60a5fa' },
                  { name: '筋肉',   T1: is3T ? 1400 : 860,  T2: is3T ? 50  : 50,  T2s: is3T ? 30 : 35, PD: 0.75, color: '#f87171' },
                  { name: '肝臓',   T1: is3T ? 800  : 490,  T2: is3T ? 35  : 40,  T2s: is3T ? 20 : 25, PD: 0.65, color: '#e88b00' },
                ]

                const calcSig = (t: typeof TISSUES[0]) => {
                  const E1 = Math.exp(-TR / t.T1)
                  if (hasIR && !isGRE) {
                    const Eti = Math.exp(-TI / t.T1)
                    return t.PD * Math.abs(1 - 2 * Eti + E1) * Math.exp(-TE / t.T2)
                  } else if (isGRE) {
                    const denom = 1 - cosFA * E1
                    return denom > 0 ? t.PD * sinFA * (1 - E1) / denom * Math.exp(-TE / t.T2s) : 0
                  }
                  return t.PD * (1 - E1) * Math.exp(-TE / t.T2)
                }

                const sigs = TISSUES.map(t => ({ ...t, sig: Math.max(0, calcSig(t)) }))
                const maxSig = Math.max(...sigs.map(s => s.sig), 0.001)

                return (
                  <div className="p-2 rounded space-y-1.5" style={{ background: '#0e0e0e' }}>
                    <div className="text-xs font-semibold" style={{ color: '#4b5563' }}>
                      組織信号予測 ({isGRE ? 'GRE/T2*' : hasIR ? 'IR' : 'SE/TSE'})
                    </div>
                    {sigs.map(t => {
                      const pct = Math.round((t.sig / maxSig) * 100)
                      return (
                        <div key={t.name} className="flex items-center gap-2">
                          <span className="text-xs shrink-0 w-12" style={{ color: t.color }}>{t.name}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                            <div className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%`, background: t.color, opacity: 0.75 }} />
                          </div>
                          <span className="text-xs font-mono w-7 text-right" style={{ color: '#4b5563' }}>{pct}</span>
                        </div>
                      )
                    })}
                    <div className="text-xs pt-0.5" style={{ color: '#374151' }}>
                      {isGRE ? `FA=${flipAngle}° Ernst最適≈${Math.round(Math.acos(Math.exp(-TR / (is3T ? 800 : 490))) * 180 / Math.PI)}°(肝)`
                        : hasIR ? `TI=${TI}ms → ${TI < 400 ? '脂肪null(STIR)' : TI > 1500 ? 'CSF null(FLAIR)' : 'IR'}`
                        : `TR=${TR}ms TE=${TE}ms`}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ===== 参照 tab ===== */}
        {innerTab === 'ref' && (
          <div className="p-3 space-y-4">
            {/* Tab tips */}
            <div>
              <div className="text-xs font-semibold mb-1.5" style={{ color: '#e88b00' }}>{tip.title}</div>
              <ul className="space-y-1.5">
                {tip.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs" style={{ color: '#9ca3af' }}>
                    <span className="shrink-0" style={{ color: '#e88b00' }}>›</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid #1f1f1f' }} />

            {/* コントラスト重み付け */}
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: '#4b5563' }}>コントラスト重み付け</div>
              <div className="space-y-0.5 text-xs">
                {([
                  ['T1強調', '短TR(400-600) 短TE(10-20)', '#f59e0b'],
                  ['T2強調', '長TR(≥2000) 長TE(80-120)', '#3b82f6'],
                  ['PD強調', '長TR(≥2000) 短TE(20-30)', '#10b981'],
                  ['FLAIR', 'TI=2500ms@3T / CSF抑制T2', '#8b5cf6'],
                  ['STIR', 'TI=220ms@3T / 脂肪抑制T2', '#f43f5e'],
                  ['DWI', 'b=1000(脳) / 800(腹部) / 1500(骨盤)', '#06b6d4'],
                ] as [string, string, string][]).map(([k, v, c]) => (
                  <div key={k} className="flex items-baseline gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                    <span className="shrink-0 font-semibold" style={{ color: c, width: '52px' }}>{k}</span>
                    <span className="font-mono" style={{ color: '#6b7280' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 脂肪抑制 */}
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: '#4b5563' }}>脂肪抑制 使い分け</div>
              <div className="space-y-0.5 text-xs">
                {([
                  ['CHESS', '頭部・脊椎（均一磁場）', '#9ca3af'],
                  ['SPAIR', '腹部・乳腺（不均一磁場に強い）', '#34d399'],
                  ['STIR', '関節・金属近傍　※造影後NG', '#f87171'],
                  ['Dixon', '3Tダイナミック第一選択・定量評価', '#a78bfa'],
                ] as [string, string, string][]).map(([k, v, c]) => (
                  <div key={k} className="flex items-baseline gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                    <span className="shrink-0 font-semibold font-mono" style={{ color: c, width: '48px' }}>{k}</span>
                    <span style={{ color: '#6b7280' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 主要パラメータ値 & SAR — 2-col grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#4b5563' }}>主要パラメータ値</div>
                <div className="space-y-0.5 text-xs">
                  {([
                    ['MRCP TE', '≥700 ms'],
                    ['FLAIR TI@3T', '2500 ms'],
                    ['STIR TI@3T', '220 ms'],
                    ['冠動脈TD', 'RR×75%'],
                    ['EOB待機', '15-20 min'],
                    ['動脈相', '25-35 s'],
                    ['門脈相', '60-70 s'],
                    ['平衡相', '120 s'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center px-1.5 py-0.5 rounded" style={{ background: '#0e0e0e' }}>
                      <span style={{ color: '#4b5563' }}>{k}</span>
                      <span className="font-mono font-semibold" style={{ color: '#e5e7eb' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#4b5563' }}>ADC（×10⁻³ mm²/s）</div>
                <div className="space-y-0.5 text-xs">
                  {([
                    ['急性脳梗塞', '<0.6', '#f87171'],
                    ['前立腺癌', '<1.0', '#f87171'],
                    ['乳癌', '<1.2', '#f87171'],
                    ['肝転移', '<1.0', '#f87171'],
                    ['良性病変', '>1.4', '#4ade80'],
                  ] as [string, string, string][]).map(([k, v, c]) => (
                    <div key={k} className="flex justify-between items-center px-1.5 py-0.5 rounded" style={{ background: '#0e0e0e' }}>
                      <span style={{ color: '#4b5563' }}>{k}</span>
                      <span className="font-mono font-semibold" style={{ color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 呼吸補正 & iPAT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#4b5563' }}>呼吸補正</div>
                <div className="space-y-0.5 text-xs">
                  {([
                    ['BH', '息止め。最短・高画質', '#fbbf24'],
                    ['RT', '自由呼吸。2-4倍時間延長', '#9ca3af'],
                    ['PACE', '自由呼吸。高精度。効率50-60%', '#60a5fa'],
                  ] as [string, string, string][]).map(([k, v, c]) => (
                    <div key={k} className="flex items-start gap-1.5 p-1 rounded" style={{ background: '#0e0e0e' }}>
                      <span className="shrink-0 font-mono font-semibold" style={{ color: c, width: '36px' }}>{k}</span>
                      <span style={{ color: '#6b7280' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#4b5563' }}>SAR規制値</div>
                <div className="space-y-0.5 text-xs">
                  {([
                    ['全身', '4 W/kg'],
                    ['頭部', '3.2 W/kg'],
                    ['3T vs 1.5T', '約4倍↑'],
                    ['FA 180→120°', 'SAR 約30%↓'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center px-1.5 py-0.5 rounded" style={{ background: '#0e0e0e' }}>
                      <span style={{ color: '#4b5563' }}>{k}</span>
                      <span className="font-mono font-semibold" style={{ color: '#fca5a5' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 造影剤ガイドライン */}
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: '#4b5563' }}>Gd造影剤 — eGFR基準</div>
              <div className="space-y-0.5 text-xs">
                {([
                  ['≥60', 'リニア型・マクロ環型ともに使用可', '#4ade80'],
                  ['30-59', 'マクロ環型（ガドテリック酸等）推奨', '#fbbf24'],
                  ['<30', 'リニア型は原則禁忌（GSNリスク）', '#f87171'],
                  ['透析中', '透析直後に投与、次回透析で除去', '#fb923c'],
                ] as [string, string, string][]).map(([k, v, c]) => (
                  <div key={k} className="flex items-start gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                    <span className="shrink-0 font-mono font-semibold" style={{ color: c, width: '36px' }}>{k}</span>
                    <span style={{ color: '#6b7280' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 pt-1 text-xs" style={{ color: '#374151', borderTop: '1px solid #1a1a1a' }}>
                GSN = 腎性全身性線維症。透析患者のeGFR≈0として扱う。
              </div>
            </div>

            <div style={{ borderTop: '1px solid #1f1f1f' }} />

            {/* 部位別パラメータ早見表 — collapsible */}
            <div>
              <button
                className="w-full flex items-center gap-1.5 text-left"
                onClick={() => setParamRefOpen(o => !o)}
              >
                <ChevronDown size={10} style={{ color: '#6b7280', transform: paramRefOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>部位別パラメータ早見表</span>
              </button>
              {paramRefOpen && (
                <div className="mt-2 space-y-3 text-xs">
                  {([
                    {
                      part: '頭部 / Brain', color: '#e88b00',
                      rows: [
                        ['DWI(脳梗塞)', 'b=1000 / TR≥5000 / BW=1500+ / GRAPPA AF=2 / 5mm'],
                        ['FLAIR', 'TR=9000 / TE=100 / TI=2500@3T / ETL=20 / 5mm'],
                        ['T2 TSE', 'TR=5000 / TE=100 / ETL=25 / Matrix=320 / 5mm'],
                        ['T2* GRE', 'TR=800 / TE=20 / FA=15° / 2-3mm (微小出血)'],
                        ['TOF-MRA', 'TR=25-35 / TE=3.4 / FA=20° / 0.6mm 3D'],
                      ],
                    },
                    {
                      part: '腹部 / Abdomen', color: '#f59e0b',
                      rows: [
                        ['EOB-VIBE BH', 'TR=4 / TE=2.1/1.1(OP/IP) / FA=10° / BW=400 / 2-3mm'],
                        ['HASTE BH', 'TR=∞ / TE=83 / FA=120° / ETL=144 / BW=558 / 5mm'],
                        ['DWI PACE', 'b=0,50,800 / TR=5000 / BW=1400+ / GRAPPA AF=2'],
                        ['3D MRCP', 'TE=700-1000 / TR=4000 / 厚スラブ40-80mm / PACE'],
                        ['starVIBE', 'FA=10-15° / Radial / Free Breath / OP+In同時'],
                      ],
                    },
                    {
                      part: '骨盤 / Pelvis (前立腺)', color: '#8b5cf6',
                      rows: [
                        ['T2 TSE tra', 'TR=4000-6000 / TE=100 / 3mm / FOV=180 / Matrix=320'],
                        ['RESOLVE DWI', 'b=0,400,800,1400 / seg=3-6 / TR=3000 / BW=1600+'],
                        ['DCE VIBE', '<10s/相 / Gd 0.1mmol/kg / 2mL/s / FA=12°'],
                        ['T2 sag/cor', 'TE=100 / 3mm / EPE評価には斜断が推奨'],
                      ],
                    },
                    {
                      part: '脊椎 / Spine', color: '#10b981',
                      rows: [
                        ['qtse sag (C)', 'TR=3500 / TE=100 / ETL=20 / 3mm / FOV=240'],
                        ['qtse sag (L)', 'TR=3500 / TE=100 / ETL=15 / 3mm / FOV=280'],
                        ['STIR/nSTIR', 'TI=220@3T / TR=5000 / 転移感度≈92%'],
                        ['Dixon T1', '1回でW/F/IP/OP 4画像 / 骨髄脂肪定量'],
                      ],
                    },
                    {
                      part: '関節 / Joint (膝)', color: '#06b6d4',
                      rows: [
                        ['PD FS sag', 'TR=3000-4000 / TE=30 / FA=90° / FOV=150-180 / 3mm'],
                        ['PD FS cor', 'FOV=150-180 / SPAIR / Matrix=384 / 半月板評価'],
                        ['PD FS tra', 'FA=90° / TE=30 / 軟骨断面・半月板水平面'],
                        ['T2* MEDIC', 'TE=20-25 / 3D / 1-2mm / 関節軟骨・関節唇'],
                      ],
                    },
                    {
                      part: '肩 / Shoulder', color: '#f43f5e',
                      rows: [
                        ['BLADE cor', 'FOV=180 / 3mm / 斜冠状断（棘上筋長軸平行）'],
                        ['BLADE sag', 'FOV=180 / 3mm / 肩峰形態・出口評価'],
                        ['PD FS', 'TR=3500 / TE=30 / ETL=12 / SPAIR'],
                      ],
                    },
                    {
                      part: '乳腺 / Breast', color: '#ec4899',
                      rows: [
                        ['DCE VIBE tra', 'TR=4-6 / TE=1.5(OP)+3.0(IP) / FA=12° / BW=400 / 1-2mm'],
                        ['DWI EPI', 'b=0,50,800 / TR=7000 / BW=1500+ / GRAPPA AF=2 / SPAIR'],
                        ['T2 TSE tra', 'TR=5000 / TE=80-100 / ETL=15 / SPAIR / 3mm'],
                        ['Silicone-spec', 'STIR水抑制+脂肪抑制 / TE=100 / Si専用bSSFP'],
                      ],
                    },
                    {
                      part: '心臓 / Cardiac', color: '#f87171',
                      rows: [
                        ['CINE bSSFP', 'TR=3.6 / TE=1.8 / FA=60° / ECG trig / BH / 8mm'],
                        ['LGE IR GRE', 'TI=250-300@3T / FA=25° / ECG trig / BH / 8mm'],
                        ['T2 STIR', 'TI=170@3T / TR=2 RR / ETL=30 / Dark Blood / 8mm'],
                        ['T1 Mapping', 'MOLLI 5(3)3 / ECG trig / BH / inversion recovery'],
                      ],
                    },
                  ] as { part: string; color: string; rows: [string, string][] }[]).map(({ part, color, rows }) => (
                  <div key={part}>
                    <div className="font-semibold mb-1" style={{ color }}>{part}</div>
                    <div className="space-y-0.5">
                      {rows.map(([seq, val]) => (
                        <div key={seq} className="flex gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                          <span className="shrink-0 font-semibold" style={{ color: '#9ca3af', width: '88px' }}>{seq}</span>
                          <span className="font-mono text-xs" style={{ color: '#6b7280' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          </div>
        )}
      </div>
    </div>
  )
}
