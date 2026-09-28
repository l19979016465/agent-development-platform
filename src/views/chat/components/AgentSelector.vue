<template>
  <div class="agent-selector">
    <div class="agent-selector__head">
      <b>选择智能体</b>
      <el-input
        v-model="keyword"
        placeholder="搜索"
        :prefix-icon="Search"
        size="small"
        clearable
      />
    </div>

    <div v-loading="agentStore.loading" class="agent-selector__list">
      <div
        v-for="agent in filtered"
        :key="agent.id"
        class="selector-item"
        :class="{ 'is-active': agent.id === activeId }"
        @click="$emit('select', agent.id)"
      >
        <span class="selector-item__avatar">{{ agent.avatar }}</span>
        <div class="selector-item__info">
          <b>{{ agent.name }}</b>
          <span>{{ agent.category }}</span>
        </div>
        <span class="selector-item__dot" :style="{ background: dotColor(agent.status) }" />
      </div>

      <el-empty v-if="!filtered.length && !agentStore.loading" description="没有匹配的智能体" :image-size="60" />
    </div>

    <div class="agent-selector__foot">
      <el-icon><InfoFilled /></el-icon>
      仅「已发布」的智能体可对外服务，草稿也可用于调试
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Search, InfoFilled } from '@element-plus/icons-vue'
import { useAgentStore } from '../../../stores/agent'

defineProps({
  activeId: { type: Number, default: null },
})

defineEmits(['select'])

const agentStore = useAgentStore()
const keyword = ref('')

onMounted(() => agentStore.fetchAll())

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = [...agentStore.all].sort((a, b) => b.updatedAt - a.updatedAt)
  if (!kw) return list
  return list.filter((a) => a.name.toLowerCase().includes(kw))
})

function dotColor(status) {
  return { published: '#10b981', draft: '#94a3b8', offline: '#f59e0b' }[status] || '#94a3b8'
}
</script>

<style scoped>
.agent-selector {
  display: flex;
  flex-direction: column;
  width: 250px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 14px;
  overflow: hidden;
}

.agent-selector__head {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.agent-selector__head b {
  font-size: 14px;
  color: #1e293b;
}

.agent-selector__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 200px;
}

.selector-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.selector-item:hover {
  background: #f8fafc;
}

.selector-item.is-active {
  background: #eef2ff;
}

.selector-item__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  font-size: 17px;
  border-radius: 9px;
  background: linear-gradient(135deg, #eef2ff, #f3e8ff);
}

.selector-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selector-item__info b {
  font-size: 13.5px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selector-item__info span {
  font-size: 11.5px;
  color: #94a3b8;
}

.selector-item__dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
}

.agent-selector__foot {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 11px 14px;
  font-size: 11.5px;
  line-height: 1.55;
  color: #94a3b8;
  background: #fafbfc;
  border-top: 1px solid #f1f5f9;
}

@media (max-width: 900px) {
  .agent-selector {
    width: 100%;
  }

  .agent-selector__list {
    max-height: 180px;
  }
}
</style>
