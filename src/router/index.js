import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppLayout from '../layouts/AppLayout.vue'

const Placeholder = () => import('../views/common/ComingSoonView.vue')

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
        meta: { title: '智能体管理' },
      },
      // 以下模块待开发，统一使用占位页
      { path: 'knowledge', name: 'knowledge', component: Placeholder, meta: { title: '知识库' } },
      { path: 'workflow', name: 'workflow', component: Placeholder, meta: { title: '工作流编排' } },
      { path: 'chat', name: 'chat', component: Placeholder, meta: { title: '对话调试' } },
      { path: 'models', name: 'models', component: Placeholder, meta: { title: '模型市场' } },
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

// 全局路由守卫：未登录跳转登录页，已登录访问登录页则跳转工作台
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.name !== 'login' && !auth.isLoggedIn) {
    return '/login'
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return '/home'
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 智能体开发平台` : '智能体开发平台'
})

export default router
