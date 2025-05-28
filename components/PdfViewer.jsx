'use client';

import React, { useState, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PdfViewer(documentURL) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent =
        typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      const mobile = Boolean(
        userAgent.match(
          /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
        )
      );
      setIsMobile(mobile);
      if (mobile) {
        setScale(0.5);
      }
    };

    checkIfMobile();
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function onDocumentLoadError(error) {
    console.error('PDF Load Error:', error);
    setError(
      isMobile
        ? 'PDF viewing may not be supported on all mobile browsers. Try downloading the file instead.'
        : 'Failed to load PDF file.'
    );
  }

  function changePage(offSet) {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offSet;
      return newPage >= 1 && newPage <= numPages ? newPage : prevPageNumber;
    });
  }

  function zoomIn() {
    setScale((prevScale) => Math.min(2.0, prevScale + 0.1));
  }

  function zoomOut() {
    setScale((prevScale) => Math.max(0.5, prevScale - 0.1));
  }

  return (
    <div className='pdf-viewer-container'>
      <div className='pdf-controls'>
        <button onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
          Previous
        </button>
        <span>
          Page {pageNumber} of {numPages}
        </span>
        <button onClick={() => changePage(1)} disabled={pageNumber >= numPages}>
          Next
        </button>
        <button onClick={zoomOut}>Zoom Out</button>
        <button onClick={zoomIn}>Zoom In</button>
      </div>

      {error && (
        <div className='pdf-error'>
          <p>{error}</p>
        </div>
      )}

      <div className='pdf-document-container'>
        <Document
          file={documentURL.artwork.pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading='Loading PDF...'
          onLoadError={onDocumentLoadError}
          error={null} // We're handling errors manually
          externalLinkTarget='_blank'
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            width={undefined}
          />
        </Document>
      </div>
      <style jsx>{`
        .pdf-viewer-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          max-width: 100%;
          margin: 0 auto;
        }

        .pdf-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 5px;
        }

        .pdf-controls button {
          padding: 8px 12px;
          background: #00000000;
          border: 1px solid #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
        }

        .pdf-controls button:hover {
          background: #f0f0f0;
        }

        .pdf-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pdf-document-container {
          margin: 0 auto;
          max-width: 100%;
          overflow-x: auto;
          display: flex;
          justify-content: center;
        }

        .pdf-thumbnails {
          margin-top: 20px;
          overflow-x: auto;
        }

        .thumbnail-container {
          display: flex;
          gap: 10px;
          padding: 10px;
        }

        .thumbnail {
          cursor: pointer;
          position: relative;
          border: 2px solid transparent;
        }

        .thumbnail.active {
          border: 2px solid #007bff;
        }

        .thumbnail span {
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
