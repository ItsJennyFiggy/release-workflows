## Summary

<!-- Describe what this PR does and why. -->

## Testing

- [ ] `npx tsc --noEmit` passes (typecheck)
- [ ] `npm run lint` passes (Biome)
- [ ] `npm run coverage` passes and meets the 85% gate (per `.agents/rules/testing_standards.md`)
- [ ] `npm run build` succeeds

## Checklist

- [ ] Rebuilt `dist/index.js` and committed it (CI fails on drift — see "Verify Bundle Up-To-Date" step)
- [ ] Followed `.agents/rules/git_safety.md` (no blanket `git add .`; staged files explicitly by path)
