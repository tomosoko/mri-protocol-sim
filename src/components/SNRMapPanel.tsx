import { useEffect, useMemo, useRef, useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { calcSNR } from '../store/calculators'
import {
  crossSections,
  getCoilForSection,
  getCoilProfile,
  type BodyCrossSection,
} from '../data/coilProfiles'
import {
  CANVAS_SIZE,
  GRID,
  COIL_CHANNELS,
  buildSNRGrid,
  computeSNRStats,
  drawSNRMapSmooth,
  drawGFactorOverlay,
  isInsideEllipse,
  type ViewMode,
} from './snrmap/snrMapUtils'

export function SNRMapPanel() {
  const { params } = useProtocolStore()
  const [activeSectionId, setActiveSectionId] = useState<BodyCrossSection>('head_axial')
  const [showContours, setShowContours] = useState(true)
  const [showGFactor, setShowGFactor] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('snr')
  const [hoverSNR, setHoverSNR] = useState<number | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gOverlayRef = useRef<HTMLCanvasElement>(null)

  const section = crossSections.find(s => s.id === activeSectionId)!
  const coilFromParams = getCoilProfile(params.coil)
  const displayCoil =
    params.coil === 'Body' ? getCoilForSection(activeSectionId) : coilFromParams

  const globalSNR = calcSNR(params)

  // Cache the snrGrid for hover SNR lookup
  const snrGridRef = useRef<number[][] | null>(null)
  const maxSnrRef = useRef<number>(0)

  const snrGridData = useMemo(() => buildSNRGrid(
    section, displayCoil, globalSNR,
    params.ipatMode, params.ipatFactor, params.fieldStrength,
  ), [section, displayCoil, globalSNR, params.ipatMode, params.ipatFactor, params.fieldStrength])

  const snrStats = useMemo(() => computeSNRStats(snrGridData[0]), [snrGridData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const [grid, maxSnr] = snrGridData
    snrGridRef.current = grid
    maxSnrRef.current = maxSnr

    drawSNRMapSmooth(
      ctx, section, displayCoil, globalSNR,
      params.ipatMode, params.ipatFactor, params.fieldStrength,
      showContours, viewMode,
    )
  }, [snrGridData, section, displayCoil, globalSNR, params.ipatMode, params.ipatFactor, params.fieldStrength, showContours, viewMode])

  // Draw g-factor overlay on separate canvas
  useEffect(() => {
    const overlayCanvas = gOverlayRef.current
    if (!overlayCanvas) return
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    if (showGFactor && params.ipatMode !== 'Off' && viewMode === 'snr') {
      drawGFactorOverlay(ctx, section, params.ipatFactor)
    }
  }, [showGFactor, section, params.ipatFactor, params.ipatMode, viewMode])

  // Mouse hover handler
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || !snrGridRef.current) return
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const nx = px / CANVAS_SIZE
    const ny = py / CANVAS_SIZE

    const o = section.outline
    if (!isInsideEllipse(nx, ny, o.cx, o.cy, o.rx, o.ry)) {
      setHoverSNR(null)
      setHoverPos(null)
      return
    }

    const gx = Math.max(0, Math.min(GRID - 1, Math.floor(nx * GRID)))
    const gy = Math.max(0, Math.min(GRID - 1, Math.floor(ny * GRID)))
    const snrVal = snrGridRef.current[gy][gx]
    setHoverSNR(Math.round(snrVal))
    setHoverPos({ x: px, y: py })
  }

  function handleMouseLeave() {
    setHoverSNR(null)
    setHoverPos(null)
  }

  const ipatReduction =
    params.ipatMode !== 'Off'
      ? Math.round((1 - 1 / (Math.sqrt(params.ipatFactor) * 1.15)) * 100)
      : 0

  const effectiveChannels = COIL_CHANNELS[displayCoil.label] ?? displayCoil.channels

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#141414' }}>
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
        style={{ color: '#4b5563', borderBottom: '1px solid #252525' }}
      >
        <span style={{ color: '#e88b00', fontSize: '10px' }}>■</span>
        SNR マップ
      </div>

      {/* Section tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid #252525', background: '#0e0e0e' }}>
        {crossSections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSectionId(s.id)}
            className="flex-1 py-1.5 text-xs transition-colors"
            style={{
              background: activeSectionId === s.id ? '#1e1200' : 'transparent',
              color: activeSectionId === s.id ? '#e88b00' : '#5a5a5a',
              borderBottom: activeSectionId === s.id ? '2px solid #e88b00' : '2px solid transparent',
              fontSize: '10px',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* View mode + contour controls */}
      <div
        className="flex items-center justify-between px-2 py-1 shrink-0"
        style={{ borderBottom: '1px solid #1a1a1a', background: '#0e0e0e' }}
      >
        {/* View mode tabs */}
        <div className="flex gap-1">
          {([['snr', 'SNR'], ['coil', 'コイル感度']] as [ViewMode, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                fontSize: '9px',
                padding: '2px 7px',
                borderRadius: '3px',
                background: viewMode === id ? '#2a1800' : 'transparent',
                color: viewMode === id ? '#e88b00' : '#4b5563',
                border: `1px solid ${viewMode === id ? '#e88b00' : '#333'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contour toggle (only in SNR mode) */}
        {viewMode === 'snr' && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowContours(v => !v)}
              style={{
                fontSize: '9px',
                padding: '2px 7px',
                borderRadius: '3px',
                background: showContours ? '#001a2a' : 'transparent',
                color: showContours ? '#60b8ff' : '#4b5563',
                border: `1px solid ${showContours ? '#60b8ff' : '#333'}`,
              }}
            >
              等高線
            </button>
            <button
              onClick={() => setShowGFactor(v => !v)}
              title={params.ipatMode === 'Off' ? 'iPATがOffの場合は無効' : ''}
              style={{
                fontSize: '9px',
                padding: '2px 7px',
                borderRadius: '3px',
                background: showGFactor && params.ipatMode !== 'Off' ? '#1f0808' : 'transparent',
                color: showGFactor && params.ipatMode !== 'Off' ? '#f87171' : '#4b5563',
                border: `1px solid ${showGFactor && params.ipatMode !== 'Off' ? '#f87171' : '#333'}`,
                opacity: params.ipatMode === 'Off' ? 0.4 : 1,
              }}
            >
              g-factor
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        className="flex items-center justify-center shrink-0 py-2"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #252525', position: 'relative' }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', border: '1px solid #252525', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {/* g-factor overlay canvas, drawn on top */}
          <canvas
            ref={gOverlayRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              display: 'block',
            }}
          />
          {/* Crosshair + tooltip */}
          {hoverPos && hoverSNR !== null && (
            <>
              {/* Crosshair lines */}
              <div
                style={{
                  position: 'absolute',
                  left: hoverPos.x,
                  top: 0,
                  width: '1px',
                  height: CANVAS_SIZE,
                  background: 'rgba(255,255,255,0.25)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: hoverPos.y,
                  width: CANVAS_SIZE,
                  height: '1px',
                  background: 'rgba(255,255,255,0.25)',
                  pointerEvents: 'none',
                }}
              />
              {/* Tooltip */}
              <div
                style={{
                  position: 'absolute',
                  left: hoverPos.x + 8,
                  top: hoverPos.y - 22,
                  background: 'rgba(0,0,0,0.85)',
                  border: '1px solid #e88b00',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  color: '#e88b00',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                SNR: {hoverSNR}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Color scale legend */}
      <div className="px-3 py-1.5 shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <span className="text-xs" style={{ color: '#4b5563', fontSize: '9px' }}>
          {viewMode === 'snr' ? 'SNR低' : '感度低'}
        </span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: viewMode === 'snr'
              ? 'linear-gradient(to right, #1e40af, #16a34a, #ca8a04, #dc2626)'
              : 'linear-gradient(to right, #008080, #00c8ff, #dc2626)',
          }}
        />
        <span className="text-xs" style={{ color: '#4b5563', fontSize: '9px' }}>高</span>

        {/* Contour legend */}
        {showContours && viewMode === 'snr' && (
          <div className="flex items-center gap-1.5 ml-2">
            {[
              { color: 'rgba(100,180,255,0.9)', label: '25%' },
              { color: 'rgba(255,255,255,0.9)', label: '50%' },
              { color: 'rgba(255,160,60,0.9)', label: '75%' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-0.5">
                <div style={{ width: 12, height: 1.5, background: color }} />
                <span style={{ fontSize: '8px', color: '#5a5a5a' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Coil info */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1.5" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            コイル
          </div>
          <div className="text-xs font-mono" style={{ color: '#e88b00' }}>
            {displayCoil.label}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6b7280', fontSize: '9px' }}>
            {displayCoil.channels}ch — {displayCoil.description}
          </div>
          {/* Channel count indicator */}
          <div
            className="mt-1.5 rounded px-2 py-1"
            style={{ background: '#111', border: '1px solid #2a2a2a' }}
          >
            <span style={{ color: '#9ca3af', fontSize: '9px' }}>実効チャンネル数: </span>
            <span style={{ color: '#e88b00', fontSize: '9px', fontFamily: 'monospace' }}>{effectiveChannels}ch</span>
            <span style={{ color: '#9ca3af', fontSize: '9px' }}> → SNR理論値 </span>
            <span style={{ color: '#4ade80', fontSize: '9px', fontFamily: 'monospace' }}>√{effectiveChannels}≈{Math.round(Math.sqrt(effectiveChannels) * 10) / 10}倍</span>
          </div>
        </div>

        {/* SNR score */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SNRスコア
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-xl font-bold font-mono"
              style={{
                color: globalSNR >= 100 ? '#4ade80' : globalSNR >= 50 ? '#e88b00' : '#f87171',
              }}
            >
              {globalSNR}
            </span>
            <span className="text-xs" style={{ color: '#4b5563' }}>/200</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded overflow-hidden" style={{ background: '#252525' }}>
            <div
              className="h-full rounded transition-all duration-300"
              style={{
                width: `${Math.min(100, (globalSNR / 200) * 100)}%`,
                background: globalSNR >= 100 ? '#16a34a' : globalSNR >= 50 ? '#e88b00' : '#dc2626',
              }}
            />
          </div>
        </div>

        {/* 3T Dielectric effect note */}
        {params.fieldStrength === 3.0 && activeSectionId === 'abdomen_axial' && (
          <div
            className="rounded p-2.5"
            style={{ background: '#001620', border: '1px solid #0e4c6a' }}
          >
            <div className="text-xs" style={{ color: '#60b8ff', fontSize: '10px' }}>
              3T Dielectric Effect
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#2a6a8a', fontSize: '9px' }}>
              腹部中央のSNR強調表示中（誘電体効果）
            </div>
          </div>
        )}

        {/* iPAT note */}
        {params.ipatMode !== 'Off' && (
          <div
            className="rounded p-2.5"
            style={{ background: '#1f1200', border: '1px solid #7c2d12' }}
          >
            <div className="text-xs" style={{ color: '#fb923c', fontSize: '10px' }}>
              iPAT {params.ipatMode} AF={params.ipatFactor}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9a3412', fontSize: '9px' }}>
              SNR約{ipatReduction}%低下（g-factor含む）
            </div>
          </div>
        )}

        {/* Average SNR over body region */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            平均SNR（断面内推定）
          </div>
          <div className="text-xs font-mono" style={{ color: '#9ca3af' }}>
            {Math.round(globalSNR * 0.72)} <span style={{ color: '#4b5563', fontSize: '9px' }}>（コイル感度平均×補正）</span>
          </div>
        </div>

        {/* SNR統計 */}
        {snrStats !== null && (
          <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="text-xs mb-1.5" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SNR統計
            </div>
            <div className="font-mono mb-1.5" style={{ color: '#9ca3af', fontSize: '9px' }}>
              {'最小: '}
              <span style={{ color: '#f87171' }}>{Math.round(snrStats.min)}%</span>
              {' | 平均: '}
              <span style={{ color: '#e88b00' }}>{Math.round(snrStats.mean)}%</span>
              {' | 最大: '}
              <span style={{ color: '#4ade80' }}>{Math.round(snrStats.max)}%</span>
            </div>
            {(() => {
              const uniformity = Math.round((snrStats.min / snrStats.max) * 100)
              const uColor = uniformity >= 70 ? '#4ade80' : uniformity >= 50 ? '#e88b00' : '#f87171'
              return (
                <div className="flex items-center gap-1.5">
                  <span style={{ color: '#4b5563', fontSize: '9px' }}>均一性:</span>
                  <span style={{ color: uColor, fontSize: '9px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {uniformity}%
                  </span>
                  <div className="flex-1 h-1 rounded overflow-hidden" style={{ background: '#252525' }}>
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{ width: `${uniformity}%`, background: uColor }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Params summary */}
        <div className="rounded p-2.5 space-y-1" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            現在のパラメータ
          </div>
          {[
            { label: 'Field', value: `${params.fieldStrength}T` },
            { label: 'FOV', value: `${params.fov} mm` },
            { label: 'Matrix', value: `${params.matrixFreq}×${params.matrixPhase}` },
            { label: 'Thickness', value: `${params.sliceThickness} mm` },
            { label: 'BW', value: `${params.bandwidth} Hz/px` },
            { label: 'Averages', value: `${params.averages}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: '#4b5563', fontSize: '9px' }}>{label}</span>
              <span className="font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
