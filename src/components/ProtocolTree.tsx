import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useProtocolStore } from '../store/protocolStore'
import { protocolTree } from '../data/protocols'
import { presets } from '../data/presets'

// 全ボディパーツを最初から展開
const initExpanded = (): Record<string, boolean> => {
  const ex: Record<string, boolean> = { USER: true }
  for (const bp of protocolTree) {
    ex[bp.id] = true
    for (const g of bp.groups) {
      ex[`${bp.id}/${g.id}`] = false // グループはデフォルト折り畳み
    }
  }
  return ex
}

export function ProtocolTree() {
  const { activeVariantId, setActiveProtocol, loadPreset } = useProtocolStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initExpanded)

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const handleVariantClick = (bodyPartId: string, groupId: string, variantId: string, presetId?: string) => {
    setActiveProtocol(bodyPartId, groupId, variantId)
    if (presetId) {
      const preset = presets.find(p => p.id === presetId)
      if (preset) loadPreset(presetId)
    }
  }

  return (
    <div className="h-full overflow-y-auto select-none" style={{ background: '#0a0a0a', fontSize: '11px' }}>
      {/* Header */}
      <div className="px-2 py-1 text-xs font-bold uppercase tracking-widest" style={{ color: '#e88b00', borderBottom: '1px solid #2a1200' }}>
        Protocol
      </div>

      {/* SYSTEM / INSTITUTION (decorative) */}
      <div className="px-2 py-0.5 flex items-center gap-1" style={{ color: '#1e2d3d' }}>
        <ChevronRight size={9} />
        <span>SYSTEM</span>
      </div>
      <div className="py-0.5 flex items-center gap-1" style={{ color: '#1e2d3d', paddingLeft: '20px' }}>
        <ChevronRight size={9} />
        <span>INSTITUTION</span>
      </div>

      {/* USER */}
      <div
        className="flex items-center gap-1 py-0.5 px-2 cursor-pointer"
        style={{ color: '#e88b00', fontWeight: 600 }}
        onClick={() => toggle('USER')}
      >
        {expanded['USER'] ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
        <span>USER</span>
      </div>

      {expanded['USER'] && protocolTree.map(bodyPart => {
        const bpKey = bodyPart.id
        const bpExpanded = !!expanded[bpKey]
        return (
          <div key={bodyPart.id}>
            {/* Body part level */}
            <div
              className="flex items-center gap-1 py-0.5 cursor-pointer transition-colors"
              style={{ paddingLeft: '14px', color: bpExpanded ? '#c47400' : '#4a4a4a' }}
              onClick={() => toggle(bpKey)}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e88b00')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = bpExpanded ? '#c47400' : '#4a4a4a')}
            >
              {bpExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
              <span className="font-semibold truncate">{bodyPart.label}</span>
            </div>

            {bpExpanded && bodyPart.groups.map(group => {
              const grpKey = `${bodyPart.id}/${group.id}`
              const grpExpanded = !!expanded[grpKey]
              return (
                <div key={group.id}>
                  {/* Group level */}
                  <div
                    className="flex items-center gap-1 py-0.5 cursor-pointer transition-colors"
                    style={{ paddingLeft: '22px', color: grpExpanded ? '#e88b00' : '#5a5a5a' }}
                    onClick={() => toggle(grpKey)}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1c1c1c')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    {grpExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                    <span className="truncate">{group.label}</span>
                  </div>

                  {/* Variants */}
                  {grpExpanded && group.variants.map(variant => {
                    const active = activeVariantId === variant.id
                    return (
                      <div
                        key={variant.id}
                        className="flex items-center gap-1 py-0.5 cursor-pointer transition-all"
                        style={{
                          paddingLeft: '30px',
                          paddingRight: '4px',
                          background: active ? '#2a1200' : 'transparent',
                          color: active ? '#e88b00' : '#5a5a5a',
                          borderLeft: active ? '2px solid #e88b00' : '2px solid transparent',
                        }}
                        onClick={() => handleVariantClick(bodyPart.id, group.id, variant.id, variant.presetId)}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#1c1c1c' }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        title={variant.label}
                      >
                        <span className="truncate" style={{ fontSize: '10px' }}>{variant.label}</span>
                        {variant.columns.length > 1 && (
                          <span className="shrink-0 ml-auto" style={{ fontSize: '8px', color: active ? '#e88b00' : '#333' }}>
                            {variant.columns.length}col
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
