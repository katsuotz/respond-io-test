import { describe, expect, it } from 'vitest'

import { NODE_TYPES } from '@/features/workflow/constants'
import { normalizePayload } from './normalize'

const payload = [
  { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened' } },
  {
    id: 'hours',
    parentId: 1,
    type: 'dateTime',
    name: 'Business Hours',
    data: {
      timezone: 'Asia/Bangkok',
      times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }],
    },
  },
  {
    id: 'success',
    parentId: 'hours',
    type: 'dateTimeConnector',
    data: { connectorType: 'success' },
  },
  {
    id: 'message',
    parentId: 'success',
    type: 'sendMessage',
    name: 'Welcome',
    data: { payload: [{ type: 'text', text: 'Hi' }] },
  },
]

describe('normalizePayload', () => {
  it('normalizes IDs, node types, branch ownership, edges, and positions', () => {
    const graph = normalizePayload(payload)
    const trigger = graph.nodes.find((node) => node.id === '1')
    const hours = graph.nodes.find((node) => node.id === 'hours')
    const success = graph.nodes.find((node) => node.id === 'success')
    const message = graph.nodes.find((node) => node.id === 'message')

    expect(trigger.type).toBe(NODE_TYPES.TRIGGER)
    expect(hours.type).toBe(NODE_TYPES.BUSINESS_HOURS)
    expect(hours.data.timezone).toBe('Asia/Bangkok')
    expect(success).toMatchObject({
      type: NODE_TYPES.BRANCH,
      data: { ownerId: 'hours', connectorType: 'success' },
    })
    expect(message.data.payload[0].text).toBe('Hi')
    expect(graph.edges).toEqual([
      { id: 'edge-1-hours', source: '1', target: 'hours' },
      { id: 'edge-hours-success', source: 'hours', target: 'success' },
      { id: 'edge-success-message', source: 'success', target: 'message' },
    ])
    expect(
      graph.nodes.every(
        (node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y),
      ),
    ).toBe(true)
  })

  it('rejects a non-array payload', () => {
    expect(() => normalizePayload({})).toThrow('Workflow payload must be an array')
  })
})
