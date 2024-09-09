"use client"
import { useState } from 'react';
import PDFDropzone from '../components/PDFDropZone';
import PDFViewer from '../components/PDFViewer'; // Assume you have a PDFViewer component

const PDFUpload = () => {
  const [pdfUrl, setPdfUrl] = useState(null);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Upload and View PDF</h1>
      <PDFDropzone onUpload={setPdfUrl} />
      {pdfUrl && (
        <div className="mt-4">
          <PDFViewer fileUrl={pdfUrl} />
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
