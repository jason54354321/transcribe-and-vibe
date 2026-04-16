import { MODELS, DEFAULT_MODEL } from '../models'
import type { BackendInfo } from '../composables/useBackendTranscriber'

export type ModelOption = {
  id: string
  label: string
}

export function getWorkerModelOptions(): ModelOption[] {
  return Object.entries(MODELS).map(([id, cfg]) => ({ id, label: cfg.label }))
}

export function getBackendModelOptions(backendInfo: BackendInfo | null): ModelOption[] {
  return backendInfo?.available_models.map(model => ({ id: model.id, label: model.label })) ?? []
}

export function getVisibleModelOptions(useBackend: boolean, backendOptions: ModelOption[]): ModelOption[] {
  return useBackend && backendOptions.length > 0 ? backendOptions : getWorkerModelOptions()
}

export function getNormalizedModelForMode(selectedModel: string, useBackend: boolean, backendInfo: BackendInfo | null): string {
  if (useBackend) {
    if (!backendInfo) return selectedModel
    const availableIds = new Set(backendInfo.available_models.map(model => model.id))
    return availableIds.has(selectedModel) ? selectedModel : backendInfo.default_model
  }

  return selectedModel in MODELS ? selectedModel : DEFAULT_MODEL
}

export function resolveBackendModel(selectedModel: string, backendInfo: BackendInfo | null): string | undefined {
  if (!backendInfo) return undefined
  const availableIds = new Set(backendInfo.available_models.map(model => model.id))
  return availableIds.has(selectedModel) ? selectedModel : backendInfo.default_model
}
