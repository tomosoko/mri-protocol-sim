import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react'
import { useProtocolStore } from '../store/protocolStore'
import { presets, categories } from '../data/presets'

export function ProtocolTree() {
  const { activePresetId, loadPreset } = useProtocolStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ USER: true, ...Object.fromEntries(categories.map(c => [c, true])) })

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  return (
    <div className="h-full overflow-y-auto select-none" style={{ background: '#1a1f2e' }}>
      <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>
        Protocol Tree
      </div>
      {/* USER root */}
      <TreeNode
        label="USER"
        expanded={expanded['USER']}
        onToggle={() => toggle('USER')}
        depth={0}
        isFolder
      >
        {categories.map(cat => (
          <TreeNode
            key={cat}
            label={cat}
            expanded={expanded[cat]}
            onToggle={() => toggle(cat)}
            depth={1}
            isFolder
          >
            {presets.filter(p => p.category === cat).map(p => (
              <div
                key={p.id}
                onClick={() => loadPreset(p.id)}
                className="flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer transition-colors text-xs"
                style={{
                  paddingLeft: `${3 * 12 + 8}px`,
                  background: activePresetId === p.id ? '#1e3a5f' : 'transparent',
                  color: activePresetId === p.id ? '#93c5fd' : '#9ca3af',
                }}
                onMouseEnter={e => { if (activePresetId !== p.id) (e.currentTarget as HTMLElement).style.background = '#1f2937' }}
                onMouseLeave={e => { if (activePresetId !== p.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                title={p.description}
              >
                <FileText size={11} style={{ flexShrink: 0 }} />
                <span className="truncate">{p.label}</span>
              </div>
            ))}
          </TreeNode>
        ))}
      </TreeNode>
    </div>
  )
}

function TreeNode({ label, expanded, onToggle, depth, isFolder, children }: {
  label: string
  expanded: boolean
  onToggle: () => void
  depth: number
  isFolder?: boolean
  children?: React.ReactNode
}) {
  const Icon = isFolder ? (expanded ? FolderOpen : Folder) : FileText
  const ChevIcon = expanded ? ChevronDown : ChevronRight

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 rounded cursor-pointer transition-colors text-xs"
        style={{ paddingLeft: `${depth * 12 + 8}px`, color: '#d1d5db' }}
        onClick={onToggle}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1f2937')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        <ChevIcon size={11} style={{ flexShrink: 0, color: '#6b7280' }} />
        <Icon size={12} style={{ flexShrink: 0, color: '#3b82f6' }} />
        <span className="font-medium">{label}</span>
      </div>
      {expanded && children}
    </div>
  )
}
