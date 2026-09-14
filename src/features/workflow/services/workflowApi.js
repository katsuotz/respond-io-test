import { WORKFLOW_SEED_URL } from '@/features/workflow/constants'

export async function fetchWorkflowPayload(fetchImplementation = fetch, signal) {
  const response =
    signal === undefined
      ? await fetchImplementation(WORKFLOW_SEED_URL)
      : await fetchImplementation(WORKFLOW_SEED_URL, { signal })

  if (!response.ok) {
    throw new Error(`Unable to load workflow payload (${response.status})`)
  }

  return response.json()
}
