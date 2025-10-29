# ClipForge - Product Context

## Why This Project Exists
ClipForge is being built for Gauntlet AI as a proof-of-concept video editor that demonstrates core media handling capabilities in a desktop application. The MVP focuses on establishing the foundation for future enhancements rather than including all possible features upfront.

## Problems It Solves
1. **Simple Video Editing**: Users need basic tools to combine video clips without heavy software
2. **Quick Compilation**: Content creators want to quickly string together clips into one video
3. **Desktop Performance**: Native desktop app provides better performance than web-based editors
4. **No Cloud Dependencies**: All processing happens locally for privacy and speed

## How It Should Work
### User Workflow
1. **Import**: Drag & drop video files or use file picker
2. **Arrange**: Clips automatically appear on timeline in sequence
3. **Preview**: Click a clip to see it in video player
4. **Trim**: Set in/out points to remove unwanted portions
5. **Export**: Click export button, choose save location, wait for processing

### User Experience Goals
- **Fast**: Import and preview should feel instant
- **Intuitive**: Minimal learning curve, standard video editor metaphors
- **Reliable**: Export should always succeed or provide clear error messages
- **Clean**: UI should be uncluttered and focused on core workflow

## Target Users

### Primary User: Content Creator (Solo)
- Needs to quickly combine clips from phone/camera
- Wants to remove mistakes or dead air
- Shares on social platforms (needs MP4 export)
- Values speed and simplicity over advanced features

### Secondary User: Educator/Professional
- Creates tutorial or presentation videos
- Needs reliable export functionality
- Wants to focus on content, not software complexity

### Developer User (Testing Persona)
- Evaluating Tauri's capabilities for desktop apps
- Testing cross-platform development workflow
- Demonstrating video processing integration

## Out of Scope for MVP
These are explicitly excluded from MVP:
- Screen/webcam recording ✅ **IMPLEMENTED** (Post-MVP)
- Audio capture from microphone ✅ **IMPLEMENTED** (Post-MVP)
- Multiple timeline tracks ✅ **IMPLEMENTED** (Post-MVP)
- Advanced transitions or effects
- Text overlays
- Audio volume controls ✅ **IMPLEMENTED** (Post-MVP)
- Filters or color grading
- Cloud upload/sharing ❌ **NOT IMPLEMENTED** (Bonus feature)

**Rationale**: MVP focuses on proving video file handling in desktop context. These are final submission features.

## Missing Requirements (Full Project Scope)

**✅ Recently Completed:**
1. ~~**Media Library Panel**~~ ✅ **COMPLETE** - Separate panel to view/browse imported clips before adding to timeline
2. ~~**File Size Metadata**~~ ✅ **COMPLETE** - Display file size alongside duration, resolution, codec

**✅ Recently Completed:**
3. ~~**Export Resolution Options**~~ ✅ **COMPLETE** - Allow users to select 720p, 1080p, or source resolution

**Remaining Missing Features:**
4. **Cloud Upload/Sharing** - Upload to Google Drive/Dropbox or generate shareable links (marked as bonus)

**Note**: Export resolution options is documented in `clipforge_postmvp_prd.md` as a planned enhancement but not yet implemented.

