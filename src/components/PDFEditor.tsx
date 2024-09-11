import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { RenderTask } from 'pdfjs-dist'; // Assuming you are using pdf.js
import { applyBlur, getRandomLightColor } from '@/lib/helper';
import { MdBlurOn } from "react-icons/md";
import { FaEraser, FaDownload, FaUndo, FaSpinner } from "react-icons/fa";
import { IoIosAddCircleOutline } from "react-icons/io";

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
  const [undoStack, setUndoStack] = useState<{ [page: number]: Array<{ type: 'blur' | 'erase' | 'annotation'; data: any }> }>({});

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
        
        if (!lastEffect) return newStack; // No effect to undo

        const context = canvasRef.current?.getContext('2d');
        if (context && canvasRef.current) {
            const img = new Image();
            img.src = lastEffect.data.image; // Use the image data saved in the undo stack
            img.onload = () => {
                if (canvasRef.current) {
                    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); // Clear canvas
                    context.drawImage(img, 0, 0); // Redraw the last saved state
                    applyStoredEffects(currentPage); // Reapply effects
                    reapplyAnnotations(currentPage); // Reapply annotations
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
      // Save current state to undoStack before applying the effect
      const img = new Image();
      img.src = canvas.toDataURL(); // Save current canvas state as an image
      img.onload = () => {
        setUndoStack(prevStack => ({
          ...prevStack,
          [currentPage]: [
            ...(prevStack[currentPage] || []),
            { type, data: { x: data.x, y: data.y, width: data.width, height: data.height, image: img.src } } // Save the effect and image data
          ]
        }));

        // Apply the effect
        if (type === 'blur') {
          blurSelection(data);
        } else if (type === 'erase') {
          eraseSelection(data);
        }
      };
    }
  };


  const addAnnotation = (rect: { x: number; y: number; width: number; height: number }, text: string, color: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Capture the current canvas state
      const img = new Image();
      img.src = canvas.toDataURL(); // Capture current canvas state as image data URL

      img.onload = () => {
        // Draw the rectangle
        context.fillStyle = color;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        // Draw the text
        context.fillStyle = 'black'; // Text color
        context.font = '12px Arial'; // Font style
        context.fillText(text, rect.x, rect.y + rect.height / 2); // Adjust text position

        // Save annotation details and add to undoStack
        setUndoStack(prevStack => ({
          ...prevStack,
          [currentPage]: [
            ...(prevStack[currentPage] || []),
            {
              type: 'annotation',
              data: {
                ...rect,
                text,
                color,
                image: img.src // Save the captured canvas state
              }
            }
          ]
        }));

        // Save annotation details separately for reapplication
        setAnnotations(prevAnnotations => ({
          ...prevAnnotations,
          [currentPage]: [
            ...(prevAnnotations[currentPage] || []),
            { rect, text, color }
          ]
        }));
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
        // Draw the rectangle
        context.fillStyle = color;
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        // Draw the text
        context.fillStyle = 'black'; // Text color
        context.font = '12px Arial'; // Font style
        context.fillText(text, rect.x, rect.y + rect.height / 2); // Adjust text position
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
          } else if (type === 'annotation') {
            context.fillStyle = data.color;
            context.fillRect(data.x, data.y, data.width, data.height);
            context.fillStyle = 'black'; // Text color
            context.font = '12px Arial'; // Font style
            context.fillText(data.text, data.x, data.y + data.height / 2); // Adjust text position
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
    if (!canvasRef.current) return;
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    setLoad(true);
    // Iterate through all pages
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      // Switch to the correct page
      setCurrentPage(pageNum);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the page to be rendered

      // Get the canvas for the current page
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Get canvas data URL for the current page
        const dataURL = canvas.toDataURL('image/png');
        const imageBytes = await fetch(dataURL).then(res => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);

        // Set page size to match the canvas size
        const pageWidth = canvas.width;
        const pageHeight = canvas.height;

        // Create a new page in the PDF with the same dimensions as the canvas
        const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

        // Draw the image on the PDF page
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
    }
    setLoad(false);
    // Save the PDF and trigger download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'updated_document.pdf';
    link.click();

  };


  return (
    <div >
      <div className="annotation-container flex flex-row flex-wrap ">
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
      <div className='flex flex-row justify-between  py-1  text-xl'>

        <div className='flex flex-row gap-3 mb-1 my-1 mt-2'>
          <button
            onClick={handleBlurClick}
            className="px-2  cursor-pointer"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            <MdBlurOn />
          </button>
          <button
            onClick={handleEraseClick}
            className="px-2   cursor-pointer"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            <FaEraser />
          </button>
          <button
            onClick={() => {
              if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
                const color = getRandomLightColor();
                const text = prompt('Enter annotation text:') || '';
                if (text) {
                  addAnnotation(selectionRect, text, color);
                }
              }
            }}
            className="px-2 cursor-pointer"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            <IoIosAddCircleOutline />
          </button>
          <button
            onClick={handleDownloadClick}
            className="px-2   cursor-pointer"
          >
            <FaDownload />
          </button>
          {load && <span><FaSpinner className='animate-spin text-base' /></span>}
        </div>
        <div className='flex flex-row  px-2  text-gray-600'>
          <button onClick={() => undoAction()}><FaUndo /></button>

        </div>

      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="border-2 border-black bg-[#e1e1ea]"
        />
        <div
          ref={overlayRef}
          className={`absolute border-dotted border-2 border-blue-600 bg-blue-100 opacity-50   ${isSelecting ? 'block' : 'hidden'
            }`}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
          }}
        />
      </div>
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

