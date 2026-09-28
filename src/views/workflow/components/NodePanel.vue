<template>
  <div class="node-panel">
    <el-input
      v-model="keyword"
      placeholder="搜索节点"
      :prefix-icon="Search"
      size="small"
      clearable
      class="node-panel__search"
    />

    <div class="node-panel__list">
      <template v-for="g in groups" :key="g.key">
        <template v-if="grouped[g.key]?.length">
          <div class="node-panel__group">{{ g.label }}</div>
          <div
            v-for="n in grouped[g.key]"
            :key="n.type"
            class="node-item"
            draggable="true"
            :title="n.desc"
            @dragstart="onDragStart(n, $event)"
            @dblclick="$emit('add', n.type)"
          >
            <span class="node-item__icon" :style="{ color: n.color, background: `${n.color}14` }">
              <el-icon :size="15"><component :is="iconOf(n.icon)" /></el-icon>
            </span>
            <div class="node-item__text">
              <div class="node-item__label">{{ n.label }}</div>
              <div class="node-item__desc">{{ n.desc }}</div>
            </div>
          </div>
        </template>
      </template>

      <el-empty v-if="!filtered.length" description="没有匹配的节点" :image-size="60" />
    </div>

    <p class="node-panel__tip">拖动节点到画布，或双击直接添加</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { NODE_TYPES, NODE_GROUPS } from '../../../api/workflow'
import { iconOf } from '../icons'

defineEmits(['add'])

const keyword = ref('')

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return NODE_TYPES
  return NODE_TYPES.filter(
    (n) => n.label.toLowerCase().includes(k) || n.desc.toLowerCase().includes(k)
  )
})

const groups = computed(() => NODE_GROUPS)

const grouped = computed(() => {
  const map = {}
  NODE_GROUPS.forEach((g) => {
    map[g.key] = filtered.value.filter((n) => n.group === g.key)
  })
  return map
})

function onDragStart(node, e) {
  e.dataTransfer.setData('node-type', node.type)
  e.dataTransfer.effectAllowed = 'copy'
}
</script>

<style scoped>
.node-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef0f4;
  overflow: hidden;
}

.node-panel__search {
  margin: 12px;
  width: calc(100% - 24px);
}

.node-panel__list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.node-panel__group {
  padding: 10px 6px 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: #a0aec0;
  letter-spacing: 0.4px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border-radius: 8px;
  cursor: grab;
  transition: background 0.15s;
}

.node-item:hover {
  background: #f6f8fc;
}

.node-item:active {
  cursor: grabbing;
}

.node-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 7px;
}

.node-item__text {
  min-width: 0;
}

.node-item__label {
  font-size: 12.5px;
  font-weight: 500;
  color: #334155;
}

.node-item__desc {
  margin-top: 1px;
  font-size: 11px;
  color: #a0aec0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-panel__tip {
  margin: 0;
  padding: 9px 12px;
  border-top: 1px solid #f1f5f9;
  background: #fcfcfd;
  font-size: 11.5px;
  color: #a0aec0;
  text-align: center;
}
</style>
