import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useProtocolStore } from '../store/protocolStore'
import { protocolTree } from '../data/protocols'
import { presets } from '../data/presets'
import { calcSNR, calcSARLevel, calcScanTime, identifySequence } from '../store/calculators'

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
  const [search, setSearch] = useState('')

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  const handleVariantClick = (bodyPartId: string, groupId: string, variantId: string, presetId?: string) => {
    setActiveProtocol(bodyPartId, groupId, variantId)
    if (presetId) {
      const preset = presets.find(p => p.id === presetId)
      if (preset) loadPreset(presetId)
    }
  }

  // Search results: flatten all presets matching the query
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return presets.filter(p =>
      p.label.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [search])

  return (
    <div className="h-full overflow-y-auto select-none flex flex-col" style={{ background: '#0a0a0a', fontSize: '11px' }}>
      {/* Header */}
      <div className="px-2 py-1 text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: '#e88b00', borderBottom: '1px solid #2a1200' }}>
        Protocol
      </div>

      {/* Search */}
      <div className="px-2 py-1 shrink-0" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="検索..."
          className="w-full px-1.5 py-0.5 text-xs rounded outline-none"
          style={{ background: '#111', border: '1px solid #252525', color: '#c8ccd6', fontSize: '10px' }}
        />
      </div>

      {/* Search results */}
      {search.trim() && (
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 && (
            <div className="px-2 py-2 text-xs" style={{ color: '#4b5563' }}>見つかりません</div>
          )}
          {searchResults.map(p => {
            const snr = calcSNR(p.params)
            const sar = calcSARLevel(p.params)
            const time = calcScanTime(p.params)
            const seqId = identifySequence(p.params)
            const fmtTime = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m${s%60 > 0 ? String(s%60).padStart(2,'0')+'s' : ''}`
            return (
              <div
                key={p.id}
                className="px-2 py-1.5 cursor-pointer"
                style={{ borderBottom: '1px solid #111' }}
                onClick={() => { loadPreset(p.id); setSearch('') }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1c1c1c')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-semibold" style={{ color: '#e88b00', fontSize: '10px' }}>{p.label}</span>
                  <span className="px-1 rounded" style={{ background: seqId.color + '18', color: seqId.color, fontSize: '8px', border: `1px solid ${seqId.color}40` }}>{seqId.type}</span>
                </div>
                <div className="flex gap-2" style={{ fontSize: '9px' }}>
                  <span style={{ color: snr > 60 ? '#34d399' : snr > 30 ? '#fbbf24' : '#f87171' }}>SNR {snr}</span>
                  <span style={{ color: sar < 40 ? '#34d399' : sar < 70 ? '#fbbf24' : '#f87171' }}>SAR {sar}%</span>
                  <span style={{ color: '#6b7280' }}>{fmtTime(time)}</span>
                  <span style={{ color: '#374151' }}>{p.params.fieldStrength}T</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Normal tree (hidden when searching) */}
      {!search.trim() && (
      <div className="flex-1 overflow-y-auto">

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
      )}
    </div>
  )
}
