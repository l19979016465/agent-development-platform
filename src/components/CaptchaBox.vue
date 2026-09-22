<template>
  <canvas
    ref="canvasRef"
    class="captcha-box"
    :width="width"
    :height="height"
    :title="'看不清？点击刷新验证码'"
    @click="refresh"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue'

const props = defineProps({
  width: { type: Number, default: 116 },
  height: { type: Number, default: 40 },
  /** 验证码字符数 */
  length: { type: Number, default: 4 },
})

const canvasRef = ref(null)
let code = ''

// 去掉易混淆字符（0/O、1/I 等）
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

function randomColor(min, max) {
  const v = Math.floor(min + Math.random() * (max - min))
  return `rgb(${v}, ${v}, ${v})`
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const { width, height } = props

  // 背景
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#eef2ff'
  ctx.fillRect(0, 0, width, height)

  // 干扰线
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(99, 102, 241, ${0.25 + Math.random() * 0.3})`
    ctx.beginPath()
    ctx.moveTo(Math.random() * width, Math.random() * height)
    ctx.lineTo(Math.random() * width, Math.random() * height)
    ctx.stroke()
  }

  // 干扰点
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(139, 92, 246, ${0.2 + Math.random() * 0.4})`
    ctx.beginPath()
    ctx.arc(Math.random() * width, Math.random() * height, 1, 0, Math.PI * 2)
    ctx.fill()
  }

  // 验证码字符（随机旋转）
  code = Array.from({ length: props.length }, randomChar).join('')
  code.split('').forEach((ch, i) => {
    ctx.save()
    ctx.translate(15 + i * (width - 30) / props.length, height / 2 + 1)
    ctx.rotate((Math.random() - 0.5) * 0.5)
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif'
    ctx.fillStyle = randomColor(40, 140)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
}

/** 刷新验证码 */
function refresh() {
  draw()
}

/** 校验用户输入（不区分大小写），校验失败自动刷新 */
function verify(input) {
  const ok = !!input && input.trim().toUpperCase() === code
  if (!ok) draw()
  return ok
}

onMounted(draw)

defineExpose({ refresh, verify })
</script>

<style scoped>
.captcha-box {
  display: block;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
}
</style>
