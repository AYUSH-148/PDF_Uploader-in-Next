import { MdBlurOn } from 'react-icons/md';
import { FaEraser, FaDownload, FaUndo, FaSpinner } from 'react-icons/fa';
import { IoIosAddCircleOutline } from 'react-icons/io';

interface ToolbarProps {
  handleBlurClick: () => void;
  handleEraseClick: () => void;
  handleAnnotation: (rect: { x: number; y: number; width: number; height: number }, text: string, color: string) => void;
  handleDownloadClick: () => void;
  undoAction: () => void;
  getRandomLightColor: () => string;
  load: boolean;
  selectionRect: {
      y: number;
      x: number; width: number; height: number 
} | null;
}

const Toolbar: React.FC<ToolbarProps> = ({
  handleBlurClick,
  handleEraseClick,
  handleAnnotation,
  handleDownloadClick,
  undoAction,
  getRandomLightColor,
  load,
  selectionRect
}) => {
  return (
    <div className='flex flex-row justify-between py-1 text-xl'>
      <ul className='flex flex-row gap-3 mb-1 my-1 mt-2'>
        <li>
          <button
            onClick={handleBlurClick}
            className="px-2 cursor-pointer"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            <MdBlurOn />
          </button>
        </li>
        <li>
          <button
            onClick={handleEraseClick}
            className="px-2 cursor-pointer"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            <FaEraser />
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              if (selectionRect && selectionRect.width > 0 && selectionRect.height > 0) {
                const color = getRandomLightColor();
                const text = prompt('Enter annotation text:') || '';
                if (text) {
                  handleAnnotation( {
                    x: selectionRect.x || 0, 
                    y: selectionRect.y || 0,
                    width: selectionRect.width,
                    height: selectionRect.height
                  }, text, color);
                }
              }
            }}
            className="px-2 cursor-pointer"
            disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
          >
            <IoIosAddCircleOutline />
          </button>
        </li>
        <li>
          <button onClick={handleDownloadClick} className="px-2 cursor-pointer">
            <FaDownload />
          </button>
        </li>
        {load && (
          <span className='flex items-center text-base gap-2'>
            <FaSpinner className='animate-spin' />
            Wait...
          </span>
        )}
      </ul>
      <div className='flex flex-row px-2 text-gray-600'>
        <button onClick={undoAction}>
          <FaUndo />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
