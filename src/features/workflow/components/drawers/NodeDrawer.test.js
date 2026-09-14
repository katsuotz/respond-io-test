import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import NodeDrawer from './NodeDrawer.vue'

const passthrough = (name, tag = 'div') => ({
  name,
  inheritAttrs: false,
  template: `<${tag} v-bind="$attrs"><slot /></${tag}>`,
})
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
const selectStub = {
  name: 'Select',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template:
    '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
}

const stubs = {
  Sheet: { name: 'Sheet', props: { open: Boolean }, template: '<div v-if="open"><slot /></div>' },
  SheetContent: passthrough('SheetContent', 'section'),
  SheetHeader: passthrough('SheetHeader', 'header'),
  SheetTitle: passthrough('SheetTitle', 'h2'),
  SheetDescription: passthrough('SheetDescription', 'p'),
  SheetFooter: passthrough('SheetFooter', 'footer'),
  AlertDialog: {
    name: 'AlertDialog',
    props: { open: Boolean },
    template: '<div v-if="open"><slot /></div>',
  },
  AlertDialogContent: passthrough('AlertDialogContent', 'section'),
  AlertDialogHeader: passthrough('AlertDialogHeader', 'header'),
  AlertDialogFooter: passthrough('AlertDialogFooter', 'footer'),
  AlertDialogTitle: passthrough('AlertDialogTitle', 'h2'),
  AlertDialogDescription: passthrough('AlertDialogDescription', 'p'),
  AlertDialogCancel: {
    name: 'AlertDialogCancel',
    inheritAttrs: false,
    template: '<button v-bind="$attrs"><slot /></button>',
  },
  AlertDialogAction: {
    name: 'AlertDialogAction',
    inheritAttrs: false,
    template: '<button v-bind="$attrs"><slot /></button>',
  },
  Button: buttonStub,
  Input: inputStub,
  Textarea: textareaStub,
  Label: passthrough('Label', 'label'),
  Badge: passthrough('Badge', 'span'),
  Separator: passthrough('Separator', 'hr'),
  Select: selectStub,
  SelectTrigger: passthrough('SelectTrigger', 'button'),
  SelectValue: passthrough('SelectValue', 'span'),
  SelectContent: passthrough('SelectContent', 'div'),
  SelectItem: {
    name: 'SelectItem',
    props: { value: String },
    template: '<option :value="value"><slot /></option>',
  },
  Alert: passthrough('Alert', 'div'),
  AlertDescription: passthrough('AlertDescription', 'p'),
}

function mountDrawer(props = {}) {
  return mount(NodeDrawer, { props: { open: true, creating: true, ...props }, global: { stubs } })
}

describe('NodeDrawer', () => {
  it('retains unsaved content when graph positions change and after failed saves', async () => {
    const node = {
      id: 'message',
      type: 'sendMessage',
      title: 'Message',
      description: '',
      position: { x: 0, y: 0 },
      data: { payload: [] },
    }
    const wrapper = mountDrawer({ node, creating: false })
    await wrapper
      .findComponent({ name: 'NodeGeneralFields' })
      .vm.$emit('update:title', 'Unsaved title')
    await wrapper.setProps({ node: { ...node, position: { x: 100, y: 0 } } })
    expect(wrapper.find('#node-title').element.value).toBe('Unsaved title')
    await wrapper.find('form').trigger('submit')
    await wrapper.setProps({ error: 'Storage full' })
    expect(wrapper.vm.hasUnsavedChanges()).toBe(true)
    expect(wrapper.find('#node-title').element.value).toBe('Unsaved title')
    wrapper.vm.markSaved()
    expect(wrapper.vm.hasUnsavedChanges()).toBe(false)
  })

  it('validates required create fields and emits a canonical new node', async () => {
    const wrapper = mountDrawer()
    const fields = wrapper.findComponent({ name: 'NodeGeneralFields' })

    await fields.vm.$emit('update:title', ' Welcome message ')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Select a valid node type')
    expect(wrapper.emitted('save')).toBeUndefined()

    await fields.vm.$emit('update:type', 'sendMessage')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('save')[0][0]).toMatchObject({
      type: 'sendMessage',
      title: 'Welcome message',
      data: { payload: [] },
    })
    expect(wrapper.emitted('save')[0][0]).not.toHaveProperty('id')
  })

  it('protects dirty drafts when canceling and exposes discard state', async () => {
    const wrapper = mountDrawer()
    const fields = wrapper.findComponent({ name: 'NodeGeneralFields' })
    await fields.vm.$emit('update:title', 'Draft')
    expect(wrapper.vm.hasUnsavedChanges()).toBe(true)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancel')
      .trigger('click')
    expect(wrapper.text()).toContain('Discard unsaved changes?')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Discard changes')
      .trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.vm.hasUnsavedChanges()).toBe(false)
  })

  it('shows mutation errors and allows deleting trigger nodes', async () => {
    const trigger = {
      id: 'trigger-1',
      type: 'trigger',
      title: 'Conversation opened',
      description: '',
      data: {},
    }
    const wrapper = mountDrawer({
      node: trigger,
      creating: false,
      error: 'Unable to save workflow.',
    })
    expect(wrapper.text()).toContain('Unable to save workflow.')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Delete')
      .trigger('click')
    expect(wrapper.text()).toContain('Delete this node?')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Delete node')
      .trigger('click')
    expect(wrapper.emitted('delete')).toEqual([['trigger-1']])
  })
})
