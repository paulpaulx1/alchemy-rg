'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function SecurePDFViewer({ pdfUrl, title }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  return (
    <div 
      className="pdf-viewer-container"
      style={{ 
        textAlign: 'center',
        userSelect: 'none', // Disable text selection
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click
    >
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div>Loading PDF...</div>}
        error={<div>Failed to load PDF</div>}
      >
        <Page 
          pageNumber={pageNumber}
          renderTextLayer={false} // Disable text selection layer
          renderAnnotationLayer={false} // Disable annotation layer
          width={800} // Fixed width
        />
      </Document>
      
      {numPages && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={goToPrevPage} 
            disabled={pageNumber <= 1}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: pageNumber <= 1 ? '#ccc' : '#333',
              color: 'white',
              cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          <span style={{ fontSize: '16px' }}>
            Page {pageNumber} of {numPages}
          </span>
          
          <button 
            onClick={goToNextPage} 
            disabled={pageNumber >= numPages}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: pageNumber >= numPages ? '#ccc' : '#333',
              color: 'white',
              cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}