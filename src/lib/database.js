import { openDB } from 'idb'

const WORKFLOW_DB = Object.freeze({
  name: 'respond-io-workflow',
  version: 1,
  store: 'workflows',
  key: 'current',
})

let databasePromise

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDB(WORKFLOW_DB.name, WORKFLOW_DB.version, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(WORKFLOW_DB.store)) {
          database.createObjectStore(WORKFLOW_DB.store)
        }
      },
    }).catch((cause) => {
      databasePromise = undefined
      throw cause
    })
  }

  return databasePromise
}

export async function getWorkflowSnapshot() {
  const database = await getDatabase()
  return database.get(WORKFLOW_DB.store, WORKFLOW_DB.key)
}

export async function saveWorkflowSnapshot(graph) {
  const database = await getDatabase()
  const transaction = database.transaction(WORKFLOW_DB.store, 'readwrite')
  await transaction.store.put(graph, WORKFLOW_DB.key)
  await transaction.done
  return graph
}

export async function clearWorkflowSnapshot() {
  const database = await getDatabase()
  const transaction = database.transaction(WORKFLOW_DB.store, 'readwrite')
  await transaction.store.delete(WORKFLOW_DB.key)
  await transaction.done
}
