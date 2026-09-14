import { describe, expect, it } from 'vitest'

import { DEFAULT_BUSINESS_HOURS, NODE_TYPES } from '@/features/workflow/constants'
import { validateConnection, validateNode } from './validation'

const graph = {
  nodes: [
    { id: 'trigger', type: NODE_TYPES.TRIGGER, data: {} },
    { id: 'hours', type: NODE_TYPES.BUSINESS_HOURS, data: {} },
    { id: 'message', type: NODE_TYPES.SEND_MESSAGE, data: { payload: [] } },
    { id: 'branch', type: NODE_TYPES.BRANCH, data: { ownerId: 'hours' } },
  ],
  edges: [
    { id: 'edge-trigger-hours', source: 'trigger', target: 'hours' },
    { id: 'edge-hours-branch', source: 'hours', target: 'branch' },
  ],
}

describe('workflow validation', () => {
  it('returns field errors for invalid node data', () => {
    expect(
      validateNode({
        type: NODE_TYPES.SEND_MESSAGE,
        title: ' ',
        description: 'x'.repeat(501),
        data: { payload: [] },
      }),
    ).toMatchObject({
      title: 'Title is required',
      description: 'Description must be 500 characters or fewer',
    })
  })

  it('rejects invalid graph connections', () => {
    expect(validateConnection(graph, { source: 'message', target: 'trigger' })).toContain('trigger')
    expect(validateConnection(graph, { source: 'message', target: 'branch' })).toContain(
      'display-only',
    )
    expect(validateConnection(graph, { source: 'hours', target: 'message' })).toContain(
      'through a branch',
    )
    expect(
      validateConnection(
        {
          nodes: graph.nodes.slice(1, 3),
          edges: [{ id: 'edge-hours-message', source: 'hours', target: 'message' }],
        },
        { source: 'message', target: 'hours' },
      ),
    ).toContain('cycle')
  })

  it('allows a branch marker to connect to an unconnected node', () => {
    expect(validateConnection(graph, { source: 'branch', target: 'message' })).toBeNull()
  })

  it('validates timezone, unique weekday schedules, and attachments', () => {
    const invalidHours = {
      type: NODE_TYPES.BUSINESS_HOURS,
      title: 'Hours',
      description: '',
      data: {
        ...DEFAULT_BUSINESS_HOURS,
        timezone: 'Invalid/Timezone',
        times: [...DEFAULT_BUSINESS_HOURS.times, DEFAULT_BUSINESS_HOURS.times[0]],
      },
    }
    const invalidMessage = {
      type: NODE_TYPES.SEND_MESSAGE,
      title: 'Message',
      description: '',
      data: {
        payload: Array.from({ length: 11 }, () => ({
          type: 'attachment',
          attachment: { type: 'image/png', size: 1 },
        })),
      },
    }

    expect(validateNode(invalidHours)).toMatchObject({
      timezone: 'Timezone is invalid',
      times: 'Business hours must include every day once',
    })
    expect(validateNode(invalidMessage).attachments).toContain('up to 10 attachments')
  })
})
