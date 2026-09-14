import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SendMessageForm from './SendMessageForm.vue'
import AddCommentForm from './AddCommentForm.vue'
import BusinessHoursForm from './BusinessHoursForm.vue'

const inputStub = {
  name: 'Input',
  inheritAttrs: false,
  props: { modelValue: { type: [String, Number], default: '' } },
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}
const textareaStub = {
  name: 'Textarea',
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  template:
    '<textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}
const buttonStub = {
  name: 'Button',
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
}
const labelStub = {
  name: 'Label',
  inheritAttrs: false,
  template: '<label v-bind="$attrs"><slot /></label>',
}
const separatorStub = { name: 'Separator', template: '<hr />' }
const attachmentStub = {
  name: 'AttachmentPreview',
  props: { attachment: Object },
  emits: ['remove'],
  template: '<div class="attachment" />',
}
const stubs = {
  Input: inputStub,
  Textarea: textareaStub,
  Button: buttonStub,
  Label: labelStub,
  Separator: separatorStub,
  AttachmentPreview: attachmentStub,
}

describe('SendMessageForm', () => {
  it('adds, updates, and removes text entries', async () => {
    const wrapper = mount(SendMessageForm, {
      props: { modelValue: { payload: [{ type: 'text', text: 'Hello' }] } },
      global: { stubs },
    })
    await wrapper.find('input').setValue('Updated')
    expect(wrapper.emitted('update:modelValue').at(-1)[0].payload[0].text).toBe('Updated')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add text')
      .trigger('click')
    expect(wrapper.findAll('input[id^="message-text-"]')).toHaveLength(2)
    await wrapper.find('button[aria-label="Remove text 1"]').trigger('click')
    expect(wrapper.emitted('update:modelValue').at(-1)[0].payload).toEqual([
      { type: 'text', text: '' },
    ])
  })

  it('rejects unsupported or oversized attachments', async () => {
    const wrapper = mount(SendMessageForm, {
      props: { modelValue: { payload: [] } },
      global: { stubs },
    })
    const file = new File(['invalid'], 'notes.txt', { type: 'text/plain' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.text()).toContain('must be a JPG, PNG, GIF, WebP, or PDF file')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('AddCommentForm', () => {
  it('allows the comment to be cleared', async () => {
    const wrapper = mount(AddCommentForm, {
      props: { modelValue: { comment: 'Existing comment' } },
      global: { stubs },
    })
    await wrapper.find('textarea').setValue('')
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toMatchObject({ comment: '', text: '' })
  })
})

describe('BusinessHoursForm', () => {
  it('renders day validation errors and emits time changes', async () => {
    const wrapper = mount(BusinessHoursForm, {
      props: {
        modelValue: {
          timezone: 'UTC',
          times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }],
        },
        errors: { mon: 'Opening time must be before closing time.' },
      },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('Opening time must be before closing time.')
    await wrapper.find('#hours-mon-start').setValue('10:00')
    expect(wrapper.emitted('update:modelValue').at(-1)[0].times[0]).toMatchObject({
      day: 'mon',
      startTime: '10:00',
    })
  })
})

describe('file preview lifecycle', () => {
  it('releases blob previews when attachments are removed', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const wrapper = mount(SendMessageForm, {
      props: {
        modelValue: {
          payload: [
            {
              type: 'attachment',
              attachment: {
                attachmentId: 'a1',
                name: 'photo.png',
                type: 'image/png',
                previewUrl: 'blob:test',
              },
            },
          ],
        },
      },
      global: { stubs: { ...stubs, AttachmentPreview: undefined } },
    })
    await wrapper.find('.attachment-preview__remove').trigger('click')
    expect(revoke).toHaveBeenCalledWith('blob:test')
    revoke.mockRestore()
  })
})
