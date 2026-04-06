import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProtocolParams } from '../data/presets'
import { presets } from '../data/presets'

interface ProtocolStore {
  params: ProtocolParams
  activePresetId: string
  activeTab: string
  activeRoutineTab: 'Part1' | 'Part2' | 'Assistant'
  highlightedParams: string[]
  hintParam: string | null
  // Protocol tree navigation
  activeBodyPartId: string | null
  activeGroupId: string | null
  activeVariantId: string | null
  activeColumnIndex: number
  activeSequenceName: string | null
  // History / diff
  baseline: ProtocolParams
  history: ProtocolParams[]
  historyIndex: number
  comparePresetId: string | null

  setParam: <K extends keyof ProtocolParams>(key: K, value: ProtocolParams[K]) => void
  loadPreset: (id: string) => void
  setActiveTab: (tab: string) => void
  setActiveRoutineTab: (tab: 'Part1' | 'Part2' | 'Assistant') => void
  setHighlightedParams: (params: string[]) => void
  setHintParam: (param: string | null) => void
  setActiveProtocol: (bodyPartId: string, groupId: string, variantId: string, columnIndex?: number) => void
  setActiveSequence: (name: string, presetId?: string) => void
  undo: () => void
  redo: () => void
  resetToBaseline: () => void
  setComparePreset: (id: string | null) => void
}

const MAX_HISTORY = 50

export const useProtocolStore = create<ProtocolStore>()(
  persist(
  (set) => ({
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

  setParam: (key, value) =>
    set((state) => {
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        state.params,
      ]
      const trimmed = newHistory.length > MAX_HISTORY
        ? newHistory.slice(newHistory.length - MAX_HISTORY)
        : newHistory
      return {
        params: { ...state.params, [key]: value },
        history: trimmed,
        historyIndex: trimmed.length - 1,
      }
    }),

  loadPreset: (id) => {
    const preset = presets.find((p) => p.id === id)
    if (preset) {
      set({
        params: preset.params,
        activePresetId: id,
        baseline: preset.params,
        history: [],
        historyIndex: -1,
      })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveRoutineTab: (tab) => set({ activeRoutineTab: tab }),
  setHighlightedParams: (params) => set({ highlightedParams: params }),
  setHintParam: (param) => set({ hintParam: param }),
  setActiveProtocol: (bodyPartId, groupId, variantId, columnIndex = 0) =>
    set({ activeBodyPartId: bodyPartId, activeGroupId: groupId, activeVariantId: variantId, activeColumnIndex: columnIndex }),
  setActiveSequence: (name, presetId) => {
    if (presetId) {
      const preset = presets.find(p => p.id === presetId)
      if (preset) {
        set({
          activeSequenceName: name,
          params: preset.params,
          activePresetId: presetId,
          baseline: preset.params,
          history: [],
          historyIndex: -1,
        })
        return
      }
    }
    set({ activeSequenceName: name })
  },

  undo: () =>
    set((state) => {
      if (state.historyIndex < 0) return state
      // history[historyIndex] is the snapshot BEFORE the current params
      return {
        params: state.history[state.historyIndex],
        historyIndex: state.historyIndex - 1,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return {
        params: state.history[newIndex],
        historyIndex: newIndex,
      }
    }),

  resetToBaseline: () =>
    set((state) => ({
      params: state.baseline,
      history: [],
      historyIndex: -1,
    })),

  setComparePreset: (id) => set({ comparePresetId: id }),
  }),
  {
    name: 'mri-protocol-store',
    storage: createJSONStorage(() => localStorage),
    // persist only the key state (skip transient UI state and large history)
    partialize: (state) => ({
      params: state.params,
      activePresetId: state.activePresetId,
      activeBodyPartId: state.activeBodyPartId,
      activeGroupId: state.activeGroupId,
      activeVariantId: state.activeVariantId,
      activeColumnIndex: state.activeColumnIndex,
      baseline: state.baseline,
      comparePresetId: state.comparePresetId,
    }),
  }
))
