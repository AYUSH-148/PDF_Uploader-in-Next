import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { RenderTask } from 'pdfjs-dist'; // Assuming you are using pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFEditor = ({ fileUrl }: { fileUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [renderTask, setRenderTask] = useState<RenderTask|null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionRect, setSelectionRect] = useState<null | { x: number; y: number; width: number; height: number }>(null);
  const [pageEffects, setPageEffects] = useState<{ [page: number]: { blurs: { x: number; y: number; width: number; height: number; }[], erases: { x: number; y: number; width: number; height: number; }[] } }>({});
  const [annotations, setAnnotations] = useState<{ [page: number]: { rect: { x: number; y: number; width: number; height: number }; text: string; color: string }[] }>({});

 
  const getRandomLightColor = () => {
    const r = Math.floor(Math.random() * 128 + 127);
    const g = Math.floor(Math.random() * 128 + 127);
    const b = Math.floor(Math.random() * 128 + 127);
    const opacity = 0.3;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };


  const handleAnnotationButton = () => {
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      const color = getRandomLightColor();
      const text = prompt('Enter annotation text:') || 'Annotation';
      addAnnotation(selectionRect, text, color);
    }
  };

  const addAnnotation = (rect: { x: number; y: number; width: number; height: number }, text: string, color: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    context!.fillStyle = color;
    context!.fillRect(rect.x, rect.y, rect.width, rect.height);

    setAnnotations(prevAnnotations => ({
      ...prevAnnotations,
      [currentPage]: [
        ...(prevAnnotations[currentPage] || []),
        { rect, text, color }
      ]
    }));
  };


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

    if (renderTask) {
      renderTask.cancel();
    }

    const renderContext = {
      canvasContext: context!,
      viewport: viewport,
    };

    const task = page.render(renderContext);
    setRenderTask(task);

    task.promise.then(() => {
      applyStoredEffects(pageNum);
      reapplyAnnotations(pageNum); // Reapply stored annotations after rendering
    }).catch((error: Error) => {
      console.error('Render task error:', error);
    });
  };

  const reapplyAnnotations = (pageNum: number) => {
    const pageAnnotations = annotations[pageNum] || [];
    const context = canvasRef.current?.getContext('2d');

    pageAnnotations.forEach(({ rect, color }) => {
      context!.fillStyle = color;
      context!.fillRect(rect.x, rect.y, rect.width, rect.height);
    });
  };

  const applyStoredEffects = (pageNum: number) => {
    const effects = pageEffects[pageNum];
    if (effects) {
      const { blurs, erases } = effects;
      const context = canvasRef.current?.getContext('2d');

      if (context) {
        // Apply blur effects
        blurs.forEach(({ x, y, width, height }) => {
          const imageData = context.getImageData(x, y, width, height);
          const blurredData = applyBlur(imageData);
          context.putImageData(blurredData, x, y);
        });

        // Apply erase effects
        erases.forEach(({ x, y, width, height }) => {
          context.clearRect(x, y, width, height);
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
      applyEffect('blur');
    }
  };

  const handleEraseClick = () => {
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      applyEffect('erase');
    }
  };
  
 
  
  const applyEffect = (type: 'blur' | 'erase') => {
    if (!canvasRef.current || !selectionRect) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      const { x, y, width, height } = selectionRect;
      const effect = { x, y, width, height };

      setPageEffects(prev => {
        const updatedEffects = { ...prev };
        if (!updatedEffects[currentPage]) {
          updatedEffects[currentPage] = { blurs: [], erases: [] };
        }
        if (type === 'blur') {
          updatedEffects[currentPage].blurs.push(effect);
        } else if (type === 'erase') {
          updatedEffects[currentPage].erases.push(effect);
        }
        return updatedEffects;
      });
      
      if (type === 'blur') {
        blurSelection();
      } else if (type === 'erase') {
        eraseSelection();
      }     
    }
  };
  

  

 
  const blurSelection = () => {
    if (!canvasRef.current || !selectionRect) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (selectionRect.width > 0 && selectionRect.height > 0) {
      const imageData = context!.getImageData(
        selectionRect.x,
        selectionRect.y,
        selectionRect.width,
        selectionRect.height
      );

      const blurredData = applyBlur(imageData);
      context!.putImageData(blurredData, selectionRect.x, selectionRect.y);
    }
  };

  const eraseSelection = () => {
    if (!canvasRef.current || !selectionRect) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    context!.clearRect(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );
  };

  const applyBlur = (imageData: ImageData) => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const blurRadius = 3;

    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;

    for (let y = blurRadius; y < height - blurRadius; y++) {
      for (let x = blurRadius; x < width - blurRadius; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;

        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            const index = getPixelIndex(x + dx, y + dy);
            r += pixels[index];
            g += pixels[index + 1];
            b += pixels[index + 2];
            a += pixels[index + 3];
          }
        }

        const avgFactor = (blurRadius * 2 + 1) ** 2;
        const index = getPixelIndex(x, y);
        pixels[index] = r / avgFactor;
        pixels[index + 1] = g / avgFactor;
        pixels[index + 2] = b / avgFactor;
        pixels[index + 3] = a / avgFactor;
      }
    }

    return new ImageData(pixels, width, height);
  };

  const handleDownloadClick = async () => {
    if (!canvasRef.current) return;
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Define the total time for the upload process (for example, 10 seconds)
    // const totalUploadTime = numPages*1000; 

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

    // Save the PDF and trigger download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'updated_document.pdf';
    link.click();


  };



  return (
    <div>
       <div className="annotation-container flex flex-row flex-wrap mt-10">
        {(annotations[currentPage] || []).map((annotation, index) => (
          <div
            key={index}
            className="annotation-item px-1 m-1 rounded"
            style={{ backgroundColor: annotation.color }} // Apply the background color
          >
            <span className='text-xs px-1'>{index + 1}</span> {annotation.text}
          </div>
        ))}

      </div>
      <div className='flex flex-row justify-between  py-1 mb-2'>
     
        <div>
          <button
            onClick={handleBlurClick}
            className="px-2 py-0.5  border border-r-0 border-gray-400 hover:bg-slate-200"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            Blur
          </button>
          <button
            onClick={handleEraseClick}
            className="px-2 py-0.5  border border-r-0 border-gray-400 hover:bg-slate-200"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            Erase
          </button>
          <button
            onClick={handleAnnotationButton}
            className="px-2 py-0.5   border border-r-0 border-gray-400 hover:bg-slate-200"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            Add Annotation
          </button>
          <button
            onClick={handleDownloadClick}
            className="px-2 py-0.5    border border-gray-400 hover:bg-slate-200"
          >
            Upload
          </button>
        </div>

        {/* <div className="px-2 py-1">
          <button onClick={handleUndo} disabled={history.length === 0} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded hover:bg-gray-400 disabled:bg-gray-200">
            Undo
          </button>
          <button onClick={handleRedo} disabled={redoStack.length === 0} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded hover:bg-gray-400 disabled:bg-gray-200">
            Redo
          </button>

        </div> */}
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className='border-2 border-black'
      />
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',

          pointerEvents: 'none',
        }}
      />
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

