import { useState, useMemo } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { protocolTree } from '../data/protocols'
import type { SequenceStep } from '../data/protocols'
import { Clock, Syringe, Timer, GitBranch, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { getSeqClinical } from '../data/sequenceClinicalData'

// シーケンス名パターン → プリセットID の自動マッチング
function matchPreset(name: string): string | undefined {
  const n = name.toLowerCase()
  if (n.includes('flair')) return 'brain_flair'
  if (n.includes('diffusion_resolve')) return 'brain_dwi'
  if (n.includes('diffusion') && (n.includes('ep2d') || n.includes('mobidiff'))) return 'abdomen_dwi'
  if (n.includes('mrcp') && n.includes('space')) return 'mrcp_3d'
  if (n.includes('mrcp')) return 'mrcp'
  if (n.includes('t2_flair') || n.includes('ftse')) return 'brain_flair'
  if (n.includes('t2_tse') && (n.includes('tra') || n.includes('cor') || n.includes('sag'))) return 'brain_t2'
  if (n.includes('t1_se') || n.includes('t1_tse')) return 'brain_t2'
  if (n.includes('haste') && (n.includes('bh') || n.includes('rt'))) {
    return n.includes('rt') ? 'abdomen_t2_rt' : 'abdomen_t2_bh'
  }
  if (n.includes('vibe') && (n.includes('dynamic') || n.includes('dyn'))) return 'liver_eob'
  if (n.includes('opp') || n.includes('opp-in') || n.includes('in-phase')) return 'liver_opp_in'
  if (n.includes('starvibe')) return 'liver_opp_in'
  if (n.includes('spair') && n.includes('t2')) return 'pelvis_female'
  if (n.includes('qtse') || n.includes('stse')) return 'spine_c_qtse'
  if (n.includes('pd_') || n.includes('_pd')) return 'knee_pd'
  if (n.includes('cardiac') || n.includes('cine')) return 'cardiac_cine'
  if (n.includes('mra') || n.includes('tof')) return 'brain_tof_mra'
  if (n.includes('native_trufi') || n.includes('trufi')) return 'renal_native_mra'
  if (n.includes('space') && n.includes('t2')) return 'brain_space'
  return undefined
}


export function SequenceQueue() {
  const { activeBodyPartId, activeGroupId, activeVariantId, activeColumnIndex, activeSequenceName, setActiveProtocol, setCurrentPage } = useProtocolStore()

  const bodyPart = protocolTree.find(b => b.id === activeBodyPartId)
  const group = bodyPart?.groups.find(g => g.id === activeGroupId)
  const variant = group?.variants.find(v => v.id === activeVariantId)

  if (!variant) {
    return (
      <div className="h-full flex flex-col" style={{ background: '#0e0e0e' }}>
        <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider shrink-0"
          style={{ color: '#374151', borderBottom: '1px solid #252525' }}>
          Sequence Queue
        </div>
        <div className="flex-1 flex items-center justify-center text-xs" style={{ color: '#374151' }}>
          プロトコルを選択
        </div>
      </div>
    )
  }

  const columns = variant.columns
  const currentColumn = columns[activeColumnIndex] ?? columns[0]

  const totalSeconds = currentColumn.sequences.reduce((sum, s) => {
    if (!s.duration) return sum
    const [m, sec] = s.duration.split(':').map(Number)
    return sum + (m * 60 + (sec || 0))
  }, 0)
  const totalMin = Math.floor(totalSeconds / 60)
  const totalSec = totalSeconds % 60

  return (
    <div className="h-full flex flex-col" style={{ background: '#0e0e0e' }}>
      {/* Header */}
      <div className="px-2 py-1 shrink-0" style={{ borderBottom: '1px solid #252525' }}>
        <div className="text-xs font-semibold truncate leading-tight" style={{ color: '#e88b00' }}>
          {group?.label} / {variant.label}
        </div>
        <div className="flex items-center gap-1 mt-0.5" style={{ color: '#374151' }}>
          <Clock size={8} />
          <span style={{ fontSize: '9px', fontFamily: 'monospace' }}>
            {totalMin}:{String(totalSec).padStart(2, '0')}
          </span>
          <span style={{ fontSize: '9px', color: '#252525' }}>•</span>
          <span style={{ fontSize: '9px' }}>{currentColumn.sequences.length} seq</span>
        </div>

        {/* Column tabs */}
        {columns.length > 1 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {columns.map((col, i) => (
              <button
                key={i}
                onClick={() => setActiveProtocol(activeBodyPartId!, activeGroupId!, activeVariantId!, i)}
                className="px-1.5 rounded transition-colors"
                style={{
                  background: activeColumnIndex === i ? '#2a1200' : '#252525',
                  color: activeColumnIndex === i ? '#e88b00' : '#5a5a5a',
                  border: `1px solid ${activeColumnIndex === i ? '#c47400' : '#2a2a2a'}`,
                  fontSize: '9px',
                  height: '15px',
                  lineHeight: '13px',
                }}
              >
                {col.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setCurrentPage('console')}
          style={{
            marginTop: 4,
            width: '100%',
            background: '#0a1f16',
            color: '#34d399',
            border: '1px solid #14532d',
            borderRadius: 3,
            fontSize: '9px',
            padding: '3px 0',
            cursor: 'pointer',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        >
          ▶ Console で開く
        </button>
      </div>

      {/* Sequence list */}
      <div className="flex-1 overflow-y-auto">
        {currentColumn.sequences.map((step, i) => (
          <SequenceRow
            key={i}
            step={step}
            index={i}
            isActive={activeSequenceName === step.name}
            bodyPartId={activeBodyPartId}
          />
        ))}
      </div>

      {/* Timeline bar */}
      {totalSeconds > 0 && (
        <ExamTimeline sequences={currentColumn.sequences} totalSeconds={totalSeconds} />
      )}
    </div>
  )
}

function ExamTimeline({ sequences, totalSeconds }: { sequences: SequenceStep[]; totalSeconds: number }) {
  const parseSec = (d?: string) => {
    if (!d) return 0
    const [m, s] = d.split(':').map(Number)
    return m * 60 + (s || 0)
  }
  const W = 188
  const segments = useMemo(() => {
    let elapsed = 0
    return sequences.map(s => {
      const dur = parseSec(s.duration)
      const x = elapsed
      elapsed += dur
      return { name: s.name, dur, x, isCE: s.isCE, isTimer: s.isTimer, isOptional: s.isOptional }
    })
  }, [sequences])

  return (
    <div className="shrink-0 px-2 py-1.5" style={{ borderTop: '1px solid #1a1a1a', background: '#080808' }}>
      <div style={{ fontSize: '7px', color: '#374151', marginBottom: '3px' }}>全体タイムライン</div>
      <svg width={W} height={10}>
        {segments.filter(s => s.dur > 0).map((s, i) => {
          const x = (s.x / totalSeconds) * W
          const w = Math.max(1, (s.dur / totalSeconds) * W)
          const color = s.isCE ? '#ef4444' : s.isTimer ? '#f59e0b' : s.isOptional ? '#374151' : '#34d399'
          return (
            <g key={i}>
              <rect x={x} y={0} width={w - 0.5} height={10} fill={color} opacity={0.7} rx={1} />
            </g>
          )
        })}
        {/* 15min marker */}
        {totalSeconds > 900 && (() => {
          const x = (900 / totalSeconds) * W
          return <line x1={x} y1={0} x2={x} y2={10} stroke="#e88b00" strokeWidth={0.8} strokeDasharray="2,2" opacity={0.5} />
        })()}
      </svg>
      <div className="flex justify-between" style={{ fontSize: '7px', color: '#252525', marginTop: '1px' }}>
        <span>0</span>
        <span style={{ color: '#374151' }}>{Math.floor(totalSeconds / 60)}:{String(totalSeconds % 60).padStart(2,'0')}</span>
      </div>
    </div>
  )
}

function SequenceRow({ step, index, isActive, bodyPartId }: { step: SequenceStep; index: number; isActive: boolean; bodyPartId: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const { setActiveSequence } = useProtocolStore()

  const matchedPreset = step.presetId ?? matchPreset(step.name)
  const clinical = getSeqClinical(step.name, bodyPartId)
  const reason = step.reason ?? clinical.reason
  const hasDetail = !!(reason || step.note || clinical.clinical)

  const rowBg =
    isActive ? '#2a1200' :
    step.isCE ? '#2d1515' :
    step.isTimer ? '#1c1500' :
    step.isDecision ? '#0c1425' :
    'transparent'

  const rowBorderLeft =
    step.isCE ? '#ef4444' :
    step.isTimer ? '#f59e0b' :
    step.isDecision ? '#3b82f6' :
    matchedPreset ? '#2a1200' :
    'transparent'

  const nameColor =
    isActive ? '#e88b00' :
    step.isCE ? '#fca5a5' :
    step.isTimer ? '#fde047' :
    step.isDecision ? '#60a5fa' :
    step.isOptional ? '#4b5563' :
    '#c9ccd4'

  const Icon = step.isCE ? Syringe
    : step.isTimer ? Timer
    : step.isDecision ? GitBranch
    : reason ? Info
    : null

  const handleClick = () => {
    if (hasDetail || matchedPreset) setExpanded(e => !e)
    setActiveSequence(step.name, matchedPreset)
    if (matchedPreset) {
      useProtocolStore.getState().setCurrentPage('console')
    }
  }

  return (
    <div>
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 cursor-pointer transition-all"
        style={{
          background: rowBg,
          borderLeft: `2px solid ${rowBorderLeft}`,
          minHeight: '20px',
        }}
        onClick={handleClick}
        onMouseEnter={e => { if (!isActive && !step.isCE && !step.isTimer) (e.currentTarget as HTMLElement).style.background = '#141414' }}
        onMouseLeave={e => { if (!isActive && !step.isCE && !step.isTimer) (e.currentTarget as HTMLElement).style.background = rowBg }}
      >
        <span className="shrink-0 w-3.5 text-right font-mono" style={{ fontSize: '8px', color: '#374151' }}>
          {index + 1}
        </span>

        {Icon && <Icon size={8} className="shrink-0" style={{ color: nameColor }} />}

        <span className="flex-1 truncate" style={{ fontSize: '9.5px', color: nameColor, fontFamily: "'Segoe UI', sans-serif" }}>
          {step.name}
        </span>

        {step.duration && (
          <span className="shrink-0 font-mono" style={{ fontSize: '8px', color: '#4ade80' }}>
            {step.duration}
          </span>
        )}

        {hasDetail && (
          expanded
            ? <ChevronDown size={8} style={{ color: '#e88b00', flexShrink: 0 }} />
            : <ChevronRight size={8} style={{ color: '#374151', flexShrink: 0 }} />
        )}
      </div>

      {expanded && (
        <div className="mx-1.5 mb-0.5 px-2 py-1.5 rounded space-y-1" style={{ background: '#111111', border: '1px solid #3a1a00' }}>
          {matchedPreset && (
            <div className="pb-1" style={{ borderBottom: '1px solid #252525' }}>
              <span style={{ fontSize: '8px', color: '#e88b00' }}>preset: </span>
              <span style={{ fontSize: '8px', color: '#e88b00' }}>{matchedPreset}</span>
            </div>
          )}
          {reason && (
            <div>
              <span style={{ color: '#e88b00', fontSize: '9px' }}>目的: </span>
              <span style={{ color: '#d1d5db', fontSize: '9px' }}>{reason}</span>
            </div>
          )}
          {step.note && (
            <div>
              <span style={{ color: '#6b7280', fontSize: '9px' }}>技術: </span>
              <span style={{ color: '#9ca3af', fontSize: '9px' }}>{step.note}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
