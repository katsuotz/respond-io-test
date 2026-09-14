<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { FileText, X } from '@lucide/vue'

const props = defineProps({
  attachment: { type: Object, required: true },
})

const emit = defineEmits(['remove'])
const objectUrl = ref('')
const imageFailed = ref(false)
const imageLoaded = ref(false)

const name = computed(() => props.attachment.name || props.attachment.file?.name || 'Attachment')
const remoteUrl = computed(() => props.attachment.url || props.attachment.previewUrl || '')
const url = computed(() => objectUrl.value || remoteUrl.value)
const isImage = computed(() => {
  const type = props.attachment.type || props.attachment.file?.type || ''
  return (
    !imageFailed.value &&
    (type.startsWith('image/') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url.value))
  )
})

function releaseObjectUrl() {
  const urlToRelease =
    objectUrl.value || (remoteUrl.value.startsWith('blob:') ? remoteUrl.value : '')
  if (urlToRelease && typeof URL !== 'undefined') URL.revokeObjectURL(urlToRelease)
  objectUrl.value = ''
}

function refreshObjectUrl(attachment) {
  releaseObjectUrl()
  imageFailed.value = false
  imageLoaded.value = false
  const file = attachment?.file
  if (file && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function')
    objectUrl.value = URL.createObjectURL(file)
}

watch(
  () => [props.attachment?.file, props.attachment?.url, props.attachment?.previewUrl],
  () => refreshObjectUrl(props.attachment),
  { immediate: true },
)
onBeforeUnmount(releaseObjectUrl)
</script>

<template>
  <div
    class="attachment-preview relative flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-muted p-2"
  >
    <div
      class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-background text-muted-foreground"
      aria-hidden="true"
    >
      <span v-if="isImage && url && !imageLoaded" class="absolute text-[.55rem]" aria-live="polite">
        Loading…
      </span>
      <img
        v-if="isImage && url"
        :src="url"
        class="size-full object-cover"
        alt=""
        :aria-busy="!imageLoaded"
        @load="imageLoaded = true"
        @error="imageFailed = true"
      />
      <FileText v-else class="size-[1.3rem]" aria-hidden="true" />
    </div>
    <span
      class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[.78rem] text-foreground"
      :title="name"
    >
      {{ name }}
    </span>
    <button
      type="button"
      class="attachment-preview__remove ml-auto grid size-[1.7rem] shrink-0 place-items-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-background hover:text-destructive focus-visible:bg-background focus-visible:text-destructive"
      :aria-label="`Remove ${name}`"
      @click="emit('remove')"
    >
      <X class="size-[.9rem]" aria-hidden="true" />
    </button>
  </div>
</template>
