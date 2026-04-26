import { useEffect, useRef } from 'react'

// syngo MR コンソール下部のリアルタイム生体信号表示（ECG + 呼吸）
// canvas + requestAnimationFrame で連続スクロール波形を描画
export function LivePhysioMonitor() {
  const ecgRef = useRef<HTMLCanvasElement>(null)
  const respRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const hrRef = useRef(68 + Math.random() * 10 | 0)  // 68-77 bpm

  // ECG amplitude function — realistic P-QRS-T complex
  function ecgAmp(t: number, hr: number): number {
    const RR = 60000 / hr
    const ph = (t % RR) / RR  // 0-1 normalized phase within beat
    // P wave (atrial depolarization)
    if (ph >= 0.05 && ph < 0.18) return 0.13 * Math.sin((ph - 0.05) / 0.13 * Math.PI)
    // Q dip
    if (ph >= 0.19 && ph < 0.215) return -0.09 * Math.sin((ph - 0.19) / 0.025 * Math.PI)
    // R peak (ventricular depolarization)
    if (ph >= 0.215 && ph < 0.235) return Math.sin((ph - 0.215) / 0.020 * Math.PI) * 0.92
    // S notch
    if (ph >= 0.235 && ph < 0.265) return -0.18 * Math.sin((ph - 0.235) / 0.030 * Math.PI)
    // ST segment (isoelectric)
    if (ph >= 0.265 && ph < 0.36) return 0.015
    // T wave (ventricular repolarization)
    if (ph >= 0.36 && ph < 0.60) return 0.22 * Math.sin((ph - 0.36) / 0.24 * Math.PI)
    return 0
  }

  // Respiratory amplitude — slow sine with slight irregularity
  function respAmp(t: number): number {
    const period = 4200  // ~14 breaths/min
    return (
      0.55 * Math.sin(t / period * 2 * Math.PI) +
      0.08 * Math.sin(t / period * 6 * Math.PI + 0.7)
    )
  }

  useEffect(() => {
    const ecgCanvas = ecgRef.current
    const respCanvas = respRef.current
    if (!ecgCanvas || !respCanvas) return
    const ec = ecgCanvas.getContext('2d')!
    const rc = respCanvas.getContext('2d')!

    const W = ecgCanvas.width
    const EH = ecgCanvas.height
    const RH = respCanvas.height

    // Circular buffers
    const N = 400
    const ecgBuf = new Float32Array(N)
    const respBuf = new Float32Array(N)
    let head = 0
    let lastRaf = 0
    const DT = 16  // ms per frame target

    function draw(now: number) {
      const dt = Math.min(now - lastRaf, 64)  // clamp to avoid huge jumps
      lastRaf = now
      const nNew = Math.max(1, Math.round(dt / DT))
      const hr = hrRef.current

      for (let i = 0; i < nNew; i++) {
        timeRef.current += DT
        ecgBuf[head] = ecgAmp(timeRef.current, hr)
        respBuf[head] = respAmp(timeRef.current)
        head = (head + 1) % N
      }

      // Draw ECG
      ec.fillStyle = '#080808'
      ec.fillRect(0, 0, W, EH)
      // Grid lines
      ec.strokeStyle = '#0d1a0d'
      ec.lineWidth = 0.5
      for (let x = 0; x < W; x += 40) { ec.beginPath(); ec.moveTo(x, 0); ec.lineTo(x, EH); ec.stroke() }
      for (let y = 0; y < EH; y += 10) { ec.beginPath(); ec.moveTo(0, y); ec.lineTo(W, y); ec.stroke() }
      // ECG trace
      ec.strokeStyle = '#34d399'
      ec.lineWidth = 1.5
      ec.shadowColor = '#34d39960'
      ec.shadowBlur = 3
      ec.beginPath()
      for (let i = 0; i < N; i++) {
        const idx = (head + i) % N
        const x = (i / N) * W
        const y = EH * 0.52 - ecgBuf[idx] * EH * 0.42
        if (i === 0) ec.moveTo(x, y); else ec.lineTo(x, y)
      }
      ec.stroke()
      ec.shadowBlur = 0

      // Draw Resp
      rc.fillStyle = '#080810'
      rc.fillRect(0, 0, W, RH)
      rc.strokeStyle = '#060c10'
      rc.lineWidth = 0.5
      for (let x = 0; x < W; x += 40) { rc.beginPath(); rc.moveTo(x, 0); rc.lineTo(x, RH); rc.stroke() }
      rc.strokeStyle = '#3b82f6'
      rc.lineWidth = 1.2
      rc.shadowColor = '#3b82f660'
      rc.shadowBlur = 2
      rc.beginPath()
      for (let i = 0; i < N; i++) {
        const idx = (head + i) % N
        const x = (i / N) * W
        const y = RH * 0.5 - respBuf[idx] * RH * 0.38
        if (i === 0) rc.moveTo(x, y); else rc.lineTo(x, y)
      }
      rc.stroke()
      rc.shadowBlur = 0

      raf = requestAnimationFrame(draw)
    }

    let raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hr = hrRef.current
  const rr = Math.round(60000 / hr)

  return (
    <div className="mx-3 mt-3 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #14281a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1" style={{ background: '#050e08', borderBottom: '1px solid #0d1a10' }}>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />
          <span style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.08em' }}>LIVE PHYSIO</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold" style={{ color: '#34d399', fontSize: '9px' }}>{hr} bpm</span>
          <span className="font-mono" style={{ color: '#9ca3af', fontSize: '8px' }}>RR {rr}ms</span>
          <span className="font-mono" style={{ color: '#3b82f6', fontSize: '8px' }}>RESP 15/min</span>
          <span className="font-mono" style={{ color: '#a78bfa', fontSize: '8px' }}>SpO₂ 98%</span>
        </div>
      </div>

      {/* ECG channel label */}
      <div className="flex items-center gap-1 px-2 pt-0.5" style={{ background: '#080808' }}>
        <span style={{ fontSize: '7px', color: '#1f4a2f', fontFamily: 'monospace' }}>ECG II</span>
        <span style={{ fontSize: '7px', color: '#0a2010' }}>──── 25mm/s · 10mm/mV</span>
      </div>
      <canvas ref={ecgRef} width={280} height={54} style={{ display: 'block', width: '100%' }} />

      {/* Resp channel label */}
      <div className="flex items-center gap-1 px-2 pt-0.5" style={{ background: '#080810', borderTop: '1px solid #0f0f1a' }}>
        <span style={{ fontSize: '7px', color: '#1a2a4a', fontFamily: 'monospace' }}>RESP</span>
        <span style={{ fontSize: '7px', color: '#0a0a20' }}>──── Bellows</span>
      </div>
      <canvas ref={respRef} width={280} height={30} style={{ display: 'block', width: '100%' }} />

      {/* Footer status */}
      <div className="flex items-center justify-between px-2 py-0.5" style={{ background: '#05080d', borderTop: '1px solid #0f1520' }}>
        <div className="flex items-center gap-2">
          <span className="font-mono" style={{ fontSize: '7px', color: '#1a3a20' }}>◼ ECG OK</span>
          <span className="font-mono" style={{ fontSize: '7px', color: '#1a2040' }}>◼ RESP OK</span>
        </div>
        <span className="font-mono" style={{ fontSize: '7px', color: '#252525' }}>Physiological Monitoring Active</span>
      </div>
    </div>
  )
}
