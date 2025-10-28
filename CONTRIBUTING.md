# Contributing to ClipForge

Thank you for your interest in contributing to ClipForge! This guide will help you get started with development and ensure your contributions align with our project standards.

## 🚀 Getting Started

### Prerequisites

- **Rust** (latest stable) - [Install from rustup.rs](https://rustup.rs/)
- **Node.js** 18+ - [Install from nodejs.org](https://nodejs.org/)
- **Tauri CLI** - `cargo install tauri-cli`
- **Git** - For version control

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/clipforge.git
   cd clipforge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install FFmpeg for development:**
   ```bash
   # macOS with Homebrew
   brew install ffmpeg
   
   # Copy binaries to Tauri bin directory
   cp /opt/homebrew/bin/ffmpeg src-tauri/bin/ffmpeg-aarch64-apple-darwin
   cp /opt/homebrew/bin/ffprobe src-tauri/bin/ffprobe-aarch64-apple-darwin
   ```

4. **Run in development mode:**
   ```bash
   npm run tauri dev
   ```

## 📋 Development Guidelines

### Code Style

#### Rust (Backend)
- Follow standard Rust formatting: `cargo fmt`
- Use `cargo clippy` for linting
- Maximum file length: **500 lines** (enforced by Cursor rules)
- Use descriptive variable and function names
- Add comprehensive error handling with `Result<T, String>`
- Document public functions with `///` comments

#### TypeScript/React (Frontend)
- Use TypeScript strict mode
- Follow React best practices with hooks
- Maximum file length: **500 lines** (enforced by Cursor rules)
- Use functional components with hooks
- Prefer `const` over `let` when possible
- Use meaningful component and prop names
- Add JSDoc comments for complex functions

#### CSS
- Use CSS Grid and Flexbox for layouts
- Follow BEM naming convention for complex components
- Keep styles modular and component-specific
- Use CSS custom properties for theming
- Maximum file length: **500 lines** (enforced by Cursor rules)

### File Organization

#### React Components
```
src/components/
├── ComponentName.tsx          # Main component (< 200 lines)
├── ComponentName.css          # Component-specific styles
├── types.ts                   # TypeScript interfaces
└── utils.ts                   # Helper functions
```

#### Rust Modules
```
src-tauri/src/
├── lib.rs                     # Main commands (< 200 lines)
├── commands/
│   ├── mod.rs
│   ├── video.rs              # Video processing
│   ├── project.rs            # Project management
│   └── export.rs             # Export functionality
└── types.rs                  # Shared data structures
```

### Git Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clean, readable code
   - Add tests if applicable
   - Update documentation as needed

3. **Test your changes:**
   ```bash
   # Frontend tests
   npm run build
   
   # Backend tests
   cargo test
   
   # Full integration test
   npm run tauri build
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(timeline): add zoom controls with keyboard shortcuts
fix(export): resolve FFmpeg audio codec compatibility issue
docs(readme): update installation instructions for macOS
```

## 🧪 Testing

### Frontend Testing
- Test all user interactions
- Verify keyboard shortcuts work correctly
- Test error handling and edge cases
- Ensure responsive design works on different screen sizes

### Backend Testing
- Test all Tauri commands with various inputs
- Verify FFmpeg integration works correctly
- Test file I/O operations
- Ensure error handling is comprehensive

### Integration Testing
- Test complete user workflows
- Verify export functionality with different video formats
- Test project save/load functionality
- Verify undo/redo system works correctly

### Manual Testing Checklist

Before submitting a PR, ensure:

- [ ] All existing tests pass
- [ ] New functionality is tested manually
- [ ] No console errors or warnings
- [ ] UI is responsive and professional
- [ ] Keyboard shortcuts work as expected
- [ ] Error handling is graceful
- [ ] Documentation is updated if needed

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS version, ClipForge version
6. **Screenshots**: If applicable
7. **Logs**: Any error messages or console output

### Bug Report Template

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: macOS 14.0
- ClipForge Version: 0.1.0
- Browser: N/A (desktop app)

## Additional Context
Any other relevant information
```

## ✨ Feature Requests

When requesting features, please include:

1. **Use Case**: Why is this feature needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other ways to solve the problem
4. **Priority**: How important is this feature?

### Feature Request Template

```markdown
## Feature Description
Brief description of the requested feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this feature work? What should the UI look like?

## Alternatives Considered
What other approaches were considered?

## Additional Context
Any other relevant information
```

## 📚 Code Documentation

### Rust Documentation
```rust
/// Extracts thumbnails from a video file at evenly distributed time points
/// 
/// # Arguments
/// * `app` - Tauri app handle for file operations
/// * `file_path` - Path to the video file
/// * `count` - Number of thumbnails to extract
/// 
/// # Returns
/// * `Result<Vec<String>, String>` - Vector of base64-encoded thumbnail data URLs
/// 
/// # Errors
/// * Returns error if file doesn't exist or FFmpeg fails
#[tauri::command]
async fn extract_thumbnails(
    app: tauri::AppHandle,
    file_path: String,
    count: usize,
) -> Result<Vec<String>, String> {
    // Implementation
}
```

### TypeScript Documentation
```typescript
/**
 * Custom hook for managing undo/redo history
 * 
 * @param initialState - Initial state for the history
 * @returns Object with current state and history management functions
 * 
 * @example
 * ```typescript
 * const { clips, undo, redo, pushState, canUndo, canRedo } = useHistory({
 *   clips: [],
 *   selectedClipId: null,
 *   playheadPosition: 0
 * });
 * ```
 */
export function useHistory(initialState: HistoryState) {
    // Implementation
}
```

## 🔧 Development Tools

### Recommended VS Code Extensions
- **Rust Analyzer** - Rust language support
- **TypeScript Importer** - Auto-import TypeScript modules
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Tauri** - Tauri development support

### Useful Commands
```bash
# Format code
cargo fmt
npm run format

# Lint code
cargo clippy
npm run lint

# Run tests
cargo test
npm run test

# Build for production
npm run tauri build

# Clean build artifacts
cargo clean
npm run clean
```

## 📖 Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Community Guidelines

- Be respectful and constructive in discussions
- Help others learn and grow
- Follow the project's code of conduct
- Provide constructive feedback on PRs
- Ask questions when you need help

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Requests**: For code contributions

Thank you for contributing to ClipForge! 🎬✨
