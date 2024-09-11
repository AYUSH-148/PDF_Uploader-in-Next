import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { RenderTask } from 'pdfjs-dist'; // Assuming you are using pdf.js
import { addAnnotation, applyBlur, downloadPDF, getRandomLightColor } from '@/lib/helper';
import CanvasOverlay from './CanvasOverlay';
import Toolbar from './Toolbar';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFEditor = ({ fileUrl }: { fileUrl: string }) => {

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [renderTask, setRenderTask] = useState<RenderTask | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionRect, setSelectionRect] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  const [annotations, setAnnotations] = useState<{ [page: number]: { rect: { x: number; y: number; width: number; height: number }; text: string; color: string }[] }>({});
  const [undoStack, setUndoStack] = useState<{
    [page: number]: Array<{
      type: 'blur' | 'erase'; data: {
        image: string; x: number; y: number; width: number; height: number
      }
    }>
  }>({});

  const [load, setLoad] = useState<boolean>(false);

  useEffect(() => {
    if (fileUrl) {
      renderPage(currentPage);
    }
    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [fileUrl, currentPage]);

  const undoAction = () => {
    setUndoStack(prevStack => {
      const newStack = { ...prevStack };
      const pageStack = newStack[currentPage] || [];
      const lastEffect = pageStack.pop();

      if (!lastEffect) return newStack; 

      // Restore the last saved state from the undo stack
      const context = canvasRef.current?.getContext('2d');
      if (context && canvasRef.current) {
        const img = new Image();
        img.src = lastEffect.data.image; 
        img.onload = () => {
          if (canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clearing canvas
            context.drawImage(img, 0, 0); // Redraw the last saved state

            // Reapply remaining effects and annotations
            applyStoredEffects(currentPage);
            reapplyAnnotations(currentPage);
          }
        };
      }

      return newStack;
    });
  };

  const applyEffect = (type: 'blur' | 'erase', data: { x: number; y: number; width: number; height: number }) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (context) {
    
      const img = new Image();
      img.src = canvas.toDataURL(); 
      img.onload = () => {
        setUndoStack(prevStack => ({
          ...prevStack,
          [currentPage]: [
            ...(prevStack[currentPage] || []),
            { type, data: { x: data.x, y: data.y, width: data.width, height: data.height, image: img.src } } // Save the effect and image data
          ]
        }));

        if (type === 'blur') {
          blurSelection(data);
        } else if (type === 'erase') {
          eraseSelection(data);
        }
      };
    }
  };

  const renderPage = async (pageNum: number) => {
    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    setNumPages(pdf.numPages);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = canvasRef.current;
    const context = canvas!.getContext('2d');

    canvas!.height = viewport.height;
    canvas!.width = viewport.width;

    const renderContext = {
      canvasContext: context!,
      viewport: viewport,
    };

    const task = page.render(renderContext);
    setRenderTask(task);

    task.promise.then(() => {
      applyStoredEffects(pageNum);
      reapplyAnnotations(pageNum);
    }).catch((error: Error) => {
      console.error('Render task error:', error);
    });
  };


  const reapplyAnnotations = (pageNum: number) => {
    const pageAnnotations = annotations[pageNum] || [];
    const context = canvasRef.current?.getContext('2d');

    if (context) {
      pageAnnotations.forEach(({ rect, text, color }) => {
        
        context.fillStyle = color;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        context.fillStyle = 'black'; 
        context.font = '12px Arial'; 
        context.fillText(text, rect.x, rect.y + rect.height / 2); 
      });
    }
  };


  const applyStoredEffects = (pageNum: number) => {
    const effects = undoStack[pageNum] || [];
    if (effects.length > 0) {
      const context = canvasRef.current?.getContext('2d');
      if (context) {
        effects.forEach(({ type, data }) => {
          if (type === 'blur') {
            const imageData = context.getImageData(data.x, data.y, data.width, data.height);
            const blurredData = applyBlur(imageData);
            context.putImageData(blurredData, data.x, data.y);
          } else if (type === 'erase') {
            context.clearRect(data.x, data.y, data.width, data.height);
          }
        });
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {

      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    setSelectionRect({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: 0, height: 0 });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionRect) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const newWidth = e.clientX - rect.left - selectionRect.x;
    const newHeight = e.clientY - rect.top - selectionRect.y;

    setSelectionRect({
      x: selectionRect.x,
      y: selectionRect.y,
      width: Math.max(0, newWidth),
      height: Math.max(0, newHeight)
    });

    updateOverlay();
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const updateOverlay = () => {
    if (!overlayRef.current || !selectionRect) return;
    const overlay = overlayRef.current;

    overlay.style.left = `${selectionRect.x}px`;
    overlay.style.top = `${selectionRect.y}px`;
    overlay.style.width = `${selectionRect.width}px`;
    overlay.style.height = `${selectionRect.height}px`;
  };

  const handleBlurClick = () => {
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      applyEffect('blur', selectionRect);
    }
  };

  const handleEraseClick = () => {
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      applyEffect('erase', selectionRect);
    }
  };
  const handleAnnotation = (rect: { x: number; y: number; width: number; height: number }, text: string, color: string) => {
    addAnnotation(canvasRef, rect, text, color, currentPage, setAnnotations)
  };

  const blurSelection = (data: { x: number; y: number; width: number; height: number }) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      const { x, y, width, height } = data;
      const imageData = context.getImageData(x, y, width, height);

      const blurredData = applyBlur(imageData);
      context.putImageData(blurredData, x, y);
    }
  };

  const eraseSelection = (data: { x: number; y: number; width: number; height: number }) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      const { x, y, width, height } = data;
      context.clearRect(x, y, width, height);
    }
  };


  const handleDownloadClick = async () => {
    await downloadPDF(canvasRef, numPages, setCurrentPage, setLoad);
  };


  return (
    <div >
      <div className="annotation-container flex flex-row flex-wrap mt-3">
        {(annotations[currentPage] || []).map((annotation, index) => (
          <div
            key={index}
            className="annotation-item px-1.5 py-0.5 m-1 rounded"
            style={{ backgroundColor: annotation.color }} // Apply the background color
          >
            <span className='text-xs px-0.5'>{index + 1}.</span> {annotation.text}
          </div>
        ))}

      </div>

      {/*  Icons list*/}
      <Toolbar
        handleBlurClick={handleBlurClick}
        handleEraseClick={handleEraseClick}
        handleAnnotation={handleAnnotation}
        handleDownloadClick={handleDownloadClick}
        undoAction={undoAction}
        getRandomLightColor={getRandomLightColor}
        load={load}
        selectionRect={selectionRect}
      />

      {/* Canvas Component */}
      <CanvasOverlay
        canvasRef={canvasRef}
        overlayRef={overlayRef}
        isSelecting={isSelecting}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
      />

      {/* Page Navigation */}
      <div className="flex my-4 flex-row gap-2 items-center justify-center">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 disabled:bg-gray-300"
        >
          Previous Page
        </button>
        <span className="px-4 py-2">
          Page {currentPage} of {numPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === numPages}
          className="px-4 py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          Next Page
        </button>
      </div>
    </div>
  );
};

export default PDFEditor;

