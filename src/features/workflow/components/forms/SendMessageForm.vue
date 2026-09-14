<script setup>
import { ref, watch } from 'vue'
import AttachmentPreview from '@/components/base/AttachmentPreview.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_ATTACHMENTS = 10
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])
const fileInput = ref(null)
const attachmentError = ref('')
const localTexts = ref(getTexts(props.modelValue))
const localAttachments = ref(getAttachments(props.modelValue))

function getTexts(data) {
  const payload = Array.isArray(data?.payload) ? data.payload : []
  return payload.filter((entry) => entry?.type === 'text').map((entry) => String(entry.text ?? ''))
}

function getAttachments(data) {
  const payload = Array.isArray(data?.payload)
    ? data.payload.filter((entry) => entry?.type === 'attachment')
    : []
  return payload
    .map((entry) => entry.attachment || entry)
    .filter(Boolean)
    .map(normalizeAttachment)
}

function normalizeAttachment(value) {
  if (typeof value === 'string')
    return { url: value, name: value.split('/').pop() || 'Attachment', type: '' }
  return {
    ...value,
    name: value.name || value.file?.name || value.url?.split('/').pop() || 'Attachment',
  }
}

function update() {
  const payload = localTexts.value.map((text) => ({ type: 'text', text }))
  localAttachments.value.forEach((attachment) => payload.push({ type: 'attachment', attachment }))
  emit('update:modelValue', { ...props.modelValue, payload })
}

watch(
  () => props.modelValue,
  (value) => {
    localTexts.value = getTexts(value)
    localAttachments.value = getAttachments(value)
  },
  { deep: true },
)

function addText() {
  localTexts.value.push('')
  update()
}
function updateText(index, value) {
  localTexts.value[index] = value
  update()
}
function removeText(index) {
  localTexts.value.splice(index, 1)
  update()
}

function chooseFiles() {
  fileInput.value?.click()
}
function onFiles(event) {
  attachmentError.value = ''
  const files = [...(event.target.files || [])]
  if (localAttachments.value.length + files.length > MAX_ATTACHMENTS) {
    attachmentError.value = `You can add up to ${MAX_ATTACHMENTS} attachments.`
    event.target.value = ''
    return
  }
  const invalid = files.find(
    (file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE,
  )
  if (invalid) {
    attachmentError.value = `${invalid.name} must be a JPG, PNG, GIF, WebP, or PDF file up to 10 MB.`
    event.target.value = ''
    return
  }
  files.forEach((file) => {
    const attachmentId = crypto.randomUUID()
    localAttachments.value.push({
      attachmentId,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
    })
  })
  update()
  event.target.value = ''
}

function removeAttachment(index) {
  localAttachments.value.splice(index, 1)
  update()
}
</script>

<template>
  <div class="grid gap-3.5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="m-0 text-sm font-semibold">Message text</h3>
        <p class="m-1 mt-1 text-xs text-muted-foreground">Add one or more text messages.</p>
      </div>
      <Button type="button" variant="outline" size="sm" @click="addText">Add text</Button>
    </div>
    <div v-if="localTexts.length" class="grid gap-3">
      <div v-for="(text, index) in localTexts" :key="index" class="grid gap-1">
        <Label class="text-xs font-semibold" :for="`message-text-${index}`">
          Text {{ index + 1 }}
        </Label>
        <div class="flex items-center gap-1">
          <Input
            class="flex-1"
            :id="`message-text-${index}`"
            :model-value="text"
            maxlength="5000"
            @update:model-value="updateText(index, $event)"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="`Remove text ${index + 1}`"
            @click="removeText(index)"
          >
            <span aria-hidden="true">×</span>
          </Button>
        </div>
      </div>
    </div>
    <p v-else class="m-1 mt-0 text-xs text-muted-foreground">No message text added.</p>
    <p v-if="errors.text" class="m-0 text-xs text-destructive" role="alert">{{ errors.text }}</p>
  </div>

  <Separator />

  <div class="grid gap-3.5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="m-0 text-sm font-semibold">Attachments</h3>
        <p class="m-1 mt-1 text-xs text-muted-foreground">
          JPG, PNG, GIF, WebP, or PDF up to 10 MB each.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="localAttachments.length >= MAX_ATTACHMENTS"
        @click="chooseFiles"
      >
        Upload
      </Button>
    </div>
    <input
      ref="fileInput"
      class="sr-only"
      type="file"
      multiple
      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
      @change="onFiles"
    />
    <div v-if="localAttachments.length" class="grid grid-cols-2 gap-2 max-[480px]:grid-cols-1">
      <AttachmentPreview
        v-for="(attachment, index) in localAttachments"
        :key="attachment.attachmentId || attachment.url || index"
        :attachment="attachment"
        @remove="removeAttachment(index)"
      />
    </div>
    <p v-else class="m-1 mt-0 text-xs text-muted-foreground">No attachments added.</p>
    <p v-if="attachmentError" class="m-0 text-xs text-destructive" role="alert">
      {{ attachmentError }}
    </p>
  </div>
</template>
