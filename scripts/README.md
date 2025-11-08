# Development Scripts

Helpful scripts for running TravelTomorrow locally on macOS.

## Available Scripts

### 🚀 Main Development Script

**`dev-mac.sh`** - Complete development environment setup

Starts all services with full checks and helpful output:
- ✅ Checks prerequisites (Node, Docker, PHP, Composer)
- ✅ Installs dependencies
- ✅ Starts Docker services (Redis, MailHog)
- ✅ Starts Supabase
- ✅ Runs database migrations
- ✅ Starts API server
- ✅ Starts Laravel server (if available)
- ✅ Displays summary with all URLs

**Usage:**
```bash
# Direct
./scripts/dev-mac.sh

# Or via npm
npm run dev:mac
```

**What you'll get:**
```
Services Running:
  API Server:          http://localhost:3001
  Supabase Studio:     http://localhost:54323
  Redis:               localhost:6379
  MailHog Web:         http://localhost:8025
  Laravel Website:     http://localhost:8000
```

---

### ⚡ Quick Start Script

**`quick-start.sh`** - Fast API-only setup

Minimal setup for backend development:
- Starts only essential services
- Skips Laravel
- Faster startup
- Runs in foreground

**Usage:**
```bash
# Direct
./scripts/quick-start.sh

# Or via npm
npm run dev:quick
```

**Best for:**
- API development
- Backend testing
- Quick prototyping
- CI/CD environments

---

### 🛑 Stop All Script

**`stop-all.sh`** - Stop all running services

Cleanly stops:
- Docker containers
- Supabase
- API server
- Laravel server
- Cleans up ports

**Usage:**
```bash
# Direct
./scripts/stop-all.sh

# Or via npm
npm run dev:stop
```

**When to use:**
- Switching branches
- Freeing up resources
- Before system sleep
- Troubleshooting port conflicts

---

## npm Commands

All scripts are also available as npm commands:

```bash
# Start full dev environment (macOS)
npm run dev:mac

# Quick start (API only)
npm run dev:quick

# Stop all services
npm run dev:stop

# Supabase management
npm run supabase:start
npm run supabase:stop
npm run supabase:status
npm run supabase:studio

# Docker management
npm run docker:up
npm run docker:down
npm run docker:reset
```

## Script Features

### Color-Coded Output

Scripts use colors for better readability:
- 🔵 **Blue** - Informational messages
- 🟢 **Green** - Success messages
- 🟡 **Yellow** - Warnings
- 🔴 **Red** - Errors

### Automatic Cleanup

All scripts handle graceful shutdown:
- Press `Ctrl+C` to stop
- Services are cleaned up automatically
- Ports are freed
- Temporary files removed

### Error Handling

Scripts check for:
- Missing prerequisites
- Port conflicts
- Service failures
- Environment issues

And provide helpful error messages with solutions.

## Common Workflows

### Daily Development

```bash
# Morning - Start everything
npm run dev:mac

# Work on features...

# Evening - Stop everything
npm run dev:stop
```

### API Development Only

```bash
# Start minimal setup
npm run dev:quick

# Make changes to API...
# Auto-reloads on file changes

# Ctrl+C to stop
```

### Database Changes

```bash
# Start services
npm run dev:mac

# In another terminal - create migration
cd packages/database
npx supabase migration new add_new_table

# Edit migration file...

# Apply migration
npx supabase db reset

# Restart API to pick up changes
```

### Troubleshooting

```bash
# Stop everything
npm run dev:stop

# Check what's using ports
lsof -ti:3001  # API
lsof -ti:54321 # Supabase
lsof -ti:8000  # Laravel

# Clean Docker
docker-compose down -v
docker system prune

# Fresh start
npm run dev:mac
```

## Customization

### Modify Startup Behavior

Edit `scripts/dev-mac.sh` to:
- Skip certain services
- Change port numbers
- Add custom checks
- Modify output

### Add New Scripts

Follow this template:

```bash
#!/bin/bash

# Description
set -e  # Exit on error

# Your script here
echo "🚀 Running custom script..."

# Cleanup on exit
cleanup() {
    echo "Cleaning up..."
}
trap cleanup SIGINT SIGTERM
```

Make it executable:
```bash
chmod +x scripts/your-script.sh
```

Add to package.json:
```json
{
  "scripts": {
    "your-command": "bash scripts/your-script.sh"
  }
}
```

## Platform Support

### macOS ✅
All scripts fully supported with:
- Homebrew integration
- BSD sed syntax
- macOS-specific commands

### Linux 🔄
Scripts work with minor modifications:
- Change `sed -i ''` to `sed -i`
- Different process management
- Package manager varies

### Windows 🚫
Not directly supported. Use:
- WSL2 (Windows Subsystem for Linux)
- Docker Desktop for Windows
- Git Bash (limited support)

## Debugging Scripts

Enable debug mode:

```bash
# Show all commands being executed
bash -x scripts/dev-mac.sh

# Or set in script
set -x
```

Check script syntax:

```bash
# Validate bash syntax
bash -n scripts/dev-mac.sh

# Lint with shellcheck (install: brew install shellcheck)
shellcheck scripts/dev-mac.sh
```

## Environment Variables

Scripts respect these environment variables:

```bash
# Skip PHP/Laravel
export SKIP_LARAVEL=1
npm run dev:mac

# Use different ports
export API_PORT=3002
npm run dev:quick

# Verbose output
export DEBUG=1
npm run dev:mac
```

## Contributing

When adding new scripts:

1. **Follow naming convention**: `verb-noun.sh`
2. **Add documentation**: Update this README
3. **Test on clean system**: Verify prerequisites work
4. **Add npm command**: Include in package.json
5. **Handle errors**: Use proper error checking
6. **Cleanup resources**: Always trap signals

## FAQ

**Q: Why does startup take so long?**
A: First time runs are slower because Docker needs to download images. Subsequent runs are faster.

**Q: Can I run multiple instances?**
A: No, services use fixed ports. Stop one instance before starting another.

**Q: What if a service fails to start?**
A: Check the error message, ensure Docker is running, and verify ports aren't in use.

**Q: How do I update the scripts?**
A: Scripts are version controlled. Pull latest changes with `git pull`.

**Q: Can I use these in production?**
A: No, these are development-only scripts. See deployment docs for production.

## Support

- 📖 **Full docs**: `docs/MACOS-SETUP.md`
- 🐛 **Issues**: GitHub Issues
- 💬 **Questions**: Team Slack/Discord

Happy coding! 🎉
