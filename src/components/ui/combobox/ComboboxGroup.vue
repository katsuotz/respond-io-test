<script setup>
import { reactiveOmit } from '@vueuse/core'
import { ComboboxGroup, ComboboxLabel } from 'reka-ui'
import { cn } from 'cn'

const props = defineProps({
  class: { type: null, required: false },
  heading: { type: String, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
})

const delegatedProps = reactiveOmit(props, 'class', 'heading')
</script>

<template>
  <ComboboxGroup
    data-slot="combobox-group"
    v-bind="{ ...$attrs, ...delegatedProps }"
    :class="cn('overflow-hidden p-1 text-foreground', props.class)"
  >
    <ComboboxLabel v-if="heading" class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
      {{ heading }}
    </ComboboxLabel>
    <slot />
  </ComboboxGroup>
</template>
