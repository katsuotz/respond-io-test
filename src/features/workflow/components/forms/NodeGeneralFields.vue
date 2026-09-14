<script setup>
import { computed } from 'vue'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  type: { type: String, default: '' },
  creating: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:title', 'update:description', 'update:type'])

const typeLabel = computed(
  () =>
    ({
      sendMessage: 'Send Message',
      addComment: 'Add Comment',
      businessHours: 'Business Hours',
    })[props.type] || props.type,
)
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-1.5">
      <Label class="text-xs font-semibold text-foreground" for="node-title">
        Title
        <span class="text-destructive" aria-hidden="true">*</span>
      </Label>
      <Input
        id="node-title"
        :model-value="title"
        maxlength="100"
        autocomplete="off"
        :aria-invalid="Boolean(errors.title)"
        :aria-describedby="errors.title ? 'node-title-error' : undefined"
        @update:model-value="emit('update:title', $event)"
      />
      <p
        v-if="errors.title"
        id="node-title-error"
        class="m-0 text-xs text-destructive"
        role="alert"
      >
        {{ errors.title }}
      </p>
    </div>

    <div class="grid gap-1.5">
      <Label class="text-xs font-semibold text-foreground" for="node-description">
        Description
      </Label>
      <Textarea
        id="node-description"
        :model-value="description"
        maxlength="500"
        :aria-invalid="Boolean(errors.description)"
        :aria-describedby="errors.description ? 'node-description-error' : undefined"
        @update:model-value="emit('update:description', $event)"
      />
      <div class="flex justify-between gap-3 text-[.7rem] text-muted-foreground">
        <span
          v-if="errors.description"
          id="node-description-error"
          class="text-destructive"
          role="alert"
        >
          {{ errors.description }}
        </span>
        <span>{{ description.length }}/500</span>
      </div>
    </div>

    <div class="grid gap-1.5">
      <Label class="text-xs font-semibold text-foreground" for="node-type">
        Type of node
        <span class="text-destructive" aria-hidden="true">*</span>
      </Label>
      <Select v-if="creating" :model-value="type" @update:model-value="emit('update:type', $event)">
        <SelectTrigger id="node-type" :aria-invalid="Boolean(errors.type)">
          <SelectValue placeholder="Select a node type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="sendMessage">Send Message</SelectItem>
            <SelectItem value="addComment">Add Comment</SelectItem>
            <SelectItem value="businessHours">Business Hours</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <div v-else class="flex min-h-10 items-center" aria-live="polite">
        <Badge variant="secondary">{{ typeLabel }}</Badge>
      </div>
      <p v-if="errors.type" class="m-0 text-xs text-destructive" role="alert">{{ errors.type }}</p>
    </div>
  </div>
</template>
