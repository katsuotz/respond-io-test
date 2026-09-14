import { beforeEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { clearWorkflowSnapshot, saveWorkflowSnapshot } from '@/lib/database'
import * as workflowPersistence from '@/features/workflow/services/workflowPersistence'
import { NODE_TYPES } from '@/features/workflow/constants'
import { useWorkflowStore } from './workflow'

const initialPayload = [
  { id: 1, parentId: -1, type: 'trigger', data: {} },
  { id: 'welcome', parentId: 1, type: 'sendMessage', name: 'Welcome', data: { payload: [] } },
]

describe('useWorkflowStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await clearWorkflowSnapshot()
  })

  it('initializes and persists a normalized graph', async () => {
    const store = useWorkflowStore()
    await store.initialize(initialPayload)

    expect(store.loaded).toBe(true)
    expect(store.graph.nodes.map((node) => node.id)).toEqual(['1', 'welcome'])
    expect(store.graph.edges).toEqual([{ id: 'edge-1-welcome', source: '1', target: 'welcome' }])
  })

  it('creates business hours with owned success and failure branches', async () => {
    const store = useWorkflowStore()
    await store.initialize(initialPayload)
    const node = await store.createNode({ title: 'Office hours', type: NODE_TYPES.BUSINESS_HOURS })

    const branches = store.graph.nodes.filter((candidate) => candidate.type === NODE_TYPES.BRANCH)
    expect(branches).toHaveLength(2)
    expect(branches.every((branch) => branch.data.ownerId === node.id)).toBe(true)
    expect(store.graph.edges.filter((edge) => edge.source === node.id)).toHaveLength(2)
  })

  it('deletes a business-hours node and its owned branches but keeps descendants', async () => {
    const store = useWorkflowStore()
    await store.initialize(initialPayload)
    const hours = await store.createNode({ title: 'Office hours', type: NODE_TYPES.BUSINESS_HOURS })
    const descendant = await store.createNode({ title: 'Reply', type: NODE_TYPES.SEND_MESSAGE })
    const success = store.graph.nodes.find(
      (node) =>
        node.type === NODE_TYPES.BRANCH &&
        node.data.ownerId === hours.id &&
        node.data.connectorType === 'success',
    )
    await store.connect({ source: success.id, target: descendant.id })
    await store.deleteNode(hours.id)

    expect(store.graph.nodes.some((node) => node.id === hours.id)).toBe(false)
    expect(
      store.graph.nodes.some(
        (node) => node.type === NODE_TYPES.BRANCH && node.data.ownerId === hours.id,
      ),
    ).toBe(false)
    expect(store.graph.nodes.some((node) => node.id === descendant.id)).toBe(true)
    expect(
      store.graph.edges.some((edge) => edge.source === hours.id || edge.target === hours.id),
    ).toBe(false)
  })

  it('prevents editing or disconnecting owned branch edges', async () => {
    const store = useWorkflowStore()
    await store.initialize(initialPayload)
    const hours = await store.createNode({ title: 'Office hours', type: NODE_TYPES.BUSINESS_HOURS })
    const ownedEdge = store.graph.edges.find((edge) => edge.source === hours.id)

    await expect(store.disconnect(ownedEdge.id)).rejects.toThrow('cannot be removed')
    await expect(
      store.reconnectEdge(ownedEdge.id, { source: hours.id, target: 'welcome' }),
    ).rejects.toThrow('cannot be changed')
  })

  it('reconnects a regular edge atomically', async () => {
    const store = useWorkflowStore()
    await store.initialize(initialPayload)
    const extra = await store.createNode({ title: 'Extra', type: NODE_TYPES.SEND_MESSAGE })
    const edge = store.graph.edges[0]

    await store.reconnectEdge(edge.id, { source: '1', target: extra.id })

    expect(store.graph.edges).toEqual([{ id: edge.id, source: '1', target: extra.id }])
  })

  it('serializes mutations so concurrent updates are retained', async () => {
    const store = useWorkflowStore()
    await store.initialize(initialPayload)
    const first = store.createNode({ title: 'First', type: NODE_TYPES.SEND_MESSAGE })
    const second = store.createNode({ title: 'Second', type: NODE_TYPES.ADD_COMMENT })
    await Promise.all([first, second])

    expect(
      store.graph.nodes.filter((node) => node.title === 'First' || node.title === 'Second'),
    ).toHaveLength(2)
  })

  it('loads the persisted graph before using a new payload', async () => {
    const firstStore = useWorkflowStore()
    await firstStore.initialize(initialPayload)
    const created = await firstStore.createNode({
      title: 'Persisted',
      type: NODE_TYPES.ADD_COMMENT,
    })

    setActivePinia(createPinia())
    const secondStore = useWorkflowStore()
    const fetcher = vi.fn()
    await secondStore.initialize(fetcher)

    expect(secondStore.graph.nodes.some((node) => node.id === created.id)).toBe(true)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('surfaces malformed persisted graphs instead of silently replacing them', async () => {
    await saveWorkflowSnapshot({ nodes: null, edges: [] })
    const store = useWorkflowStore()

    await expect(store.initialize(initialPayload)).rejects.toThrow(
      'Workflow graph must include nodes and edges arrays',
    )
    expect(store.loaded).toBe(false)
    expect(store.error.message).toContain('Workflow graph must include nodes and edges arrays')
  })

  it('keeps the published graph unchanged when persistence fails and retries cleanly', async () => {
    const store = useWorkflowStore()
    await store.initialize(initialPayload)
    const before = store.graph.nodes.map((node) => node.id)
    const persistSpy = vi
      .spyOn(workflowPersistence, 'persistWorkflow')
      .mockRejectedValueOnce(new Error('storage unavailable'))

    await expect(
      store.createNode({ title: 'Not persisted', type: NODE_TYPES.SEND_MESSAGE }),
    ).rejects.toThrow('storage unavailable')
    expect(store.graph.nodes.map((node) => node.id)).toEqual(before)

    persistSpy.mockRestore()
    const created = await store.createNode({
      title: 'Persisted after retry',
      type: NODE_TYPES.SEND_MESSAGE,
    })
    expect(store.graph.nodes.some((node) => node.id === created.id)).toBe(true)
  })
})
