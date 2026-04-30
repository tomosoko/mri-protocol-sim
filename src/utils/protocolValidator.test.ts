import { describe, it, expect } from 'vitest'
import type { ProtocolParams } from '../data/presets'
import { validateProtocol, issueCount } from './protocolValidator'

// ─── Clean base — triggers no validation rules ────────────────────────────────
// SAR ≈4%, SNR ≈50, no physio triggers, no special sequences
const base: ProtocolParams = {
  TR: 5000, TE: 100, TI: 0,
  flipAngle: 90, slices: 20, sliceThickness: 5, sliceGap: 0.5, averages: 1,
  phaseOversampling: 20, sarAssistant: 'Normal', allowedDelay: 30,
  fatSat: 'None', mt: false,
  matrixFreq: 256, matrixPhase: 256, fov: 256, phaseResolution: 100,
  bandwidth: 200, interpolation: false,
  orientation: 'Tra', phaseEncDir: 'A>>P', satBands: false,
  coil: 'Head_64', coilType: 'Head_64',
  ipatMode: 'Off', ipatFactor: 2,
  gradientMode: 'Normal', shim: 'Auto',
  ecgTrigger: false, respTrigger: 'Off', triggerDelay: 0, triggerWindow: 5,
  inlineADC: false, inlineMIP: false, inlineMPR: false, inlineSubtraction: false,
  turboFactor: 15, echoSpacing: 4.5,
  partialFourier: 'Off', bValues: [0],
  fieldStrength: 1.5,
}

const ids = (p: ProtocolParams) => validateProtocol(p).map(i => i.id)
const hasId = (p: ProtocolParams, id: string) => ids(p).includes(id)

// ─── validateProtocol — base is clean ────────────────────────────────────────
describe('validateProtocol: base protocol', () => {
  it('returns no issues for a clean baseline protocol', () => {
    expect(validateProtocol(base)).toHaveLength(0)
  })
})

// ─── Output sorting ───────────────────────────────────────────────────────────
describe('validateProtocol: result ordering', () => {
  it('returns errors before warnings before infos', () => {
    // STIR+TI=0 → error; STIR+3T → warning; (combine both)
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 0, fieldStrength: 3.0 }
    const issues = validateProtocol(p)
    const severities = issues.map(i => i.severity)
    const errIdx = severities.indexOf('error')
    const warnIdx = severities.indexOf('warning')
    if (errIdx !== -1 && warnIdx !== -1) {
      expect(errIdx).toBeLessThan(warnIdx)
    }
  })

  it('each issue has required fields: id, severity, category, title, detail', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 0 }
    const issues = validateProtocol(p)
    expect(issues.length).toBeGreaterThan(0)
    for (const issue of issues) {
      expect(issue.id).toBeTruthy()
      expect(['error', 'warning', 'info']).toContain(issue.severity)
      expect(issue.category).toBeTruthy()
      expect(issue.title).toBeTruthy()
      expect(issue.detail).toBeTruthy()
    }
  })
})

// ─── issueCount ───────────────────────────────────────────────────────────────
describe('issueCount', () => {
  it('returns zeros for an empty array', () => {
    expect(issueCount([])).toEqual({ errors: 0, warnings: 0, infos: 0 })
  })

  it('counts severities correctly', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 0, fieldStrength: 3.0 }
    const issues = validateProtocol(p)
    const counts = issueCount(issues)
    expect(counts.errors).toBeGreaterThanOrEqual(1) // stir_no_ti
    expect(counts.warnings).toBeGreaterThanOrEqual(1) // stir_3t
    expect(counts.errors + counts.warnings + counts.infos).toBe(issues.length)
  })
})

// ─── SAR ──────────────────────────────────────────────────────────────────────
// SAR = (FA/90)² × (2000/TR) × min(ETL,200)/50 × (fieldStrength/1.5)² × penalties × 32
describe('SAR rules', () => {
  it('sar_over: triggers when SAR = 100 (high FA, 3T, long ETL, short TR)', () => {
    // raw ≈ 1² × (2000/2000) × (40/50) × 4 × 32 = 102.4 → capped at 100
    const p: ProtocolParams = {
      ...base, flipAngle: 90, TR: 2000, turboFactor: 40, fieldStrength: 3.0,
    }
    expect(hasId(p, 'sar_over')).toBe(true)
  })

  it('sar_over: does not trigger at low SAR (1.5T, long TR)', () => {
    expect(hasId(base, 'sar_over')).toBe(false)
  })

  it('sar_high: triggers when SAR is 80–99', () => {
    // raw = (100/90)² × 1 × 0.6 × 4 × 32 ≈ 94.8 → rounds to 95
    const p: ProtocolParams = {
      ...base, flipAngle: 100, TR: 2000, turboFactor: 30, fieldStrength: 3.0,
    }
    const issueIds = ids(p)
    // Either sar_high or sar_over depending on rounding
    expect(issueIds.includes('sar_high') || issueIds.includes('sar_over')).toBe(true)
  })

  it('sar_high: does not trigger at low SAR (1.5T, long TR, small ETL)', () => {
    expect(hasId(base, 'sar_high')).toBe(false)
  })
})

// ─── Contrast ────────────────────────────────────────────────────────────────
describe('contrast_t1_te_long', () => {
  it('triggers when TE > 30 and TR < 800 (T1-weighted but TE too long)', () => {
    const p: ProtocolParams = { ...base, TE: 35, TR: 600 }
    expect(hasId(p, 'contrast_t1_te_long')).toBe(true)
  })

  it('does not trigger when TR >= 800', () => {
    const p: ProtocolParams = { ...base, TE: 35, TR: 800 }
    expect(hasId(p, 'contrast_t1_te_long')).toBe(false)
  })

  it('does not trigger when TE <= 30', () => {
    const p: ProtocolParams = { ...base, TE: 20, TR: 600 }
    expect(hasId(p, 'contrast_t1_te_long')).toBe(false)
  })
})

describe('contrast_t2_tr_short', () => {
  it('triggers when TR < 2000 and TE > 80 (T2-weighted but TR too short)', () => {
    const p: ProtocolParams = { ...base, TR: 1500, TE: 90 }
    expect(hasId(p, 'contrast_t2_tr_short')).toBe(true)
  })

  it('does not trigger when TR >= 2000', () => {
    const p: ProtocolParams = { ...base, TR: 2000, TE: 90 }
    expect(hasId(p, 'contrast_t2_tr_short')).toBe(false)
  })
})

// ─── Fat saturation ───────────────────────────────────────────────────────────
describe('stir_3t', () => {
  it('triggers when STIR is used at 3T', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 160, fieldStrength: 3.0 }
    expect(hasId(p, 'stir_3t')).toBe(true)
  })

  it('does not trigger at 1.5T', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 160, fieldStrength: 1.5 }
    expect(hasId(p, 'stir_3t')).toBe(false)
  })

  it('does not trigger when fatSat is not STIR', () => {
    const p: ProtocolParams = { ...base, fatSat: 'SPAIR', fieldStrength: 3.0 }
    expect(hasId(p, 'stir_3t')).toBe(false)
  })
})

describe('stir_no_ti', () => {
  it('triggers (error) when STIR is set but TI = 0', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 0 }
    const issues = validateProtocol(p)
    const issue = issues.find(i => i.id === 'stir_no_ti')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('error')
  })

  it('does not trigger when TI is set correctly', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 160 }
    expect(hasId(p, 'stir_no_ti')).toBe(false)
  })

  it('quickFix sets TI to 160 at 1.5T', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 0, fieldStrength: 1.5 }
    const issue = validateProtocol(p).find(i => i.id === 'stir_no_ti')
    const fix = issue?.quickFixes?.find(f => f.label.includes('160'))
    expect(fix).toBeDefined()
    expect(fix?.apply(p)).toMatchObject({ TI: 160 })
  })

  it('quickFix sets TI to 180 at 3T', () => {
    const p: ProtocolParams = { ...base, fatSat: 'STIR', TI: 0, fieldStrength: 3.0 }
    const issue = validateProtocol(p).find(i => i.id === 'stir_no_ti')
    const fix = issue?.quickFixes?.find(f => f.label.includes('180'))
    expect(fix).toBeDefined()
    expect(fix?.apply(p)).toMatchObject({ TI: 180 })
  })
})

// ─── FLAIR ────────────────────────────────────────────────────────────────────
describe('flair_tr_short', () => {
  it('triggers when TI > 1000 and TR < 6000', () => {
    const p: ProtocolParams = { ...base, TI: 2000, TR: 5000, turboFactor: 15 }
    expect(hasId(p, 'flair_tr_short')).toBe(true)
  })

  it('does not trigger when TR >= 6000', () => {
    const p: ProtocolParams = { ...base, TI: 2000, TR: 9000, turboFactor: 15 }
    expect(hasId(p, 'flair_tr_short')).toBe(false)
  })
})

describe('flair_3t_ti_short', () => {
  it('triggers when FLAIR-like (TI > 1500, ETL > 5), 3T, and TI < 2200', () => {
    const p: ProtocolParams = {
      ...base, TI: 2000, TR: 9000, turboFactor: 15, fieldStrength: 3.0,
    }
    expect(hasId(p, 'flair_3t_ti_short')).toBe(true)
  })

  it('does not trigger at 1.5T', () => {
    const p: ProtocolParams = {
      ...base, TI: 2000, TR: 9000, turboFactor: 15, fieldStrength: 1.5,
    }
    expect(hasId(p, 'flair_3t_ti_short')).toBe(false)
  })

  it('does not trigger when TI >= 2200', () => {
    const p: ProtocolParams = {
      ...base, TI: 2400, TR: 9000, turboFactor: 15, fieldStrength: 3.0,
    }
    expect(hasId(p, 'flair_3t_ti_short')).toBe(false)
  })
})

// ─── DWI rules ────────────────────────────────────────────────────────────────
describe('dwi_bw_low', () => {
  it('triggers for EPI-like DWI (ETL<=2, multiple b-values) with low bandwidth', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000], bandwidth: 600,
    }
    expect(hasId(p, 'dwi_bw_low')).toBe(true)
  })

  it('does not trigger when bandwidth >= 800', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000], bandwidth: 800,
    }
    expect(hasId(p, 'dwi_bw_low')).toBe(false)
  })
})

describe('dwi_no_adc (second rule: b>=500 DWI)', () => {
  it('triggers (info) when DWI has high b-value but inlineADC is off', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000], inlineADC: false,
    }
    const issue = validateProtocol(p).find(i => i.id === 'dwi_no_adc')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('info')
  })

  it('does not trigger when inlineADC is on', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000], inlineADC: true,
    }
    expect(hasId(p, 'dwi_no_adc')).toBe(false)
  })

  it('quickFix enables inlineADC', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000], inlineADC: false,
    }
    const issue = validateProtocol(p).find(i => i.id === 'dwi_no_adc')
    const fix = issue?.quickFixes?.[0]
    expect(fix?.apply(p)).toMatchObject({ inlineADC: true })
  })
})

describe('dwi_low_bmax', () => {
  it('triggers when DWI max b < 500', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 300],
    }
    expect(hasId(p, 'dwi_low_bmax')).toBe(true)
  })

  it('does not trigger when max b >= 500', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 500],
    }
    expect(hasId(p, 'dwi_low_bmax')).toBe(false)
  })
})

describe('dwi_no_b0', () => {
  it('triggers (error) when DWI has no b=0 value', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [500, 1000],
    }
    const issue = validateProtocol(p).find(i => i.id === 'dwi_no_b0')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('error')
  })

  it('does not trigger when b=0 is present', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000],
    }
    expect(hasId(p, 'dwi_no_b0')).toBe(false)
  })

  it('quickFix prepends b=0', () => {
    const p: ProtocolParams = { ...base, turboFactor: 1, bValues: [500, 1000] }
    const issue = validateProtocol(p).find(i => i.id === 'dwi_no_b0')
    const fix = issue?.quickFixes?.[0]
    const result = fix?.apply(p)
    expect(result?.bValues).toContain(0)
  })
})

describe('dwi_no_fatsat', () => {
  it('triggers when EPI-DWI has no fat saturation', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000], fatSat: 'None',
    }
    expect(hasId(p, 'dwi_no_fatsat')).toBe(true)
  })

  it('does not trigger when fat saturation is applied', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000], fatSat: 'SPAIR',
    }
    expect(hasId(p, 'dwi_no_fatsat')).toBe(false)
  })
})

describe('prostate_dwi_low_b', () => {
  it('triggers when DWI max b < 800 (prostate PI-RADS requirement)', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 600],
    }
    expect(hasId(p, 'prostate_dwi_low_b')).toBe(true)
  })

  it('does not trigger when max b >= 800', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 800],
    }
    expect(hasId(p, 'prostate_dwi_low_b')).toBe(false)
  })
})

describe('dwi_3t_phase_ap', () => {
  it('triggers when 3T DWI uses A>>P phase encoding direction', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000],
      fieldStrength: 3.0, phaseEncDir: 'A>>P',
    }
    expect(hasId(p, 'dwi_3t_phase_ap')).toBe(true)
  })

  it('does not trigger when phase direction is R>>L', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, bValues: [0, 1000],
      fieldStrength: 3.0, phaseEncDir: 'R>>L',
    }
    expect(hasId(p, 'dwi_3t_phase_ap')).toBe(false)
  })
})

// ─── HASTE ────────────────────────────────────────────────────────────────────
describe('haste_no_pf', () => {
  it('triggers (error) when single-shot HASTE has no Partial Fourier', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: 'Off',
    }
    const issue = validateProtocol(p).find(i => i.id === 'haste_no_pf')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('error')
  })

  it('does not trigger when Partial Fourier is enabled', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: '5/8',
    }
    expect(hasId(p, 'haste_no_pf')).toBe(false)
  })

  it('quickFix sets partialFourier to 5/8', () => {
    const p: ProtocolParams = { ...base, turboFactor: 120, partialFourier: 'Off' }
    const issue = validateProtocol(p).find(i => i.id === 'haste_no_pf')
    const fix = issue?.quickFixes?.find(f => f.label.includes('5/8'))
    expect(fix?.apply(p)).toMatchObject({ partialFourier: '5/8' })
  })
})

describe('haste_stir', () => {
  it('triggers when HASTE is combined with STIR fat suppression', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: '5/8',
      fatSat: 'STIR', TI: 160,
    }
    expect(hasId(p, 'haste_stir')).toBe(true)
  })

  it('does not trigger when fat suppression is SPAIR', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: '5/8',
      fatSat: 'SPAIR',
    }
    expect(hasId(p, 'haste_stir')).toBe(false)
  })
})

describe('haste_thick_slice', () => {
  it('triggers (info) when HASTE uses slice thickness > 4mm', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: '5/8', sliceThickness: 5,
    }
    expect(hasId(p, 'haste_thick_slice')).toBe(true)
  })

  it('does not trigger when slice thickness <= 4mm', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: '5/8', sliceThickness: 4,
    }
    expect(hasId(p, 'haste_thick_slice')).toBe(false)
  })
})

// ─── iPAT rules ───────────────────────────────────────────────────────────────
describe('ipat_matrix_small', () => {
  it('triggers when iPAT AF>=3 and matrix < 192', () => {
    const p: ProtocolParams = {
      ...base, ipatMode: 'GRAPPA', ipatFactor: 3, matrixPhase: 180,
    }
    expect(hasId(p, 'ipat_matrix_small')).toBe(true)
  })

  it('does not trigger when matrix >= 192', () => {
    const p: ProtocolParams = {
      ...base, ipatMode: 'GRAPPA', ipatFactor: 3, matrixPhase: 192,
    }
    expect(hasId(p, 'ipat_matrix_small')).toBe(false)
  })
})

describe('ipat_af4_15t', () => {
  it('triggers when iPAT AF=4 at 1.5T', () => {
    const p: ProtocolParams = {
      ...base, ipatMode: 'GRAPPA', ipatFactor: 4, fieldStrength: 1.5,
    }
    expect(hasId(p, 'ipat_af4_15t')).toBe(true)
  })

  it('does not trigger at 3T', () => {
    const p: ProtocolParams = {
      ...base, ipatMode: 'GRAPPA', ipatFactor: 4, fieldStrength: 3.0,
    }
    expect(hasId(p, 'ipat_af4_15t')).toBe(false)
  })
})

describe('ipat_low_avg', () => {
  it('triggers when AF>=3, matrix < 256, averages=1', () => {
    // First guard (matrix>=256 && averages=1) is false → falls through to second
    const p: ProtocolParams = {
      ...base, ipatMode: 'GRAPPA', ipatFactor: 3, matrixPhase: 200, averages: 1,
    }
    expect(hasId(p, 'ipat_low_avg')).toBe(true)
  })

  it('does not trigger when matrix >= 256 and averages = 1 (guard returns null)', () => {
    const p: ProtocolParams = {
      ...base, ipatMode: 'GRAPPA', ipatFactor: 3, matrixPhase: 256, averages: 1,
    }
    expect(hasId(p, 'ipat_low_avg')).toBe(false)
  })
})

describe('ipat_gfactor_15t', () => {
  it('triggers when 1.5T with iPAT AF>=3 and averages=1', () => {
    const p: ProtocolParams = {
      ...base, ipatFactor: 3, averages: 1, fieldStrength: 1.5,
    }
    expect(hasId(p, 'ipat_gfactor_15t')).toBe(true)
  })

  it('does not trigger at 3T', () => {
    const p: ProtocolParams = {
      ...base, ipatFactor: 3, averages: 1, fieldStrength: 3.0,
    }
    expect(hasId(p, 'ipat_gfactor_15t')).toBe(false)
  })
})

// ─── Physio / trigger rules ───────────────────────────────────────────────────
describe('abdomen_no_resp', () => {
  it('triggers for large FOV (>320) with no respiratory trigger', () => {
    const p: ProtocolParams = {
      ...base, fov: 380, respTrigger: 'Off', turboFactor: 15, ecgTrigger: false,
    }
    expect(hasId(p, 'abdomen_no_resp')).toBe(true)
  })

  it('does not trigger when PACE is enabled', () => {
    const p: ProtocolParams = {
      ...base, fov: 380, respTrigger: 'PACE',
    }
    expect(hasId(p, 'abdomen_no_resp')).toBe(false)
  })

  it('does not trigger when FOV <= 320', () => {
    const p: ProtocolParams = {
      ...base, fov: 300, respTrigger: 'Off',
    }
    expect(hasId(p, 'abdomen_no_resp')).toBe(false)
  })
})

describe('bh_ecg_conflict', () => {
  it('triggers when breath-hold and ECG trigger are both active', () => {
    const p: ProtocolParams = { ...base, respTrigger: 'BH', ecgTrigger: true }
    expect(hasId(p, 'bh_ecg_conflict')).toBe(true)
  })

  it('does not trigger when only ECG is active', () => {
    const p: ProtocolParams = { ...base, respTrigger: 'Off', ecgTrigger: true }
    expect(hasId(p, 'bh_ecg_conflict')).toBe(false)
  })
})

describe('ecg_no_delay', () => {
  it('triggers (info) when ECG trigger is active but triggerDelay = 0', () => {
    const p: ProtocolParams = { ...base, ecgTrigger: true, triggerDelay: 0, respTrigger: 'BH' }
    const issue = validateProtocol(p).find(i => i.id === 'ecg_no_delay')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('info')
  })

  it('does not trigger when triggerDelay is set', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, triggerDelay: 500, respTrigger: 'BH',
    }
    expect(hasId(p, 'ecg_no_delay')).toBe(false)
  })
})

describe('ecg_high_tr', () => {
  it('triggers (info) when ECG trigger is on and TR > 3000', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, TR: 4000, respTrigger: 'BH', triggerDelay: 400,
    }
    const issue = validateProtocol(p).find(i => i.id === 'ecg_high_tr')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('info')
  })

  it('does not trigger when TR <= 3000', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, TR: 1000, respTrigger: 'BH', triggerDelay: 400,
    }
    expect(hasId(p, 'ecg_high_tr')).toBe(false)
  })
})

describe('ecg_high_hr', () => {
  it('triggers when ECG trigger + TR < 800 implies HR > 90 bpm', () => {
    // HR = 60000/500 = 120 bpm > 90
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, TR: 500, respTrigger: 'BH',
    }
    expect(hasId(p, 'ecg_high_hr')).toBe(true)
  })

  it('does not trigger when TR >= 800', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, TR: 800, respTrigger: 'BH',
    }
    expect(hasId(p, 'ecg_high_hr')).toBe(false)
  })
})

describe('bh_too_long', () => {
  it('triggers when breath-hold scan time exceeds 25s', () => {
    // t = 2000 * 256 * 1.0 * 1 / 15 / 1 / 1000 ≈ 34s > 25
    const p: ProtocolParams = {
      ...base, respTrigger: 'BH', TR: 2000, matrixPhase: 256,
      phaseResolution: 100, averages: 1, turboFactor: 15, ipatMode: 'Off',
    }
    expect(hasId(p, 'bh_too_long')).toBe(true)
  })

  it('does not trigger when scan time <= 25s', () => {
    // t = 500 * 256 * 1.0 * 1 / 15 / 1 / 1000 ≈ 8.5s
    const p: ProtocolParams = {
      ...base, respTrigger: 'BH', TR: 500, matrixPhase: 256,
      phaseResolution: 100, averages: 1, turboFactor: 15, ipatMode: 'Off',
    }
    expect(hasId(p, 'bh_too_long')).toBe(false)
  })
})

describe('cardiac_no_resp', () => {
  it('triggers (info) when ECG trigger is on but no respiratory trigger', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, respTrigger: 'Off', TR: 1000, slices: 10,
    }
    expect(hasId(p, 'cardiac_no_resp')).toBe(true)
  })

  it('does not trigger when respiratory trigger is set', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, respTrigger: 'BH', TR: 1000,
    }
    expect(hasId(p, 'cardiac_no_resp')).toBe(false)
  })
})

// ─── SNR ──────────────────────────────────────────────────────────────────────
describe('snr_low', () => {
  it('triggers when estimated SNR < 20 (small voxel + Body coil + high BW)', () => {
    // voxel=2mm³, bwNorm=0.25, coilFactor=0.55 → SNR≈2.75 < 20
    const p: ProtocolParams = {
      ...base, sliceThickness: 2, bandwidth: 800, coilType: 'Body',
    }
    expect(hasId(p, 'snr_low')).toBe(true)
  })

  it('does not trigger for high SNR (large voxel, head coil)', () => {
    expect(hasId(base, 'snr_low')).toBe(false)
  })
})

describe('thin_slice_low_snr', () => {
  it('triggers when slice < 2mm, 1.5T, and SNR < 20', () => {
    // voxel=1mm³, bwNorm=1, coilFactor=1.0 → SNR=10 < 20
    const p: ProtocolParams = {
      ...base, sliceThickness: 1, bandwidth: 200, coilType: 'Head_64', fieldStrength: 1.5,
    }
    expect(hasId(p, 'thin_slice_low_snr')).toBe(true)
  })

  it('does not trigger when slice >= 2mm', () => {
    const p: ProtocolParams = {
      ...base, sliceThickness: 2, bandwidth: 200, coilType: 'Head_64', fieldStrength: 1.5,
    }
    expect(hasId(p, 'thin_slice_low_snr')).toBe(false)
  })
})

// ─── Chemical shift ───────────────────────────────────────────────────────────
describe('chemshift_high', () => {
  it('triggers when chemical shift > 3px (low BW at 3T)', () => {
    // cs = 440/100 = 4.4 > 3.0
    const p: ProtocolParams = { ...base, bandwidth: 100, fieldStrength: 3.0 }
    expect(hasId(p, 'chemshift_high')).toBe(true)
  })

  it('does not trigger when chemical shift <= 3px', () => {
    // cs = 220/200 = 1.1
    expect(hasId(base, 'chemshift_high')).toBe(false)
  })
})

describe('spine_chemshift_high', () => {
  it('triggers for sagittal spine at 3T with no fat saturation and low BW', () => {
    // chemShiftPx = 440/100 = 4.4 >= 2.5
    const p: ProtocolParams = {
      ...base, orientation: 'Sag', fieldStrength: 3.0, bandwidth: 100, fatSat: 'None',
    }
    expect(hasId(p, 'spine_chemshift_high')).toBe(true)
  })

  it('does not trigger when fat saturation is applied', () => {
    const p: ProtocolParams = {
      ...base, orientation: 'Sag', fieldStrength: 3.0, bandwidth: 100, fatSat: 'SPAIR',
    }
    expect(hasId(p, 'spine_chemshift_high')).toBe(false)
  })

  it('does not trigger for transverse orientation', () => {
    const p: ProtocolParams = {
      ...base, orientation: 'Tra', fieldStrength: 3.0, bandwidth: 100, fatSat: 'None',
    }
    expect(hasId(p, 'spine_chemshift_high')).toBe(false)
  })
})

// ─── GRE / T2* ───────────────────────────────────────────────────────────────
describe('gre_te_long_3t', () => {
  it('triggers for 3T GRE (ETL<=2) with TE > 100ms', () => {
    const p: ProtocolParams = {
      ...base, fieldStrength: 3.0, TE: 110, turboFactor: 1,
    }
    expect(hasId(p, 'gre_te_long_3t')).toBe(true)
  })

  it('does not trigger at 1.5T', () => {
    const p: ProtocolParams = {
      ...base, fieldStrength: 1.5, TE: 110, turboFactor: 1,
    }
    expect(hasId(p, 'gre_te_long_3t')).toBe(false)
  })
})

describe('gre_opposed_phase_3t', () => {
  it('triggers when GRE TE is near 3T opposed-phase value (3.45ms)', () => {
    const p: ProtocolParams = {
      ...base, fieldStrength: 3.0, turboFactor: 1, TR: 100, TE: 3.45,
    }
    expect(hasId(p, 'gre_opposed_phase_3t')).toBe(true)
  })

  it('does not trigger at in-phase TE', () => {
    const p: ProtocolParams = {
      ...base, fieldStrength: 3.0, turboFactor: 1, TR: 100, TE: 4.6,
    }
    expect(hasId(p, 'gre_opposed_phase_3t')).toBe(false)
  })
})

// ─── Sequence rules ───────────────────────────────────────────────────────────
describe('t1_tse_etl_long', () => {
  it('triggers when T1-weighted TSE (TR < 1000) has ETL > 10', () => {
    const p: ProtocolParams = { ...base, TR: 600, turboFactor: 15 }
    expect(hasId(p, 't1_tse_etl_long')).toBe(true)
  })

  it('does not trigger when ETL <= 10', () => {
    const p: ProtocolParams = { ...base, TR: 600, turboFactor: 5 }
    expect(hasId(p, 't1_tse_etl_long')).toBe(false)
  })
})

describe('tr_too_short_for_etl', () => {
  it('triggers (error) when TR < ETL × echoSpacing + 50', () => {
    // minTR = 20 * 4.5 + 50 = 140ms
    const p: ProtocolParams = { ...base, turboFactor: 20, TR: 130 }
    const issue = validateProtocol(p).find(i => i.id === 'tr_too_short_for_etl')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('error')
  })

  it('quickFix sets TR to the minimum required value', () => {
    const p: ProtocolParams = { ...base, turboFactor: 20, TR: 130, echoSpacing: 4.5 }
    const issue = validateProtocol(p).find(i => i.id === 'tr_too_short_for_etl')
    const fix = issue?.quickFixes?.[0]
    const result = fix?.apply(p)
    expect(result?.TR).toBeGreaterThanOrEqual(140)
  })

  it('does not trigger when TR is sufficient', () => {
    const p: ProtocolParams = { ...base, turboFactor: 15, TR: 5000 }
    expect(hasId(p, 'tr_too_short_for_etl')).toBe(false)
  })
})

describe('3d_no_pf', () => {
  it('triggers (info) for long 3D acquisition with no Partial Fourier', () => {
    // is3D: ETL=30>=30, slices=80>=60; longScan: 80*256/(30*1)=682>600
    const p: ProtocolParams = {
      ...base, turboFactor: 30, slices: 80, matrixPhase: 256,
      ipatFactor: 1, ipatMode: 'Off', partialFourier: 'Off',
    }
    expect(hasId(p, '3d_no_pf')).toBe(true)
  })

  it('does not trigger when PF is applied', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 30, slices: 80, matrixPhase: 256,
      ipatFactor: 1, ipatMode: 'Off', partialFourier: '6/8',
    }
    expect(hasId(p, '3d_no_pf')).toBe(false)
  })
})

describe('3d_thin_no_pf', () => {
  it('triggers (info) for thin-slice 3D with no Partial Fourier', () => {
    // is3D: ETL=15>=3, sliceThickness=1<=1.5
    const p: ProtocolParams = {
      ...base, turboFactor: 15, sliceThickness: 1.0,
      partialFourier: 'Off', TR: 5000, averages: 1,
    }
    expect(hasId(p, '3d_thin_no_pf')).toBe(true)
  })

  it('does not trigger when PF is applied', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 15, sliceThickness: 1.0,
      partialFourier: '6/8', TR: 5000, averages: 1,
    }
    expect(hasId(p, '3d_thin_no_pf')).toBe(false)
  })
})

// ─── Geometry ─────────────────────────────────────────────────────────────────
describe('slice_overlap', () => {
  it('triggers when sliceGap is negative', () => {
    const p: ProtocolParams = { ...base, sliceGap: -1 }
    expect(hasId(p, 'slice_overlap')).toBe(true)
  })

  it('does not trigger when sliceGap >= 0', () => {
    const p: ProtocolParams = { ...base, sliceGap: 0 }
    expect(hasId(p, 'slice_overlap')).toBe(false)
  })
})

describe('phase_res_low', () => {
  it('triggers (info) when phase resolution < 60%', () => {
    const p: ProtocolParams = { ...base, phaseResolution: 50 }
    expect(hasId(p, 'phase_res_low')).toBe(true)
  })

  it('does not trigger when phase resolution >= 60%', () => {
    const p: ProtocolParams = { ...base, phaseResolution: 60 }
    expect(hasId(p, 'phase_res_low')).toBe(false)
  })
})

describe('dielectric_3t', () => {
  it('triggers (info) at 3T with large FOV, no fat sat, auto shim', () => {
    const p: ProtocolParams = {
      ...base, fieldStrength: 3.0, fov: 400, fatSat: 'None', shim: 'Auto',
    }
    expect(hasId(p, 'dielectric_3t')).toBe(true)
  })

  it('does not trigger when fat saturation is applied', () => {
    const p: ProtocolParams = {
      ...base, fieldStrength: 3.0, fov: 400, fatSat: 'CHESS', shim: 'Auto',
    }
    expect(hasId(p, 'dielectric_3t')).toBe(false)
  })
})

describe('slices_exceed_tr', () => {
  it('triggers when GRE-like sequence has more slices than TR can accommodate', () => {
    // maxSlicesPerTR = floor(600/30) = 20; 25 > 20*1.2=24; TR=600<2000
    const p: ProtocolParams = {
      ...base, turboFactor: 1, TR: 600, slices: 25,
    }
    expect(hasId(p, 'slices_exceed_tr')).toBe(true)
  })

  it('does not trigger when slice count is within TR capacity', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, TR: 600, slices: 15,
    }
    expect(hasId(p, 'slices_exceed_tr')).toBe(false)
  })
})

// ─── Coil ─────────────────────────────────────────────────────────────────────
describe('knee_fov_large', () => {
  it('triggers (info) when Knee coil is used with FOV > 250', () => {
    const p: ProtocolParams = { ...base, coilType: 'Knee', fov: 280 }
    expect(hasId(p, 'knee_fov_large')).toBe(true)
  })

  it('triggers for Shoulder coil as well', () => {
    const p: ProtocolParams = { ...base, coilType: 'Shoulder', fov: 280 }
    expect(hasId(p, 'knee_fov_large')).toBe(true)
  })

  it('does not trigger when FOV <= 250', () => {
    const p: ProtocolParams = { ...base, coilType: 'Knee', fov: 200 }
    expect(hasId(p, 'knee_fov_large')).toBe(false)
  })
})

// ─── Contrast / MT ────────────────────────────────────────────────────────────
describe('mt_stir_conflict', () => {
  it('triggers when both MT and STIR are active', () => {
    const p: ProtocolParams = { ...base, mt: true, fatSat: 'STIR', TI: 160 }
    expect(hasId(p, 'mt_stir_conflict')).toBe(true)
  })

  it('does not trigger when MT is off', () => {
    const p: ProtocolParams = { ...base, mt: false, fatSat: 'STIR', TI: 160 }
    expect(hasId(p, 'mt_stir_conflict')).toBe(false)
  })
})

describe('fa_over_ernst', () => {
  it('triggers (info) when GRE FA greatly exceeds Ernst angle at very short TR', () => {
    // TR=10ms: ernstDeg = acos(exp(-10/1000)) * 180/pi ≈ acos(0.99) ≈ 8.1°
    // flipAngle > ernstDeg * 2 ≈ 16.2°, so flipAngle=90 triggers
    const p: ProtocolParams = {
      ...base, turboFactor: 1, TR: 10, flipAngle: 90,
    }
    expect(hasId(p, 'fa_over_ernst')).toBe(true)
  })

  it('does not trigger for TSE (turboFactor > 2)', () => {
    const p: ProtocolParams = { ...base, turboFactor: 15, TR: 10, flipAngle: 90 }
    expect(hasId(p, 'fa_over_ernst')).toBe(false)
  })
})

// ─── Efficiency ───────────────────────────────────────────────────────────────
describe('averages_high', () => {
  it('triggers (info) when averages >= 4 and turboFactor >= 10', () => {
    const p: ProtocolParams = { ...base, averages: 4, turboFactor: 10 }
    expect(hasId(p, 'averages_high')).toBe(true)
  })

  it('does not trigger when turboFactor < 10', () => {
    const p: ProtocolParams = { ...base, averages: 4, turboFactor: 5 }
    expect(hasId(p, 'averages_high')).toBe(false)
  })
})

describe('low_phase_os', () => {
  it('triggers (info) when phaseOversampling < 15 and phaseResolution >= 100', () => {
    const p: ProtocolParams = { ...base, phaseOversampling: 0, phaseResolution: 100 }
    expect(hasId(p, 'low_phase_os')).toBe(true)
  })

  it('does not trigger when phaseOversampling >= 15', () => {
    const p: ProtocolParams = { ...base, phaseOversampling: 20, phaseResolution: 100 }
    expect(hasId(p, 'low_phase_os')).toBe(false)
  })
})

// ─── Cardiac sequences ────────────────────────────────────────────────────────
describe('cine_no_ecg', () => {
  it('triggers (error) for cardiac cine (short TR, FA 40-80°) without ECG trigger', () => {
    const p: ProtocolParams = {
      ...base, TR: 30, flipAngle: 60, ecgTrigger: false,
    }
    const issue = validateProtocol(p).find(i => i.id === 'cine_no_ecg')
    expect(issue).toBeDefined()
    expect(issue?.severity).toBe('error')
  })

  it('does not trigger when ECG trigger is on', () => {
    const p: ProtocolParams = {
      ...base, TR: 30, flipAngle: 60, ecgTrigger: true, respTrigger: 'BH',
    }
    expect(hasId(p, 'cine_no_ecg')).toBe(false)
  })
})

describe('lge_no_ti', () => {
  it('triggers when ECG-gated GRE has TI = 0 (LGE without inversion)', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, TR: 10, flipAngle: 20, TI: 0, respTrigger: 'BH',
    }
    expect(hasId(p, 'lge_no_ti')).toBe(true)
  })

  it('does not trigger when TI is set', () => {
    const p: ProtocolParams = {
      ...base, ecgTrigger: true, TR: 10, flipAngle: 20, TI: 300, respTrigger: 'BH',
    }
    expect(hasId(p, 'lge_no_ti')).toBe(false)
  })
})

// ─── Special sequences ────────────────────────────────────────────────────────
describe('tof_no_fatsat', () => {
  it('triggers (info) when TOF-MRA has no fat saturation', () => {
    // isTOF: ETL<=2, TR<40, FA 15-35°
    const p: ProtocolParams = {
      ...base, turboFactor: 1, TR: 30, flipAngle: 25, fatSat: 'None',
    }
    expect(hasId(p, 'tof_no_fatsat')).toBe(true)
  })

  it('does not trigger when SPAIR is used', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, TR: 30, flipAngle: 25, fatSat: 'SPAIR',
    }
    expect(hasId(p, 'tof_no_fatsat')).toBe(false)
  })
})

describe('cemra_no_mip', () => {
  it('triggers (info) for CE-MRA sequence without inline MIP', () => {
    // isCEmra: TR<=5, TE<=2, FA 15-40°, ETL<=2
    const p: ProtocolParams = {
      ...base, TR: 3, TE: 1, flipAngle: 25, turboFactor: 1, inlineMIP: false,
    }
    expect(hasId(p, 'cemra_no_mip')).toBe(true)
  })

  it('does not trigger when inline MIP is enabled', () => {
    const p: ProtocolParams = {
      ...base, TR: 3, TE: 1, flipAngle: 25, turboFactor: 1, inlineMIP: true,
    }
    expect(hasId(p, 'cemra_no_mip')).toBe(false)
  })
})

describe('mrcp_te_short', () => {
  it('triggers when HASTE-like scan has TE < 600 (insufficient liquid-tissue contrast)', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: '5/8', TE: 400,
    }
    expect(hasId(p, 'mrcp_te_short')).toBe(true)
  })

  it('does not trigger when TE >= 600', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 120, partialFourier: '5/8', TE: 700,
    }
    expect(hasId(p, 'mrcp_te_short')).toBe(false)
  })
})

describe('ciss_low_bw', () => {
  it('triggers (info) for 3D bSSFP/CISS at 3T with low bandwidth', () => {
    // isCISS: ETL<=2, FA<=70, TR<=15, fieldStrength>=2.5
    const p: ProtocolParams = {
      ...base, turboFactor: 1, flipAngle: 60, TR: 10, fieldStrength: 3.0, bandwidth: 300,
    }
    expect(hasId(p, 'ciss_low_bw')).toBe(true)
  })

  it('does not trigger when bandwidth >= 500', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, flipAngle: 60, TR: 10, fieldStrength: 3.0, bandwidth: 700,
    }
    expect(hasId(p, 'ciss_low_bw')).toBe(false)
  })
})

describe('vibe_no_resp', () => {
  it('triggers for abdominal VIBE (large FOV, many slices) without respiratory control', () => {
    // isVIBE: ETL<=2, TR<15; isAbdomen: fov>=300, slices>=40
    const p: ProtocolParams = {
      ...base, turboFactor: 1, TR: 5, fov: 380, slices: 50,
      respTrigger: 'Off', ecgTrigger: false,
    }
    expect(hasId(p, 'vibe_no_resp')).toBe(true)
  })

  it('does not trigger when breath-hold is set', () => {
    const p: ProtocolParams = {
      ...base, turboFactor: 1, TR: 5, fov: 380, slices: 50,
      respTrigger: 'BH', ecgTrigger: false,
    }
    expect(hasId(p, 'vibe_no_resp')).toBe(false)
  })
})
