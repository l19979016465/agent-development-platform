<template>
  <el-container class="app-layout">
    <!-- 侧边导航 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="app-aside">
      <div class="aside-logo" @click="router.push('/home')">
        <BrandLogo size="small" />
        <span v-show="!isCollapse" class="aside-logo__text">智能体开发平台</span>
      </div>

      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        class="aside-menu"
      >
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.title }}</template>
        </el-menu-item>
      </el-menu>

      <div v-show="!isCollapse" class="aside-footer">
        <p>高级软件工程 · 第 3 组</p>
        <p>原型系统 v0.2.0</p>
      </div>
    </el-aside>

    <el-container class="app-body">
      <!-- 顶部栏 -->
      <el-header class="app-header">
        <el-icon class="collapse-btn" :size="20" @click="isCollapse = !isCollapse">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>

        <span class="page-title">{{ route.meta.title }}</span>

        <div class="header-right">
          <el-tooltip content="通知中心（开发中）" placement="bottom">
            <el-badge is-dot class="header-badge">
              <el-icon :size="19" class="header-icon" @click="handleComingSoon">
                <Bell />
              </el-icon>
            </el-badge>
          </el-tooltip>

          <el-dropdown @command="handleCommand">
            <span class="user-entry">
              <el-avatar :size="30" class="user-avatar">{{ avatarChar }}</el-avatar>
              <span class="user-name">{{ auth.displayName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  {{ auth.user?.role }} · {{ auth.user?.username }}
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Fold,
  Expand,
  Bell,
  ArrowDown,
  Monitor,
  MagicStick,
  Collection,
  Connection,
  ChatDotRound,
  Cpu,
} from '@element-plus/icons-vue'

import BrandLogo from '../components/BrandLogo.vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isCollapse = ref(false)

// 侧边导航配置：新增模块时在此追加
const menus = [
  { path: '/home', title: '工作台', icon: Monitor },
  { path: '/agents', title: '智能体管理', icon: MagicStick },
  { path: '/knowledge', title: '知识库', icon: Collection },
  { path: '/workflow', title: '工作流编排', icon: Connection },
  { path: '/chat', title: '对话调试', icon: ChatDotRound },
  { path: '/models', title: '模型市场', icon: Cpu },
]

const avatarChar = computed(() => auth.displayName.charAt(0))

// 窄屏自动折叠侧边栏，避免遮挡内容
function syncCollapse() {
  if (window.innerWidth < 768) isCollapse.value = true
}

onMounted(() => {
  syncCollapse()
  window.addEventListener('resize', syncCollapse)
})

onBeforeUnmount(() => window.removeEventListener('resize', syncCollapse))

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
  ElMessage.info('该功能正在开发中，敬请期待')
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

/* ---------- 侧边栏 ---------- */
.app-aside {
  display: flex;
  flex-direction: column;
  background: #1e1b3a;
  transition: width 0.25s ease;
  overflow: hidden;
}

.aside-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 14px;
  flex-shrink: 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.aside-logo__text {
  font-size: 15.5px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.aside-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  padding: 10px 8px;
}

.aside-menu:not(.el-menu--collapse) {
  width: 220px;
}

.aside-menu :deep(.el-menu-item) {
  height: 46px;
  margin-bottom: 4px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
}

.aside-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.aside-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 500;
}

.aside-footer {
  flex-shrink: 0;
  padding: 14px 18px;
  font-size: 11.5px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.35);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.aside-footer p {
  margin: 0;
}

/* ---------- 顶部栏 ---------- */
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 60px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #eef0f4;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}

.collapse-btn {
  cursor: pointer;
  color: #64748b;
}

.collapse-btn:hover {
  color: #6366f1;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-left: auto;
}

.header-icon {
  cursor: pointer;
  color: #64748b;
  display: block;
}

.header-icon:hover {
  color: #6366f1;
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

/* ---------- 内容区 ---------- */
.app-main {
  padding: 24px;
  background: #f5f7fb;
  overflow-y: auto;
}

/* 路由切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.22s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 14px;
  }

  .app-main {
    padding: 14px;
  }

  .user-name {
    display: none;
  }
}
</style>
