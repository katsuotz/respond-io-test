<script setup>
import { computed } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])
const comment = computed(() => String(props.modelValue?.comment ?? props.modelValue?.text ?? ''))

function update(value) {
  emit('update:modelValue', { ...props.modelValue, comment: value, text: value })
}
</script>

<template>
  <div class="grid gap-1.5">
    <Label class="text-xs font-semibold text-foreground" for="node-comment">Comment</Label>
    <Textarea
      id="node-comment"
      :model-value="comment"
      maxlength="5000"
      rows="6"
      :aria-invalid="Boolean(errors.comment)"
      @update:model-value="update"
    />
    <div class="flex justify-between gap-3 text-[.7rem] text-muted-foreground">
      <span v-if="errors.comment" class="text-destructive" role="alert">{{ errors.comment }}</span
      ><span>{{ comment.length }}/5000</span>
    </div>
  </div>
</template>
