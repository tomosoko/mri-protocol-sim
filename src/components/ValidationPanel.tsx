import { useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { validateProtocol, issueCount, type ValidationIssue, type RuleSeverity } from '../utils/protocolValidator'
import { AlertTriangle, XCircle, Info, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'

// パラメータ → タブのマッピング
const PARAM_TAB: Record<string, string> = {
  TR: 'Routine', TE: 'Routine', TI: 'Routine', flipAngle: 'Routine',
  slices: 'Routine', sliceThickness: 'Routine', sliceGap: 'Routine', averages: 'Routine',
  fatSat: 'Contrast', mt: 'Contrast',
  matrixFreq: 'Resolution', matrixPhase: 'Resolution', fov: 'Resolution',
  phaseResolution: 'Resolution', bandwidth: 'Resolution',
  orientation: 'Geometry', phaseEncDir: 'Geometry', satBands: 'Geometry',
  coil: 'System', coilType: 'System', ipatMode: 'System', ipatFactor: 'System',
  gradientMode: 'System', shim: 'System', fieldStrength: 'System',
  ecgTrigger: 'Physio', respTrigger: 'Physio', triggerDelay: 'Physio', triggerWindow: 'Physio',
  inlineADC: 'Inline', inlineMIP: 'Inline', inlineMPR: 'Inline', inlineSubtraction: 'Inline',
  turboFactor: 'Sequence', echoSpacing: 'Sequence', partialFourier: 'Sequence', bValues: 'Sequence',
}

const severityIcon = (s: RuleSeverity, size = 12) => {
  if (s === 'error') return <XCircle size={size} className="text-red-400 shrink-0" />
  if (s === 'warning') return <AlertTriangle size={size} className="text-yellow-400 shrink-0" />
  return <Info size={size} className="text-blue-400 shrink-0" />
}

const severityBg: Record<RuleSeverity, string> = {
  error: '#1a0505',
  warning: '#1a1100',
  info: '#050a1a',
}

const severityBorder: Record<RuleSeverity, string> = {
  error: '#7f1d1d',
  warning: '#713f12',
  info: '#1e3a5f',
}

const severityLabel: Record<RuleSeverity, string> = {
  error: 'エラー',
  warning: '警告',
  info: '情報',
}

function IssueCard({ issue, expanded, onToggle, onJumpToTab }: {
  issue: ValidationIssue
  expanded: boolean
  onToggle: () => void
  onJumpToTab: (tab: string, params: string[]) => void
}) {
  // 最初の関連パラメータからタブを推定
  const targetTab = issue.params
    ? issue.params.map(p => PARAM_TAB[p]).find(t => t != null)
    : null

  return (
    <div
      className="rounded mb-1 overflow-hidden cursor-pointer"
      style={{ background: severityBg[issue.severity], border: `1px solid ${severityBorder[issue.severity]}` }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        {severityIcon(issue.severity)}
        <span className="flex-1 font-semibold" style={{ fontSize: '11px', color: '#e2e8f0' }}>
          {issue.title}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{
          background: severityBorder[issue.severity] + '40',
          color: issue.severity === 'error' ? '#fca5a5' : issue.severity === 'warning' ? '#fcd34d' : '#93c5fd',
          fontSize: '9px',
        }}>
          {issue.category}
        </span>
        {expanded ? <ChevronDown size={10} style={{ color: '#6b7280' }} /> : <ChevronRight size={10} style={{ color: '#6b7280' }} />}
      </div>
      {expanded && (
        <div className="px-2 pb-2" style={{ color: '#9ca3af', fontSize: '10px', lineHeight: '1.5' }}>
          {issue.detail}
          {issue.params && issue.params.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
              {issue.params.map(p => (
                <span key={p} className="font-mono px-1 rounded" style={{ background: '#252525', color: '#60a5fa', fontSize: '9px' }}>
                  {p}
                </span>
              ))}
              {targetTab && (
                <button
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded ml-auto transition-colors"
                  style={{ background: '#1a2a1a', color: '#4ade80', border: '1px solid #166534', fontSize: '9px' }}
                  onClick={e => { e.stopPropagation(); onJumpToTab(targetTab, issue.params ?? []) }}
                >
                  <ArrowRight size={8} />
                  {targetTab}タブへ
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ValidationPanel() {
  const { params, setActiveTab, setHighlightedParams } = useProtocolStore()
  const issues = validateProtocol(params)
  const counts = issueCount(issues)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<RuleSeverity | 'all'>('all')

  const handleJumpToTab = (tab: string, relatedParams: string[]) => {
    setActiveTab(tab)
    setHighlightedParams(relatedParams)
    // 3秒後にハイライト解除
    setTimeout(() => setHighlightedParams([]), 3000)
  }

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = filter === 'all' ? issues : issues.filter(i => i.severity === filter)

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs" style={{ background: '#0a0a0a', color: '#c8ccd6' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ background: '#111', borderBottom: '1px solid #252525' }}>
        <div className="flex items-center justify-between">
          <div className="font-semibold" style={{ color: '#f87171' }}>Protocol Validator</div>
          <div className="flex items-center gap-2">
            {counts.errors > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: '#1a0505', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
                <XCircle size={9} /> {counts.errors}
              </span>
            )}
            {counts.warnings > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: '#1a1100', border: '1px solid #713f12', color: '#fcd34d' }}>
                <AlertTriangle size={9} /> {counts.warnings}
              </span>
            )}
            {counts.infos > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: '#050a1a', border: '1px solid #1e3a5f', color: '#93c5fd' }}>
                <Info size={9} /> {counts.infos}
              </span>
            )}
          </div>
        </div>
        <div style={{ color: '#4b5563' }}>臨床ルールに基づくリアルタイム検証</div>
      </div>

      {/* Filter tabs */}
      <div className="flex shrink-0 px-2 pt-2 gap-1">
        {(['all', 'error', 'warning', 'info'] as const).map(f => {
          const count = f === 'all' ? issues.length : f === 'error' ? counts.errors : f === 'warning' ? counts.warnings : counts.infos
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-2 py-0.5 rounded text-xs transition-colors"
              style={{
                background: filter === f ? '#252525' : 'transparent',
                color: filter === f ? '#e2e8f0' : '#4b5563',
                border: `1px solid ${filter === f ? '#374151' : 'transparent'}`,
              }}
            >
              {f === 'all' ? `全て (${count})` : `${severityLabel[f]} (${count})`}
            </button>
          )
        })}
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32" style={{ color: '#374151' }}>
            <div className="text-2xl mb-2">✓</div>
            <div style={{ color: '#34d399' }}>
              {filter === 'all' ? '問題なし — プロトコルは適切です' : '該当なし'}
            </div>
          </div>
        ) : (
          filtered.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              expanded={expandedIds.has(issue.id)}
              onToggle={() => toggle(issue.id)}
              onJumpToTab={handleJumpToTab}
            />
          ))
        )}
      </div>

      {/* Summary footer */}
      {issues.length > 0 && (
        <div className="px-3 py-2 shrink-0" style={{ borderTop: '1px solid #1a1a1a', background: '#0a0a0a' }}>
          <div style={{ color: '#4b5563' }}>
            {counts.errors > 0
              ? `⚠ ${counts.errors}件のエラーを要修正`
              : counts.warnings > 0
              ? `${counts.warnings}件の警告を確認してください`
              : `${counts.infos}件の情報のみ — 臨床使用可`}
          </div>
        </div>
      )}
    </div>
  )
}
