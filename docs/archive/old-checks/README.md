# Old release checks (archived)

These scripts checked an earlier version of the static site and the old release package. They fail on the current code, were never part of
`npm test`, and gave a false sense of security, so they were moved here instead of being deleted. The current checks are `npm run verify`
(lint, type check, build and every test in `tests/`).
