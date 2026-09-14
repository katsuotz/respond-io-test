import { getWorkflowSnapshot, saveWorkflowSnapshot } from '@/lib/database'

export async function loadWorkflow() {
  return getWorkflowSnapshot()
}

export async function persistWorkflow(graph) {
  return saveWorkflowSnapshot(graph)
}
