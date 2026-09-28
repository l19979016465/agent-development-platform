<template>
  <div class="agent-list-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索智能体名称或简介"
        :prefix-icon="Search"
        clearable
        class="toolbar__search"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />

      <el-select v-model="query.status" placeholder="全部状态" clearable class="toolbar__select" @change="handleSearch">
        <el-option v-for="(v, k) in STATUS_MAP" :key="k" :label="v.label" :value="k" />
      </el-select>

      <el-select v-model="query.category" placeholder="全部分类" clearable class="toolbar__select" @change="handleSearch">
        <el-option v-for="c in CATEGORY_OPTIONS" :key="c" :label="c" :value="c" />
      </el-select>

      <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>

      <div class="toolbar__spacer" />

      <el-button type="primary" :icon="Plus" @click="handleCreate">新建智能体</el-button>
    </div>

    <!-- 结果统计 -->
    <p class="result-bar">
      共 <b>{{ total }}</b> 个智能体
      <span v-if="hasFilter">（已按条件筛选）</span>
    </p>

    <!-- 列表 -->
    <div v-loading="loading" class="agent-grid-wrap">
      <div v-if="list.length" class="agent-grid">
        <AgentCard
          v-for="agent in list"
          :key="agent.id"
          :agent="agent"
          @edit="handleEdit"
          @debug="handleDebug"
          @toggle="handleToggle"
          @copy="handleCopy"
          @delete="handleDelete"
        />
      </div>

      <el-empty v-else-if="!loading" description="暂无智能体，点击右上角新建一个吧">
        <el-button type="primary" :icon="Plus" @click="handleCreate">新建智能体</el-button>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div v-if="total > query.pageSize" class="pagination">
      <el-pagination
        v-model:current-page="query.page"
        :page-size="query.pageSize"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新建/编辑弹窗 -->
    <AgentFormDialog ref="dialogRef" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, RefreshLeft } from '@element-plus/icons-vue'

import AgentCard from './components/AgentCard.vue'
import AgentFormDialog from './components/AgentFormDialog.vue'
import { useAgentStore } from '../../stores/agent'
import { CATEGORY_OPTIONS, STATUS_MAP } from '../../api/agent'

const agentStore = useAgentStore()
const router = useRouter()

const dialogRef = ref(null)

const list = computed(() => agentStore.list)
const total = computed(() => agentStore.total)
const loading = computed(() => agentStore.loading)
const query = computed(() => agentStore.query)
const hasFilter = computed(() => !!(query.value.keyword || query.value.status || query.value.category))

onMounted(load)

function load() {
  agentStore.fetchList()
  agentStore.fetchAll()
}

function handleSearch() {
  agentStore.query.page = 1
  agentStore.fetchList()
}

function handleReset() {
  agentStore.resetQuery()
  agentStore.fetchList()
}

function handlePageChange() {
  agentStore.fetchList()
}

function handleCreate() {
  dialogRef.value.open()
}

function handleEdit(agent) {
  dialogRef.value.open(agent)
}

function handleDebug(agent) {
  // 携带智能体 id 跳转到对话调试页，由该页自动选中
  router.push({ path: '/chat', query: { agentId: agent.id } })
}

async function handleToggle(agent) {
  const willPublish = agent.status !== 'published'
  try {
    await ElMessageBox.confirm(
      willPublish ? `确定要发布「${agent.name}」吗？` : `确定要下线「${agent.name}」吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  await agentStore.toggleStatus(agent.id)
  ElMessage.success(willPublish ? '已发布' : '已下线')
}

async function handleCopy(agent) {
  const { id, conversations, createdAt, updatedAt, ...rest } = agent
  await agentStore.create({ ...rest, name: `${agent.name} 副本`, status: 'draft' })
  ElMessage.success('已复制为新草稿')
}

async function handleDelete(agent) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${agent.name}」吗？删除后不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
  } catch {
    return
  }
  await agentStore.remove(agent.id)
  ElMessage.success('已删除')
}
</script>

<style scoped>
.agent-list-view {
  max-width: 1200px;
  margin: 0 auto;
}

/* ---------- 工具栏 ---------- */
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
  width: 140px;
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

/* ---------- 卡片网格 ---------- */
.agent-grid-wrap {
  min-height: 260px;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 26px;
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
