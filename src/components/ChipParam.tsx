// Small helper components used by ConsoleParamStrip

export function ChipParam({ label, value, unit, ok, warnMsg, onFix }: {
  label: string; value: string; unit: string; ok: boolean; warnMsg?: string; onFix?: () => void
}) {
  return (
    <div className="flex items-center gap-1 px-2 shrink-0" style={{ borderRight: '1px solid #111d27' }}>
      <span style={{ color: '#4a7a9a', fontSize: '9px', letterSpacing: '0.06em' }}>{label}</span>
      <span
        className="font-mono font-semibold"
        style={{ color: ok ? '#dde4ec' : '#fca5a5', fontSize: '11px' }}
        title={warnMsg}
      >
        {value}
      </span>
      {unit && <span style={{ color: '#4a7a9a', fontSize: '9px' }}>{unit}</span>}
      {!ok && warnMsg && (
        <>
          <span style={{ color: '#f87171', fontSize: '8px' }}>⚠{warnMsg}</span>
          {onFix && (
            <button onClick={onFix}
              style={{ color: '#34d399', fontSize: '8px', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, padding: '0 2px', cursor: 'pointer' }}>
              fix
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function ChipDiv() {
  return null  // separator handled via borderRight on each chip
}
