import { useQuery } from '@tanstack/vue-query'

import { WORKFLOW_SEED_URL } from '@/features/workflow/constants'
import { fetchWorkflowPayload } from '@/features/workflow/services/workflowApi'
import { useWorkflowStore } from '@/features/workflow/stores/workflow'

export function useWorkflowQuery() {
  const store = useWorkflowStore()

  return useQuery({
    queryKey: ['workflow', WORKFLOW_SEED_URL],
    queryFn: ({ signal }) => store.initialize(() => fetchWorkflowPayload(fetch, signal)),
    refetchOnWindowFocus: false,
    networkMode: 'always',
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  })
}
