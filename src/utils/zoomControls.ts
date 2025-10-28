export interface ZoomHandlers {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
}

export function handleZoomIn(handlers: ZoomHandlers): void {
  const zoomLevels = [0.25, 0.5, 1, 2, 5, 10, 20];
  const currentIndex = zoomLevels.findIndex(level => Math.abs(level - handlers.zoomLevel) < 0.01);
  if (currentIndex < zoomLevels.length - 1) {
    handlers.setZoomLevel(zoomLevels[currentIndex + 1]);
  }
}

export function handleZoomOut(handlers: ZoomHandlers): void {
  const zoomLevels = [0.25, 0.5, 1, 2, 5, 10, 20];
  const currentIndex = zoomLevels.findIndex(level => Math.abs(level - handlers.zoomLevel) < 0.01);
  if (currentIndex > 0) {
    handlers.setZoomLevel(zoomLevels[currentIndex - 1]);
  }
}

export function handleZoomToFit(handlers: ZoomHandlers): void {
  handlers.setZoomLevel(1);
}
