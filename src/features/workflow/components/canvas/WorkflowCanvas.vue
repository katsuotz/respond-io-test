<script setup>
import { computed, markRaw, ref, watch } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { Plus, Minus, Maximize } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import WorkflowNode from './WorkflowNode.vue'

const props = defineProps({
  graph: { type: Object, required: true },
  selectedId: { type: String, default: '' },
})
const emit = defineEmits(['select', 'move', 'connect', 'reconnect', 'disconnect'])
const nodeTypes = { workflow: markRaw(WorkflowNode) }
const { fitView, zoomIn, zoomOut, screenToFlowCoordinate } = useVueFlow('workflow')
const root = ref(null)
const nodes = ref([])
const selectedEdgeId = ref('')
function syncNodes(value = props.graph.nodes) {
  nodes.value = value.map((node) => ({
    id: node.id,
    type: 'workflow',
    position: { ...node.position },
    data: { node },
    selected: node.id === props.selectedId,
    selectable: node.type !== 'branch',
    focusable: node.type !== 'branch',
    ariaLabel: node.title,
  }))
}
watch(() => props.graph.nodes, syncNodes, { immediate: true })
watch(
  () => props.selectedId,
  (id) => {
    nodes.value = nodes.value.map((node) => ({ ...node, selected: node.id === id }))
  },
)
const edges = computed(() =>
  props.graph.edges.map((edge) => {
    const target = props.graph.nodes.find((node) => node.id === edge.target)
    const source = props.graph.nodes.find((node) => node.id === edge.source)
    const fixed = target?.type === 'branch'
    const color =
      (source?.data.connectorType || target?.data.connectorType) === 'failure'
        ? '#d2967e'
        : '#9bb7ad'
    return {
      ...edge,
      type: 'smoothstep',
      updatable: !fixed,
      selectable: !fixed,
      deletable: false,
      style: { stroke: color, strokeWidth: 1.6, strokeOpacity: 0.45 },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 13, height: 13 },
    }
  }),
)
function centerPosition() {
  const rect = root.value.getBoundingClientRect()
  const point = screenToFlowCoordinate({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  })
  return { x: point.x - 130, y: point.y - 60 }
}
function keySelect(event) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    const edge = props.graph.edges.find((item) => String(item.id) === selectedEdgeId.value)
    const target = props.graph.nodes.find((node) => String(node.id) === String(edge?.target))
    if (!edge || target?.type === 'branch') return
    event.preventDefault()
    selectedEdgeId.value = ''
    emit('disconnect', edge.id)
    return
  }
  if (event.key !== 'Enter' && event.key !== ' ') return
  const element = event.target.closest('.vue-flow__node')
  const node = props.graph.nodes.find((item) => item.id === element?.dataset.id)
  if (!node || node.type === 'branch') return
  event.preventDefault()
  emit('select', node.id)
}
function selectEdge({ edge }) {
  if (!edge.selectable) return
  selectedEdgeId.value = String(edge.id)
  root.value?.focus()
}
function clearEdgeSelection() {
  selectedEdgeId.value = ''
}
defineExpose({
  centerPosition,
  syncNodes,
  fit: () =>
    fitView({
      padding: 0.25,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250,
    }),
})
</script>

<template>
  <div ref="root" class="canvas-root" tabindex="-1" @keydown="keySelect">
    <VueFlow
      id="workflow"
      v-model:nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :min-zoom="0.25"
      :max-zoom="1.75"
      :default-viewport="{ zoom: 0.9, x: 0, y: 0 }"
      :delete-key-code="null"
      :connect-on-click="false"
      fit-view-on-init
      :fit-view-options="{ padding: 0.22, maxZoom: 1 }"
      @pane-click="clearEdgeSelection"
      @node-click="({ node }) => { clearEdgeSelection(); node.data.node.type !== 'branch' && emit('select', node.id) }"
      @node-drag-stop="({ node }) => emit('move', node.id, node.position)"
      @connect="(connection) => emit('connect', connection)"
      @edge-click="selectEdge"
      @edge-update="({ edge, connection }) => emit('reconnect', edge.id, connection)"
    >
      <Background pattern-color="#cdd6d8" :gap="20" :size="1" />
      <Controls :show-interactive="false" position="bottom-left">
        <template #control-zoom-in
          ><Button variant="ghost" size="icon" aria-label="Zoom in" @click="zoomIn()"
            ><Plus /></Button
        ></template>
        <template #control-zoom-out
          ><Button variant="ghost" size="icon" aria-label="Zoom out" @click="zoomOut()"
            ><Minus /></Button
        ></template>
        <template #control-fit-view
          ><Button
            variant="ghost"
            size="icon"
            aria-label="Fit canvas"
            @click="fitView({ padding: 0.25 })"
            ><Maximize /></Button
        ></template>
      </Controls>
    </VueFlow>
    <div class="canvas-hint">
      Drag to move <span>·</span> Connect the dots <span>·</span> Click a line, then press Delete to disconnect
    </div>
  </div>
</template>

<style scoped>
.canvas-root {
  position: relative;
  width: 100%;
  height: 100%;
}
.canvas-hint {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  color: #7b8592;
  pointer-events: none;
}
.canvas-hint span {
  padding: 0 8px;
}
:deep(.vue-flow__controls) {
  display: flex;
  box-shadow: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin: 18px 22px;
}
:deep(.vue-flow__controls-button) {
  width: 32px;
  height: 32px;
  border-bottom: 0;
  border-right: 1px solid var(--border);
}
:deep(.vue-flow__node:focus-visible) {
  outline: 2px solid var(--ring);
  outline-offset: 5px;
  border-radius: 12px;
}
:deep(.vue-flow__edge) {
  cursor: pointer;
}
:deep(.vue-flow__edge .vue-flow__edge-path) {
  transition: stroke-opacity 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
:deep(.vue-flow__edge.selected .vue-flow__edge-path),
:deep(.vue-flow__edge:focus-visible .vue-flow__edge-path) {
  stroke-opacity: 1 !important;
}
@media (max-width: 800px) {
  .canvas-hint {
    display: none;
  }
}
</style>
