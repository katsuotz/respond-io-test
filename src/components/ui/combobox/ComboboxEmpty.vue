<script setup>
import { reactiveOmit } from '@vueuse/core'
import { ComboboxEmpty } from 'reka-ui'
import { cn } from 'cn'

const props = defineProps({
  class: { type: null, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
})

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ComboboxEmpty
    data-slot="combobox-empty"
    v-bind="{ ...$attrs, ...delegatedProps }"
    :class="cn('px-3 py-3 text-center text-sm text-muted-foreground', props.class)"
  >
    <slot />
  </ComboboxEmpty>
</template>
