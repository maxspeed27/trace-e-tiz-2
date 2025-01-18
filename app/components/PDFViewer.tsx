import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PdfDocument } from '../types/pdf';
import { PDFErrorBoundary } from './PDFErrorBoundary';
import { PDFOptionsBar } from '../view/PdfOptionsBar';
import { Resizable } from 're-resizable';
import { usePDFViewer } from '../hooks/usePdfViewer';
import { ScrollArea } from '@/components/ui/scroll-area';

const VirtualizedPDF = dynamic(() => import('../view/VirtualizedPdf').then(mod => mod.VirtualizedPDF), {
  ssr: false,
  loading: () => <div className="p-4 flex items-center justify-center">Loading PDF viewer...</div>
});

interface PDFViewerProps {
  file: PdfDocument;
  containerClassName?: string;
  selectedDocuments: string[];
  currentDocumentIndex: number;
  onDocumentChange: (index: number) => void;
}

export default function PDFViewer({ 
  file, 
  containerClassName,
  selectedDocuments,
  currentDocumentIndex,
  onDocumentChange
}: PDFViewerProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const {
    scale,
    setScaleFit,
    numPages,
    setNumPages,
    setCurrentPageNumber,
    pdfFocusRef,
  } = usePDFViewer(file);

  const handleError = (error: Error) => {
    console.error('PDF loading error:', error);
    console.error('File URL:', file.url);
    setLoadError(`Failed to load PDF: ${error.message}`);
  };

  useEffect(() => {
    setLoadError(null);
  }, [file.url]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 font-semibold">Error loading PDF</p>
          <p className="text-sm text-red-500 mt-2">URL: {file.url}</p>
          <p className="text-sm text-red-500">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <Resizable
      defaultSize={{ width: '100%', height: '100%' }}
      minHeight="400px"
      maxHeight="95vh"
      enable={{
        bottom: true,
        bottomRight: true,
        right: true,
      }}
      className={`pdf-viewer-container ${containerClassName || ''}`}
    >
      <div className="h-full flex flex-col border bg-white">
        <PDFOptionsBar
          file={file}
          selectedDocuments={selectedDocuments}
          currentDocumentIndex={currentDocumentIndex}
          onDocumentChange={onDocumentChange}
        />
        <ScrollArea className="flex-1 relative bg-gray-50">
          <PDFErrorBoundary
            fallback={
              <div className="flex items-center justify-center h-full p-4">
                <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 font-semibold">Failed to load PDF viewer</p>
                  <p className="text-sm text-red-500 mt-2">URL: {file.url}</p>
                </div>
              </div>
            }
          >
            <VirtualizedPDF
              ref={pdfFocusRef}
              file={file}
              setIndex={setCurrentPageNumber}
              setNumPages={setNumPages}
              onError={handleError}
              selectedDocuments={selectedDocuments}
              currentDocumentIndex={currentDocumentIndex}
              onDocumentChange={onDocumentChange}
            />
          </PDFErrorBoundary>
        </ScrollArea>
      </div>
    </Resizable>
  );
} 