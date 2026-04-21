<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'file-selected', file: File): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    emit('file-selected', files[0])
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('file-selected', target.files[0])
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div
    id="drop-zone"
    class="drop-zone"
    :class="{ 'drag-over': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="triggerFileInput"
  >
    <p>
      Drag & drop audio file here<br /><span style="font-size: 12px; opacity: 0.7"
        >(mp3, wav, m4a, ogg • Max 100MB)</span
      >
    </p>
    <div class="btn">Select File</div>
    <input
      type="file"
      id="file-input"
      ref="fileInput"
      hidden
      accept="audio/mpeg,audio/wav,audio/x-m4a,audio/ogg,audio/mp4"
      @change="handleFileChange"
    />
  </div>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius);
  padding: calc(var(--spacing-unit) * 4);
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
  background: var(--panel-bg);
}

.drop-zone:hover {
  background: var(--hover-bg);
}

.drop-zone.drag-over {
  border-color: var(--accent-color);
  background-color: var(--accent-light);
}

.drop-zone p {
  margin-bottom: var(--spacing-unit);
  color: var(--secondary-text);
}

.btn {
  display: inline-block;
  background-color: var(--button-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.btn:hover {
  background-color: var(--button-hover-bg);
}
</style>
