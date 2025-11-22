# MCP Nano Banana

> Model Context Protocol (MCP) server for Google Gemini Nano Banana image generation

[![npm version](https://badge.fury.io/js/mcp-nano-banana.svg)](https://www.npmjs.com/package/mcp-nano-banana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready MCP server that enables AI assistants like Claude to generate images using Google's Gemini 2.5 Flash Image model (Nano Banana). Features async job tracking, multiple aspect ratios, and file system integration.

## Features

- 🎨 **Image Generation**: Create images using Gemini 2.5 Flash Image model
- ⏱️ **Async Job Tracking**: Monitor generation progress with unique job IDs
- 📐 **Multiple Aspect Ratios**: Support for 1:1, 3:4, 4:3, 9:16, and 16:9
- 💾 **File System Integration**: Save images anywhere with automatic PNG conversion
- 🔌 **STDIO Transport**: Local MCP server for secure, private operation
- ✅ **Production Ready**: Fully tested with comprehensive error handling

## Quick Start

### Installation

```bash
npm install -g mcp-nano-banana
```

Or with Bun:

```bash
bun install -g mcp-nano-banana
```

### Setup

1. Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)

2. Set the environment variable:

```bash
export GEMINI_API_KEY=your-api-key-here
```

Or create a `.env` file:

```bash
echo "GEMINI_API_KEY=your-api-key-here" > .env
```

### Usage with Claude Desktop

Add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nano-banana": {
      "command": "mcp-nano-banana",
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop and the server will be available.

## Available Tools

### `generate_image`

Generate an image from a text prompt.

**Parameters:**
- `prompt` (string, required): Description of the image to generate
- `aspectRatio` (string, optional): One of "1:1", "3:4", "4:3", "9:16", "16:9" (default: "1:1")

**Returns:** Job ID for tracking generation progress

### `check_job_status`

Check the status of an image generation job.

**Parameters:**
- `jobId` (string, required): Job ID from `generate_image`

**Returns:** Status information (pending/processing/completed/failed)

### `save_image`

Save a completed image to the file system.

**Parameters:**
- `jobId` (string, required): Job ID of completed generation
- `filePath` (string, required): Absolute path for saving (must end in .png)

**Returns:** Success confirmation and file path

### `list_jobs`

List all image generation jobs and their status.

**Returns:** Array of all jobs with status information

## Example Workflow

```
User: Generate an image of a sunset over mountains

Claude: I'll generate that for you...
[Uses generate_image tool]
Job started: job_1234567890_abc123

[Waits and checks status]
Image complete! Where would you like me to save it?

User: Save it to ~/Pictures/sunset.png

Claude: [Uses save_image tool]
Saved to /Users/you/Pictures/sunset.png ✓
```

## Development

### Running from Source

```bash
git clone https://github.com/dennisonbertram/mcp-nano-banana.git
cd mcp-nano-banana
bun install
bun run dev
```

### Testing

```bash
bun test
```

### Building

```bash
bun build index.ts --target=bun --outdir=./dist
```

## Technical Details

- **Protocol**: Model Context Protocol (MCP) 2024-11-05
- **Transport**: STDIO for local, secure communication
- **Image Model**: gemini-2.5-flash-image
- **Output Format**: PNG (base64 decoded)
- **Generation Time**: ~8 seconds average
- **Image Size**: 1024x1024 pixels (1:1 aspect ratio)

## Security

⚠️ **Never commit API keys to version control**

Best practices:
- Use environment variables for API keys
- Store keys in secure configuration management
- Rotate keys regularly
- Use `.env` files (already in `.gitignore`)

## Troubleshooting

### Server not appearing in Claude Desktop

1. Verify the configuration file path is correct
2. Ensure `mcp-nano-banana` is in your PATH
3. Check that `GEMINI_API_KEY` is set
4. Restart Claude Desktop completely

### Image generation fails

1. Verify API key is valid at [Google AI Studio](https://aistudio.google.com/apikey)
2. Check Gemini API quotas and limits
3. Review error messages via `check_job_status`
4. Ensure internet connectivity

### Cannot save images

1. Verify file path is absolute (not relative)
2. Ensure write permissions for target directory
3. File path must end in `.png`
4. Parent directory must exist or be creatable

## Requirements

- Node.js ≥ 20.0.0 or Bun ≥ 1.1.0
- Google Gemini API key
- Internet connection for image generation

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - Copyright (c) 2025 Dennison Bertram

See [LICENSE](LICENSE) file for details.

## Author

**Dennison Bertram**

## Links

- [npm Package](https://www.npmjs.com/package/mcp-nano-banana)
- [GitHub Repository](https://github.com/dennisonbertram/mcp-nano-banana)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Report Issues](https://github.com/dennisonbertram/mcp-nano-banana/issues)

---

Made with ❤️ for the MCP and AI community
