<template>
  <div class="flow-list">
    <!-- 筛选栏 -->
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索工作流名称或说明"
        :prefix-icon="Search"
        clearable
        class="toolbar__search"
      />
      <el-select v-model="status" placeholder="全部状态" clearable class="toolbar__select">
        <el-option label="已发布" value="published" />
        <el-option label="草稿" value="draft" />
        <el-option label="已下线" value="offline" />
      </el-select>
      <span class="toolbar__spacer"></span>
      <el-button type="primary" :icon="Plus" @click="dialogRef.open()">新建工作流</el-button>
    </div>

    <p class="result-count">
      共 <b>{{ filtered.length }}</b> 个工作流
    </p>

    <div v-loading="store.listLoading" class="flow-grid-wrap">
      <div v-if="filtered.length" class="flow-grid">
        <div v-for="f in filtered" :key="f.id" class="flow-card">
          <div class="flow-card__head">
            <span class="flow-card__cover">{{ f.cover }}</span>
            <div class="flow-card__title">
              <div class="flow-card__name" :title="f.name">{{ f.name }}</div>
              <div class="flow-card__time">更新于 {{ formatDate(f.updatedAt) }}</div>
            </div>
            <el-tag :type="statusTag(f).type" size="small" effect="light">
              {{ statusTag(f).label }}
            </el-tag>
          </div>

          <p class="flow-card__desc">{{ f.description }}</p>

          <div class="flow-card__meta">
            <span><b>{{ f.nodeCount }}</b> 节点</span>
            <span><b>{{ f.runs }}</b> 次运行</span>
            <span>{{ scopeLabel(f.publishScope) }}可见</span>
          </div>

          <div class="flow-card__foot">
            <el-button link type="primary" size="small" :icon="EditPen" @click="edit(f)">
              编排
            </el-button>
            <el-button link size="small" :icon="CopyDocument" @click="duplicate(f)">复制</el-button>
            <el-button link size="small" :icon="Download" @click="exportFlow(f)">导出</el-button>
            <el-button
              v-if="f.status === 'published'"
              link
              type="warning"
              size="small"
              @click="offline(f)"
            >
              下线
            </el-button>
            <el-button v-else link type="success" size="small" @click="publish(f)">发布</el-button>
            <span class="flow-card__spacer"></span>
            <el-button link type="danger" size="small" @click="remove(f)">删除</el-button>
          </div>
        </div>
      </div>
      <el-empty v-else description="没有符合条件的工作流" :image-size="100" />
    </div>

    <WorkflowFormDialog ref="dialogRef" @created="edit" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, EditPen, CopyDocument, Download } from '@element-plus/icons-vue'

import WorkflowFormDialog from './components/WorkflowFormDialog.vue'
import { useWorkflowStore } from '../../stores/workflow'
import { exportWorkflowApi } from '../../api/workflow'

const router = useRouter()
const store = useWorkflowStore()

const dialogRef = ref(null)
const keyword = ref('')
const status = ref('')

const STATUS = {
  published: { label: '已发布', type: 'success' },
  draft: { label: '草稿', type: 'info' },
  offline: { label: '已下线', type: 'warning' },
}

const SCOPE = { personal: '个人', organization: '组织', public: '公开' }

onMounted(() => store.fetchList())

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return store.list.filter((f) => {
    const matchKw = !k || f.name.toLowerCase().includes(k) || f.description.toLowerCase().includes(k)
    const matchStatus = !status.value || f.status === status.value
    return matchKw && matchStatus
  })
})

const statusTag = (f) => STATUS[f.status] || STATUS.draft
const scopeLabel = (s) => SCOPE[s] || '个人'

function formatDate(ts) {
  const diff = Date.now() - ts
  const day = 24 * 3600 * 1000
  if (diff < 3600 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

function edit(flow) {
  router.push(`/workflow/${flow.id}`)
}

async function duplicate(flow) {
  await store.duplicate(flow.id)
  ElMessage.success('已复制为新的草稿')
}

async function publish(flow) {
  try {
    await store.publish(flow.id, { status: 'published' })
    ElMessage.success('工作流已发布')
  } catch (err) {
    ElMessage.error(err.message || '发布失败')
  }
}

async function offline(flow) {
  try {
    await ElMessageBox.confirm('下线后该工作流将不再对外提供服务，确定下线吗？', '下线确认', {
      confirmButtonText: '确定下线',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  await store.publish(flow.id, { status: 'offline' })
  ElMessage.success('工作流已下线')
}

async function remove(flow) {
  try {
    await ElMessageBox.confirm(`确定删除工作流「${flow.name}」吗？该操作不可恢复。`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'error',
    })
  } catch {
    return
  }
  await store.remove(flow.id)
  ElMessage.success('已删除')
}

/** 导出为 JSON 文件，便于在团队间传递 */
async function exportFlow(flow) {
  const data = await exportWorkflowApi(flow.id)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${flow.name}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出为 JSON 文件')
}
</script>

<style scoped>
.flow-list {
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.toolbar__search {
  width: 250px;
}

.toolbar__select {
  width: 132px;
}

.toolbar__spacer {
  flex: 1;
}

.result-count {
  margin: 14px 0 12px;
  padding-left: 4px;
  font-size: 13px;
  color: #94a3b8;
}

.result-count b {
  color: #6366f1;
  font-size: 15px;
  margin: 0 2px;
}

.flow-grid-wrap {
  min-height: 220px;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}

.flow-card {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 18px 18px 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}

.flow-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.09);
  transform: translateY(-2px);
}

.flow-card__head {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.flow-card__cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 11px;
  font-size: 19px;
  background: #eef2ff;
}

.flow-card__title {
  flex: 1;
  min-width: 0;
}

.flow-card__name {
  font-size: 14.5px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-card__time {
  margin-top: 3px;
  font-size: 11.5px;
  color: #a0aec0;
}

.flow-card__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
}

.flow-card__meta {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px dashed #f1f5f9;
  border-bottom: 1px dashed #f1f5f9;
  font-size: 12px;
  color: #94a3b8;
}

.flow-card__meta b {
  color: #6366f1;
}

.flow-card__foot {
  display: flex;
  align-items: center;
  gap: 2px;
}

.flow-card__spacer {
  flex: 1;
}

@media (max-width: 900px) {
  .toolbar__search,
  .toolbar__select {
    width: 100%;
  }

  .toolbar__spacer {
    display: none;
  }
}
</style>
