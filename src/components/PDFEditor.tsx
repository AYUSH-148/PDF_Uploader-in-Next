import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFEditor = ({ fileUrl }: { fileUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null); // Ref for the overlay div
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderTask, setRenderTask] = useState<any>(null); // Track the ongoing render task.
  const [isSelecting, setIsSelecting] = useState(false); // Track whether the user is selecting an area.
  const [selectionRect, setSelectionRect] = useState<null | { x: number; y: number; width: number; height: number }>(null); // Store the selection area.
  const [tool, setTool] = useState<'blur' | 'erase'>('blur'); // Current tool selected

  useEffect(() => {
    if (fileUrl) {
      renderPage(currentPage);
    }

    return () => {
      if (renderTask) {
        renderTask.cancel(); // Cancel any ongoing render task when the component unmounts or page changes.
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
      renderTask.cancel(); // Cancel the previous render task before starting a new one.
    }

    const renderContext = {
      canvasContext: context!,
      viewport: viewport,
    };

    const task = page.render(renderContext);
    setRenderTask(task);

    task.promise.catch((error: any) => {
      console.error('Render task error:', error);
    });
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

  // Start selecting an area for blurring or erasing.
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    setSelectionRect({ x: e.clientX - rect.left, y: e.clientY - rect.top, width: 0, height: 0 });
    setIsSelecting(true);
  };

  // Update the selection area while dragging.
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

    // Update the overlay position and size
    updateOverlay();
  };

  // End selection.
  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  // Update overlay for the selection border
  const updateOverlay = () => {
    if (!overlayRef.current || !selectionRect) return;
    const overlay = overlayRef.current;

    overlay.style.left = `${selectionRect.x}px`;
    overlay.style.top = `${selectionRect.y}px`;
    overlay.style.width = `${selectionRect.width}px`;
    overlay.style.height = `${selectionRect.height}px`;
  };

  // Apply blur effect when the button is clicked.
  const handleBlurClick = () => {
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      blurSelection();
    }
  };

  // Apply erase effect when the button is clicked.
  const handleEraseClick = () => {
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      eraseSelection();
    }
  };

  // Apply a blur effect to the selected area.
  const blurSelection = () => {
    if (!canvasRef.current || !selectionRect) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Get the selected image data, ensuring the selection area is not zero.
    if (selectionRect.width > 0 && selectionRect.height > 0) {
      const imageData = context!.getImageData(
        selectionRect.x,
        selectionRect.y,
        selectionRect.width,
        selectionRect.height
      );

      // Apply a simple blur effect by averaging pixel colors in the selection.
      const blurredData = applyBlur(imageData);
      context!.putImageData(blurredData, selectionRect.x, selectionRect.y);
    }
  };

  // Apply an erase effect to the selected area.
  const eraseSelection = () => {
    if (!canvasRef.current || !selectionRect) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Clear the selected area
    context!.clearRect(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );
  };

  // Simple box blur effect by averaging neighboring pixel colors.
  const applyBlur = (imageData: ImageData) => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Radius of blur effect
    const blurRadius = 3;

    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;

    for (let y = blurRadius; y < height - blurRadius; y++) {
      for (let x = blurRadius; x < width - blurRadius; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0;

        // Average the pixels within the blur radius.
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

  // Function to get canvas blob and upload it.
  const handleDownloadClick = () => {
    if (!canvasRef.current) return;
  
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png'); // Convert canvas to base64 data URL
  
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'updated-file.png'; // Set the filename for download
  
    // Append the link to the document body and simulate a click
    document.body.appendChild(link);
    link.click();
  
    // Remove the link from the document
    document.body.removeChild(link);
  };
  
  

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className='mx-auto'
      />
      <div
        ref={overlayRef}
        style={{
          position: 'absolute',
          border: '2px dashed rgba(0, 0, 255, 0.5)',
          pointerEvents: 'none',
        }}
      />
      <div className="controls">
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
        <button
          onClick={handleBlurClick}
          className="px-4 py-2 bg-red-500 text-white font-semibold rounded hover:bg-red-600"
          disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
        >
          Blur Selection
        </button>
        <button
          onClick={handleEraseClick}
          className="px-4 py-2 bg-green-500 text-white font-semibold rounded hover:bg-green-600"
          disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
        >
          Erase Selection
        </button>
        <button
          onClick={handleDownloadClick}
          className="px-4 py-2 bg-purple-500 text-white font-semibold rounded hover:bg-purple-600"
        >
          Upload Updated File
        </button>
      </div>
    </div>
  );
};

export default PDFEditor;
