import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock zustand persist middleware to skip localStorage in tests
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<typeof import('zustand/middleware')>('zustand/middleware')
  return {
    ...actual,
    persist: (fn: unknown) => fn,
    createJSONStorage: actual.createJSONStorage,
  }
})

import { useProtocolStore } from './protocolStore'
import { presets } from '../data/presets'

// Reset store to initial state before each test
beforeEach(() => {
  useProtocolStore.setState({
    params: presets[0].params,
    activePresetId: presets[0].id,
    activeTab: 'Routine',
    activeRoutineTab: 'Part1',
    highlightedParams: [],
    hintParam: null,
    activeBodyPartId: 'head',
    activeGroupId: 'brain',
    activeVariantId: 'brain_routine_dot',
    activeColumnIndex: 0,
    activeSequenceName: null,
    baseline: presets[0].params,
    history: [],
    historyIndex: -1,
    comparePresetId: null,
    viewMode: 'console',
    currentPage: 'console',
  })
})

describe('protocolStore', () => {
  // ─── Initial state ──────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('loads first preset params by default', () => {
      const { params, activePresetId } = useProtocolStore.getState()
      expect(params).toEqual(presets[0].params)
      expect(activePresetId).toBe(presets[0].id)
    })

    it('starts with empty history', () => {
      const { history, historyIndex } = useProtocolStore.getState()
      expect(history).toEqual([])
      expect(historyIndex).toBe(-1)
    })

    it('starts in console view mode', () => {
      const { viewMode, currentPage } = useProtocolStore.getState()
      expect(viewMode).toBe('console')
      expect(currentPage).toBe('console')
    })
  })

  // ─── setParam ──────────��───────────────────────────────��────────────────────
  describe('setParam', () => {
    it('updates a single parameter', () => {
      useProtocolStore.getState().setParam('TR', 3000)
      expect(useProtocolStore.getState().params.TR).toBe(3000)
    })

    it('builds timeline with initial state and new state', () => {
      const originalParams = { ...useProtocolStore.getState().params }
      useProtocolStore.getState().setParam('TE', 50)
      const { history, historyIndex } = useProtocolStore.getState()
      // history = [original, newState], historyIndex = 1
      expect(history).toHaveLength(2)
      expect(history[0]).toEqual(originalParams)
      expect(history[1].TE).toBe(50)
      expect(historyIndex).toBe(1)
    })

    it('accumulates history across multiple changes', () => {
      useProtocolStore.getState().setParam('TR', 1000)
      useProtocolStore.getState().setParam('TR', 2000)
      useProtocolStore.getState().setParam('TR', 3000)
      const { history, historyIndex } = useProtocolStore.getState()
      // history = [S0, S1(1000), S2(2000), S3(3000)], index = 3
      expect(history).toHaveLength(4)
      expect(historyIndex).toBe(3)
      expect(history[3].TR).toBe(3000)
      expect(useProtocolStore.getState().params.TR).toBe(3000)
    })

    it('truncates future history when changing after undo', () => {
      useProtocolStore.getState().setParam('TR', 1000)
      useProtocolStore.getState().setParam('TR', 2000)
      useProtocolStore.getState().setParam('TR', 3000)
      // history = [S0, S1(1000), S2(2000), S3(3000)], idx = 3
      useProtocolStore.getState().undo() // idx=2, params=S2(2000)
      useProtocolStore.getState().undo() // idx=1, params=S1(1000)
      // Make a new change from S1(1000) — should discard S2, S3
      useProtocolStore.getState().setParam('TR', 9999)
      const { history, historyIndex, params } = useProtocolStore.getState()
      expect(params.TR).toBe(9999)
      // history = [S0, S1(1000), S_new(9999)], idx = 2
      expect(history).toHaveLength(3)
      expect(historyIndex).toBe(2)
    })

    it('caps history at MAX_HISTORY (50)', () => {
      for (let i = 1; i <= 55; i++) {
        useProtocolStore.getState().setParam('TR', i)
      }
      const { history } = useProtocolStore.getState()
      expect(history).toHaveLength(50)
    })
  })

  // ─── undo / redo ────────────────────────────────────────────────────���───────
  describe('undo / redo', () => {
    it('undo restores previous params', () => {
      const original = useProtocolStore.getState().params.TR
      useProtocolStore.getState().setParam('TR', 9999)
      useProtocolStore.getState().undo()
      expect(useProtocolStore.getState().params.TR).toBe(original)
    })

    it('undo is a no-op when history is empty', () => {
      const before = useProtocolStore.getState()
      useProtocolStore.getState().undo()
      const after = useProtocolStore.getState()
      expect(after.params).toEqual(before.params)
      expect(after.historyIndex).toBe(-1)
    })

    it('undo is a no-op at the beginning of history', () => {
      useProtocolStore.getState().setParam('TR', 1000)
      // history = [S0, S1], idx=1
      useProtocolStore.getState().undo() // idx=0
      const before = useProtocolStore.getState()
      useProtocolStore.getState().undo() // should be no-op (idx=0, can't go lower)
      const after = useProtocolStore.getState()
      expect(after.params).toEqual(before.params)
      expect(after.historyIndex).toBe(0)
    })

    it('redo restores the undone state', () => {
      useProtocolStore.getState().setParam('TR', 1000)
      useProtocolStore.getState().setParam('TR', 2000)
      useProtocolStore.getState().undo()
      expect(useProtocolStore.getState().params.TR).toBe(1000)
      useProtocolStore.getState().redo()
      expect(useProtocolStore.getState().params.TR).toBe(2000)
    })

    it('redo is a no-op at the end of history', () => {
      useProtocolStore.getState().setParam('TR', 1000)
      const before = useProtocolStore.getState()
      useProtocolStore.getState().redo()
      expect(useProtocolStore.getState().params.TR).toBe(before.params.TR)
    })

    it('multiple undo/redo cycles work correctly', () => {
      const original = useProtocolStore.getState().params.TR
      useProtocolStore.getState().setParam('TR', 100)
      useProtocolStore.getState().setParam('TR', 200)
      useProtocolStore.getState().setParam('TR', 300)

      useProtocolStore.getState().undo() // → 200
      expect(useProtocolStore.getState().params.TR).toBe(200)
      useProtocolStore.getState().undo() // → 100
      expect(useProtocolStore.getState().params.TR).toBe(100)
      useProtocolStore.getState().undo() // → original
      expect(useProtocolStore.getState().params.TR).toBe(original)

      useProtocolStore.getState().redo() // �� 100
      expect(useProtocolStore.getState().params.TR).toBe(100)
      useProtocolStore.getState().redo() // → 200
      expect(useProtocolStore.getState().params.TR).toBe(200)
      useProtocolStore.getState().redo() // → 300
      expect(useProtocolStore.getState().params.TR).toBe(300)
    })
  })

  // ─── loadPreset ────────────��─────────────────────────────────���──────────────
  describe('loadPreset', () => {
    it('loads a valid preset and updates params, baseline, activePresetId', () => {
      const target = presets[1] ?? presets[0]
      useProtocolStore.getState().loadPreset(target.id)
      const state = useProtocolStore.getState()
      expect(state.params).toEqual(target.params)
      expect(state.baseline).toEqual(target.params)
      expect(state.activePresetId).toBe(target.id)
    })

    it('resets history when loading a preset', () => {
      useProtocolStore.getState().setParam('TR', 9999)
      useProtocolStore.getState().setParam('TR', 8888)
      const target = presets[1] ?? presets[0]
      useProtocolStore.getState().loadPreset(target.id)
      const { history, historyIndex } = useProtocolStore.getState()
      expect(history).toEqual([])
      expect(historyIndex).toBe(-1)
    })

    it('does nothing for an invalid preset id', () => {
      const before = useProtocolStore.getState()
      useProtocolStore.getState().loadPreset('nonexistent_id')
      const after = useProtocolStore.getState()
      expect(after.params).toEqual(before.params)
      expect(after.activePresetId).toBe(before.activePresetId)
    })
  })

  // ─── resetToBaseline ─────────���──────────────────────────────────────────────
  describe('resetToBaseline', () => {
    it('restores params to baseline and clears history', () => {
      const baseline = useProtocolStore.getState().baseline
      useProtocolStore.getState().setParam('TR', 9999)
      useProtocolStore.getState().setParam('TE', 5555)
      useProtocolStore.getState().resetToBaseline()
      const state = useProtocolStore.getState()
      expect(state.params).toEqual(baseline)
      expect(state.history).toEqual([])
      expect(state.historyIndex).toBe(-1)
    })
  })

  // ─── UI state setters ─────────��────────────────────────────────────────────
  describe('UI state setters', () => {
    it('setActiveTab', () => {
      useProtocolStore.getState().setActiveTab('Contrast')
      expect(useProtocolStore.getState().activeTab).toBe('Contrast')
    })

    it('setActiveRoutineTab', () => {
      useProtocolStore.getState().setActiveRoutineTab('Part2')
      expect(useProtocolStore.getState().activeRoutineTab).toBe('Part2')
    })

    it('setHighlightedParams', () => {
      useProtocolStore.getState().setHighlightedParams(['TR', 'TE'])
      expect(useProtocolStore.getState().highlightedParams).toEqual(['TR', 'TE'])
    })

    it('setHintParam', () => {
      useProtocolStore.getState().setHintParam('TR')
      expect(useProtocolStore.getState().hintParam).toBe('TR')
    })

    it('setComparePreset', () => {
      useProtocolStore.getState().setComparePreset('some-id')
      expect(useProtocolStore.getState().comparePresetId).toBe('some-id')
    })

    it('setViewMode', () => {
      useProtocolStore.getState().setViewMode('extended')
      expect(useProtocolStore.getState().viewMode).toBe('extended')
    })

    it('setCurrentPage', () => {
      useProtocolStore.getState().setCurrentPage('browser')
      expect(useProtocolStore.getState().currentPage).toBe('browser')
    })
  })

  // ─── setActiveProtocol ───────────���─────────────────────────────────────────
  describe('setActiveProtocol', () => {
    it('sets body part, group, variant, and column', () => {
      useProtocolStore.getState().setActiveProtocol('spine', 'cervical', 'c_spine_t2', 2)
      const state = useProtocolStore.getState()
      expect(state.activeBodyPartId).toBe('spine')
      expect(state.activeGroupId).toBe('cervical')
      expect(state.activeVariantId).toBe('c_spine_t2')
      expect(state.activeColumnIndex).toBe(2)
    })

    it('defaults columnIndex to 0 when omitted', () => {
      useProtocolStore.getState().setActiveProtocol('knee', 'knee_group', 'knee_t1')
      expect(useProtocolStore.getState().activeColumnIndex).toBe(0)
    })
  })

  // ─── setActiveSequence ─��───────────────────────────────────────────────────
  describe('setActiveSequence', () => {
    it('sets sequence name without preset', () => {
      useProtocolStore.getState().setActiveSequence('T2_TSE')
      expect(useProtocolStore.getState().activeSequenceName).toBe('T2_TSE')
    })

    it('sets sequence name and loads preset when presetId is valid', () => {
      const target = presets[1] ?? presets[0]
      useProtocolStore.getState().setActiveSequence('my_seq', target.id)
      const state = useProtocolStore.getState()
      expect(state.activeSequenceName).toBe('my_seq')
      expect(state.params).toEqual(target.params)
      expect(state.activePresetId).toBe(target.id)
      expect(state.baseline).toEqual(target.params)
      expect(state.history).toEqual([])
    })

    it('only sets name when presetId is invalid', () => {
      const before = useProtocolStore.getState().params
      useProtocolStore.getState().setActiveSequence('my_seq', 'invalid_id')
      const state = useProtocolStore.getState()
      expect(state.activeSequenceName).toBe('my_seq')
      expect(state.params).toEqual(before)
    })
  })
})
