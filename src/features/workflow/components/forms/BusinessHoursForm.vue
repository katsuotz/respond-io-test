<script setup>
import { computed } from 'vue'
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
    <div class="hours-table" role="group" aria-label="Business hours by day">
      <div class="hours-table__header"><span>Day</span><span>Opens</span><span>Closes</span></div>
      <div v-for="(entry, index) in schedule" :key="entry.day" class="hours-row">
        <Label :for="`hours-${entry.day}-start`">{{ DAYS[index][1] }}</Label>
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
        <p v-if="errors[entry.day]" class="field-error m-0 text-xs text-destructive" role="alert">{{ errors[entry.day] }}</p>
      </div>
    </div>
    <p v-if="errors.times" class="m-0 text-xs text-destructive" role="alert">{{ errors.times }}</p>
    <div class="grid gap-1.5">
      <Label class="text-xs font-semibold text-foreground" for="node-timezone">Time zone</Label>
      <Input
        id="node-timezone"
        list="workflow-timezones"
        :model-value="timezone"
        autocomplete="off"
        :aria-invalid="Boolean(errors.timezone)"
        :aria-describedby="errors.timezone ? 'timezone-error' : undefined"
        @update:model-value="updateTimezone"
      />
      <datalist id="workflow-timezones">
        <option v-for="option in TIMEZONES" :key="option" :value="option" />
      </datalist>
      <p v-if="errors.timezone" id="timezone-error" class="m-0 text-xs text-destructive" role="alert">
        {{ errors.timezone }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.hours-table {
  display: grid;
  gap: 0.45rem;
}
.hours-table__header,
.hours-row {
  display: grid;
  grid-template-columns: minmax(4.3rem, 1fr) 1fr 1fr;
  gap: 0.5rem;
  align-items: center;
}
.hours-table__header {
  padding: 0 0.15rem;
  color: var(--muted-foreground, #657080);
  font-size: 0.68rem;
  font-weight: 600;
}
.hours-row :deep(label) {
  font-size: 0.75rem;
  font-weight: 600;
}
.hours-row .field-error {
  grid-column: 2 / -1;
  margin: -0.15rem 0 0;
}
</style>
