<template>
  <div class="coming-soon">
    <div class="coming-soon__icon">
      <el-icon :size="42"><Tools /></el-icon>
    </div>
    <h3>{{ route.meta.title }}</h3>
    <p>该模块正在开发中，将在后续迭代中上线。</p>
    <el-button type="primary" @click="router.push('/agents')">先去体验智能体管理</el-button>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { Tools } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
</script>

<style scoped>
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 62vh;
  text-align: center;
}

.coming-soon__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 92px;
  border-radius: 26px;
  color: #a5b4fc;
  background: linear-gradient(135deg, #eef2ff, #f3e8ff);
  margin-bottom: 22px;
}

.coming-soon h3 {
  margin: 0 0 10px;
  font-size: 20px;
  color: #1e293b;
}

.coming-soon p {
  margin: 0 0 26px;
  font-size: 13.5px;
  color: #94a3b8;
}
</style>
