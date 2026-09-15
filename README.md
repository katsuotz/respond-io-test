# Workflow Studio

A Vue workflow editor built with Vue Flow, Pinia, Vue Router, TanStack Query, and shadcn-vue.

## Setup

Use Node.js 22.18+ (22.x) and pnpm 10.33.2.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm test          # Unit and component tests
pnpm test:watch    # Interactive unit tests
pnpm test:e2e     # Chromium browser integration tests
pnpm lint:check    # Read-only ESLint and oxlint checks
pnpm build        # Production output in dist/
pnpm preview      # Serve the production build locally
```

Before the first browser test run, install Chromium with `pnpm exec playwright install chromium`. Browser tests start their own Vite server on port 5174 and stop it when finished.

## Using the editor

Select a node to open its details. Select it again to close the drawer, or select another node to switch. Edit a draft and choose **Save changes** or **Cancel**; leaving an unsaved draft asks for confirmation. Nodes are keyboard-focusable and Enter opens details.

**Add node** adds a Send Message, Add Comment, or Business Hours node near the visible canvas center. Drag nodes to reposition them. Drag between connection handles to connect nodes, drag a connection endpoint to reconnect, and double-click an editable line to disconnect. Zoom controls and fit-to-view sit at the lower left.

Business Hours uses seven weekday time ranges and an IANA timezone. New schedules use UTC and 09:00–17:00 daily. Success and Failure markers are managed by Business Hours and remain display-only. Deleting a node removes its connections and owned markers while preserving downstream nodes.

## Sample data and persistence

The supplied [assessment payload](https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com/candidate-assessments/payload.json) is bundled unchanged in `public/data/workflow.json`. It is initial sample data. TanStack Query fetches that same-origin file on first use, avoiding the source bucket’s browser CORS restriction. A saved workflow is loaded from IndexedDB on subsequent visits.

Query defaults are `refetchOnWindowFocus: false`, `networkMode: 'always'`, `staleTime: Infinity`, and `gcTime: 60 * 60 * 1000`. Pinia owns the editable graph; TanStack mutations coordinate writes. IndexedDB transactions finish before successful edits are published, and store mutations are serialized to prevent concurrent writes losing changes.

Normalization converts numeric IDs to strings, `name` to `title`, `dateTime` to `businessHours`, and `dateTimeConnector` to `branch`. Edges come from `parentId`; subtree layout supplies initial positions. Titles and editable descriptions are separate from message/comment content; the sample has empty descriptions, so cards show a content summary until one is entered.

Uploaded files are stored as blobs within the workflow record. Preview URLs are created when displayed and released afterward. Clearing this site’s browser storage removes the saved workflow and files; the next visit initializes the sample again.

Routes are `/`, `/nodes/new`, and `/nodes/:nodeId`. Created-node links resolve in the browser and origin where their data is saved. Configure production static hosting to serve `index.html` for application routes and serve `/data/workflow.json` as JSON. Deploy the `dist` directory after building.

## Validation and design decisions

- Titles are required, trimmed, and limited to 100 characters; descriptions are optional and limited to 500.
- Message texts and comments allow up to 5,000 characters and can be removed.
- Uploads accept JPEG, PNG, GIF, WebP, and PDF, up to 10 MB per file and 10 attachments per node.
- Each weekday requires valid opening and closing times with opening before closing.
- Connections form a directed acyclic graph with at most one parent per node. Business Hours connects through its owned branches.
- The light dotted canvas and right-side drawer follow the supplied mockup. Drawers preserve canvas context; reduced-motion preferences disable transitions.

## Project conventions

`src/components/ui` contains shadcn-vue primitives. `src/components/base` contains shared app-level compositions with props and events. Workflow UI lives in `src/features/workflow/components`, grouped into `canvas`, `drawers`, and `forms`.

Within a feature, views compose the screen, composables coordinate behavior, stores own editable state, services perform I/O, constants define shared values, and utils contain pure functions. Shared infrastructure lives in `src/lib`; cross-feature pure helpers belong in `src/utils` when needed. Shared code must not import feature code.

Use PascalCase Vue filenames, `useX.js` composables, camelCase JavaScript modules, and `@/` imports. Colocate `*.test.js` files beside their implementation. Shared test setup and fixtures live in `tests`. Avoid barrel exports and empty placeholder directories.

```text
src/
  app/                          Query client configuration
  components/ui/                shadcn-vue primitives and generated exports
  components/base/              Reusable attachment preview
  features/workflow/
    components/canvas/          Vue Flow adapter and node cards
    components/drawers/         Draft editing and confirmation
    components/forms/           General and type-specific fields
    composables/                Query lifecycle
    constants/                  Types, defaults, limits, seed URL
    services/                   Fetching and persistence
    stores/                     Pinia graph and serialized mutations
    utils/                      Normalization, validation, layout, cloning
    views/                      Routed editor screen
  lib/                          IndexedDB and shadcn cn() helper
  router/                       Application routes
  styles/                       Global tokens and styles
tests/                          Test setup and browser integration tests
public/data/                    Original assessment sample
```

The feature code is custom implementation. shadcn-vue primitives are generated from its official registry. Tests exercise normalization, layout, graph restrictions, persistence and failures, form validation, drafts, attachments, and route-driven editing.
