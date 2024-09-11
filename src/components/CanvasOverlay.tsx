import React from 'react';

interface CanvasOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  isSelecting: boolean;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => void;
}

const CanvasOverlay: React.FC<CanvasOverlayProps> = ({
  canvasRef,
  overlayRef,
  isSelecting,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}) => {
  return (
    <div className="canvas-container relative">
      <canvas
        ref={canvasRef}
        className="canvas border-2 border-black bg-[#e1e1ea]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <div
        ref={overlayRef}
        className={`absolute border-dotted border-2 border-blue-600 bg-blue-100 opacity-50 ${isSelecting ? 'block' : 'hidden'}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default CanvasOverlay;
