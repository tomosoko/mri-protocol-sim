import { useProtocolStore } from '../store/protocolStore'

export function VizSection({ children, always }: { children: React.ReactNode; always?: boolean }) {
  const viewMode = useProtocolStore(s => s.viewMode)
  if (!always && viewMode === 'console') return null
  return <>{children}</>
}
