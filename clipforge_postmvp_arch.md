graph TB
    subgraph "React Frontend (Renderer Process)"
        UI[Main App Component]
        VP[Video Player]
        TL[Timeline Editor<br/>Main + Overlay Tracks]
        REC[Recording Panel<br/>Screen/Webcam/Audio]
        EFX[Effects Panel<br/>Text/Transitions/Filters]
        EXP[Export Manager<br/>Resolution/Presets]
        PIP[PiP Editor<br/>Resize/Position]
        PROJ[Project Manager<br/>Save/Load/Auto-save]
        CLOUD[Cloud Upload<br/>Google Drive]
        
        UI --> VP
        UI --> TL
        UI --> REC
        UI --> EFX
        UI --> EXP
        UI --> PIP
        UI --> PROJ
        UI --> CLOUD
        
        STATE[App State<br/>Undo/Redo History<br/>Timeline Data<br/>Effects/Transitions]
        
        UI -.-> STATE
    end
    
    subgraph "Tauri IPC Layer"
        IPC[invoke / listen<br/>Event System]
    end
    
    subgraph "Rust Backend (Main Process)"
        CMD[Tauri Commands]
        
        REC_MOD[recording.rs<br/>Screen/Webcam Capture]
        EXP_MOD[export.rs<br/>Video Processing]
        PROJ_MOD[project.rs<br/>File I/O]
        CLOUD_MOD[cloud.rs<br/>OAuth/Upload]
        META[Metadata Extraction<br/>FFprobe Integration]
        
        CMD --> REC_MOD
        CMD --> EXP_MOD
        CMD --> PROJ_MOD
        CMD --> CLOUD_MOD
        CMD --> META
        
        FS[File System<br/>~/Library/Application Support/ClipForge/<br/>- autosave.clipforge<br/>- recordings/<br/>- temp/]
        
        PROJ_MOD --> FS
        REC_MOD --> FS
    end
    
    subgraph "External Tools & APIs"
        FFMPEG[FFmpeg Binary<br/>Video Encoding<br/>Filters<br/>Compositing]
        FFPROBE[FFprobe Binary<br/>Metadata Extraction]
        
        AVF[macOS AVFoundation<br/>Screen Capture API]
        MEDIA[MediaDevices API<br/>Webcam Access]
        GDRIVE[Google Drive API<br/>File Upload]
        
        EXP_MOD --> FFMPEG
        META --> FFPROBE
        REC_MOD --> AVF
        REC --> MEDIA
        CLOUD_MOD --> GDRIVE
    end
    
    UI -->|Tauri Invoke| IPC
    IPC -->|Call Commands| CMD
    CMD -->|Emit Events| IPC
    IPC -->|Progress Updates| UI
    
    style UI fill:#4a90e2,color:#fff
    style STATE fill:#2ecc71,color:#fff
    style CMD fill:#e74c3c,color:#fff
    style FFMPEG fill:#f39c12,color:#fff
    style FFPROBE fill:#f39c12,color:#fff
    style AVF fill:#9b59b6,color:#fff
    style GDRIVE fill:#3498db,color:#fff