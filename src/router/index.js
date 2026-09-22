import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { title: '工作台' },
  },
  {
    path: '/',
    redirect: '/home',
  },
]

// 使用 hash 模式：打包后的静态文件无需服务端路由配置即可部署演示
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 全局路由守卫：未登录跳转登录页，已登录访问登录页则跳转工作台
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.path !== '/login' && !auth.isLoggedIn) {
    return '/login'
  }
  if (to.path === '/login' && auth.isLoggedIn) {
    return '/home'
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 智能体开发平台` : '智能体开发平台'
})

export default router
