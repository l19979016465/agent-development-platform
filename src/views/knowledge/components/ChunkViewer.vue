<template>
  <div class="chunk-viewer">
    <!-- 左：切片列表 -->
    <div class="chunk-panel">
      <div class="chunk-panel__head">
        <b>切片列表</b>
        <span class="chunk-panel__count">共 {{ chunks.length }} 个切片</span>
      </div>

      <div class="chunk-list">
        <div
          v-for="chunk in chunks"
          :key="chunk.id"
          class="chunk-item"
          :class="{ 'is-active': chunk.id === activeChunkId }"
          @click="$emit('select', chunk.id)"
        >
          <div class="chunk-item__head">
            <span class="chunk-item__index">#{{ chunk.index }}</span>
            <span class="chunk-item__tokens">{{ chunk.tokens }} tokens</span>
          </div>
          <p class="chunk-item__text">{{ chunk.text }}</p>
        </div>
      </div>
    </div>

    <!-- 右：原文（选中切片高亮） -->
    <div class="origin-panel">
      <div class="origin-panel__head">
        <b>原文对照</b>
        <span v-if="activeChunk" class="origin-panel__hint">
          已定位到第 <em>{{ activeChunk.index }}</em> 个切片
          （第 {{ activeChunk.start }}–{{ activeChunk.end }} 字符）
        </span>
        <span v-else class="origin-panel__hint">点击左侧切片可定位原文</span>
      </div>

      <div class="origin-text">
        <template v-if="activeChunk">
          <span>{{ before }}</span><mark class="hl">{{ highlighted }}</mark><span>{{ after }}</span>
        </template>
        <template v-else>{{ content }}</template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  doc: { type: Object, default: null },
  chunks: { type: Array, default: () => [] },
  activeChunkId: { type: String, default: null },
})

defineEmits(['select'])

const content = computed(() => props.doc?.content || '')

const activeChunk = computed(
  () => props.chunks.find((c) => c.id === props.activeChunkId) || null
)

const before = computed(() => content.value.slice(0, activeChunk.value?.start ?? 0))
const highlighted = computed(() =>
  content.value.slice(activeChunk.value?.start ?? 0, activeChunk.value?.end ?? 0)
)
const after = computed(() => content.value.slice(activeChunk.value?.end ?? 0))
</script>

<style scoped>
.chunk-viewer {
  display: flex;
  gap: 16px;
  height: calc(100vh - 300px);
  min-height: 380px;
}

/* ---------- 切片列表 ---------- */
.chunk-panel {
  display: flex;
  flex-direction: column;
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid #f1f5f9;
  padding-right: 16px;
}

.chunk-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
}

.chunk-panel__head b {
  font-size: 14px;
  color: #1e293b;
}

.chunk-panel__count {
  font-size: 12px;
  color: #94a3b8;
}

.chunk-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.chunk-item {
  padding: 11px 13px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid #eef0f4;
  cursor: pointer;
  transition: all 0.2s;
}

.chunk-item:hover {
  border-color: #c7d2fe;
  background: #fafbff;
}

.chunk-item.is-active {
  border-color: #6366f1;
  background: #eef2ff;
}

.chunk-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.chunk-item__index {
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
}

.chunk-item__tokens {
  font-size: 11px;
  color: #a0aec0;
}

.chunk-item__text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- 原文区 ---------- */
.origin-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.origin-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
}

.origin-panel__head b {
  font-size: 14px;
  color: #1e293b;
}

.origin-panel__hint {
  font-size: 12px;
  color: #94a3b8;
}

.origin-panel__hint em {
  color: #6366f1;
  font-style: normal;
  font-weight: 600;
}

.origin-text {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 2;
  color: #475569;
  background: #fafbfc;
  border: 1px solid #f1f5f9;
  white-space: pre-wrap;
  word-break: break-word;
}

.hl {
  padding: 2px 3px;
  border-radius: 3px;
  background: #fde68a;
  color: #92400e;
  font-weight: 500;
  transition: background 0.3s;
}

@media (max-width: 900px) {
  .chunk-viewer {
    flex-direction: column;
    height: auto;
  }

  .chunk-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #f1f5f9;
    padding: 0 0 16px;
  }

  .chunk-list {
    max-height: 220px;
  }

  .origin-text {
    max-height: 320px;
  }
}
</style>
