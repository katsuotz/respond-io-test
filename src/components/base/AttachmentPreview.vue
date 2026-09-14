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
  <div class="attachment-preview">
    <div class="attachment-preview__media" aria-hidden="true">
      <span
        v-if="isImage && url && !imageLoaded"
        class="attachment-preview__loading"
        aria-live="polite"
        >Loading…</span
      >
      <img
        v-if="isImage && url"
        :src="url"
        alt=""
        :aria-busy="!imageLoaded"
        @load="imageLoaded = true"
        @error="imageFailed = true"
      />
      <FileText v-else aria-hidden="true" />
    </div>
    <span class="attachment-preview__name" :title="name">{{ name }}</span>
    <button
      type="button"
      class="attachment-preview__remove"
      :aria-label="`Remove ${name}`"
      @click="emit('remove')"
    >
      <X aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.attachment-preview {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  padding: 0.55rem;
  border: 1px solid var(--border, #e1e5eb);
  border-radius: 0.6rem;
  background: var(--muted, #f3f5f7);
}
.attachment-preview__media {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 2.5rem;
  overflow: hidden;
  border-radius: 0.4rem;
  background: var(--background, #ffffff);
  color: var(--muted-foreground, #657080);
}
.attachment-preview__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.attachment-preview__loading {
  position: absolute;
  font-size: 0.55rem;
}
.attachment-preview__media svg {
  width: 1.3rem;
  height: 1.3rem;
}
.attachment-preview__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  color: var(--foreground, #252b37);
}
.attachment-preview__remove {
  display: grid;
  place-items: center;
  margin-left: auto;
  width: 1.7rem;
  height: 1.7rem;
  flex: 0 0 1.7rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: var(--muted-foreground, #657080);
  cursor: pointer;
}
.attachment-preview__remove:hover,
.attachment-preview__remove:focus-visible {
  background: var(--background, #ffffff);
  color: var(--destructive, #b42335);
}
.attachment-preview__remove svg {
  width: 0.9rem;
  height: 0.9rem;
}
</style>
