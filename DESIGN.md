# Workflow Studio design

The supplied mockup governs the design: a light, dotted workflow canvas with compact connected cards and a right details panel. The canvas occupies the remaining viewport beneath a compact identity bar and workflow toolbar.

The primary action and selected nodes use forest green (`#176e59`). Background is `#f8fafb`; panels are white; primary text is `#252b37`; muted text is `#657080`; borders are `#e1e5eb`. Node types use restrained purple, teal, orange, and pink icons. Success and Failure have distinct labeled colors.

Use the system sans-serif stack for this operational UI. Cards are 260 pixels wide with 12-pixel corners and two-line summaries. Branch markers are 100 pixels wide. Shared UI is composed from shadcn-vue primitives; the global stylesheet owns semantic colors.

Desktop drawers are 28rem wide; narrow screens use the full viewport width. Canvas coordinates do not animate while dragging. Drawer movement uses the shadcn slide transition; reduced motion removes animation. Every action must retain visible focus, labels, and readable inline errors.
