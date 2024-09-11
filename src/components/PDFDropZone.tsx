
import { useEffect } from 'react';
import Dropzone from 'dropzone';
import { AiOutlineCloudUpload } from 'react-icons/ai';

interface PDFDropzoneProps {
  onUpload: (fileUrl: string, fileName: string) => void;
}
const PDFDropzone = ({ onUpload }: PDFDropzoneProps) => {
  useEffect(() => {
    const dropzone = new Dropzone('#dropzone', {
      url: '#', // Not using server; handle files locally
      addRemoveLinks: true,
      // dictDefaultMessage: 'Drag a PDF here to upload, or click to select one',
      acceptedFiles: 'application/pdf',
      maxFiles: 1,
      maxFilesize: 50, // MB
      success: (file: File) => {
        const fileUrl = URL.createObjectURL(file);
        const fileName = file.name; // Get the name of the file
        onUpload(fileUrl, fileName); // Pass both fileUrl and fileName
      },
      error: (file: File, response) => {
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
      className="dropzone  font-serif text-lg font-semibold  shadow-lg bg-blue-100 w-[80%] md:w-[60%] lg:w-[35%] mx-auto flex flex-col
      items-center justify-center  text-center cursor-pointer "
    >
      <AiOutlineCloudUpload className="text-[100px] text-blue-500 " />
      
    </div>
  );
};

export default PDFDropzone;
