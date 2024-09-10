// components/PDFDropzone.js
import { useEffect } from 'react';
import Dropzone from 'dropzone';

const PDFDropzone = ({ onUpload }:any )=> {
  useEffect(() => {
    const dropzone = new Dropzone('#dropzone', {
      url: '#', // Not using server; handle files locally
      addRemoveLinks: true,
      dictDefaultMessage: 'Drag a PDF here to upload, or click to select one',
      acceptedFiles: 'application/pdf',
      maxFiles: 1,
      maxFilesize: 50, // MB
      //@ts-ignore
      success: (file:any, response:any) => {
        const fileUrl = URL.createObjectURL(file);
        onUpload(fileUrl);
      },
      error: (file:any, response:any) => {
        console.error('File upload error:', response);
      }
    });

    return () => {
      dropzone.destroy();
    };
  }, [onUpload]);

  return (
    <div
      id="dropzone"
      className="dropzone border border-gray-300 rounded-md p-4 w-[63%] mx-auto"
    />
  );
};

export default PDFDropzone;
