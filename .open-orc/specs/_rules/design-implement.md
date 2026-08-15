# Rules for workflow: design-implement

Use when the task includes a **Figma URL** or asks to match a design pixel-faithfully.

## Spec must include

- **Goal** — screen / surface to implement
- **Figma** — full URL with `node-id` (required)
- **Acceptance criteria** — visual + behavioral, testable
- **Design facts** — layout, spacing, colors, type, components, assets
- **Repo facts** — files/symbols to reuse; verified commands
- **Todo list** and **Out of scope**

## Implementation constraints

- Adapt Figma reference code to the target stack — never ship raw Tailwind/web markup into a non-web project
- Prefer existing components and theme tokens from the repo
- Download Figma assets into the project before commit
- Follow project `AGENTS.md` conventions

## Routing hint for router

Figma link / "match design" / "implement from Figma" → `design-implement`.
