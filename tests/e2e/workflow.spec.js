import { expect, test } from '@playwright/test'

const DB_NAME = 'respond-io-workflow'
const DB_STORE = 'workflows'
const DB_KEY = 'current'

async function clearWorkflow(page) {
  await page.goto('/')
  await expect(page.locator('.vue-flow__node').first()).toBeVisible()
}

async function openNode(page, title) {
  const node = page.locator('.vue-flow__node').filter({ hasText: title }).first()
  await expect(node).toBeVisible()
  await node.click()
  await expect(page.locator('.node-drawer')).toBeVisible()
  return node
}

async function createNode(page, { title, type = 'sendMessage', description = '' }) {
  await page.getByRole('button', { name: 'Create New Node' }).click()
  await expect(page).toHaveURL(/\/nodes\/new$/)
  await page.locator('#node-title').fill(title)
  if (description) await page.locator('#node-description').fill(description)
  await page.locator('#node-type').click()
  await page
    .getByRole('option', {
      name:
        type === 'sendMessage'
          ? 'Send Message'
          : type === 'addComment'
            ? 'Add Comment'
            : 'Business Hours',
    })
    .click()
  await page.getByRole('button', { name: 'Create node' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.vue-flow__node').filter({ hasText: title })).toBeVisible()
}

async function readPosition(page, id) {
  return page.evaluate(
    ({ dbName, storeName, key, id: nodeId }) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const getRequest = database
            .transaction(storeName, 'readonly')
            .objectStore(storeName)
            .get(key)
          getRequest.onsuccess = () => {
            database.close()
            resolve(
              getRequest.result?.nodes.find((node) => String(node.id) === String(nodeId))?.position,
            )
          }
          getRequest.onerror = () => reject(getRequest.error)
        }
      }),
    { dbName: DB_NAME, storeName: DB_STORE, key: DB_KEY, id },
  )
}

test.beforeEach(async ({ page }) => {
  await clearWorkflow(page)
})

test('creates, edits, refreshes, and deletes a node through its routed drawer', async ({
  page,
}) => {
  const title = 'E2E Send Message'
  await createNode(page, { title, description: 'Created from the integration test.' })

  await openNode(page, title)
  await expect(page.locator('#node-description')).toHaveValue('Created from the integration test.')
  await page.locator('#node-description').fill('Updated from the drawer.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.reload()
  await expect(page.locator('.vue-flow__node').filter({ hasText: title })).toBeVisible()
  await openNode(page, title)
  await expect(page.locator('#node-description')).toHaveValue('Updated from the drawer.')

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('button', { name: 'Delete node' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.vue-flow__node').filter({ hasText: title })).toHaveCount(0)
})

test('opens a node drawer from a direct URL and keeps branch markers display-only', async ({
  page,
}) => {
  await page.goto('/nodes/d09c08')
  await expect(page.locator('#node-title')).toHaveValue('Business Hours')

  await page.goto('/nodes/161f52')
  await expect(page.getByText('Node details unavailable')).toBeVisible()
  await expect(page.locator('.node-drawer')).toHaveCount(0)
})

test('persists message text and an uploaded attachment across refresh', async ({ page }) => {
  const title = 'E2E Attachment Node'
  await createNode(page, { title, type: 'sendMessage' })
  await openNode(page, title)

  await page.getByRole('button', { name: 'Add text' }).click()
  await page.locator('#message-text-0').fill('A persisted message.')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-attachment.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(page.getByText('e2e-attachment.png')).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.reload()
  await openNode(page, title)
  await expect(page.locator('#message-text-0')).toHaveValue('A persisted message.')
  await expect(page.getByText('e2e-attachment.png')).toBeVisible()
  await expect
    .poll(() =>
      page
        .locator('.attachment-preview img')
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true)
})

test('validates and persists business-hours changes', async ({ page }) => {
  await openNode(page, 'Business Hours')
  await page.getByLabel('Monday closing time').fill('08:00')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Opening time must be before closing time' }),
  ).toBeVisible()

  await page.getByLabel('Monday closing time').fill('18:00')
  await page.getByLabel('Time zone').fill('Asia/Bangkok')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.reload()
  await openNode(page, 'Business Hours')
  await expect(page.getByLabel('Monday closing time')).toHaveValue('18:00')
  await expect(page.locator('#node-timezone')).toHaveValue('Asia/Bangkok')
})

test('opens a node with Enter, keeps drag separate from click, and persists its position', async ({
  page,
}) => {
  const node = page.locator('.vue-flow__node').filter({ hasText: 'Away Message' }).first()
  await expect(node).toBeVisible()
  await node.focus()
  await node.press('Enter')
  await expect(page).toHaveURL(/\/nodes\/b6a0c1$/)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/$/)

  const before = await readPosition(page, 'b6a0c1')
  const box = await node.boundingBox()
  if (!box) throw new Error('Away Message node has no bounding box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40, { steps: 10 })
  await page.mouse.up()
  await expect(page).toHaveURL(/\/$/)
  const after = await readPosition(page, 'b6a0c1')
  expect(after).not.toEqual(before)
  await page.reload()
  await expect(page.locator('.vue-flow__node').filter({ hasText: 'Away Message' })).toBeVisible()
  await expect.poll(() => readPosition(page, 'b6a0c1')).toEqual(after)
})

test('guards switching nodes while a drawer has unsaved edits', async ({ page }) => {
  await openNode(page, 'Away Message')
  await page.locator('#node-title').fill('Unsaved Away Message')
  await page.locator('.vue-flow__node').filter({ hasText: 'Business Hours' }).click()
  await expect(page.getByText('Discard unsaved changes?')).toBeVisible()
  await page.getByRole('button', { name: 'Discard changes' }).click()
  await expect(page).toHaveURL(/\/nodes\/d09c08$/)
  await expect(page.locator('#node-title')).toHaveValue('Business Hours')
})

test('uses a full-width details drawer on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.reload()
  await openNode(page, 'Business Hours')
  const drawer = page.locator('.node-drawer')
  await expect(drawer).toHaveCSS('width', '375px')
})

test('highlights a connector when selected', async ({ page }) => {
  const edge = page.getByRole('group', { name: 'Edge from b6a0c1 to e879e4', exact: true })
  const path = edge.locator('.vue-flow__edge-path')

  await expect(path).toHaveCSS('stroke-opacity', '0.45')
  await edge.click()

  await expect(edge).toHaveClass(/selected/)
  await expect(path).toHaveCSS('stroke', 'rgb(155, 183, 173)')
  await expect(path).toHaveCSS('stroke-opacity', '1')
})

test('disconnects and reconnects nodes using canvas handles', async ({ page }) => {
  const edge = page.getByRole('group', { name: 'Edge from b6a0c1 to e879e4', exact: true })
  const source = page.locator('.vue-flow__node[data-id="b6a0c1"] .vue-flow__handle.source')
  const target = page.locator('.vue-flow__node[data-id="e879e4"] .vue-flow__handle.target')
  await page.getByRole('button', { name: 'Fit canvas', exact: true }).click()
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  await edge.click()
  await expect(edge).toHaveClass(/selected/)
  await page.keyboard.press('Delete')
  await expect(edge).toHaveCount(0)
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 15,
  })
  await page.mouse.up()
  await expect(edge).toHaveCount(1)
  await page.reload()
  await expect(edge).toHaveCount(1)
})
