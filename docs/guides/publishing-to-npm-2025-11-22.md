# NPM Publishing Checklist

## Pre-Publish Verification

### ✅ Required Files
- [x] `package.json` - Complete with author, license, keywords
- [x] `README.md` - Clear, concise documentation
- [x] `LICENSE` - MIT license with Dennison Bertram attribution
- [x] `index.ts` - Main server implementation with header comments
- [x] `CHANGELOG.md` - Version 1.0.0 documented
- [x] `CONTRIBUTING.md` - Contribution guidelines

### ✅ Package Configuration
- [x] Package name: `mcp-nano-banana`
- [x] Version: `1.0.0`
- [x] Author: Dennison Bertram
- [x] License: MIT
- [x] Repository URL configured
- [x] Keywords for discoverability
- [x] Bin entry point configured
- [x] Files array includes only necessary files
- [x] Engine requirements specified

### ✅ Code Quality
- [x] TypeScript compiles without errors
- [x] Build process works (`bun build`)
- [x] All tests pass (`bun test`)
- [x] Integration test succeeds
- [x] No hardcoded API keys in source
- [x] Proper error handling implemented
- [x] JSDoc comments for main functions

### ✅ Documentation
- [x] README has quick start guide
- [x] All tools documented with parameters
- [x] Example workflows provided
- [x] Troubleshooting section included
- [x] Security best practices noted
- [x] Attribution to Dennison Bertram
- [x] Links to resources and support

### ✅ Testing
- [x] Server starts successfully
- [x] MCP protocol handshake works
- [x] Image generation tested end-to-end
- [x] Job tracking verified
- [x] File saving tested
- [x] Error handling validated

### ✅ Security
- [x] `.env` in `.gitignore`
- [x] No API keys in source code
- [x] Environment variable validation
- [x] Security warnings in README
- [x] `.env.example` not included (security)

### ✅ Git Repository
- [x] Repository initialized
- [x] `.gitignore` configured properly
- [x] Clean working directory recommended
- [x] Tags ready for releases

## Publishing Steps

### 1. Final Verification

```bash
# Ensure you're in the project directory
cd mcp-nano-banana

# Run final test
bun test

# Check package contents
npm pack --dry-run

# Verify build
bun build index.ts --target=bun --outdir=./dist
```

### 2. Git Repository Setup (if not done)

```bash
# Initialize git repository
git init

# Add remote (update with your GitHub username)
git remote add origin https://github.com/dennisonbertram/mcp-nano-banana.git

# Commit all files
git add .
git commit -m "Initial release v1.0.0"

# Create version tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push to GitHub
git push -u origin main
git push origin v1.0.0
```

### 3. Publish to NPM

```bash
# Login to npm (if not already logged in)
npm login

# Publish package (public)
npm publish --access public
```

Or with Bun:

```bash
# Login
bun pm login

# Publish
bun pm publish
```

### 4. Post-Publishing

- [ ] Verify package appears on npm: https://www.npmjs.com/package/mcp-nano-banana
- [ ] Test installation: `npm install -g mcp-nano-banana`
- [ ] Verify command works: `mcp-nano-banana --help` or run it
- [ ] Create GitHub release with changelog
- [ ] Update any documentation that references the package

## Troubleshooting

### Package Name Conflict

If the package name is taken:
```bash
# Try alternative names
mcp-nano-banana
@your-scope/mcp-nano-banana
mcp-gemini-image
```

### Build Issues

```bash
# Clean and rebuild
rm -rf dist node_modules
bun install
bun build index.ts --target=bun --outdir=./dist
```

### Authentication Issues

```bash
# Check npm auth
npm whoami

# Re-login if needed
npm logout
npm login
```

## Version Updates (Future)

For subsequent releases:

1. Update code
2. Run tests
3. Update `CHANGELOG.md`
4. Bump version in `package.json`:
   - Patch: `1.0.1` (bug fixes)
   - Minor: `1.1.0` (new features)
   - Major: `2.0.0` (breaking changes)
5. Commit changes
6. Create git tag
7. Push to GitHub
8. Publish to npm

---

**Current Status**: ✅ Ready for initial 1.0.0 release

**Maintainer**: Dennison Bertram

**Last Updated**: 2025-11-22
