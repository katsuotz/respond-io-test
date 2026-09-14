import { describe, expect, it, vi } from 'vitest'

import { WORKFLOW_SEED_URL } from '@/features/workflow/constants'
import { fetchWorkflowPayload } from './workflowApi'

describe('fetchWorkflowPayload', () => {
  it('requests the candidate assessment payload and returns JSON', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1 }],
    })

    await expect(fetchWorkflowPayload(fetchImplementation)).resolves.toEqual([{ id: 1 }])
    expect(fetchImplementation).toHaveBeenCalledWith(WORKFLOW_SEED_URL)
  })

  it('reports HTTP failures', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: false, status: 503 })

    await expect(fetchWorkflowPayload(fetchImplementation)).rejects.toThrow('503')
  })

  it('passes TanStack Query cancellation through to the seed request', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    const signal = new AbortController().signal

    await fetchWorkflowPayload(fetchImplementation, signal)

    expect(fetchImplementation).toHaveBeenCalledWith('/data/workflow.json', { signal })
  })
})
