# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-22

### Added
- Initial release of MCP Nano Banana server
- Image generation using Google Gemini 2.5 Flash Image model
- Async job tracking with unique job IDs
- Four MCP tools: `generate_image`, `check_job_status`, `save_image`, `list_jobs`
- Support for multiple aspect ratios (1:1, 3:4, 4:3, 9:16, 16:9)
- STDIO transport for local, secure operation
- Automatic PNG format conversion and file system integration
- Environment variable support for API key management
- Comprehensive error handling and validation
- Full test suite with integration tests
- Complete documentation and usage examples

### Features
- Production-ready MCP server implementation
- Real-time status tracking for async image generation
- File system integration with automatic directory creation
- Support for both Node.js and Bun runtimes
- Claude Desktop integration ready

### Technical
- MCP Protocol 2024-11-05 compliance
- Zod schema validation for all inputs
- TypeScript implementation with strict typing
- Base64 image data handling
- Job persistence during server lifetime

### Documentation
- Comprehensive README with quick start guide
- Detailed API documentation for all tools
- Troubleshooting guide
- Security best practices
- Example workflows and use cases
- Test results and verification documentation

[1.0.0]: https://github.com/dennisonbertram/mcp-nano-banana/releases/tag/v1.0.0
