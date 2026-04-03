import { useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { clinicalFindings } from '../data/clinicalFindings'
import { ChevronRight, ChevronDown } from 'lucide-react'

const REGIONS = ['すべて', '頭部', '腹部', '脊椎', '骨盤', '関節', '乳腺', '心臓']

export function ScenarioPanel() {
  const { activeBodyPartId } = useProtocolStore()
  const [selectedRegion, setSelectedRegion] = useState('すべて')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const bodyPartRegion: Record<string, string> = {
    head: '頭部', abdomen: '腹部', spine: '脊椎', pelvis: '骨盤',
    joint: '関節', breast: '乳腺', cardiac: '心臓',
  }
  const autoRegion = activeBodyPartId ? bodyPartRegion[activeBodyPartId] : null

  const region = selectedRegion === 'すべて' ? null : selectedRegion
  const filtered = clinicalFindings.filter(f => !region || f.region === region)

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0f0f0f' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0 flex items-center gap-2"
        style={{ borderBottom: '1px solid #1e1e1e', background: '#0a0a0a' }}>
        <span className="text-xs font-semibold" style={{ color: '#e88b00' }}>臨床所見ガイド</span>
        {autoRegion && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#2a1200', color: '#e88b00', fontSize: '9px', border: '1px solid #3a1a00' }}>
            {autoRegion}
          </span>
        )}
        <span className="text-xs ml-auto" style={{ color: '#3a3a3a', fontSize: '9px' }}>
          {filtered.length}疾患
        </span>
      </div>

      {/* Region filter */}
      <div className="flex gap-0.5 px-2 py-1.5 shrink-0 flex-wrap" style={{ borderBottom: '1px solid #1e1e1e' }}>
        {REGIONS.map(r => (
          <button
            key={r}
            onClick={() => setSelectedRegion(r)}
            className="px-1.5 py-0.5 rounded text-xs transition-colors"
            style={{
              background: selectedRegion === r ? '#2a1200' : '#1a1a1a',
              color: selectedRegion === r ? '#e88b00' : '#5a5a5a',
              border: `1px solid ${selectedRegion === r ? '#c47400' : '#2a2a2a'}`,
              fontSize: '9px',
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Finding list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(finding => {
          const isExpanded = expandedId === finding.id
          return (
            <div key={finding.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.02]"
                onClick={() => setExpandedId(isExpanded ? null : finding.id)}
              >
                {isExpanded
                  ? <ChevronDown size={9} style={{ color: '#e88b00', flexShrink: 0 }} />
                  : <ChevronRight size={9} style={{ color: '#3a3a3a', flexShrink: 0 }} />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate" style={{ color: isExpanded ? '#e88b00' : '#c8c8c8', fontSize: '11px' }}>
                      {finding.disease}
                    </span>
                    <span className="shrink-0 text-xs px-1 rounded" style={{ background: '#1a1a1a', color: '#5a5a5a', fontSize: '8px', border: '1px solid #252525' }}>
                      {finding.region}
                    </span>
                  </div>
                  <div className="text-xs truncate mt-0.5" style={{ color: '#4a4a4a', fontSize: '9px' }}>
                    {finding.keySequence.split('（')[0].split('、')[0]}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Key Sequence */}
                  <div className="p-2 rounded" style={{ background: '#1a0e00', border: '1px solid #3a1a00' }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#e88b00', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Key Sequence</div>
                    <div className="text-xs leading-relaxed" style={{ color: '#c8a060', fontSize: '10px' }}>{finding.keySequence}</div>
                  </div>

                  {/* Typical Findings */}
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: '#5a5a5a', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>典型所見</div>
                    <div className="space-y-0.5">
                      {finding.typicalFindings.map((f, i) => (
                        <div key={i} className="flex gap-1.5 text-xs" style={{ color: '#8a8a8a', fontSize: '10px', lineHeight: 1.5 }}>
                          <span style={{ color: '#3a3a3a', flexShrink: 0, marginTop: '2px' }}>·</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Differential */}
                  {finding.differentialPoints.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#5a5a5a', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>鑑別ポイント</div>
                      <div className="space-y-0.5">
                        {finding.differentialPoints.map((d, i) => (
                          <div key={i} className="flex gap-1.5 text-xs" style={{ color: '#8a8a8a', fontSize: '10px', lineHeight: 1.5 }}>
                            <span style={{ color: '#4ade80', flexShrink: 0, marginTop: '2px', fontSize: '8px' }}>▸</span>
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pitfalls */}
                  {finding.pitfalls.length > 0 && (
                    <div className="p-2 rounded" style={{ background: '#1a1000', border: '1px solid #2a1a00' }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#f87171', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pitfall</div>
                      <div className="space-y-0.5">
                        {finding.pitfalls.map((p, i) => (
                          <div key={i} className="text-xs" style={{ color: '#c87070', fontSize: '10px', lineHeight: 1.5 }}>⚠ {p}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Imaging */}
                  {finding.additionalImaging.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#5a5a5a', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>追加撮像</div>
                      <div className="flex flex-wrap gap-1">
                        {finding.additionalImaging.map((a, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1a1a1a', color: '#6b6b6b', border: '1px solid #252525', fontSize: '9px' }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
