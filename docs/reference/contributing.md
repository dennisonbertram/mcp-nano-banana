# Contributing to MCP Nano Banana

Thank you for your interest in contributing to MCP Nano Banana! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, constructive, and collaborative. We're all here to build great tools for the AI community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

1. **Clear title** - Descriptive summary of the issue
2. **Environment** - OS, Node/Bun version, MCP client
3. **Steps to reproduce** - Minimal steps to trigger the bug
4. **Expected behavior** - What should happen
5. **Actual behavior** - What actually happens
6. **Logs/errors** - Any relevant error messages

### Suggesting Features

Feature requests are welcome! Please include:

1. **Use case** - Why this feature would be useful
2. **Proposed solution** - How you envision it working
3. **Alternatives** - Other approaches you've considered
4. **Compatibility** - Impact on existing functionality

### Pull Requests

We love pull requests! Here's how to submit one:

#### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-nano-banana.git
   cd mcp-nano-banana
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development

1. Make your changes
2. Add tests for new functionality
3. Ensure all tests pass:
   ```bash
   bun test
   ```
4. Verify the build works:
   ```bash
   bun build index.ts --target=bun
   ```

#### Code Style

- Use TypeScript with strict typing
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions focused and well-named
- Use async/await for asynchronous code

#### Testing

- Add tests for all new features
- Ensure existing tests still pass
- Test both success and error cases
- Verify integration with MCP clients

#### Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for image editing
fix: resolve job status race condition
docs: update API documentation
test: add integration tests for save_image
refactor: simplify job tracking logic
```

#### Submit

1. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a pull request on GitHub
3. Describe your changes clearly
4. Link any related issues
5. Wait for review and address feedback

## Development Guidelines

### Project Structure

```
mcp-nano-banana/
├── index.ts           # Main server implementation
├── package.json       # Package configuration
├── full-test.ts       # Integration tests
├── README.md          # User documentation
├── CHANGELOG.md       # Version history
└── LICENSE            # MIT license
```

### Key Concepts

- **MCP Protocol**: Follow MCP specification strictly
- **Async Operations**: Use job IDs for tracking
- **Error Handling**: Always provide clear error messages
- **Type Safety**: Leverage TypeScript and Zod
- **Security**: Never log API keys or sensitive data

### Adding New Tools

When adding a new MCP tool:

1. Define Zod schema for validation
2. Register tool in `ListToolsRequestSchema` handler
3. Implement tool logic in `CallToolRequestSchema` handler
4. Add comprehensive tests
5. Update documentation

### Dependencies

Only add dependencies when absolutely necessary:
- Consider bundle size impact
- Verify license compatibility (MIT preferred)
- Ensure active maintenance
- Document purpose in PR

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run integration test
bun run full-test.ts
```

### Test Coverage

Aim to test:
- ✅ Happy path scenarios
- ✅ Error cases and edge cases
- ✅ Input validation
- ✅ MCP protocol compliance
- ✅ File system operations
- ✅ API integration

### Manual Testing

Test with actual MCP clients:
1. Claude Desktop
2. Other MCP-compatible tools
3. Direct STDIO communication

## Documentation

### Code Documentation

- Add JSDoc comments for public functions
- Document complex algorithms
- Explain non-obvious decisions
- Include usage examples

### User Documentation

Update README.md when:
- Adding new features
- Changing tool behavior
- Modifying configuration
- Adding requirements

### Changelog

Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com):
- Add entries under "Unreleased"
- Use semantic versioning
- Categorize: Added, Changed, Fixed, Deprecated, Removed, Security

## Release Process

Maintainers handle releases:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `v1.0.0`
4. Push to GitHub
5. Publish to npm
6. Create GitHub release

## Questions?

- Open a [Discussion](https://github.com/dennisonbertram/mcp-nano-banana/discussions)
- Ask in [Issues](https://github.com/dennisonbertram/mcp-nano-banana/issues)
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to MCP Nano Banana! 🎨🍌
