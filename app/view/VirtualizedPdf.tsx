import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useState, forwardRef, useRef, useMemo, useEffect, useCallback, useImperativeHandle } from 'react';
import { PdfDocument } from '../types/pdf';
import { usePdfFocus } from '../hooks/usePdfFocus';
import { DocumentColorEnum } from '../constants/colors';
import { multiHighlight } from '../utils/multi-line-highlight';

// Initialize pdfjs worker
if (typeof window !== 'undefined') {
  // Use the worker from the public directory
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export interface PdfFocusHandler {
  scrollToPage: (pageNumber: number) => void;
}

interface VirtualizedPDFProps {
  file: PdfDocument;
  setIndex: (index: number) => void;
  setNumPages: (pages: number) => void;
  onError?: (error: Error) => void;
  selectedDocuments: string[];
  currentDocumentIndex: number;
  onDocumentChange: (index: number) => void;
}

export const VirtualizedPDF = forwardRef<PdfFocusHandler, VirtualizedPDFProps>(
  ({ file, setIndex, setNumPages, onError, selectedDocuments, currentDocumentIndex, onDocumentChange }, ref) => {
    const [pageCount, setPageCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const { pdfFocusState } = usePdfFocus();

    const memoizedFile = useMemo(() => ({ url: file.url }), [file.url]);

    useEffect(() => {
      if (!pdfFocusState.citation) {
        console.log('No citation in focus state');
        return;
      }
      
      const citation = pdfFocusState.citation;
      console.log('Citation clicked:', {
        citation,
        fileId: file.id,
        documentId: pdfFocusState.documentId,
        pageNumber: pdfFocusState.pageNumber,
        pageCount
      });
      
      if (
        pdfFocusState.documentId === file.id && 
        pdfFocusState.pageNumber > 0 && 
        pdfFocusState.pageNumber <= pageCount
      ) {
        const pageRef = pageRefs.current[pdfFocusState.pageNumber - 1];
        if (!pageRef) {
          console.warn('Page ref not found');
          return;
        }

        const container = containerRef.current;
        if (!container) {
          console.warn('Container ref not found');
          return;
        }

        // Initial scroll to make sure the page is in view, but don't center it yet
        const pageTop = pageRef.offsetTop;
        container.scrollTo({
          top: pageTop,
          behavior: 'instant' // Use instant to avoid conflicting with highlight scroll
        });
        
        // Give PDF.js time to render the text layer
        const attemptHighlight = (attempts = 0) => {
          if (attempts > 10) {
            console.warn('Max highlight attempts reached');
            return;
          }
          
          const textLayer = pageRef.querySelector('.react-pdf__Page__textContent');
          console.log('Text layer found:', {
            hasTextLayer: !!textLayer,
            childrenCount: textLayer?.children.length
          });
          
          if (textLayer && textLayer.children.length > 0) {
            // Remove any existing highlights first
            const existingHighlights = document.querySelectorAll('.highlight-wrapper');
            existingHighlights.forEach(el => el.remove());
            
            // Wait a bit for the text layer to stabilize
            setTimeout(() => {
              console.log('Attempting highlight with:', {
                snippet: citation.snippet,
                pageNumber: pdfFocusState.pageNumber - 1
              });
              
              const success = multiHighlight(
                citation.snippet,
                pdfFocusState.pageNumber - 1,
                citation.color
              );
              
              console.log('Highlight attempt result:', success);
              
              if (success) {
                // Find the highlight element and scroll to center it
                const highlight = document.querySelector('.highlight-wrapper');
                if (highlight) {
                  const highlightRect = highlight.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();
                  const pageRect = pageRef.getBoundingClientRect();
                  
                  // Calculate the absolute position of the highlight within the page
                  const highlightOffsetTop = highlightRect.top - pageRect.top;
                  
                  // Calculate the ideal scroll position to place highlight in top quarter
                  // Use 0.25 to position at ~25% from the top of the viewport
                  const idealScrollTop = pageTop + highlightOffsetTop - (containerRect.height * 0.25);
                  
                  // Smooth scroll to the adjusted position
                  container.scrollTo({
                    top: idealScrollTop,
                    behavior: 'smooth'
                  });
                }
              } else if (attempts < 10) {
                setTimeout(() => attemptHighlight(attempts + 1), 100);
              }
            }, 100);
          } else {
            setTimeout(() => attemptHighlight(attempts + 1), 100);
          }
        };

        attemptHighlight();
      } else {
        console.warn('Citation does not match current document', {
          citationDocId: pdfFocusState.documentId,
          fileId: file.id,
          citationPage: pdfFocusState.pageNumber,
          pageCount
        });
      }
    }, [pdfFocusState, file.id, pageCount]);

    useImperativeHandle(ref, () => ({
      scrollToPage: (pageNumber: number) => {
        pageRefs.current[pageNumber]?.scrollIntoView({ behavior: 'smooth' });
      }
    }));

    return (
      <div className="h-full w-full overflow-hidden">
        <Document
          file={memoizedFile}
          onLoadSuccess={({ numPages }) => {
            setPageCount(numPages);
            setNumPages(numPages);
            setIsLoading(false);
          }}
          onLoadError={onError}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 bg-white p-6 rounded-lg shadow-sm">
                <div className="flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          }
          className="h-full"
        >
          <div 
            ref={containerRef}
            className="h-screen overflow-y-scroll scroll-smooth bg-gray-100"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex flex-col items-center gap-8 py-8 px-4">
              {!isLoading && Array.from(new Array(pageCount), (_, index) => (
                <div 
                  ref={el => { pageRefs.current[index] = el; }} 
                  key={`page_${index + 1}_${file.url}`}
                  className="w-full flex justify-center"
                >
                  <div className="relative">
                    <Page
                      pageNumber={index + 1}
                      className="rounded-lg border border-gray-200 shadow-lg bg-white"
                      width={850}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={
                        <div className="bg-white rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                          <div className="text-gray-500">Loading page {index + 1}...</div>
                        </div>
                      }
                      error={
                        <div className="bg-red-50 text-red-600 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                          Error loading page {index + 1}
                        </div>
                      }
                    />
                    <div className="absolute bottom-4 right-4 bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-50">
                      {index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Document>
      </div>
    );
  }
);

VirtualizedPDF.displayName = 'VirtualizedPDF'; 