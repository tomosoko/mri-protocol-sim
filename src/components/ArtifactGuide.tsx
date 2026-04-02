import { useState } from 'react'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { artifacts } from '../data/artifactGuide'
import { useProtocolStore } from '../store/protocolStore'

export function ArtifactGuide() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const { setHighlightedParams, setActiveTab } = useProtocolStore()

  const handleSelect = (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      setHighlightedParams([])
      return
    }
    setExpanded(id)
    const artifact = artifacts.find(a => a.id === id)
    if (artifact) setHighlightedParams(artifact.params)
  }

  const goToParam = (param: string) => {
    const tabMap: Record<string, string> = {
      phaseEncDir: 'Geometry', phaseOversampling: 'Geometry', satBands: 'Geometry', FOV: 'Resolution',
      bandwidth: 'Resolution', matrixFreq: 'Resolution', matrixPhase: 'Resolution', partialFourier: 'Sequence',
      ipatMode: 'System', ipatFactor: 'System', turboFactor: 'Sequence',
      fatSat: 'Contrast', flipAngle: 'Contrast', respTrigger: 'Physio', averages: 'Routine',
    }
    const tab = tabMap[param]
    if (tab) setActiveTab(tab)
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#1a1f2e' }}>
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
        style={{ color: '#4b5563', borderBottom: '1px solid #1f2937' }}>
        <Zap size={11} />
        アーチファクト対策ガイド
      </div>
      <div className="p-2 space-y-1">
        {artifacts.map(artifact => (
          <div key={artifact.id} className="rounded overflow-hidden" style={{ border: '1px solid #1f2937' }}>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
              style={{
                background: expanded === artifact.id ? '#1e2d4a' : '#1f2937',
                color: expanded === artifact.id ? '#93c5fd' : '#9ca3af',
              }}
              onClick={() => handleSelect(artifact.id)}
            >
              {expanded === artifact.id ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span className="font-medium">{artifact.name}</span>
            </button>

            {expanded === artifact.id && (
              <div className="px-3 py-2 text-xs space-y-3" style={{ background: '#111827' }}>
                <div>
                  <div className="font-semibold mb-1" style={{ color: '#f87171' }}>原因</div>
                  <p style={{ color: '#9ca3af' }}>{artifact.cause}</p>
                </div>
                <div>
                  <div className="font-semibold mb-1" style={{ color: '#34d399' }}>対策</div>
                  <div className="space-y-1.5">
                    {artifact.solutions.map((sol, i) => (
                      <div key={i} className="p-2 rounded" style={{ background: '#1f2937' }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <button
                            onClick={() => goToParam(sol.param)}
                            className="px-1.5 py-0.5 rounded text-xs font-mono transition-colors hover:bg-blue-900"
                            style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb' }}
                          >
                            {sol.param}
                          </button>
                          <span className="font-semibold" style={{ color: '#fbbf24' }}>{sol.action}</span>
                        </div>
                        <p style={{ color: '#6b7280' }}>{sol.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2 rounded text-xs" style={{ background: '#1a1a2e', border: '1px solid #7c3aed' }}>
                  <span className="font-semibold" style={{ color: '#a78bfa' }}>例: </span>
                  <span style={{ color: '#d1d5db' }}>{artifact.example}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
