export type DtypeInfo = { label: string; size: number }
export type ModelConfig = { label: string; dtypes: Record<string, DtypeInfo> }

export const MODELS: Record<string, ModelConfig> = {
  'onnx-community/whisper-base_timestamped': {
    label: 'Base',
    dtypes: {
      q8:   { label: 'q8 (int8)',   size: 77 },
      fp16: { label: 'fp16',        size: 146 },
      q4:   { label: 'q4',          size: 143 },
      fp32: { label: 'fp32',        size: 291 },
    },
  },
  'onnx-community/whisper-small_timestamped': {
    label: 'Small',
    dtypes: {
      q8:   { label: 'q8 (int8)',   size: 249 },
      q4:   { label: 'q4',          size: 300 },
      fp16: { label: 'fp16',        size: 485 },
      fp32: { label: 'fp32',        size: 968 },
    },
  },
  'onnx-community/whisper-medium_timestamped': {
    label: 'Medium',
    dtypes: {
      q4f16: { label: 'q4f16',       size: 517 },
      q4:    { label: 'q4',          size: 679 },
      q8:    { label: 'q8 (int8)',   size: 986 },
      fp16:  { label: 'fp16',        size: 1530 },
      fp32:  { label: 'fp32',        size: 3057 },
    },
  },
}

export const DEFAULT_MODEL = 'onnx-community/whisper-small_timestamped'
export const DEFAULT_DTYPE = 'q8'
