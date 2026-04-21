import { describe, it, expect } from 'vitest'
import {
  getBackendModelOptions,
  getNormalizedModelForMode,
  getVisibleModelOptions,
  getWorkerModelOptions,
  resolveBackendModel,
} from './modelMode'
import type { BackendInfo } from '../composables/useBackendTranscriber'

const backendInfo: BackendInfo = {
  hardware: 'apple_silicon',
  device: 'Apple M4',
  memory_gb: 16,
  engine: 'mlx-whisper',
  default_model: 'large-v3-turbo',
  available_models: [
    { id: 'large-v3-turbo', label: 'Large V3 Turbo', description: '', vram_mb: 1500 },
    { id: 'small', label: 'Small', description: '', vram_mb: 500 },
  ],
}

describe('modelMode', () => {
  it('returns worker model options from local registry', () => {
    const options = getWorkerModelOptions()
    expect(options.map((option) => option.id)).toContain('onnx-community/whisper-small_timestamped')
    expect(options.map((option) => option.label)).toContain('Small')
  })

  it('returns backend model options from backend info', () => {
    expect(getBackendModelOptions(backendInfo)).toEqual([
      { id: 'large-v3-turbo', label: 'Large V3 Turbo' },
      { id: 'small', label: 'Small' },
    ])
  })

  it('shows backend options only when backend mode has options', () => {
    const backendOptions = getBackendModelOptions(backendInfo)
    expect(getVisibleModelOptions(true, backendOptions)).toEqual(backendOptions)
    expect(getVisibleModelOptions(true, [])).toEqual(getWorkerModelOptions())
    expect(getVisibleModelOptions(false, backendOptions)).toEqual(getWorkerModelOptions())
  })

  it('normalizes selected model for backend mode', () => {
    expect(getNormalizedModelForMode('small', true, backendInfo)).toBe('small')
    expect(
      getNormalizedModelForMode('onnx-community/whisper-small_timestamped', true, backendInfo),
    ).toBe('large-v3-turbo')
  })

  it('normalizes selected model for worker mode', () => {
    expect(
      getNormalizedModelForMode('onnx-community/whisper-small_timestamped', false, backendInfo),
    ).toBe('onnx-community/whisper-small_timestamped')
    expect(getNormalizedModelForMode('small', false, backendInfo)).toBe(
      'onnx-community/whisper-small_timestamped',
    )
  })

  it('resolves backend model with fallback', () => {
    expect(resolveBackendModel('small', backendInfo)).toBe('small')
    expect(resolveBackendModel('onnx-community/whisper-small_timestamped', backendInfo)).toBe(
      'large-v3-turbo',
    )
    expect(resolveBackendModel('small', null)).toBeUndefined()
  })
})
