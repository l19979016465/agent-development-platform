<template>
  <el-container class="home-page">
    <!-- 顶部导航 -->
    <el-header class="home-header">
      <BrandLogo size="small" show-text class="home-header__logo" />
      <el-menu
        mode="horizontal"
        :default-active="activeMenu"
        :ellipsis="false"
        class="home-menu"
        @select="handleComingSoon"
      >
        <el-menu-item index="agents">智能体</el-menu-item>
        <el-menu-item index="knowledge">知识库</el-menu-item>
        <el-menu-item index="workflow">工作流</el-menu-item>
        <el-menu-item index="models">模型市场</el-menu-item>
      </el-menu>
      <el-dropdown @command="handleCommand">
        <span class="user-entry">
          <el-avatar :size="30" class="user-avatar">{{ avatarChar }}</el-avatar>
          <span class="user-name">{{ auth.displayName }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>{{ auth.user?.role }} · {{ auth.user?.username }}</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-header>

    <el-main class="home-main">
      <!-- 欢迎横幅 -->
      <div class="welcome-banner">
        <h2>欢迎回来，{{ auth.displayName }}！</h2>
        <p>智能体开发平台原型系统已就绪，以下功能模块正在开发中。</p>
      </div>

      <!-- 功能模块卡片 -->
      <div class="module-grid">
        <div v-for="m in modules" :key="m.title" class="module-card" @click="handleComingSoon">
          <span class="module-card__icon">
            <el-icon :size="24"><component :is="m.icon" /></el-icon>
          </span>
          <div class="module-card__body">
            <div class="module-card__head">
              <b>{{ m.title }}</b>
              <el-tag size="small" type="warning" effect="plain">开发中</el-tag>
            </div>
            <p>{{ m.desc }}</p>
          </div>
        </div>
      </div>
    </el-main>

    <el-footer class="home-footer">
      智能体开发平台 · 高级软件工程综合大作业原型系统 · © 2026 第 3 组
    </el-footer>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  MagicStick,
  Collection,
  Connection,
  ChatDotRound,
  Cpu,
  Promotion,
} from '@element-plus/icons-vue'

import BrandLogo from '../components/BrandLogo.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const activeMenu = ref('agents')

const modules = [
  { icon: MagicStick, title: '智能体管理', desc: '可视化编排创建、配置与调试智能体' },
  { icon: Collection, title: '知识库管理', desc: '上传文档，构建智能体专属知识库' },
  { icon: Connection, title: '工作流编排', desc: '拖拽式搭建多节点智能体工作流' },
  { icon: ChatDotRound, title: '对话调试', desc: '实时对话预览与调试智能体效果' },
  { icon: Cpu, title: '模型市场', desc: '接入主流大模型，灵活切换与配置' },
  { icon: Promotion, title: '发布集成', desc: '一键发布到 Web / API / 第三方渠道' },
]

const avatarChar = computed(() => auth.displayName.charAt(0))

async function handleCommand(command) {
  if (command !== 'logout') return
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return // 用户取消
  }
  auth.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}

function handleComingSoon() {
  ElMessage.info('该模块正在开发中，敬请期待')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f7fb;
}

/* ---------- 顶部导航 ---------- */
.home-header {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 28px;
  background: #fff;
  border-bottom: 1px solid #eef0f4;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}

.home-header__logo {
  color: #1e293b;
}

.home-menu {
  flex: 1;
  border-bottom: none;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #475569;
  font-size: 14px;
  outline: none;
}

.user-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 600;
}

/* ---------- 主体 ---------- */
.home-main {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 28px;
}

.welcome-banner {
  padding: 30px 36px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(120deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.35);
}

.welcome-banner h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.welcome-banner p {
  margin: 0;
  font-size: 14px;
  opacity: 0.85;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.module-card {
  display: flex;
  gap: 16px;
  padding: 22px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eef0f4;
  cursor: pointer;
  transition: all 0.25s ease;
}

.module-card:hover {
  transform: translateY(-4px);
  border-color: #c7d2fe;
  box-shadow: 0 12px 28px rgba(99, 102, 241, 0.14);
}

.module-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 12px;
  color: #6366f1;
  background: #eef2ff;
}

.module-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.module-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.module-card__head b {
  font-size: 15.5px;
  color: #1e293b;
}

.module-card__body p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
}

/* ---------- 页脚 ---------- */
.home-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  color: #94a3b8;
  background: transparent;
}
</style>
