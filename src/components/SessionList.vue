<script setup lang="ts">
import { ref } from 'vue'

type Session = {
  id: string
  name: string
  createdAt: number
  durationSec: number
}

defineProps<{
  sessions: Session[]
  activeSessionId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'new-session'): void
}>()

const isOpen = ref(false)

function toggleSidebar() {
  isOpen.value = !isOpen.value
}

function closeSidebar() {
  isOpen.value = false
}

function handleDelete(id: string, event: Event) {
  event.stopPropagation()
  if (window.confirm('Are you sure you want to delete this session?')) {
    emit('delete', id)
  }
}

function handleSelect(id: string) {
  emit('select', id)
  closeSidebar()
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}
</script>

<template>
  <button class="mobile-toggle" @click="toggleSidebar" aria-label="Toggle session sidebar">
    ☰
  </button>

  <div v-if="isOpen" class="sidebar-backdrop" @click="closeSidebar"></div>

  <aside
    id="session-sidebar"
    class="sidebar"
    :class="{ 'is-open': isOpen }"
    role="navigation"
    aria-label="Session history"
  >
    <div class="sidebar-header">
      <h1 class="app-title">Vibe</h1>
      <button class="new-btn" @click="emit('new-session')">+ New</button>
    </div>

    <div class="session-list">
      <div v-if="sessions.length === 0" class="empty-state">No sessions yet</div>

      <div
        v-else
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ 'is-active': session.id === activeSessionId }"
        role="button"
        tabindex="0"
        @click="handleSelect(session.id)"
        @keydown.enter="handleSelect(session.id)"
        @keydown.space.prevent="handleSelect(session.id)"
      >
        <div class="session-info">
          <div class="session-name" :title="session.name">{{ session.name }}</div>
          <div class="session-meta">
            <span>{{ formatRelativeTime(session.createdAt) }}</span>
            <span>&middot;</span>
            <span>{{ formatDuration(session.durationSec) }}</span>
          </div>
        </div>
        <button
          class="delete-btn"
          aria-label="Delete session"
          @click="handleDelete(session.id, $event)"
        >
          &times;
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.mobile-toggle {
  display: none;
  position: fixed;
  top: calc(var(--spacing-unit) * 1);
  left: calc(var(--spacing-unit) * 1);
  z-index: 100;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: calc(var(--spacing-unit) * 0.5);
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-color);
}

.sidebar-backdrop {
  display: none;
}

.sidebar {
  width: 260px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--panel-bg);
  border-right: 1px solid var(--divider-color);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  transition: transform 0.2s ease;
}

.sidebar-header {
  padding: calc(var(--spacing-unit) * 1.5) calc(var(--spacing-unit) * 1);
  border-bottom: 1px solid var(--divider-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-color);
}

.new-btn {
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--radius);
  padding: calc(var(--spacing-unit) * 0.5) calc(var(--spacing-unit) * 1);
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.new-btn:hover {
  opacity: 0.9;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: calc(var(--spacing-unit) * 0.5) 0;
}

.empty-state {
  text-align: center;
  color: var(--secondary-text);
  padding: calc(var(--spacing-unit) * 2);
  font-size: 0.9rem;
}

.session-item {
  padding: calc(var(--spacing-unit) * 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s ease;
  border-left: 3px solid transparent;
}

.session-item:hover {
  background: var(--hover-bg);
}

.session-item.is-active {
  background: var(--hover-bg);
  border-left-color: var(--accent-color);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: calc(var(--spacing-unit) * 0.25);
}

.session-meta {
  font-size: 0.8rem;
  color: var(--secondary-text);
  display: flex;
  gap: calc(var(--spacing-unit) * 0.5);
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--error-color);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 calc(var(--spacing-unit) * 0.25);
  opacity: 0;
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  transform: scale(1.1);
}

@media (max-width: 600px) {
  .mobile-toggle {
    display: block;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 101;
    transform: translateX(-100%);
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
  }
}
</style>
