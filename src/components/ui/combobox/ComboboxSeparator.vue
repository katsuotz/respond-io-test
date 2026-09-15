<script setup>
import { reactiveOmit } from '@vueuse/core'
import { ComboboxSeparator } from 'reka-ui'
import { cn } from 'cn'

const props = defineProps({
  class: { type: null, required: false },
  orientation: { type: String, required: false },
  decorative: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ComboboxSeparator
    data-slot="combobox-separator"
    v-bind="{ ...$attrs, ...delegatedProps }"
    :class="cn('-mx-1 h-px bg-border', props.class)"
  >
    <slot />
  </ComboboxSeparator>
</template>
