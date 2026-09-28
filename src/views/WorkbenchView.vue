<template>
  <div class="workbench">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-banner__text">
        <h2>欢迎回来，{{ auth.displayName }}！</h2>
        <p>智能体开发平台已就绪，今日也要高效工作呀。</p>
      </div>
      <el-button class="welcome-banner__btn" :icon="Plus" @click="router.push('/agents')">
        创建智能体
      </el-button>
    </div>

    <!-- 数据概览 -->
    <div class="stat-grid">
      <div v-for="s in statCards" :key="s.label" class="stat-card">
        <span class="stat-card__icon" :style="{ background: s.bg, color: s.color }">
          <el-icon :size="22"><component :is="s.icon" /></el-icon>
        </span>
        <div class="stat-card__body">
          <b>{{ s.value }}</b>
          <span>{{ s.label }}</span>
        </div>
      </div>
    </div>

    <!-- 最近编辑 -->
    <div class="panel">
      <div class="panel__head">
        <b>最近编辑的智能体</b>
        <a class="panel__more" @click="router.push('/agents')">查看全部 →</a>
      </div>

      <el-empty v-if="!recentAgents.length" description="还没有智能体" :image-size="80" />
      <div v-else class="recent-list">
        <div
          v-for="a in recentAgents"
          :key="a.id"
          class="recent-item"
          @click="router.push('/agents')"
        >
          <span class="recent-item__avatar">{{ a.avatar }}</span>
          <div class="recent-item__info">
            <b>{{ a.name }}</b>
            <span>{{ a.description }}</span>
          </div>
          <el-tag :type="STATUS_MAP[a.status].type" size="small" effect="light" round>
            {{ STATUS_MAP[a.status].label }}
          </el-tag>
          <span class="recent-item__time">{{ formatTime(a.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- 功能模块入口 -->
    <div class="panel">
      <div class="panel__head">
        <b>平台功能模块</b>
      </div>
      <div class="module-grid">
        <div
          v-for="m in modules"
          :key="m.title"
          class="module-card"
          @click="router.push(m.path)"
        >
          <span class="module-card__icon">
            <el-icon :size="22"><component :is="m.icon" /></el-icon>
          </span>
          <div class="module-card__body">
            <div class="module-card__head">
              <b>{{ m.title }}</b>
            </div>
            <p>{{ m.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  MagicStick,
  CircleCheck,
  Edit,
  ChatDotRound,
  Collection,
  Connection,
  Cpu,
} from '@element-plus/icons-vue'

import { useAuthStore } from '../stores/auth'
import { useAgentStore } from '../stores/agent'
import { STATUS_MAP } from '../api/agent'

const router = useRouter()
const auth = useAuthStore()
const agentStore = useAgentStore()

onMounted(() => agentStore.fetchAll())

const statCards = computed(() => [
  { label: '智能体总数', value: agentStore.stats.total, icon: MagicStick, bg: '#eef2ff', color: '#6366f1' },
  { label: '已发布', value: agentStore.stats.published, icon: CircleCheck, bg: '#ecfdf5', color: '#10b981' },
  { label: '草稿', value: agentStore.stats.draft, icon: Edit, bg: '#fff7ed', color: '#f59e0b' },
  { label: '累计对话', value: agentStore.stats.conversations, icon: ChatDotRound, bg: '#fdf4ff', color: '#a855f7' },
])

/** 最近编辑的 5 个智能体 */
const recentAgents = computed(() =>
  [...agentStore.all].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
)

// 平台功能模块入口，6 个模块均已实现
const modules = [
  { path: '/agents', title: '智能体管理', desc: '创建、配置与发布智能体', icon: MagicStick },
  { path: '/knowledge', title: '知识库', desc: '上传文档构建专属知识库', icon: Collection },
  { path: '/workflow', title: '工作流编排', desc: '拖拽式搭建多节点工作流', icon: Connection },
  { path: '/chat', title: '对话调试', desc: '实时对话预览与调试', icon: ChatDotRound },
  { path: '/models', title: '模型市场', desc: '接入主流大模型', icon: Cpu },
]

function formatTime(ts) {
  const diff = Date.now() - ts
  const day = 24 * 60 * 60 * 1000
  if (diff < 60 * 60 * 1000) return '刚刚'
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / day)} 天前`
}
</script>

<style scoped>
.workbench {
  max-width: 1200px;
  margin: 0 auto;
}

/* ---------- 欢迎横幅 ---------- */
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 34px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(120deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.35);
}

.welcome-banner h2 {
  margin: 0 0 8px;
  font-size: 23px;
}

.welcome-banner p {
  margin: 0;
  font-size: 13.5px;
  opacity: 0.85;
}

.welcome-banner__btn {
  flex-shrink: 0;
  border: none;
  font-weight: 600;
  color: #4f46e5;
}

/* ---------- 数据概览 ---------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 12px;
}

.stat-card__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-card__body b {
  font-size: 23px;
  line-height: 1.2;
  color: #1e293b;
}

.stat-card__body span {
  font-size: 12.5px;
  color: #94a3b8;
}

/* ---------- 面板 ---------- */
.panel {
  margin-top: 20px;
  padding: 20px 24px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel__head b {
  font-size: 15.5px;
  color: #1e293b;
}

.panel__more {
  font-size: 13px;
  color: #6366f1;
  cursor: pointer;
}

.panel__more:hover {
  text-decoration: underline;
}

/* ---------- 最近编辑 ---------- */
.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.recent-item:hover {
  background: #f8fafc;
}

.recent-item__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  font-size: 19px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eef2ff, #f3e8ff);
}

.recent-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recent-item__info b {
  font-size: 14px;
  color: #1e293b;
}

.recent-item__info span {
  font-size: 12px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-item__time {
  width: 66px;
  flex-shrink: 0;
  text-align: right;
  font-size: 12px;
  color: #cbd5e1;
}

/* ---------- 模块入口 ---------- */
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.module-card {
  display: flex;
  gap: 14px;
  padding: 18px;
  border-radius: 12px;
  border: 1px solid #eef0f4;
  cursor: pointer;
  transition: all 0.25s ease;
}

.module-card:hover {
  transform: translateY(-3px);
  border-color: #c7d2fe;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.12);
}

.module-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 11px;
  color: #6366f1;
  background: #eef2ff;
}

.module-card__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.module-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-card__head b {
  font-size: 14.5px;
  color: #1e293b;
}

.module-card__body p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: #94a3b8;
}

@media (max-width: 640px) {
  .welcome-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
