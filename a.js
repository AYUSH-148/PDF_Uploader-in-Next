<div>
<div className='flex flex-row gap-1 py-1 mt-4'>
  <button
    onClick={handleBlurClick}
    className="px-2 py-1  rounded "
    disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
  >
    Blur
  </button>
  <button
    onClick={handleEraseClick}
    className="px-2 py-1  rounded "
    disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
  >
    Erase
  </button>
  <button
    onClick={handleAnnotationButton}
    className="px-2 py-1   rounded "
    disabled={!selectionRect || selectionRect.width === 0 || selectionRect.height === 0}
  >
    Add Annotation
  </button>
  <button
    onClick={handleDownloadClick}
    className="px-2 py-1    rounded "
  >
    Upload
  </button>
</div>
<div className="annotation-container flex flex-row flex-wrap mt-2">
  {(annotations[currentPage] || []).map((annotation, index) => (
    <div
      key={index}
      className="annotation-item px-2 py-1 m-1 rounded"
      style={{ backgroundColor: annotation.color }} // Apply the background color
    >
      <span className='text-xs px-1'>{index + 1}</span> {annotation.text}
    </div>
  ))}
  
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

</div>
</div>