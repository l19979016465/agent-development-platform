<template>
  <div
    class="flow-node"
    :class="{
      'is-selected': selected,
      'is-running': running,
      'is-done': done,
      'is-error': hasError,
    }"
    :style="{ width: `${NODE_W}px`, height: `${NODE_H}px`, transform: `translate(${node.x}px, ${node.y}px)` }"
    @mousedown.stop="$emit('nodeDown', node, $event)"
    @click.stop="$emit('select', node.id)"
  >
    <span class="flow-node__bar" :style="{ background: meta.color }"></span>
    <span class="flow-node__icon" :style="{ color: meta.color, background: `${meta.color}14` }">
      <el-icon :size="16"><component :is="icon" /></el-icon>
    </span>
    <div class="flow-node__text">
      <div class="flow-node__name" :title="node.name">{{ node.name }}</div>
      <div class="flow-node__type">{{ meta.label }}</div>
    </div>
    <el-icon v-if="done && !hasError" class="flow-node__badge is-ok"><CircleCheckFilled /></el-icon>
    <el-icon v-else-if="hasError" class="flow-node__badge is-err"><CircleCloseFilled /></el-icon>
    <el-icon v-else-if="running" class="flow-node__badge is-run is-loading"><Loading /></el-icon>

    <!-- 输入端口 -->
    <span
      v-if="meta.inputs > 0"
      class="port port--in"
      :style="{ top: `${INPUT_PORT_Y}px` }"
      :data-port="`in:${node.id}`"
      @mouseup="$emit('portUp', node.id, 'in', -1)"
    ></span>

    <!-- 输出端口（多分支节点会渲染多个） -->
    <span
      v-for="i in meta.outputs"
      :key="i"
      class="port port--out"
      :style="{ top: `${outputPortY(i - 1, meta.outputs)}px` }"
      @mousedown.stop="$emit('portDown', node.id, i - 1, $event)"
    ></span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CircleCheckFilled, CircleCloseFilled, Loading } from '@element-plus/icons-vue'
import { nodeMeta } from '../../../api/workflow'
import { iconOf, NODE_W, NODE_H, INPUT_PORT_Y, outputPortY } from '../icons'

const props = defineProps({
  node: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
  done: { type: Boolean, default: false },
  hasError: { type: Boolean, default: false },
})

defineEmits(['nodeDown', 'select', 'portDown', 'portUp'])

const meta = computed(() => nodeMeta(props.node.type))
const icon = computed(() => iconOf(meta.value.icon))
</script>

<style scoped>
.flow-node {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: 10px;
  background: #fff;
  border: 1.5px solid #e5e8ee;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  cursor: grab;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.flow-node:hover {
  border-color: #c7d2fe;
}

.flow-node.is-selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.flow-node.is-running {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
}

.flow-node.is-done {
  border-color: #10b981;
}

.flow-node.is-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.flow-node__bar {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
}

.flow-node__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 8px;
}

.flow-node__text {
  flex: 1;
  min-width: 0;
}

.flow-node__name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-node__type {
  margin-top: 2px;
  font-size: 11px;
  color: #94a3b8;
}

.flow-node__badge {
  flex-shrink: 0;
  font-size: 15px;
}

.flow-node__badge.is-ok {
  color: #10b981;
}

.flow-node__badge.is-err {
  color: #ef4444;
}

.flow-node__badge.is-run {
  color: #f59e0b;
}

/* ---------- 端口 ---------- */
.port {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #cbd5e1;
  transition: border-color 0.15s, transform 0.15s;
}

.port:hover {
  border-color: #6366f1;
  transform: scale(1.25);
}

.port--in {
  left: -5px;
  margin-top: -5px;
}

.port--out {
  right: -5px;
  margin-top: -5px;
  cursor: crosshair;
}
</style>
