import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { RenderTask } from 'pdfjs-dist'; // Assuming you are using pdf.js
import { applyBlur, getRandomLightColor } from '@/lib/helper';
import { MdBlurOn } from "react-icons/md";
import { FaEraser, FaDownload } from "react-icons/fa";
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
  const [pageEffects, setPageEffects] = useState<{ [page: number]: { blurs: { x: number; y: number; width: number; height: number; }[], erases: { x: number; y: number; width: number; height: number; }[] } }>({});
  const [annotations, setAnnotations] = useState<{ [page: number]: { rect: { x: number; y: number; width: number; height: number }; text: string; color: string }[] }>({});
  

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


  const handleAnnotationButton = () => {
    if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
      const color = getRandomLightColor();
      const text = prompt('Enter annotation text:')||null;
      if(text === null){
        return ;
      }
      addAnnotation(selectionRect, text, color);
    }
  };

  const addAnnotation = (rect: { x: number; y: number; width: number; height: number }, text: string, color: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
  
    if (context) {
      // Draw the rectangle
      context.fillStyle = color;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
  
    }
    
  
    // Save annotation details
    setAnnotations(prevAnnotations => ({
      ...prevAnnotations,
      [currentPage]: [
        ...(prevAnnotations[currentPage] || []),
        { rect, text, color }
      ]
    }));
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
      reapplyAnnotations(pageNum); // Reapply annotations after the page is rendered
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
        // Ensure the updatedEffects structure matches the expected type
        return updatedEffects as { [page: number]: { blurs: { x: number; y: number; width: number; height: number; }[]; erases: { x: number; y: number; width: number; height: number; }[] } };
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
            onClick={handleAnnotationButton}
            className="px-2   cursor-pointer"
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
        </div>
        <div>
     
        </div>

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

