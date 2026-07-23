# Frontend scaffold placeholder

This directory holds hand-written source (`src/app`, `src/components`,
`src/lib`) that assumes a Next.js + Tailwind + shadcn/ui project. The full
`node_modules` / generated Next.js boilerplate is **not** checked into the
release zip (see `.gitignore` in the repo root) and is not pre-generated here
either, since it requires network installs.

Run `make develop` from the repo root — it will:
1. Run `npx create-next-app@latest .` inside this folder if `next` isn't
   already installed (non-interactive flags set in the Makefile).
2. Run `npx shadcn-ui@latest init` and add the required components.
3. Install `framer-motion`, `lucide-react`, `zustand`.

After that, drop the components in `src/components/DataTable.tsx`,
`src/lib/store.ts`, and wire them into `src/app/page.tsx` per the project
plan.
