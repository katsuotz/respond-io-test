<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { Workflow, Plus, Maximize, AlertCircle, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkflowStore } from '@/features/workflow/stores/workflow'
import { useWorkflowQuery } from '@/features/workflow/composables/useWorkflowQuery'
import WorkflowCanvas from '@/features/workflow/components/canvas/WorkflowCanvas.vue'
import NodeDrawer from '@/features/workflow/components/drawers/NodeDrawer.vue'

const store = useWorkflowStore()
const query = useWorkflowQuery()
const route = useRoute()
const router = useRouter()
const canvas = ref(null)
const drawer = ref(null)
const problem = ref('')
const discardOpen = ref(false)
let resolveNavigation
const creating = computed(() => route.name === 'create-node')
const selectedNode = computed(() =>
  store.graph.nodes.find((node) => node.id === route.params.nodeId),
)
const drawerOpen = computed(
  () =>
    store.loaded &&
    (creating.value || (!!selectedNode.value && selectedNode.value.type !== 'branch')),
)
const invalidRoute = computed(
  () =>
    store.loaded &&
    route.path !== '/' &&
    !creating.value &&
    (!selectedNode.value || selectedNode.value.type === 'branch'),
)
const editableCount = computed(
  () => store.graph.nodes.filter((node) => node.type !== 'branch').length,
)
const mutation = useMutation({ mutationFn: ({ action, args }) => store[action](...args) })

async function perform(action, ...args) {
  problem.value = ''
  try {
    const result = await mutation.mutateAsync({ action, args })
    return result
  } catch (error) {
    if (action === 'moveNode') canvas.value?.syncNodes()
    problem.value = error.message || 'Unable to save. Please try again.'
    return null
  }
}
async function save(node) {
  const input = creating.value
    ? { ...node, position: canvas.value.centerPosition() }
    : { ...node, position: selectedNode.value.position }
  const result = await perform(creating.value ? 'createNode' : 'saveNode', input)
  if (result) {
    drawer.value?.discard()
    await router.push('/')
  }
}
async function remove(id) {
  if (await perform('deleteNode', id)) {
    drawer.value?.discard()
    await router.push('/')
  }
}
function select(id) {
  router.push(route.params.nodeId === id ? '/' : `/nodes/${encodeURIComponent(id)}`)
}
function guard() {
  if (mutation.isPending.value) return false
  if (!drawer.value?.hasUnsavedChanges()) return true
  resolveNavigation?.(false)
  discardOpen.value = true
  return new Promise((resolve) => {
    resolveNavigation = resolve
  })
}
function resolveDiscard(confirmed) {
  if (confirmed) drawer.value?.discard()
  discardOpen.value = false
  resolveNavigation?.(confirmed)
  resolveNavigation = undefined
}
onBeforeRouteUpdate(guard)
onBeforeRouteLeave(guard)
function beforeUnload(event) {
  if (drawer.value?.hasUnsavedChanges() || mutation.isPending.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  resolveNavigation?.(false)
})
</script>

<template>
  <main class="flex h-dvh flex-col overflow-hidden">
    <header
      class="flex h-[68px] shrink-0 items-center border-b border-border bg-white px-8 max-[640px]:h-14 max-[640px]:px-4"
    >
      <div
        class="flex items-center gap-3 text-base font-semibold tracking-[-0.025em] max-[640px]:text-sm"
      >
        <div class="grid size-[34px] place-items-center rounded-[9px] bg-accent text-primary">
          <Workflow :size="21" />
        </div>
        <span>Workflow Studio</span>
      </div>
    </header>
    <section
      class="flex items-center justify-between gap-5 border-b border-border bg-white px-8 py-6 max-[640px]:flex-wrap max-[640px]:gap-4 max-[640px]:px-4 max-[640px]:py-[18px]"
      aria-label="Workflow tools"
    >
      <div>
        <h1 class="m-0 text-[22px] font-semibold tracking-[-0.03em] max-[640px]:text-xl">
          Conversation workflow
        </h1>
      </div>
      <div class="flex items-center gap-2.5 max-[640px]:w-full">
        <Badge variant="secondary" class="mr-2 font-normal max-[640px]:mr-auto">
          {{ editableCount }} nodes
        </Badge>
        <Button
          variant="outline"
          size="icon"
          aria-label="Fit workflow to view"
          :disabled="!store.loaded"
          @click="canvas?.fit()"
        >
          <Maximize />
        </Button>
        <Button
          :disabled="!store.loaded || mutation.isPending.value"
          @click="router.push('/nodes/new')"
        >
          <Plus />
          Create New Node
        </Button>
      </div>
    </section>
    <section class="relative min-h-0 flex-1 bg-canvas" aria-label="Workflow canvas">
      <div
        v-if="query.isPending.value"
        class="absolute inset-0 flex flex-col items-center justify-center gap-[30px]"
        aria-label="Loading workflow"
      >
        <Skeleton class="h-28 w-64" />
        <Skeleton class="h-28 w-64" />
        <p class="text-[13px] text-muted-foreground">Opening your workflow…</p>
      </div>
      <div
        v-else-if="query.isError.value"
        class="mx-auto flex max-w-[420px] flex-col items-center justify-center gap-5 p-5"
      >
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn’t open the workflow</AlertTitle>
          <AlertDescription>{{ query.error.value?.message }}</AlertDescription>
        </Alert>
        <Button variant="outline" @click="query.refetch()">Try again</Button>
      </div>
      <WorkflowCanvas
        v-else-if="store.loaded"
        ref="canvas"
        :graph="store.graph"
        :selected-id="String(route.params.nodeId || '')"
        @select="select"
        @move="(id, position) => perform('moveNode', id, position)"
        @connect="(connection) => perform('connect', connection)"
        @reconnect="(id, connection) => perform('reconnectEdge', id, connection)"
        @disconnect="(id) => perform('disconnect', id)"
      />
      <div
        v-if="store.loaded && !store.graph.nodes.length"
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4"
      >
        <Workflow :size="32" />
        <h2>Your next workflow starts here</h2>
        <p class="text-[13px] text-muted-foreground">
          Create a node, then connect it to build your flow.
        </p>
        <Button class="pointer-events-auto" @click="router.push('/nodes/new')">
          <Plus />
          Create New Node
        </Button>
      </div>
      <div
        v-if="invalidRoute"
        class="absolute right-5 top-5 flex w-[min(380px,calc(100%-40px))] flex-col gap-3"
      >
        <Alert>
          <AlertTitle>Node details unavailable</AlertTitle>
          <AlertDescription>
            {{
              selectedNode?.type === 'branch'
                ? 'Success and Failure are display-only branch markers.'
                : 'This node does not exist in this browser’s saved workflow.'
            }}
          </AlertDescription>
        </Alert>
        <Button variant="outline" @click="router.push('/')">Back to canvas</Button>
      </div>
      <div
        v-if="problem && !drawerOpen"
        class="absolute left-1/2 top-[18px] flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 text-xs text-destructive"
        role="alert"
      >
        <AlertCircle :size="16" />
        {{ problem }}
        <button class="border-0 bg-transparent" aria-label="Dismiss error" @click="problem = ''">
          <X :size="14" />
        </button>
      </div>
    </section>
    <NodeDrawer
      ref="drawer"
      :node="selectedNode || null"
      :creating="creating"
      :open="drawerOpen"
      :busy="mutation.isPending.value"
      :error="problem"
      @save="save"
      @delete="remove"
      @close="router.push('/')"
    />
    <AlertDialog :open="discardOpen" @update:open="(value) => !value && resolveDiscard(false)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your edits haven’t been saved. Leaving this node will discard them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="resolveDiscard(false)">Keep editing</AlertDialogCancel>
          <Button @click="resolveDiscard(true)">Discard changes</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>
</template>
