"use client"
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';


const PDFViewer = ({ fileUrl }:any) => {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="relative w-full max-w-4xl h-[750px] bg-white border border-gray-300 rounded-md shadow-lg">
        <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`}>
          <Viewer fileUrl={fileUrl} />
        </Worker>
      </div>
    </div>
  );
};

export default PDFViewer;
