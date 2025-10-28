import React from 'react';

interface ProjectMenuProps {
  onSaveProject: () => void;
  onLoadProject: () => void;
  canSave: boolean;
}

export const ProjectMenu: React.FC<ProjectMenuProps> = ({
  onSaveProject,
  onLoadProject,
  canSave,
}) => {
  return (
    <div className="project-menu">
      <button
        onClick={onSaveProject}
        disabled={!canSave}
        className="save-project-button"
        title="Save Project (Cmd+S)"
      >
        💾 Save Project
      </button>
      <button
        onClick={onLoadProject}
        className="load-project-button"
        title="Open Project (Cmd+O)"
      >
        📁 Open Project
      </button>
    </div>
  );
};
