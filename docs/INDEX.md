# Documentation Index

> Last updated: 2025-11-22

## Overview

This directory contains all project documentation organized by category. Each subdirectory has its own INDEX.md for detailed listings.

## Quick Links

- [Guides](./guides/INDEX.md) - How-to guides and tutorials
- [Reference](./reference/INDEX.md) - Reference materials and contributing guidelines

## Recent Documents

| Date | Category | Document | Description |
|------|----------|----------|-------------|
| 2025-11-22 | guides | [publishing-to-npm-2025-11-22.md](./guides/publishing-to-npm-2025-11-22.md) | NPM publishing checklist |
| 2025-11-22 | reference | [npm-ready-summary-2025-11-22.md](./reference/npm-ready-summary-2025-11-22.md) | Package readiness verification |
| - | reference | [contributing.md](./reference/contributing.md) | Contribution guidelines |

## Document Count by Category

- Guides: 1 document
- Reference: 2 documents

**Total**: 3 documents

## How to Use This Documentation

1. **Finding Information**: Use this index or category indices
2. **Creating New Docs**: Follow templates and naming conventions from markdown-organizer skill
3. **Updating Docs**: Update in place or create new dated version
4. **Organizing**: Always update indices when adding/moving files

## Contributing

When adding documentation:
1. Choose the appropriate category (guides, reference, architecture, decisions, etc.)
2. Use the naming convention: `category-topic-YYYY-MM-DD.md` (or undated for references)
3. Use the template for that document type
4. Update the category INDEX.md
5. Update this master INDEX.md

## Root-Level Documentation

- [README.md](../README.md) - Project overview and quick start
- [CHANGELOG.md](../CHANGELOG.md) - Version history following Keep a Changelog format

## Project Structure

```
mcp-nano-banana/
├── README.md              # Project overview (root)
├── CHANGELOG.md           # Version history (root)
└── docs/
    ├── INDEX.md           # This file
    ├── guides/            # How-to guides
    │   └── INDEX.md
    └── reference/         # Reference materials
        └── INDEX.md
```

## Future Categories

As the project grows, consider adding:
- `architecture/` - System design documents
- `decisions/` - Architecture Decision Records (ADRs)
- `learnings/` - Insights and retrospectives
- `api/` - Detailed API documentation
