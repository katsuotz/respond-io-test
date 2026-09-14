<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { Zap, Send, MessageSquareText, CalendarClock, Check, X, Paperclip } from '@lucide/vue'

const props = defineProps({ data: { type: Object, required: true }, selected: Boolean })
const icons = {
  trigger: Zap,
  sendMessage: Send,
  addComment: MessageSquareText,
  businessHours: CalendarClock,
}
const labels = {
  trigger: 'Trigger',
  sendMessage: 'Send message',
  addComment: 'Add comment',
  businessHours: 'Business hours',
}
const node = computed(() => props.data.node)
const summary = computed(() => {
  if (node.value.description) return node.value.description
  const { type, data } = node.value
  if (type === 'trigger') return 'When a conversation is opened'
  if (type === 'sendMessage')
    return (
      data.payload
        ?.filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join(' ') || 'Add a message or attachment'
    )
  if (type === 'addComment') return data.comment || 'Add a private comment'
  if (type === 'businessHours') return `Weekly schedule · ${data.timezone}`
  return ''
})
const attachmentCount = computed(
  () => node.value.data.payload?.filter((p) => p.type === 'attachment').length || 0,
)
</script>

<template>
  <div v-if="node.type === 'branch'" class="branch-label" :class="node.data.connectorType">
    <Handle type="target" :position="Position.Top" :connectable="false" />
    <span class="branch-icon" aria-hidden="true">
      <component :is="node.data.connectorType === 'success' ? Check : X" :size="12" />
    </span>
    {{ node.title }}
    <Handle type="source" :position="Position.Bottom" />
  </div>
  <article v-else class="workflow-node" :class="[node.type, { 'is-selected': selected }]">
    <Handle v-if="node.type !== 'trigger'" type="target" :position="Position.Top" />
    <div class="node-type">
      <span class="node-icon" aria-hidden="true">
        <component :is="icons[node.type]" :size="15" />
      </span>
      <span>{{ labels[node.type] }}</span>
    </div>
    <h2>{{ node.title }}</h2>
    <p class="node-description">{{ summary }}</p>
    <div v-if="attachmentCount" class="attachment-count">
      <Paperclip :size="12" />
      {{ attachmentCount }} attachment{{ attachmentCount > 1 ? 's' : '' }}
    </div>
    <Handle v-if="node.type !== 'businessHours'" type="source" :position="Position.Bottom" />
    <Handle v-else type="source" :position="Position.Bottom" :connectable="false" />
  </article>
</template>

<style scoped>
.workflow-node {
  width: 260px;
  padding: 14px 16px 16px;
  border: 1px solid #dce2e7;
  border-radius: 12px;
  background: white;
  color: var(--foreground);
  transition:
    border-color 150ms,
    box-shadow 150ms;
}
.workflow-node:hover {
  border-color: #a9b9b4;
  box-shadow: 0 4px 14px #17392c0d;
}
.workflow-node.is-selected {
  border-color: #218369;
  box-shadow: 0 4px 16px #17392c1c;
}
.node-type {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #677184;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
}
.node-icon {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 7px;
  background: #f1f4f3;
}
.trigger .node-type {
  color: var(--node-trigger);
}
.trigger .node-icon {
  background: var(--node-trigger-soft);
}
.sendMessage .node-type {
  color: var(--node-message);
}
.sendMessage .node-icon {
  background: var(--node-message-soft);
}
.businessHours .node-type {
  color: var(--node-business);
}
.businessHours .node-icon {
  background: var(--node-business-soft);
}
.addComment .node-type {
  color: var(--node-comment);
}
.addComment .node-icon {
  background: var(--node-comment-soft);
}
h2 {
  margin: 10px 0 5px;
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node-description {
  margin: 0;
  color: #697382;
  font-size: 12px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.attachment-count {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-top: 12px;
  padding-top: 9px;
  border-top: 1px solid #eef1f2;
  color: #657080;
  font-size: 10px;
  line-height: 1;
}
.branch-label {
  width: 100px;
  min-height: 34px;
  display: flex;
  justify-content: center;
  gap: 5px;
  align-items: center;
  border-radius: 6px;
  border: 1px solid #cae6d8;
  padding: 5px 10px;
  background: var(--branch-success);
  color: var(--branch-success-foreground);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.branch-label.failure {
  border-color: #f2d5ca;
  background: var(--branch-failure);
  color: var(--branch-failure-foreground);
}
.branch-icon {
  display: grid;
  place-items: center;
}
:deep(.vue-flow__handle) {
  z-index: 2;
  width: 10px;
  height: 10px;
  border: 2px solid white;
  background: var(--connector);
  box-shadow: 0 0 0 1px #9bb7ad33;
  transition:
    background-color 150ms,
    box-shadow 150ms;
}
:deep(.vue-flow__handle:hover) {
  background: #176e59;
  box-shadow: 0 0 0 3px #176e5924;
}
</style>
