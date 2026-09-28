<template>
  <div v-loading="!store.current" class="editor">
    <template v-if="store.current">
      <!-- 头部 -->
      <div class="editor__head">
        <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
        <span class="editor__cover">{{ store.current.cover }}</span>
        <div class="editor__info">
          <div class="editor__name">
            <b>{{ store.current.name }}</b>
            <el-tag :type="statusTag.type" size="small" effect="light">{{ statusTag.label }}</el-tag>
            <el-tag v-if="store.dirty" type="warning" size="small" effect="plain">未保存</el-tag>
          </div>
          <span class="editor__meta">
            {{ store.nodes.length }} 节点 · {{ store.edges.length }} 连线 ·
            运行 {{ store.current.runs }} 次 · 更新于 {{ formatDate(store.current.updatedAt) }}
          </span>
        </div>

        <div class="editor__ops">
          <el-button :icon="VideoPlay" @click="runRef.open()">试运行</el-button>
          <el-button :icon="Finished" :loading="store.saving" @click="handleSave">保存</el-button>
          <el-button
            v-if="store.current.status === 'published'"
            type="warning"
            plain
            @click="handleOffline"
          >
            下线
          </el-button>
          <el-button v-else type="primary" :icon="Upload" @click="publishDialog = true">
            发布
          </el-button>
        </div>
      </div>

      <!-- 三栏：节点面板 / 画布 / 配置面板 -->
      <div class="editor__body">
        <NodePanel class="editor__palette" @add="addAtCenter" />
        <FlowCanvas ref="canvasRef" class="editor__canvas" />
        <NodeConfigPanel class="editor__config" />
      </div>
    </template>

    <RunPanel ref="runRef" @focus="(id) => canvasRef?.focusNode(id)" />

    <!-- 发布设置 -->
    <el-dialog v-model="publishDialog" title="发布工作流" width="460px">
      <el-form label-width="90px">
        <el-form-item label="发布范围">
          <el-radio-group v-model="publishScope">
            <el-radio value="personal">个人</el-radio>
            <el-radio value="organization">组织</el-radio>
            <el-radio value="public">公开</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="发布说明">
          <span class="publish-hint">
            发布后可在「对话调试」中按工作流方式调用，也可通过 API/SDK、网页或应用广场对外提供。
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialog = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="handlePublish">确认发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, VideoPlay, Upload, Finished } from '@element-plus/icons-vue'

import NodePanel from './components/NodePanel.vue'
import FlowCanvas from './components/FlowCanvas.vue'
import NodeConfigPanel from './components/NodeConfigPanel.vue'
import RunPanel from './components/RunPanel.vue'
import { useWorkflowStore } from '../../stores/workflow'

const route = useRoute()
const router = useRouter()
const store = useWorkflowStore()

const canvasRef = ref(null)
const runRef = ref(null)
const publishDialog = ref(false)
const publishing = ref(false)
const publishScope = ref('organization')

const STATUS = {
  published: { label: '已发布', type: 'success' },
  draft: { label: '草稿', type: 'info' },
  offline: { label: '已下线', type: 'warning' },
}

const statusTag = computed(() => STATUS[store.current?.status] || STATUS.draft)

onMounted(async () => {
  await store.openEditor(Number(route.params.id))
  publishScope.value = store.current?.publishScope || 'organization'
  // 等节点渲染完成后再调整视图
  setTimeout(() => canvasRef.value?.fitView(), 120)
})

function formatDate(ts) {
  const diff = Date.now() - ts
  const day = 24 * 3600 * 1000
  if (diff < 3600 * 1000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

/** 双击左侧节点时，放在画布可视区域的中间 */
function addAtCenter(type) {
  const canvas = canvasRef.value
  const created = store.addNode(type, 120 + store.nodes.length * 40, 120 + store.nodes.length * 30)
  if (!created) {
    ElMessage.warning('「开始」节点只能有一个')
    return
  }
  canvas?.focusNode(created.id)
}

async function handleSave() {
  try {
    await store.save()
    ElMessage.success('画布已保存')
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

async function handlePublish() {
  publishing.value = true
  try {
    // 发布前先落盘；保存失败时直接抛出原因（如存在环路），不继续发布
    if (store.dirty) await store.save()
    await store.publish(store.current.id, { status: 'published', publishScope: publishScope.value })
    await store.openEditor(store.current.id)
    ElMessage.success('工作流已发布')
    publishDialog.value = false
  } catch (err) {
    ElMessage.error(err.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

async function handleOffline() {
  try {
    await ElMessageBox.confirm('下线后该工作流将不再对外提供服务，确定下线吗？', '下线确认', {
      confirmButtonText: '确定下线',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  await store.publish(store.current.id, { status: 'offline' })
  await store.openEditor(store.current.id)
  ElMessage.success('工作流已下线')
}

function goBack() {
  router.push('/workflow')
}
</script>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 116px);
}

.editor__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.editor__cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  font-size: 21px;
  background: #eef2ff;
}

.editor__info {
  flex: 1;
  min-width: 0;
}

.editor__name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor__name b {
  font-size: 17px;
  color: #1e293b;
}

.editor__meta {
  display: block;
  margin-top: 4px;
  font-size: 12.5px;
  color: #94a3b8;
}

.editor__ops {
  display: flex;
  gap: 8px;
}

.editor__body {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.editor__palette {
  width: 216px;
  flex-shrink: 0;
}

.editor__canvas {
  flex: 1;
  min-width: 0;
}

.editor__config {
  width: 322px;
  flex-shrink: 0;
}

.publish-hint {
  font-size: 12.5px;
  line-height: 1.6;
  color: #94a3b8;
}

@media (max-width: 1200px) {
  .editor__palette {
    width: 180px;
  }

  .editor__config {
    width: 280px;
  }
}
</style>
