import { createRouter, createWebHashHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../layouts/AppLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('../views/WorkbenchView.vue'),
        meta: { title: '工作台' },
      },
      {
        path: 'agents',
        name: 'agents',
        component: () => import('../views/agents/AgentListView.vue'),
        meta: { title: '智能体管理', permission: 'agents' },
      },
      {
        path: 'chat',
        name: 'chat',
        component: () => import('../views/chat/ChatView.vue'),
        meta: { title: '对话调试', permission: 'chat' },
      },
      {
        path: 'knowledge',
        name: 'knowledge',
        component: () => import('../views/knowledge/KnowledgeListView.vue'),
        meta: { title: '知识库', permission: 'knowledge' },
      },
      {
        path: 'knowledge/:id',
        name: 'knowledge-detail',
        component: () => import('../views/knowledge/KnowledgeDetailView.vue'),
        meta: { title: '知识库详情', permission: 'knowledge' },
      },
      {
        path: 'models',
        name: 'models',
        component: () => import('../views/models/ModelMarketView.vue'),
        meta: { title: '模型市场', permission: 'models' },
      },
      {
        path: 'workflow',
        name: 'workflow',
        component: () => import('../views/workflow/WorkflowListView.vue'),
        meta: { title: '工作流编排', permission: 'workflow' },
      },
      {
        path: 'workflow/:id',
        name: 'workflow-editor',
        component: () => import('../views/workflow/WorkflowEditorView.vue'),
        meta: { title: '工作流编排', permission: 'workflow' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/users/UserListView.vue'),
        // adminOnly 已强于 permission，无需再声明具体的模块权限
        meta: { title: '用户管理', adminOnly: true },
      },
    ],
  },
  // 兜底：未匹配路由回到工作台
  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

// 使用 hash 模式：打包后的静态文件无需服务端路由配置即可部署演示
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 全局路由守卫：未登录跳转登录页，已登录访问登录页则跳转工作台，
// 并按角色的模块权限拦截无权访问的页面
router.beforeEach((to) => {
  const auth = useAuthStore()

  // 先用用户表的最新数据同步会话：账号被删除或停用则立即失效。
  // 这一步要放在登录页判断之前，否则失效会话访问 /login 会被
  // 「已登录 → 回工作台」的规则先弹走，再被踢回登录页，来回跳转。
  if (auth.isLoggedIn && !auth.refresh()) {
    ElMessage.error('账号已失效，请重新登录')
    return '/login'
  }

  if (to.name !== 'login' && !auth.isLoggedIn) {
    return '/login'
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return '/home'
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    ElMessage.warning('用户管理仅管理员可用')
    return '/home'
  }
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    ElMessage.warning('您没有该模块的访问权限，请联系管理员')
    return '/home'
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 智能体开发平台` : '智能体开发平台'
})

export default router
