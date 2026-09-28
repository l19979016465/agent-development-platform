<template>
  <div v-loading="!store.current" class="kb-detail">
    <template v-if="store.current">
      <!-- 头部信息 -->
      <div class="kb-head">
        <el-button :icon="ArrowLeft" text @click="router.push('/knowledge')">返回</el-button>
        <span class="kb-head__icon">
          <el-icon :size="22"><Collection /></el-icon>
        </span>
        <div class="kb-head__info">
          <div class="kb-head__name">
            <b>{{ store.current.name }}</b>
            <el-tag size="small" effect="plain">{{ store.current.group }}</el-tag>
          </div>
          <span class="kb-head__meta">
            {{ vectorModelLabel }} · {{ strategyLabel }} · {{ store.documents.length }} 文档 ·
            {{ totalChunks }} 切片
          </span>
        </div>
      </div>

      <p class="kb-desc">{{ store.current.description }}</p>

      <!-- 标签页 -->
      <div class="kb-panel">
        <el-tabs v-model="activeTab">
          <!-- 文档管理 -->
          <el-tab-pane label="文档管理" name="docs">
            <div class="tab-toolbar">
              <span class="tab-toolbar__hint">
                支持 {{ SUPPORTED_EXT.join('、') }} 格式，上传后自动解析清洗并切片
              </span>
              <el-button type="primary" :icon="Upload" @click="uploadRef.open()">上传文档</el-button>
            </div>

            <el-table v-loading="store.docsLoading" :data="store.documents" class="doc-table">
              <el-table-column label="文档名称" min-width="230">
                <template #default="{ row }">
                  <div class="doc-name">
                    <span class="doc-name__ext" :data-ext="row.ext">{{ row.ext.toUpperCase() }}</span>
                    <span class="doc-name__text" :title="row.name">{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column label="大小" width="90">
                <template #default="{ row }">{{ formatSize(row.size) }}</template>
              </el-table-column>

              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="STATUS[row.status].type" size="small" effect="light">
                    <el-icon v-if="row.status === 'parsing'" class="is-loading"><Loading /></el-icon>
                    {{ STATUS[row.status].label }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="标签" min-width="160">
                <template #default="{ row }">
                  <el-tag
                    v-for="t in row.tags"
                    :key="t"
                    size="small"
                    effect="plain"
                    class="doc-tag"
                  >
                    {{ t }}
                  </el-tag>
                  <el-button link size="small" :icon="EditPen" @click="editTags(row)">标签</el-button>
                </template>
              </el-table-column>

              <el-table-column label="切片数" width="85">
                <template #default="{ row }">
                  <span class="doc-chunks">{{ row.chunkCount }}</span>
                </template>
              </el-table-column>

              <el-table-column label="上传时间" width="115">
                <template #default="{ row }">{{ formatDate(row.uploadedAt) }}</template>
              </el-table-column>

              <el-table-column label="操作" width="130" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="viewChunks(row)">
                    查看切片
                  </el-button>
                  <el-button link type="danger" size="small" @click="removeDoc(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 切片查看 -->
          <el-tab-pane label="切片查看" name="chunks">
            <div class="tab-toolbar">
              <el-select
                v-model="selectedDocId"
                placeholder="选择文档"
                class="doc-select"
                @change="handleDocChange"
              >
                <el-option
                  v-for="d in readyDocs"
                  :key="d.id"
                  :label="d.name"
                  :value="d.id"
                />
              </el-select>
              <span class="tab-toolbar__hint">
                点击左侧切片，右侧原文会高亮定位到对应位置
              </span>
            </div>

            <ChunkViewer
              v-if="store.activeDoc"
              :doc="store.activeDoc"
              :chunks="store.chunks"
              :active-chunk-id="store.activeChunkId"
              @select="store.selectChunk"
            />
            <el-empty v-else description="请先选择一篇文档" :image-size="90" />
          </el-tab-pane>

          <!-- 命中测试 -->
          <el-tab-pane label="命中测试" name="hit">
            <HitTestPanel
              :loading="store.hitLoading"
              :result="store.hitResult"
              @search="handleHitTest"
              @locate="handleLocate"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>

    <DocumentUploadDialog ref="uploadRef" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Collection, Upload, EditPen, Loading } from '@element-plus/icons-vue'

import ChunkViewer from './components/ChunkViewer.vue'
import HitTestPanel from './components/HitTestPanel.vue'
import DocumentUploadDialog from './components/DocumentUploadDialog.vue'
import { useKnowledgeStore } from '../../stores/knowledge'
import { CHUNK_STRATEGIES, SUPPORTED_EXT } from '../../api/knowledge'
import { modelLabel } from '../../api/model'

const route = useRoute()
const router = useRouter()
const store = useKnowledgeStore()

const activeTab = ref('docs')
const selectedDocId = ref(null)
const uploadRef = ref(null)

const STATUS = {
  ready: { label: '已就绪', type: 'success' },
  parsing: { label: '解析中', type: 'warning' },
  failed: { label: '解析失败', type: 'danger' },
}

onMounted(() => store.openKnowledgeBase(Number(route.params.id)))

const vectorModelLabel = computed(() => modelLabel(store.current?.vectorModel))
const strategyLabel = computed(
  () => CHUNK_STRATEGIES.find((s) => s.value === store.current?.chunkStrategy)?.label || ''
)
const totalChunks = computed(() => store.documents.reduce((sum, d) => sum + d.chunkCount, 0))
const readyDocs = computed(() => store.documents.filter((d) => d.status === 'ready'))

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(ts) {
  const diff = Date.now() - ts
  const day = 24 * 3600 * 1000
  if (diff < 3600 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

/** 从文档列表跳到切片查看 */
async function viewChunks(row) {
  if (row.status !== 'ready') {
    ElMessage.warning('文档尚未解析完成，请稍后再试')
    return
  }
  selectedDocId.value = row.id
  await store.openDocument(row.id)
  activeTab.value = 'chunks'
}

async function handleDocChange(docId) {
  await store.openDocument(docId)
}

async function editTags(row) {
  try {
    const { value } = await ElMessageBox.prompt('输入标签，多个标签用逗号分隔', '编辑标签', {
      inputValue: (row.tags || []).join(','),
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    })
    const tags = value
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    await store.updateTags(row.id, tags)
    ElMessage.success('标签已更新')
  } catch {
    /* 取消 */
  }
}

async function removeDoc(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.name}」吗？其下 ${row.chunkCount} 个切片将一并删除。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
  } catch {
    return
  }
  await store.removeDocument(row.id)
  if (selectedDocId.value === row.id) selectedDocId.value = null
  ElMessage.success('已删除')
}

function handleHitTest({ query, topK, threshold }) {
  store.runHitTest(query, { topK, threshold })
}

/** 命中结果 → 定位到原文 */
async function handleLocate(item) {
  selectedDocId.value = item.docId
  await store.openDocument(item.docId)
  store.selectChunk(item.chunkId)
  activeTab.value = 'chunks'
}
</script>

<style scoped>
.kb-detail {
  max-width: 1200px;
  margin: 0 auto;
}

/* ---------- 头部 ---------- */
.kb-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kb-head__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 12px;
  color: #6366f1;
  background: #eef2ff;
}

.kb-head__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb-head__name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kb-head__name b {
  font-size: 18px;
  color: #1e293b;
}

.kb-head__meta {
  font-size: 12.5px;
  color: #94a3b8;
}

.kb-desc {
  margin: 14px 0 18px;
  padding-left: 4px;
  font-size: 13px;
  color: #64748b;
}

/* ---------- 面板 ---------- */
.kb-panel {
  padding: 8px 22px 22px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.tab-toolbar__hint {
  flex: 1;
  font-size: 12.5px;
  color: #94a3b8;
}

.doc-select {
  width: 260px;
}

/* ---------- 文档表格 ---------- */
.doc-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.doc-name__ext {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
}

.doc-name__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-tag {
  margin-right: 5px;
}

.doc-chunks {
  font-weight: 600;
  color: #6366f1;
}
</style>
