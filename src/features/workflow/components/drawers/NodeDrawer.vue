<script setup>
import { computed, ref, watch } from 'vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { validateNode } from '@/features/workflow/utils/validation'
import { cloneValue } from '@/features/workflow/utils/clone'
import { snapshot } from '@/features/workflow/utils/snapshot'
import NodeGeneralFields from '../forms/NodeGeneralFields.vue'
import SendMessageForm from '../forms/SendMessageForm.vue'
import AddCommentForm from '../forms/AddCommentForm.vue'
import BusinessHoursForm from '../forms/BusinessHoursForm.vue'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const props = defineProps({
  node: { type: Object, default: null },
  creating: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['save', 'close', 'delete'])
const draft = ref(makeDraft(null, true))
const initialSnapshot = ref(snapshot(draft.value))
const errors = ref({})
const showDiscardDialog = ref(false)
const showDeleteDialog = ref(false)
const pendingClose = ref(false)

const isDirty = computed(() => snapshot(draft.value) !== initialSnapshot.value)
const title = computed(() =>
  props.creating ? 'Create new node' : draft.value.title || 'Node details',
)
const description = computed(() =>
  props.creating ? 'Add a node to your workflow.' : 'Edit this node and its workflow content.',
)
const isBranchMarker = computed(() => draft.value.type === 'branch')
const isTrigger = computed(() => draft.value.type === 'trigger')
const canDelete = computed(
  () => Boolean(props.node?.id) && !isBranchMarker.value && !props.creating,
)

watch(
  [() => props.node?.id, () => props.creating, () => props.open],
  () => {
    if (props.open) resetDraft()
  },
  { immediate: true },
)

function defaultData(type) {
  if (type === 'sendMessage') return { payload: [] }
  if (type === 'addComment') return { comment: '' }
  if (type === 'businessHours')
    return {
      timezone: 'UTC',
      times: DAYS.map((day) => ({ day, startTime: '09:00', endTime: '17:00' })),
    }
  return {}
}

function makeDraft(node, creating) {
  if (creating || !node)
    return { id: undefined, type: '', title: '', description: '', position: undefined, data: {} }
  return {
    ...cloneValue(node),
    title: node.title || '',
    description: node.description || '',
    data: { ...defaultData(node.type), ...cloneValue(node.data || {}) },
  }
}

function resetDraft() {
  draft.value = makeDraft(props.node, props.creating)
  initialSnapshot.value = snapshot(draft.value)
  errors.value = {}
  showDiscardDialog.value = false
  pendingClose.value = false
}

function updateData(value) {
  draft.value.data = value
}

function updateType(value) {
  draft.value.type = value
  draft.value.data = defaultData(value)
}

function validate() {
  const candidate = {
    ...draft.value,
    title: draft.value.title.trim(),
    description: draft.value.description.trim(),
  }
  const baseErrors = validateNode(candidate)
  const next = { ...baseErrors }
  if (baseErrors.payload) {
    next.text = baseErrors.payload
    delete next.payload
  }
  if (draft.value.type === 'businessHours') {
    const times = Array.isArray(draft.value.data?.times) ? draft.value.data.times : []
    times.forEach((entry) => {
      if (!entry.startTime || !entry.endTime) next[entry.day] = 'Both times are required.'
      else if (entry.startTime >= entry.endTime)
        next[entry.day] = 'Opening time must be before closing time.'
    })
  }
  errors.value = next
  if (Object.keys(next).length) return false
  draft.value.title = candidate.title
  draft.value.description = candidate.description
  return true
}

function save() {
  if (props.busy) return
  if (!validate()) return
  const value = cloneValue(draft.value)
  if (props.creating) delete value.id
  emit('save', value)
}

function close() {
  if (props.busy) return
  if (isDirty.value) {
    pendingClose.value = true
    showDiscardDialog.value = true
    return
  }
  emit('close')
}

function discardAndClose() {
  const shouldClose = pendingClose.value
  resetDraft()
  showDiscardDialog.value = false
  if (shouldClose) emit('close')
}

function requestDelete() {
  showDeleteDialog.value = true
}
function deleteNode() {
  showDeleteDialog.value = false
  if (props.node?.id) emit('delete', props.node.id)
}

function hasUnsavedChanges() {
  return isDirty.value
}
function discard() {
  resetDraft()
}
function markSaved() {
  initialSnapshot.value = snapshot(draft.value)
}
defineExpose({ hasUnsavedChanges, discard, markSaved })
</script>

<template>
  <Sheet :open="open" :modal="false" @update:open="(value) => !value && close()">
    <SheetContent
      side="right"
      class="node-drawer w-full sm:max-w-md gap-0 p-0"
      :show-overlay="false"
      :aria-label="title"
      @interact-outside.prevent
    >
      <SheetHeader class="node-drawer__header">
        <SheetTitle>{{ title }}</SheetTitle>
        <SheetDescription>{{ description }}</SheetDescription>
      </SheetHeader>

      <div v-if="isBranchMarker" class="node-drawer__unavailable" role="status">
        <p>Success and failure branches are display-only.</p>
      </div>
      <form v-else class="node-drawer__body" @submit.prevent="save">
        <Alert v-if="error" variant="destructive"
          ><AlertDescription>{{ error }}</AlertDescription></Alert
        >
        <NodeGeneralFields
          :title="draft.title"
          :description="draft.description"
          :type="draft.type"
          :creating="creating"
          :errors="errors"
          @update:title="draft.title = $event"
          @update:description="draft.description = $event"
          @update:type="updateType"
        />

        <dl v-if="isTrigger" class="trigger-details">
          <div>
            <dt>Trigger event</dt>
            <dd>{{ draft.data?.type || 'Conversation opened' }}</dd>
          </div>
          <div>
            <dt>Run once per contact</dt>
            <dd>{{ draft.data?.oncePerContact ? 'Yes' : 'No' }}</dd>
          </div>
        </dl>

        <Separator v-if="draft.type && !isTrigger" />
        <SendMessageForm
          v-if="draft.type === 'sendMessage'"
          :model-value="draft.data"
          :errors="errors"
          @update:model-value="updateData"
        />
        <AddCommentForm
          v-else-if="draft.type === 'addComment'"
          :model-value="draft.data"
          :errors="errors"
          @update:model-value="updateData"
        />
        <BusinessHoursForm
          v-else-if="draft.type === 'businessHours'"
          :model-value="draft.data"
          :errors="errors"
          @update:model-value="updateData"
        />

        <SheetFooter class="node-drawer__footer">
          <Button
            v-if="canDelete"
            type="button"
            variant="destructive"
            class="node-drawer__delete"
            :disabled="busy"
            @click="requestDelete"
            >Delete</Button
          >
          <span class="node-drawer__footer-spacer" />
          <Button type="button" variant="outline" :disabled="busy" @click="close">Cancel</Button>
          <Button type="submit" :disabled="busy || isBranchMarker">{{
            busy ? 'Saving…' : creating ? 'Create node' : 'Save changes'
          }}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>

  <AlertDialog :open="showDiscardDialog" @update:open="showDiscardDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader
        ><AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle
        ><AlertDialogDescription
          >Your edits will be lost if you close this drawer.</AlertDialogDescription
        ></AlertDialogHeader
      >
      <AlertDialogFooter
        ><AlertDialogCancel @click="pendingClose = false">Keep editing</AlertDialogCancel
        ><AlertDialogAction @click="discardAndClose"
          >Discard changes</AlertDialogAction
        ></AlertDialogFooter
      >
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader
        ><AlertDialogTitle>Delete this node?</AlertDialogTitle
        ><AlertDialogDescription
          >This removes the node and its connections from the workflow.</AlertDialogDescription
        ></AlertDialogHeader
      >
      <AlertDialogFooter
        ><AlertDialogCancel>Cancel</AlertDialogCancel
        ><AlertDialogAction @click="deleteNode">Delete node</AlertDialogAction></AlertDialogFooter
      >
    </AlertDialogContent>
  </AlertDialog>
</template>

<style scoped>
.node-drawer {
  display: flex;
  width: min(100vw, 28rem);
  max-width: 28rem;
  flex-direction: column;
  gap: 0;
  padding: 0;
}
.node-drawer__header {
  padding: 1.35rem 1.35rem 1rem;
  border-bottom: 1px solid var(--border, #e1e5eb);
}
.node-drawer__body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 1.25rem;
  overflow-y: auto;
  padding: 1.25rem 1.35rem;
}
.node-drawer__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: auto -1.35rem -1.25rem;
  padding: 1rem 1.35rem;
  border-top: 1px solid var(--border, #e1e5eb);
  background: var(--background, #ffffff);
}
.node-drawer__footer-spacer {
  flex: 1;
}
.node-drawer__delete {
  margin-right: auto;
}
.node-drawer__unavailable {
  margin: 1.35rem;
  padding: 1rem;
  border: 1px solid var(--border, #e1e5eb);
  border-radius: 0.6rem;
  color: var(--muted-foreground, #657080);
  font-size: 0.8rem;
}
.node-drawer__unavailable p {
  margin: 0;
}
.trigger-details {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0.85rem;
  border: 1px solid var(--border, #e1e5eb);
  border-radius: 0.6rem;
  background: var(--muted, #f3f5f7);
}
.trigger-details div {
  display: grid;
  gap: 0.2rem;
}
.trigger-details dt {
  color: var(--muted-foreground, #657080);
  font-size: 0.7rem;
}
.trigger-details dd {
  margin: 0;
  font-size: 0.8rem;
}
@media (max-width: 640px) {
  .node-drawer {
    width: 100vw;
  }
}
@media (prefers-reduced-motion: reduce) {
  .node-drawer :deep(*) {
    scroll-behavior: auto;
  }
}
</style>
