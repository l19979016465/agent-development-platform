<template>
  <div class="canvas-wrap">
    <!-- 工具栏 -->
    <div class="canvas-toolbar">
      <el-button-group>
        <el-button size="small" :icon="ZoomOut" @click="zoomBy(-0.1)" />
        <el-button size="small" @click="zoom = 1">{{ Math.round(zoom * 100) }}%</el-button>
        <el-button size="small" :icon="ZoomIn" @click="zoomBy(0.1)" />
      </el-button-group>
      <el-button size="small" :icon="FullScreen" @click="fitView">适应画布</el-button>
      <el-button
        size="small"
        type="danger"
        plain
        :icon="Delete"
        :disabled="!store.selectedNodeId"
        @click="removeSelected"
      >
        删除节点
      </el-button>
      <span class="canvas-toolbar__hint">
        拖动节点调整位置 · 从右侧圆点拖到左侧圆点建立连线 · 滚轮缩放 · 空白处拖动平移
      </span>
    </div>

    <!-- 画布 -->
    <div
      ref="wrapRef"
      class="canvas"
      :class="{ 'is-panning': !!panning }"
      @mousedown="onCanvasDown"
      @wheel.prevent="onWheel"
      @dragover.prevent
      @drop="onDrop"
    >
      <!-- 网格背景 -->
      <div
        class="canvas__grid"
        :style="{
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }"
      ></div>

      <div class="canvas__layer" :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }">
        <!-- 连线 -->
        <svg class="canvas__edges">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
            </marker>
            <marker id="arrow-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
          </defs>

          <g v-for="edge in edgePaths" :key="`${edge.from}-${edge.to}`">
            <!-- 加粗的透明线，扩大点击热区 -->
            <path :d="edge.d" class="edge-hit" @click.stop="removeEdge(edge)" />
            <path
              :d="edge.d"
              class="edge"
              :class="{ 'is-done': edge.done }"
              :marker-end="edge.done ? 'url(#arrow-done)' : 'url(#arrow)'"
            />
          </g>

          <path v-if="linking" :d="linkingPath" class="edge is-temp" />
        </svg>

        <!-- 节点 -->
        <FlowNode
          v-for="n in store.nodes"
          :key="n.id"
          :node="n"
          :selected="store.selectedNodeId === n.id"
          :running="store.run.activeNodeId === n.id"
          :done="store.doneNodeIds.includes(n.id)"
          :has-error="!!store.run.error && store.run.activeNodeId === n.id"
          @select="store.selectNode"
          @node-down="onNodeDown"
          @port-down="onPortDown"
          @port-up="onPortUp"
        />
      </div>

      <div v-if="!store.nodes.length" class="canvas__empty">
        <el-empty description="从左侧拖入节点开始编排" :image-size="90" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ZoomIn, ZoomOut, FullScreen, Delete } from '@element-plus/icons-vue'
import FlowNode from './FlowNode.vue'
import { useWorkflowStore } from '../../../stores/workflow'
import { nodeMeta } from '../../../api/workflow'
import { NODE_W, INPUT_PORT_Y, outputPortY } from '../icons'

const store = useWorkflowStore()

const wrapRef = ref(null)
const pan = ref({ x: 60, y: 40 })
const zoom = ref(1)

/** 拖动节点 */
const dragging = ref(null)
/** 从输出端口拉线中 */
const linking = ref(null)
/** 拖动平移画布 */
const panning = ref(null)

/* ---------------- 坐标换算 ---------------- */

/** 屏幕坐标 → 画布坐标（已抵消平移与缩放） */
function toCanvas(clientX, clientY) {
  const rect = wrapRef.value.getBoundingClientRect()
  return {
    x: (clientX - rect.left - pan.value.x) / zoom.value,
    y: (clientY - rect.top - pan.value.y) / zoom.value,
  }
}

/* ---------------- 连线路径 ---------------- */

function bezier(x1, y1, x2, y2) {
  const dx = Math.max(40, Math.abs(x2 - x1) / 2)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

const edgePaths = computed(() => {
  const done = store.doneNodeIds
  return store.edges
    .map((e) => {
      const from = store.nodes.find((n) => n.id === e.from)
      const to = store.nodes.find((n) => n.id === e.to)
      if (!from || !to) return null
      const meta = nodeMeta(from.type)
      const x1 = from.x + NODE_W
      const y1 = from.y + outputPortY(e.fromPort ?? 0, meta.outputs)
      const x2 = to.x
      const y2 = to.y + INPUT_PORT_Y
      return {
        ...e,
        d: bezier(x1, y1, x2, y2),
        // 两端都已执行完，说明这条连线已被走过
        done: done.includes(e.from) && done.includes(e.to),
      }
    })
    .filter(Boolean)
})

const linkingPath = computed(() => {
  if (!linking.value) return ''
  const from = store.nodes.find((n) => n.id === linking.value.fromId)
  if (!from) return ''
  const meta = nodeMeta(from.type)
  const x1 = from.x + NODE_W
  const y1 = from.y + outputPortY(linking.value.fromPort, meta.outputs)
  return bezier(x1, y1, linking.value.x, linking.value.y)
})

/* ---------------- 交互 ---------------- */

function onNodeDown(node, e) {
  store.selectNode(node.id)
  const start = toCanvas(e.clientX, e.clientY)
  dragging.value = { id: node.id, dx: start.x - node.x, dy: start.y - node.y }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e) {
  if (!dragging.value) return
  const p = toCanvas(e.clientX, e.clientY)
  // 网格吸附，让节点排列更整齐
  const snap = (v) => Math.round(v / 10) * 10
  store.moveNode(dragging.value.id, Math.max(0, snap(p.x - dragging.value.dx)), Math.max(0, snap(p.y - dragging.value.dy)))
}

function onDragEnd() {
  dragging.value = null
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

function onPortDown(nodeId, portIndex, e) {
  const p = toCanvas(e.clientX, e.clientY)
  linking.value = { fromId: nodeId, fromPort: portIndex, x: p.x, y: p.y }
  window.addEventListener('mousemove', onLinkMove)
  window.addEventListener('mouseup', onLinkEnd)
}

function onLinkMove(e) {
  if (!linking.value) return
  const p = toCanvas(e.clientX, e.clientY)
  linking.value.x = p.x
  linking.value.y = p.y
}

function onLinkEnd(e) {
  window.removeEventListener('mousemove', onLinkMove)
  window.removeEventListener('mouseup', onLinkEnd)
  if (!linking.value) return

  // 用命中测试判断落点是不是输入端口
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const portEl = el?.closest?.('.port--in')
  const from = linking.value.fromId
  const fromPort = linking.value.fromPort
  linking.value = null

  if (!portEl) return
  const toId = portEl.dataset.port?.split(':')[1]
  if (!toId) return

  if (!store.connect(from, toId, fromPort)) {
    ElMessage.warning('该连线不成立：可能重复、指向自身或形成环路')
  }
}

/** 从输入端口回拖到输出端口也允许（更符合直觉） */
function onPortUp(nodeId, dir, portIndex) {
  if (!linking.value) return
  const from = linking.value.fromId
  const fromPort = linking.value.fromPort
  linking.value = null
  if (dir !== 'in') return
  if (!store.connect(from, nodeId, fromPort)) {
    ElMessage.warning('该连线不成立：可能重复、指向自身或形成环路')
  }
}

function onCanvasDown(e) {
  // 点在节点或端口上时由它们自己处理
  if (e.target.closest('.flow-node')) return
  store.selectNode(null)
  panning.value = { sx: e.clientX, sy: e.clientY, ox: pan.value.x, oy: pan.value.y }
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup', onPanEnd)
}

function onPanMove(e) {
  if (!panning.value) return
  pan.value = {
    x: panning.value.ox + (e.clientX - panning.value.sx),
    y: panning.value.oy + (e.clientY - panning.value.sy),
  }
}

function onPanEnd() {
  panning.value = null
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', onPanEnd)
}

/** 以光标位置为中心缩放，避免缩放后视图跑偏 */
function onWheel(e) {
  const rect = wrapRef.value.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const next = clampZoom(zoom.value - e.deltaY * 0.001)
  const ratio = next / zoom.value
  pan.value = {
    x: mx - (mx - pan.value.x) * ratio,
    y: my - (my - pan.value.y) * ratio,
  }
  zoom.value = next
}

function zoomBy(delta) {
  const rect = wrapRef.value.getBoundingClientRect()
  const mx = rect.width / 2
  const my = rect.height / 2
  const next = clampZoom(zoom.value + delta)
  const ratio = next / zoom.value
  pan.value = { x: mx - (mx - pan.value.x) * ratio, y: my - (my - pan.value.y) * ratio }
  zoom.value = next
}

function clampZoom(v) {
  return Math.min(1.6, Math.max(0.4, Number(v.toFixed(2))))
}

/** 适应画布：按所有节点的包围盒计算缩放与平移 */
function fitView() {
  if (!store.nodes.length) {
    pan.value = { x: 60, y: 40 }
    zoom.value = 1
    return
  }
  const rect = wrapRef.value.getBoundingClientRect()
  const minX = Math.min(...store.nodes.map((n) => n.x))
  const minY = Math.min(...store.nodes.map((n) => n.y))
  const maxX = Math.max(...store.nodes.map((n) => n.x + NODE_W))
  const maxY = Math.max(...store.nodes.map((n) => n.y + 64))

  const pad = 50
  const scale = clampZoom(
    Math.min((rect.width - pad * 2) / (maxX - minX), (rect.height - pad * 2) / (maxY - minY), 1)
  )
  zoom.value = scale
  pan.value = {
    x: (rect.width - (maxX - minX) * scale) / 2 - minX * scale,
    y: (rect.height - (maxY - minY) * scale) / 2 - minY * scale,
  }
}

/** 从左侧节点面板拖入 */
function onDrop(e) {
  const type = e.dataTransfer?.getData('node-type')
  if (!type) return
  const p = toCanvas(e.clientX, e.clientY)
  const snap = (v) => Math.max(0, Math.round(v / 10) * 10)
  const created = store.addNode(type, snap(p.x - NODE_W / 2), snap(p.y - 32))
  if (!created) ElMessage.warning('「开始」节点只能有一个')
}

async function removeEdge(edge) {
  try {
    await ElMessageBox.confirm('确定删除这条连线吗？', '删除连线', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  store.removeEdge(edge.from, edge.to)
}

async function removeSelected() {
  const node = store.selectedNode
  if (!node) return
  try {
    await ElMessageBox.confirm(
      `确定删除节点「${node.name}」吗？与其相连的连线会一并删除。`,
      '删除节点',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' }
    )
  } catch {
    return
  }
  store.removeNode(node.id)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  window.removeEventListener('mousemove', onLinkMove)
  window.removeEventListener('mouseup', onLinkEnd)
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', onPanEnd)
})

/** 把某个节点移到视图中央，供运行轨迹里「在画布中定位」使用 */
function focusNode(id) {
  const n = store.nodes.find((x) => x.id === id)
  if (!n) return
  const rect = wrapRef.value.getBoundingClientRect()
  pan.value = {
    x: rect.width / 2 - (n.x + NODE_W / 2) * zoom.value,
    y: rect.height / 2 - (n.y + 32) * zoom.value,
  }
}

defineExpose({ fitView, focusNode })
</script>

<style scoped>
.canvas-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eef0f4;
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fcfcfd;
}

.canvas-toolbar__hint {
  flex: 1;
  font-size: 12px;
  color: #a0aec0;
  text-align: right;
}

.canvas {
  position: relative;
  flex: 1;
  overflow: hidden;
  cursor: default;
}

.canvas.is-panning {
  cursor: grabbing;
}

.canvas__grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, #e2e8f0 1px, transparent 1px);
  pointer-events: none;
}

.canvas__layer {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.canvas__edges {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  overflow: visible;
  pointer-events: none;
}

.edge {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 1.6;
}

.edge.is-done {
  stroke: #10b981;
}

.edge.is-temp {
  stroke: #6366f1;
  stroke-dasharray: 5 4;
}

.edge-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 14;
  pointer-events: stroke;
  cursor: pointer;
}

.canvas__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>
