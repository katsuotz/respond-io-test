<script setup>
import { computed } from 'vue'
import { Check } from '@lucide/vue'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DAYS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
]
const TIMEZONES = ['UTC', ...Intl.supportedValuesOf('timeZone')]
const TIMEZONE_OPTIONS = TIMEZONES.map((value) => ({ value, label: value }))

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue'])

const schedule = computed(() =>
  DAYS.map(
    ([day]) =>
      props.modelValue?.times?.find((entry) => entry.day === day) || {
        day,
        startTime: '09:00',
        endTime: '17:00',
      },
  ),
)
const timezone = computed(() => props.modelValue?.timezone || 'UTC')
const selectedTimezone = computed({
  get: () =>
    TIMEZONE_OPTIONS.find((option) => option.value === timezone.value) || {
      value: timezone.value,
      label: timezone.value,
    },
  set: (value) => updateTimezone(value?.value || ''),
})

function updateTime(day, field, value) {
  const times = schedule.value.map((entry) =>
    entry.day === day ? { ...entry, [field]: value } : { ...entry },
  )
  emit('update:modelValue', { ...props.modelValue, times, timezone: timezone.value })
}
function updateTimezone(value) {
  emit('update:modelValue', { ...props.modelValue, times: schedule.value, timezone: value })
}
</script>

<template>
  <div class="grid gap-4">
    <div class="grid gap-[.45rem]" role="group" aria-label="Business hours by day">
      <div
        class="grid grid-cols-[minmax(4.3rem,1fr)_1fr_1fr] items-center gap-2 px-[.15rem] text-[.68rem] font-semibold text-muted-foreground"
      >
        <span>Day</span>
        <span>Opens</span>
        <span>Closes</span>
      </div>
      <div
        v-for="(entry, index) in schedule"
        :key="entry.day"
        class="grid grid-cols-[minmax(4.3rem,1fr)_1fr_1fr] items-center gap-2"
      >
        <Label class="text-xs font-semibold" :for="`hours-${entry.day}-start`">
          {{ DAYS[index][1] }}
        </Label>
        <Input
          :id="`hours-${entry.day}-start`"
          type="time"
          :model-value="entry.startTime"
          :aria-label="`${DAYS[index][1]} opening time`"
          :aria-invalid="Boolean(errors[entry.day])"
          @update:model-value="updateTime(entry.day, 'startTime', $event)"
        />
        <Input
          :id="`hours-${entry.day}-end`"
          type="time"
          :model-value="entry.endTime"
          :aria-label="`${DAYS[index][1]} closing time`"
          :aria-invalid="Boolean(errors[entry.day])"
          @update:model-value="updateTime(entry.day, 'endTime', $event)"
        />
        <p
          v-if="errors[entry.day]"
          class="col-span-2 col-start-2 m-0 -mt-0.5 text-xs text-destructive"
          role="alert"
        >
          {{ errors[entry.day] }}
        </p>
      </div>
    </div>
    <p v-if="errors.times" class="m-0 text-xs text-destructive" role="alert">{{ errors.times }}</p>
    <div class="grid gap-1.5">
      <Label class="text-xs font-semibold text-foreground" for="node-timezone">Time zone</Label>
      <Combobox v-model="selectedTimezone" by="value" :open-on-focus="true" :open-on-click="true">
        <ComboboxAnchor class="w-full">
          <ComboboxInput
            id="node-timezone"
            :display-value="(value) => value?.label || ''"
            placeholder="Search time zones..."
            :aria-invalid="Boolean(errors.timezone)"
            :aria-describedby="errors.timezone ? 'timezone-error' : undefined"
          />
        </ComboboxAnchor>
        <ComboboxList align="start" class="w-(--reka-combobox-trigger-width)">
          <ComboboxEmpty>No time zone found.</ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxItem
              v-for="option in TIMEZONE_OPTIONS"
              :key="option.value"
              :value="option"
              :text-value="option.label"
            >
              {{ option.label }}
              <ComboboxItemIndicator>
                <Check />
              </ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxList>
      </Combobox>
      <p
        v-if="errors.timezone"
        id="timezone-error"
        class="m-0 text-xs text-destructive"
        role="alert"
      >
        {{ errors.timezone }}
      </p>
    </div>
  </div>
</template>
