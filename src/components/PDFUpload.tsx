// components/PDFUpload.tsx
"use client"
import { useState } from 'react';
import PDFDropzone from '../components/PDFDropZone';

import PDFEditor from '../components/PDFEditor'; // Import PDFEditor component

const PDFUpload = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  return (
    <div className="p-6">
      
      <PDFDropzone onUpload={setPdfUrl} />
      {pdfUrl && (
        <div className=" flex items-center justify-center">
     
          <PDFEditor fileUrl={pdfUrl} />
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
