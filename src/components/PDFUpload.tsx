// components/PDFUpload.tsx
"use client";
import { useState } from 'react';
import PDFDropzone from '../components/PDFDropZone';
import PDFEditor from '../components/PDFEditor'; // Import PDFEditor component

const PDFUpload = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);

  const handleUpload = (fileUrl: string, fileName: string) => {
    setPdfUrl(fileUrl);
    setPdfName(fileName);
  };

  return (
    <div className="p-6">
      <PDFDropzone onUpload={handleUpload} />
    
      {pdfUrl && (
        <div className="flex flex-col items-center justify-center mt-14">
          <h2 className="text-xl font-semibold mb-2 border-b-2 border-black py-2">{pdfName}</h2>
          <PDFEditor fileUrl={pdfUrl} />
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
