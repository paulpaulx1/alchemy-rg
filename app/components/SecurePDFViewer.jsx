'use client';
import { useState } from 'react';

export default function SecurePDFViewer({ pdfUrl, title }) {
  return (
    <div 
      style={{
        width: '100%',
        maxWidth: '800px', // Constrain the width
        height: '600px', // Fixed reasonable height
        margin: '0 auto', // Center it
        border: '1px solid #ddd',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        backgroundColor: '#f5f5f5' // Light background
      }}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click
      onSelectStart={(e) => e.preventDefault()} // Disable text selection
    >
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} // Hide some PDF controls
        title={title}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
      />
    </div>
  );
}