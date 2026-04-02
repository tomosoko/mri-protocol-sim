import { useState } from 'react'
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
  const { activeBodyPartId, activeGroupId, activeVariantId, activeColumnIndex, activeSequenceName, setActiveProtocol } = useProtocolStore()

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
        <div className="text-xs font-semibold truncate leading-tight" style={{ color: '#60a5fa' }}>
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
                  background: activeColumnIndex === i ? '#1e3a5f' : '#252525',
                  color: activeColumnIndex === i ? '#93c5fd' : '#6b7280',
                  border: `1px solid ${activeColumnIndex === i ? '#2563eb' : '#374151'}`,
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
    </div>
  )
}

function SequenceRow({ step, index, isActive, bodyPartId }: { step: SequenceStep; index: number; isActive: boolean; bodyPartId: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const { setActiveSequence } = useProtocolStore()

  const matchedPreset = step.presetId ?? matchPreset(step.name, bodyPartId)
  const clinical = getSeqClinical(step.name, bodyPartId)
  const reason = step.reason ?? clinical.reason
  const hasDetail = !!(reason || step.note || clinical.clinical)

  const rowBg =
    isActive ? '#1e3a5f' :
    step.isCE ? '#2d1515' :
    step.isTimer ? '#1c1500' :
    step.isDecision ? '#0c1425' :
    'transparent'

  const rowBorderLeft =
    step.isCE ? '#ef4444' :
    step.isTimer ? '#f59e0b' :
    step.isDecision ? '#3b82f6' :
    matchedPreset ? '#1e3a5f' :
    'transparent'

  const nameColor =
    isActive ? '#93c5fd' :
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
            ? <ChevronDown size={8} style={{ color: '#3b82f6', flexShrink: 0 }} />
            : <ChevronRight size={8} style={{ color: '#374151', flexShrink: 0 }} />
        )}
      </div>

      {expanded && (
        <div className="mx-1.5 mb-0.5 px-2 py-1.5 rounded space-y-1" style={{ background: '#111111', border: '1px solid #1e3a5f' }}>
          {matchedPreset && (
            <div className="pb-1" style={{ borderBottom: '1px solid #252525' }}>
              <span style={{ fontSize: '8px', color: '#3b82f6' }}>preset: </span>
              <span style={{ fontSize: '8px', color: '#60a5fa' }}>{matchedPreset}</span>
            </div>
          )}
          {reason && (
            <div>
              <span style={{ color: '#60a5fa', fontSize: '9px' }}>目的: </span>
              <span style={{ color: '#d1d5db', fontSize: '9px' }}>{reason}</span>
            </div>
          )}
          {clinical.clinical && (
            <div>
              <span style={{ color: '#a78bfa', fontSize: '9px' }}>臨床: </span>
              <span style={{ color: '#c4b5fd', fontSize: '9px' }}>{clinical.clinical}</span>
            </div>
          )}
          {clinical.findings && (
            <div>
              <span style={{ color: '#34d399', fontSize: '9px' }}>所見: </span>
              <span style={{ color: '#6ee7b7', fontSize: '9px' }}>{clinical.findings}</span>
            </div>
          )}
          {clinical.params && (
            <div>
              <span style={{ color: '#fbbf24', fontSize: '9px' }}>設定: </span>
              <span style={{ color: '#fde68a', fontSize: '9px' }}>{clinical.params}</span>
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
