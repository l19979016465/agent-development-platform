<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="bg-grid" aria-hidden="true"></div>
    <div class="bg-blob bg-blob--one" aria-hidden="true"></div>
    <div class="bg-blob bg-blob--two" aria-hidden="true"></div>
    <div class="bg-blob bg-blob--three" aria-hidden="true"></div>

    <div class="login-container">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <BrandLogo size="large" show-text />
        <h1 class="brand-title">让每一个创意<br />都能生长为智能体</h1>
        <p class="brand-sub">AI 智能体一体化开发平台，覆盖从构建、训练到发布的全生命周期</p>

        <ul class="features">
          <li v-for="f in features" :key="f.title" class="feature">
            <span class="feature__icon">
              <el-icon :size="20"><component :is="f.icon" /></el-icon>
            </span>
            <div class="feature__body">
              <b>{{ f.title }}</b>
              <span>{{ f.desc }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- 右侧登录表单 -->
      <div class="form-panel">
        <div class="form-card">
          <h2 class="form-title">{{ isRegister ? '创建新账号' : '欢迎登录' }}</h2>
          <p class="form-sub">
            {{ isRegister ? '注册后即可进入智能体开发工作台' : '登录后进入智能体开发工作台' }}
          </p>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            size="large"
            @keyup.enter="handleSubmit"
          >
            <el-form-item prop="username">
              <el-input
                v-model.trim="form.username"
                placeholder="请输入账号"
                :prefix-icon="User"
                clearable
                autocomplete="username"
              />
            </el-form-item>

            <el-form-item v-if="isRegister" prop="nickname">
              <el-input
                v-model.trim="form.nickname"
                placeholder="请输入昵称（选填）"
                :prefix-icon="Postcard"
                clearable
                autocomplete="nickname"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                show-password
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
              />
            </el-form-item>

            <el-form-item v-if="isRegister" prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                :prefix-icon="Lock"
                show-password
                autocomplete="new-password"
              />
            </el-form-item>

            <el-form-item prop="captcha">
              <div class="captcha-row">
                <el-input
                  v-model.trim="form.captcha"
                  placeholder="验证码"
                  :prefix-icon="Key"
                  maxlength="4"
                  autocomplete="off"
                />
                <CaptchaBox ref="captchaRef" />
              </div>
            </el-form-item>

            <div v-if="!isRegister" class="form-options">
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
              <a class="link" @click="handleComingSoon">忘记密码？</a>
            </div>

            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              @click="handleSubmit"
            >
              {{ submitText }}
            </el-button>
          </el-form>

          <div class="register-row">
            {{ isRegister ? '已有账号？' : '还没有账号？' }}
            <a class="link" @click="switchMode">{{ isRegister ? '返回登录' : '立即注册' }}</a>
          </div>

          <div v-if="!isRegister" class="demo-tip">
            <el-icon><InfoFilled /></el-icon>
            演示账号：admin / admin123（或 user / user123）
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  User,
  Lock,
  Key,
  Postcard,
  InfoFilled,
  MagicStick,
  Cpu,
  Collection,
  Promotion,
} from '@element-plus/icons-vue'

import BrandLogo from '../components/BrandLogo.vue'
import CaptchaBox from '../components/CaptchaBox.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref(null)
const captchaRef = ref(null)
const loading = ref(false)
/** 卡片内的模式：false 登录 / true 注册 */
const isRegister = ref(false)

const features = [
  { icon: MagicStick, title: '零代码搭建', desc: '可视化编排，快速创建专属智能体' },
  { icon: Cpu, title: '多模型接入', desc: '主流大模型自由切换与调用' },
  { icon: Collection, title: '知识库增强', desc: '上传文档构建专属知识库' },
  { icon: Promotion, title: '一键发布', desc: '多渠道发布与 API 集成' },
]

const rememberKey = 'agent-platform-remember'
const form = reactive({
  username: localStorage.getItem(rememberKey) || '',
  nickname: '',
  password: '',
  confirmPassword: '',
  captcha: '',
})
const rememberMe = ref(!!form.username)

// 注册模式的字段用 v-if 卸载，未渲染的表单项不会注册进表单，因此不会参与校验
const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]{4,20}$/,
      message: '账号需为 4-20 位字母、数字或下划线',
      trigger: 'blur',
    },
  ],
  nickname: [{ max: 20, message: '昵称最多 20 个字符', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6-20 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      // rules 是静态对象，取不到兄弟字段的当前值，用闭包比较 form.password
      validator: (_rule, value, callback) =>
        value === form.password ? callback() : callback(new Error('两次输入的密码不一致')),
      trigger: ['blur', 'change'],
    },
  ],
  captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

const submitText = computed(() => {
  if (loading.value) return isRegister.value ? '注册中…' : '登录中…'
  return isRegister.value ? '注 册' : '登 录'
})

/** 在登录与注册之间切换：清空密码类字段与验证码，保留账号 */
function switchMode() {
  if (loading.value) return // 请求进行中不切换，避免提示与当前模式错位
  isRegister.value = !isRegister.value
  form.nickname = ''
  form.password = ''
  form.confirmPassword = ''
  form.captcha = ''
  // 不用 resetFields：它会把账号重置回挂载时的初始值，抹掉「记住我」预填的内容
  formRef.value?.clearValidate()
  captchaRef.value?.refresh()
}

function handleSubmit() {
  if (isRegister.value) handleRegister()
  else handleLogin()
}

async function handleLogin() {
  if (loading.value) return
  try {
    await formRef.value.validate()
  } catch {
    return // 表单校验未通过
  }

  // 验证码校验（不区分大小写，失败自动刷新）
  if (!captchaRef.value.verify(form.captcha)) {
    ElMessage.warning('验证码错误，请重新输入')
    form.captcha = ''
    return
  }

  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    // 记住我：保存/清除账号
    if (rememberMe.value) {
      localStorage.setItem(rememberKey, form.username)
    } else {
      localStorage.removeItem(rememberKey)
    }
    ElMessage.success(`欢迎回来，${auth.displayName}！`)
    router.push('/home')
  } catch (err) {
    ElMessage.error(err.message || '登录失败，请重试')
    captchaRef.value.refresh()
    form.captcha = ''
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (loading.value) return
  try {
    await formRef.value.validate()
  } catch {
    return // 表单校验未通过
  }

  // 验证码校验（不区分大小写，失败自动刷新）
  if (!captchaRef.value.verify(form.captcha)) {
    ElMessage.warning('验证码错误，请重新输入')
    form.captcha = ''
    return
  }

  loading.value = true
  try {
    // 注册成功即写入会话，直接进入工作台
    // 不写 rememberKey：「记住我」是登录模式的控件，注册模式下用户没有勾选动作
    await auth.register({
      username: form.username,
      password: form.password,
      nickname: form.nickname,
    })
    ElMessage.success(`注册成功，欢迎你，${auth.displayName}！`)
    router.push('/home')
  } catch (err) {
    ElMessage.error(err.message || '注册失败，请重试')
    captchaRef.value.refresh()
    form.captcha = ''
  } finally {
    loading.value = false
  }
}

function handleComingSoon() {
  ElMessage.info('该功能正在开发中，敬请期待')
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #0b1026 0%, #1b1f4b 45%, #2d1b69 100%);
}

/* ---------- 背景装饰 ---------- */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
  animation: blob-float 14s ease-in-out infinite;
}

.bg-blob--one {
  width: 420px;
  height: 420px;
  top: -120px;
  left: -100px;
  background: #4f46e5;
}

.bg-blob--two {
  width: 360px;
  height: 360px;
  bottom: -100px;
  right: -80px;
  background: #7c3aed;
  animation-delay: -5s;
}

.bg-blob--three {
  width: 260px;
  height: 260px;
  top: 40%;
  left: 55%;
  background: #0891b2;
  opacity: 0.35;
  animation-delay: -9s;
}

@keyframes blob-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.08); }
  66% { transform: translate(-25px, 25px) scale(0.94); }
}

/* ---------- 整体卡片 ---------- */
.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  width: 1000px;
  max-width: 100%;
  min-height: 600px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 80px rgba(2, 6, 23, 0.55);
  animation: card-in 0.7s ease-out both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

/* ---------- 左侧品牌区 ---------- */
.brand-panel {
  flex: 0 0 46%;
  display: flex;
  flex-direction: column;
  padding: 48px 44px;
  color: #fff;
  background: linear-gradient(160deg, rgba(79, 70, 229, 0.45), rgba(124, 58, 237, 0.25));
}

.brand-title {
  margin: 40px 0 12px;
  font-size: 30px;
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 1px;
}

.brand-sub {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.72);
}

.features {
  list-style: none;
  margin: 36px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 14px;
}

.feature__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 12px;
  color: #c7d2fe;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.feature__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feature__body b {
  font-size: 15px;
  font-weight: 600;
}

.feature__body span {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.62);
}

/* ---------- 右侧表单区 ---------- */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 56px;
  background: #fff;
}

.form-card {
  width: 100%;
  max-width: 340px;
}

.form-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
}

.form-sub {
  margin: 8px 0 32px;
  font-size: 14px;
  color: #94a3b8;
}

.captcha-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-row :deep(.el-input) {
  flex: 1;
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 22px;
  font-size: 13px;
}

.link {
  color: #6366f1;
  cursor: pointer;
  text-decoration: none;
}

.link:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  letter-spacing: 6px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border: none;
}

.login-btn:hover {
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
}

.register-row {
  margin-top: 22px;
  text-align: center;
  font-size: 13.5px;
  color: #94a3b8;
}

.demo-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 28px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  color: #6366f1;
  background: #eef2ff;
}

/* ---------- 响应式 ---------- */
@media (max-width: 860px) {
  .brand-panel {
    display: none;
  }

  .login-container {
    width: 420px;
  }
}
</style>
