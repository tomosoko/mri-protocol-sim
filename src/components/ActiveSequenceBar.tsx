import { useProtocolStore } from '../store/protocolStore'

export function ActiveSequenceBar() {
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
