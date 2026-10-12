<template>
  <div class="user-list-view">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="query.keyword"
        class="toolbar__search"
        placeholder="搜索账号或昵称"
        :prefix-icon="Search"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />

      <el-select
        v-model="query.role"
        class="toolbar__select"
        placeholder="全部角色"
        clearable
        @change="handleSearch"
      >
        <el-option v-for="r in ROLE_OPTIONS" :key="r" :label="r" :value="r" />
      </el-select>

      <el-select
        v-model="query.org"
        class="toolbar__select"
        placeholder="全部组织"
        clearable
        @change="handleSearch"
      >
        <el-option v-for="o in ORG_FILTER_OPTIONS" :key="o" :label="o" :value="o" />
      </el-select>

      <el-select
        v-model="query.status"
        class="toolbar__select"
        placeholder="全部状态"
        clearable
        @change="handleSearch"
      >
        <el-option v-for="(v, k) in STATUS_MAP" :key="k" :label="v.label" :value="k" />
      </el-select>

      <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>

      <div class="toolbar__spacer" />

      <el-button type="primary" :icon="Plus" @click="formDialogRef.open()">新建用户</el-button>
    </div>

    <div class="result-bar">
      共 <b>{{ total }}</b> 个用户
    </div>

    <!-- 用户表格 -->
    <div class="table-card">
      <el-table v-loading="loading" :data="list" style="width: 100%">
        <el-table-column prop="username" label="账号" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="110" />

        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="ROLE_TAG_MAP[row.role]?.type" size="small" effect="light" round>
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="org" label="所属组织" width="110" />

        <el-table-column label="模块权限" min-width="200">
          <template #default="{ row }">
            <el-tag v-if="hasAllPermissions(row)" size="small" effect="plain" round>全部</el-tag>
            <template v-else>
              <el-tag
                v-for="p in row.permissions"
                :key="p"
                class="perm-tag"
                size="small"
                effect="plain"
                type="info"
              >
                {{ PERMISSION_MAP[p]?.label || p }}
              </el-tag>
              <span v-if="!row.permissions?.length" class="perm-empty">无</span>
            </template>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type" size="small" effect="light" round>
              {{ STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" width="110">
          <template #default="{ row }">
            <span class="time-cell">{{ formatTime(row.updatedAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="formDialogRef.open(row)">
              编辑
            </el-button>
            <el-button link type="primary" size="small" @click="resetDialogRef.open(row)">
              重置密码
            </el-button>

            <el-tooltip :disabled="!disableReason(row, 'toggle')" :content="disableReason(row, 'toggle')">
              <span>
                <el-button
                  link
                  type="warning"
                  size="small"
                  :disabled="!!disableReason(row, 'toggle')"
                  @click="handleToggle(row)"
                >
                  {{ row.status === 'active' ? '停用' : '启用' }}
                </el-button>
              </span>
            </el-tooltip>

            <el-tooltip :disabled="!disableReason(row, 'delete')" :content="disableReason(row, 'delete')">
              <span>
                <el-button
                  link
                  type="danger"
                  size="small"
                  :disabled="!!disableReason(row, 'delete')"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="没有符合条件的用户" :image-size="80" />
        </template>
      </el-table>
    </div>

    <div v-if="total > query.pageSize" class="pagination">
      <el-pagination
        v-model:current-page="query.page"
        :page-size="query.pageSize"
        :total="total"
        layout="prev, pager, next"
        background
        @current-change="handlePageChange"
      />
    </div>

    <UserFormDialog ref="formDialogRef" />
    <ResetPasswordDialog ref="resetDialogRef" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, RefreshLeft } from '@element-plus/icons-vue'

import UserFormDialog from './components/UserFormDialog.vue'
import ResetPasswordDialog from './components/ResetPasswordDialog.vue'
import { useUsersStore } from '../../stores/users'
import { useAuthStore } from '../../stores/auth'
import {
  ROLE_OPTIONS,
  ROLE_ADMIN,
  ROLE_TAG_MAP,
  ORG_OPTIONS,
  DEFAULT_ORG,
  PERMISSION_KEYS,
  PERMISSION_MAP,
  STATUS_MAP,
} from '../../api/users'

const userStore = useUsersStore()
const auth = useAuthStore()

const formDialogRef = ref(null)
const resetDialogRef = ref(null)

const query = computed(() => userStore.query)
const list = computed(() => userStore.list)
const total = computed(() => userStore.total)
const loading = computed(() => userStore.loading)

// 筛选用的组织选项要带上「未分配」，与表单里的可选值保持一致
const ORG_FILTER_OPTIONS = [DEFAULT_ORG, ...ORG_OPTIONS]

onMounted(load)

function load() {
  userStore.fetchList()
  userStore.fetchAll()
}

function handleSearch() {
  userStore.query.page = 1
  userStore.fetchList()
}

function handleReset() {
  userStore.resetQuery()
  userStore.fetchList()
}

function handlePageChange() {
  userStore.fetchList()
}

/** 权限是否已全开（管理员恒为全部） */
function hasAllPermissions(row) {
  return row.role === ROLE_ADMIN || (row.permissions?.length || 0) === PERMISSION_KEYS.length
}

/**
 * 返回按钮被禁用的原因，空字符串表示可用。
 * 界面层的拦截用于给出解释，接口层还会再拦截一次。
 */
function disableReason(row, action) {
  const isSelf = row.username === auth.user?.username
  if (action === 'delete') {
    if (isSelf) return '不能删除当前登录账号'
    if (row.role === ROLE_ADMIN && userStore.adminCount === 1) return '系统至少需要保留一名管理员'
  }
  if (action === 'toggle' && isSelf && row.status === 'active') return '不能停用当前登录账号'
  return ''
}

async function handleToggle(row) {
  const next = row.status === 'active' ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(
      next === '停用'
        ? `停用后「${row.nickname}」将无法登录，确定停用吗？`
        : `确定要启用「${row.nickname}」吗？`,
      `${next}确认`,
      { confirmButtonText: next, cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return // 用户取消
  }
  await userStore.toggleStatus(row.username)
  ElMessage.success(`已${next}`)
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${row.nickname}」吗？删除后不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
  } catch {
    return
  }
  await userStore.remove(row.username)
  ElMessage.success('已删除')
}

function formatTime(ts) {
  const diff = Date.now() - ts
  const day = 24 * 60 * 60 * 1000
  if (diff < 60 * 60 * 1000) return '刚刚'
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / day)} 天前`
}
</script>

<style scoped>
.user-list-view {
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
  width: 220px;
}

.toolbar__select {
  width: 130px;
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

/* ---------- 表格 ---------- */
.table-card {
  padding: 6px 16px 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.table-card :deep(.el-table) {
  --el-table-border-color: #f1f5f9;
}

.table-card :deep(.el-table th.el-table__cell) {
  color: #64748b;
  font-weight: 600;
  font-size: 13px;
  background: #fbfcfe;
}

.perm-tag {
  margin-right: 4px;
}

.perm-empty {
  color: #cbd5e1;
  font-size: 13px;
}

.time-cell {
  color: #94a3b8;
  font-size: 13px;
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
