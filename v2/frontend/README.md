# Frontend

Next.js 14 (App Router) + Tailwind, with framer-motion for the small
animations and zustand for state.

Three main pieces on the page: the chat panel (clarifying questions render
as clickable chips, data caveats in a banner above the answer), a live data
grid showing what came back from monday.com, and the "Generate Leadership
Update" panel.

Setup:

```
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL to the backend
npm install
npm run dev                        # :3000, expects the backend on :5000
```

Or just run `make develop` from the repo root, which does both sides.
