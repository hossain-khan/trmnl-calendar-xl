# Contributing

Contributions should improve Calendar XL as a Merge-based TRMNL plugin, not reintroduce generic template scaffolding.

## Reporting Issues

Open an issue with:

- A clear description of the problem
- The template or doc affected
- The merged payload shape involved, when relevant
- Screenshots if the problem is visual

## Submitting Changes

1. Fork the repository.
2. Create a focused branch.
3. Keep the change set narrow.
4. Update documentation when behavior changes.
5. Open a pull request with a concise description and screenshots for layout changes.

## Development Guidelines

- Use TRMNL framework utilities before adding custom styling.
- Keep shared logic in [templates/shared.liquid](templates/shared.liquid).
- Preserve the Now / Next / Later hierarchy from [docs/PRD.md](docs/PRD.md).
- Keep docs aligned with the current Merge-only architecture.
- Do not add backend-contract examples unless the repository actually gains a backend.

## Merge-Specific Rules

- The merge namespace is resolved automatically via the `calendar_source` custom field — no per-file namespace update is needed when the calendar instance changes.
- Test with a namespaced payload such as [assets/demo/trmnl-plugin-merge-snapshot.json](assets/demo/trmnl-plugin-merge-snapshot.json), not with a flat event list.
- Verify NOW and NEXT still ignore all-day events unless the product decision changes.

## Testing Expectations

Before opening a pull request, validate:

- Full, half horizontal, half vertical, and quadrant layouts
- Empty and fallback states
- Long event titles
- Different device sizes in the TRMNL Markup Editor

## Documentation Expectations

Update these when relevant:

- [README.md](README.md) for architecture and usage changes
- [GETTING_STARTED.md](GETTING_STARTED.md) for workflow changes
- [docs/TECHNICAL_SKETCH.md](docs/TECHNICAL_SKETCH.md) for implementation details
- [.github/copilot-instructions.md](.github/copilot-instructions.md) for project-specific agent guidance

## Questions

- Review [README.md](README.md)
- Review [GETTING_STARTED.md](GETTING_STARTED.md)
- Review [docs/TECHNICAL_SKETCH.md](docs/TECHNICAL_SKETCH.md)
- Review [.github/copilot-instructions.md](.github/copilot-instructions.md)
