import { PDFDocument } from 'pdf-lib';
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Annotation {
  rect: Rect;
  text: string;
  color: string;
}

export const getRandomLightColor = () => {
  const r = Math.floor(Math.random() * 128 + 127);
  const g = Math.floor(Math.random() * 128 + 127);
  const b = Math.floor(Math.random() * 128 + 127);
  const opacity = 0.3;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


export const applyBlur = (imageData: ImageData): ImageData => {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const blurRadius = 3;

  const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;

  // Create a new Uint8ClampedArray for the output image data
  const blurredPixels = new Uint8ClampedArray(pixels.length);

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
      blurredPixels[index] = r / avgFactor;
      blurredPixels[index + 1] = g / avgFactor;
      blurredPixels[index + 2] = b / avgFactor;
      blurredPixels[index + 3] = a / avgFactor;
    }
  }

  return new ImageData(blurredPixels, width, height);
};


export const downloadPDF = async (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  numPages: number,
  setCurrentPage: (page: number) => void,
  setLoad: (loading: boolean) => void
) => {
  if (!canvasRef.current) return;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  setLoad(true);

  // Iterate through all pages
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    // Switch to the correct page
    setCurrentPage(pageNum);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for the page to render

    // Get the canvas for the current page
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Get canvas data URL for the current page
      const dataURL = canvas.toDataURL('image/png');
      const imageBytes = await fetch(dataURL).then((res) => res.arrayBuffer());
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
  link.download = 'Edited_doc.pdf';
  link.click();
};



export const addAnnotation = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  rect: Rect,
  text: string,
  color: string,
  currentPage: number,
  setAnnotations: React.Dispatch<React.SetStateAction<{ [key: number]: Annotation[] }>>
) => {
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
      context.font = '600 14px Arial'; // Font style
      context.fillText(text, rect.x, rect.y + rect.height / 2); // Adjust text position

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
