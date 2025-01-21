import { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import ChatPanel from './ChatPanel';
import DocumentSelector from './DocumentSelector';
import { PdfFocusProvider } from '../contexts/PdfFocusContext';
import { PdfDocument } from '../types/pdf';
import { Resizable } from 're-resizable';
import { canPreloadDocuments } from '../utils/memory';

interface ContractSet {
  id: string;
  name: string;
  documents: PdfDocument[];
}

interface MainLayoutProps {
  contractSets: ContractSet[];
}

export default function MainLayout({ contractSets: initialSets }: MainLayoutProps) {
  const [contractSets, setContractSets] = useState(initialSets);
  const [selectedContractSet, setSelectedContractSet] = useState<string>('');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<PdfDocument | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState<string>('40%');
  const [preloadedDocs, setPreloadedDocs] = useState<Map<string, Blob>>(new Map());

  useEffect(() => {
    const currentSet = contractSets.find(set => set.id === selectedContractSet);
    if (!currentSet) return;
    
    const preloadDocuments = async () => {
      if (!canPreloadDocuments(currentSet.documents.length)) return;
      
      for (const doc of currentSet.documents) {
        if (preloadedDocs.has(doc.id)) continue;
        
        try {
          const response = await fetch(doc.url);
          if (!response.ok) continue;
          
          const blob = await response.blob();
          setPreloadedDocs(prev => new Map(prev).set(doc.id, blob));
        } catch (error) {
          console.warn('Failed to preload document:', doc.id, error);
        }
      }
    };
    
    preloadDocuments();
  }, [selectedContractSet, contractSets, preloadedDocs]);

  const getDocumentUrl = (docId: string): string => {
    const blob = preloadedDocs.get(docId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    const currentSet = contractSets.find(set => set.id === selectedContractSet);
    const doc = currentSet?.documents.find(d => d.id === docId);
    return doc?.url || '';
  };

  const handleDocumentChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < selectedDocuments.length) {
      const newDocId = selectedDocuments[newIndex];
      const newDoc = contractSets
        .find(set => set.id === selectedContractSet)
        ?.documents.find(doc => doc.id === newDocId);
      
      if (newDoc) {
        const sanitizedDoc = {
          ...newDoc,
          content: newDoc.content ? sanitizeDocumentContent(newDoc.content) : '',
          url: getDocumentUrl(newDocId)
        };
        setCurrentDocumentIndex(newIndex);
        setActiveDocument(sanitizedDoc);
      }
    }
  };

  const sanitizeDocumentContent = (content: string): string => {
    return content
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleCitationClick = (documentId: string) => {
    const docIndex = selectedDocuments.findIndex(id => id === documentId);
    if (docIndex !== -1) {
      handleDocumentChange(docIndex);
    }
  };

  const getDocumentDisplayName = (documentId: string): string => {
    const parts = documentId.split('/');
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename.replace(/\.[^/.]+$/, ""));
  };

  return (
    <PdfFocusProvider>
      <div className="flex w-screen h-screen overflow-hidden bg-gray-100">
        {/* Left Panel - Chat */}
        <Resizable
          size={{ width: leftPanelWidth, height: '100%' }}
          minWidth="25%"
          maxWidth="75%"
          enable={{ right: true }}
          onResizeStop={(e, direction, ref, d) => {
            const newWidth = ((ref.offsetWidth / window.innerWidth) * 100).toFixed(2) + '%';
            setLeftPanelWidth(newWidth);
          }}
          className="h-full flex flex-col border-r border-gray-200 bg-white shadow-sm"
          handleStyles={{ right: { width: '4px', right: '-2px' } }}
          handleClasses={{ right: 'hover:bg-blue-400 transition-colors duration-150' }}
        >
          <div className="flex-1 overflow-hidden">
            <ChatPanel 
              selectedDocuments={selectedDocuments.map(docId => {
                const doc = contractSets
                  .find(set => set.id === selectedContractSet)
                  ?.documents.find(d => d.id === docId);
                return {
                  id: docId,
                  name: doc?.name || getDocumentDisplayName(docId),
                  url: getDocumentUrl(docId)
                };
              })}
              onCitationClick={handleCitationClick}
              activeDocument={activeDocument ? {
                id: activeDocument.id,
                name: activeDocument.name,
                url: getDocumentUrl(activeDocument.id)
              } : undefined}
            />
          </div>
        </Resizable>

        {/* Right Panel - Document Viewer */}
        <div className="flex-1 h-full flex flex-col bg-white">
          <div className="flex-shrink-0">
            <DocumentSelector
              selectedContractSet={selectedContractSet}
              setSelectedContractSet={setSelectedContractSet}
              selectedDocuments={selectedDocuments}
              setSelectedDocuments={setSelectedDocuments}
              activeDocument={activeDocument}
              setActiveDocument={(doc: PdfDocument | null) => {
                if (doc) {
                  setActiveDocument({
                    ...doc,
                    url: getDocumentUrl(doc.id)
                  });
                } else {
                  setActiveDocument(null);
                }
              }}
              contractSets={contractSets}
              setContractSets={setContractSets}
            />
          </div>
          <div className="flex-1 overflow-hidden bg-gray-50">
            {activeDocument ? (
              <PDFViewer 
                file={activeDocument}
                containerClassName="h-full w-full"
                selectedDocuments={selectedDocuments}
                currentDocumentIndex={currentDocumentIndex}
                onDocumentChange={handleDocumentChange}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8 rounded-lg bg-white shadow-sm border border-gray-200">
                  <p className="text-lg font-medium text-gray-900">No document selected</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Select a document from above to view its contents
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PdfFocusProvider>
  );
} 