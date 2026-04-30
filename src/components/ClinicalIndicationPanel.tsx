import { useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { presets } from '../data/presets'
import { ChevronRight } from 'lucide-react'
import { CLINICAL_DB, priorityStyle, urgencyStyle, type ClinicalIndication } from './clinicalindication/clinicalIndicationUtils'

// ────────────────────────────────────────────────────────────────────────────
// コンポーネント
// ────────────────────────────────────────────────────────────────────────────

export function ClinicalIndicationPanel() {
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null)
  const [selectedIndication, setSelectedIndication] = useState<ClinicalIndication | null>(null)
  const { loadPreset } = useProtocolStore()

  const bodyPart = CLINICAL_DB.find(b => b.id === selectedBodyPart)

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs" style={{ background: '#0a0a0a', color: '#c8ccd6' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ background: '#111', borderBottom: '1px solid #252525' }}>
        <div className="font-semibold" style={{ color: '#60a5fa' }}>Clinical Indication Selector</div>
        <div style={{ color: '#4b5563' }}>臨床課題からプロトコルを逆引き</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Body part selection */}
        {!selectedBodyPart && (
          <div className="p-3">
            <div className="text-xs mb-3" style={{ color: '#6b7280' }}>検査部位を選択</div>
            <div className="grid grid-cols-2 gap-2">
              {CLINICAL_DB.map(bp => (
                <button
                  key={bp.id}
                  onClick={() => { setSelectedBodyPart(bp.id); setSelectedIndication(null) }}
                  className="flex flex-col items-center justify-center p-3 rounded transition-colors"
                  style={{ background: '#151515', border: '1px solid #252525', gap: '4px' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#151515')}
                >
                  <span style={{ fontSize: '24px' }}>{bp.icon}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 600 }}>{bp.label}</span>
                  <span style={{ color: '#4b5563', fontSize: '9px' }}>{bp.indications.length}種</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Indication selection */}
        {selectedBodyPart && !selectedIndication && bodyPart && (
          <div className="p-3">
            <button
              onClick={() => setSelectedBodyPart(null)}
              className="flex items-center gap-1 mb-3 text-xs"
              style={{ color: '#6b7280' }}
            >
              ← {bodyPart.icon} {bodyPart.label}
            </button>
            <div className="text-xs mb-2" style={{ color: '#6b7280' }}>臨床的適応を選択</div>
            <div className="space-y-1.5">
              {bodyPart.indications.map(ind => {
                const urg = ind.urgency ? urgencyStyle[ind.urgency] : null
                return (
                  <button
                    key={ind.id}
                    onClick={() => setSelectedIndication(ind)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded transition-colors"
                    style={{ background: '#151515', border: '1px solid #252525', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#151515')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{ind.icon}</span>
                      <span style={{ color: '#e2e8f0', fontSize: '11px' }}>{ind.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {urg && (
                        <span className="px-1.5 py-0.5 rounded" style={{ background: urg.color + '20', color: urg.color, fontSize: '8px', border: `1px solid ${urg.color}40` }}>
                          {urg.label}
                        </span>
                      )}
                      <ChevronRight size={10} style={{ color: '#4b5563' }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Protocol recommendations */}
        {selectedIndication && (
          <div className="p-3">
            <button
              onClick={() => setSelectedIndication(null)}
              className="flex items-center gap-1 mb-3 text-xs"
              style={{ color: '#6b7280' }}
            >
              ← {selectedIndication.icon} {selectedIndication.label}
            </button>

            {/* Urgency + Clinical pearl */}
            {selectedIndication.urgency && (
              <div className="mb-2 px-2 py-1 rounded" style={{
                background: urgencyStyle[selectedIndication.urgency].color + '15',
                border: `1px solid ${urgencyStyle[selectedIndication.urgency].color}40`,
              }}>
                <span style={{ color: urgencyStyle[selectedIndication.urgency].color, fontWeight: 600 }}>
                  {urgencyStyle[selectedIndication.urgency].label}
                </span>
              </div>
            )}

            {selectedIndication.clinicalPearl && (
              <div className="mb-3 p-2 rounded" style={{ background: '#0f172a', border: '1px solid #1e3a5f' }}>
                <div className="font-semibold mb-0.5" style={{ color: '#60a5fa', fontSize: '9px' }}>💡 Clinical Pearl</div>
                <div style={{ color: '#93c5fd', fontSize: '10px', lineHeight: '1.5' }}>
                  {selectedIndication.clinicalPearl}
                </div>
              </div>
            )}

            {/* Contraindications */}
            {selectedIndication.contraindications && (
              <div className="mb-3 p-2 rounded" style={{ background: '#1a0505', border: '1px solid #7f1d1d' }}>
                <div className="font-semibold mb-0.5" style={{ color: '#fca5a5', fontSize: '9px' }}>⚠ 禁忌・注意</div>
                {selectedIndication.contraindications.map((c, i) => (
                  <div key={i} style={{ color: '#fca5a5', fontSize: '10px' }}>• {c}</div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            <div className="font-semibold mb-2" style={{ color: '#9ca3af' }}>推奨プロトコル順</div>
            <div className="space-y-2">
              {selectedIndication.recommendations.map((rec, i) => {
                const preset = presets.find(p => p.id === rec.presetId)
                const ps = priorityStyle[rec.priority]
                if (!preset) return null
                return (
                  <div key={rec.presetId} className="rounded overflow-hidden" style={{ border: `1px solid ${ps.border}` }}>
                    <div className="flex items-center justify-between px-2 py-1.5" style={{ background: ps.bg }}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs" style={{ color: '#4b5563' }}>{i + 1}</span>
                        <div>
                          <div className="font-semibold" style={{ color: '#e2e8f0', fontSize: '11px' }}>{preset.label}</div>
                          <div style={{ color: '#6b7280', fontSize: '9px' }}>{preset.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded" style={{ background: ps.border + '40', color: ps.text, fontSize: '8px' }}>
                          {ps.label}
                        </span>
                        <button
                          onClick={() => loadPreset(rec.presetId)}
                          className="px-2 py-0.5 rounded transition-colors text-xs font-semibold"
                          style={{ background: '#1a2a1a', color: '#4ade80', border: '1px solid #166534' }}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="px-2 py-1.5" style={{ background: '#0a0a0a', borderTop: `1px solid ${ps.border}60` }}>
                      <div style={{ color: '#9ca3af', fontSize: '10px', lineHeight: '1.5' }}>{rec.reason}</div>
                      {rec.clinicalNote && (
                        <div className="mt-0.5 font-mono" style={{ color: '#60a5fa', fontSize: '9px' }}>
                          → {rec.clinicalNote}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
