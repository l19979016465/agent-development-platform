<template>
  <div class="kb-list-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索知识库名称或描述"
        :prefix-icon="Search"
        clearable
        class="toolbar__search"
      />
      <el-select v-model="group" placeholder="全部群组" clearable class="toolbar__select">
        <el-option v-for="g in KB_GROUPS" :key="g" :label="g" :value="g" />
      </el-select>
      <div class="toolbar__spacer" />
      <el-button type="primary" :icon="Plus" @click="dialogRef.open()">新建知识库</el-button>
    </div>

    <p class="result-bar">
      共 <b>{{ filtered.length }}</b> 个知识库
    </p>

    <!-- 知识库卡片 -->
    <div v-loading="store.listLoading" class="kb-grid-wrap">
      <div v-if="filtered.length" class="kb-grid">
        <div
          v-for="kb in filtered"
          :key="kb.id"
          class="kb-card"
          @click="openDetail(kb)"
        >
          <div class="kb-card__head">
            <span class="kb-card__icon">
              <el-icon :size="20"><Collection /></el-icon>
            </span>
            <div class="kb-card__title">
              <b>{{ kb.name }}</b>
              <el-tag size="small" effect="plain">{{ kb.group }}</el-tag>
            </div>
            <el-dropdown trigger="click" @command="(c) => onCommand(c, kb)">
              <el-icon class="kb-card__more" @click.stop><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="open">打开</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <p class="kb-card__desc">{{ kb.description }}</p>

          <div class="kb-card__stats">
            <span><b>{{ kb.docCount }}</b> 文档</span>
            <span><b>{{ kb.chunkCount }}</b> 切片</span>
          </div>

          <div class="kb-card__footer">
            <span class="kb-card__model">{{ modelLabel(kb.vectorModel) }}</span>
            <span class="kb-card__time">{{ formatDate(kb.updatedAt) }} 更新</span>
          </div>
        </div>
      </div>

      <el-empty v-else-if="!store.listLoading" description="还没有知识库，点击右上角新建一个吧">
        <el-button type="primary" :icon="Plus" @click="dialogRef.open()">新建知识库</el-button>
      </el-empty>
    </div>

    <KnowledgeFormDialog ref="dialogRef" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Collection, MoreFilled } from '@element-plus/icons-vue'

import KnowledgeFormDialog from './components/KnowledgeFormDialog.vue'
import { useKnowledgeStore } from '../../stores/knowledge'
import { KB_GROUPS } from '../../api/knowledge'
import { modelLabel } from '../../api/model'

const router = useRouter()
const store = useKnowledgeStore()

const dialogRef = ref(null)
const keyword = ref('')
const group = ref('')

onMounted(() => store.fetchList())

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return store.list.filter((kb) => {
    const matchKw = !kw || kb.name.toLowerCase().includes(kw) || kb.description.toLowerCase().includes(kw)
    const matchGroup = !group.value || kb.group === group.value
    return matchKw && matchGroup
  })
})


function formatDate(ts) {
  const diff = Date.now() - ts
  const day = 24 * 3600 * 1000
  if (diff < 3600 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

function openDetail(kb) {
  router.push(`/knowledge/${kb.id}`)
}

async function onCommand(command, kb) {
  if (command === 'open') return openDetail(kb)
  if (command !== 'delete') return

  try {
    await ElMessageBox.confirm(
      `确定要删除「${kb.name}」吗？其下的 ${kb.docCount} 个文档与全部切片将一并删除。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
  } catch {
    return
  }
  await store.remove(kb.id)
  ElMessage.success('已删除')
}
</script>

<style scoped>
.kb-list-view {
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.toolbar__search {
  width: 260px;
}

.toolbar__select {
  width: 150px;
}

.toolbar__spacer {
  flex: 1;
}

.result-bar {
  margin: 18px 4px 12px;
  font-size: 13px;
  color: #94a3b8;
}

.result-bar b {
  color: #6366f1;
  font-size: 15px;
  margin: 0 2px;
}

.kb-grid-wrap {
  min-height: 240px;
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 16px;
}

.kb-card {
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
  cursor: pointer;
  transition: all 0.25s ease;
}

.kb-card:hover {
  transform: translateY(-4px);
  border-color: #c7d2fe;
  box-shadow: 0 12px 28px rgba(99, 102, 241, 0.14);
}

.kb-card__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.kb-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 11px;
  color: #6366f1;
  background: #eef2ff;
}

.kb-card__title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.kb-card__title b {
  font-size: 15.5px;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.kb-card__more {
  color: #cbd5e1;
  cursor: pointer;
  margin-top: 4px;
}

.kb-card__more:hover {
  color: #6366f1;
}

.kb-card__desc {
  margin: 14px 0;
  font-size: 12.5px;
  line-height: 1.65;
  color: #64748b;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.kb-card__stats {
  display: flex;
  gap: 22px;
  padding: 12px 0;
  border-top: 1px dashed #eef0f4;
  font-size: 12.5px;
  color: #94a3b8;
}

.kb-card__stats b {
  color: #6366f1;
  font-size: 15px;
  margin-right: 3px;
}

.kb-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  color: #a0aec0;
}

.kb-card__model {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .toolbar__search,
  .toolbar__select {
    width: 100%;
  }
}
</style>
