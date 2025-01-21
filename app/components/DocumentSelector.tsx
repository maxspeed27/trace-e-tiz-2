import { useState, useCallback, ChangeEvent } from 'react';
import { PdfDocument } from '../types/pdf';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ContractSet {
  id: string;
  name: string;
  documents: PdfDocument[];
}

interface DocumentSelectorProps {
  selectedContractSet: string;
  setSelectedContractSet: (id: string) => void;
  selectedDocuments: string[];
  setSelectedDocuments: (docs: string[]) => void;
  activeDocument: PdfDocument | null;
  setActiveDocument: (doc: PdfDocument | null) => void;
  contractSets: ContractSet[];
  setContractSets: React.Dispatch<React.SetStateAction<ContractSet[]>>;
}

export default function DocumentSelector({
  selectedContractSet,
  setSelectedContractSet,
  selectedDocuments,
  setSelectedDocuments,
  activeDocument,
  setActiveDocument,
  contractSets,
  setContractSets,
}: DocumentSelectorProps) {
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    setError('');
    console.log('Starting upload of', files.length, 'files');

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
        console.log('Adding file to form:', file.name);
      });

      const setName = `Contract Set ${new Date().toLocaleString()}`;
      formData.append('set_name', setName);
      console.log('Set name:', setName);

      console.log('Sending request to /api/upload');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>')) {
        console.error('Received HTML instead of JSON response');
        throw new Error('Server returned HTML instead of JSON. Check server logs.');
      }

      if (!response.ok) {
        const errorDetail = responseText.includes('{') 
          ? JSON.parse(responseText).detail 
          : responseText;
        throw new Error(`Upload failed: ${errorDetail}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        console.error('Raw response that failed to parse:', responseText);
        throw new Error('Server returned invalid JSON');
      }

      if (!data || typeof data !== 'object') {
        console.error('Invalid response format - expected object, got:', typeof data);
        throw new Error('Server returned invalid data format');
      }

      if (!data.id) {
        console.error('Response data missing id:', data);
        throw new Error('Server response missing contract set ID');
      }
      if (!Array.isArray(data.documents)) {
        console.error('Missing or invalid documents in response:', data);
        throw new Error('Server response missing documents');
      }

      const newContractSet = {
        id: data.id,
        name: data.name || setName,
        documents: data.documents.map((file: any) => ({
          id: file.id,
          name: file.name,
          url: file.url
        }))
      };
      
      console.log('Created new contract set:', newContractSet);
      setContractSets(prev => [...prev, newContractSet]);
      setSelectedContractSet(newContractSet.id);
    } catch (err) {
      console.error('Detailed upload error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to upload files. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  }, [setSelectedContractSet, setContractSets]);

  const handleFolderUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const currentContractSet = contractSets.find(set => set.id === selectedContractSet);

  const handleContractSetChange = (value: string) => {
    setSelectedContractSet(value);
    setSelectedDocuments([]);
    setActiveDocument(null);
  };

  const handleDocumentSelect = (docId: string) => {
    const isSelected = selectedDocuments.includes(docId);
    let newSelected: string[];
    
    if (isSelected) {
      newSelected = selectedDocuments.filter(id => id !== docId);
    } else {
      newSelected = [...selectedDocuments, docId];
    }
    
    setSelectedDocuments(newSelected);

    if (currentContractSet) {
      const doc = currentContractSet.documents.find(d => d.id === docId);
      if (doc && (!activeDocument || newSelected.length === 1 || (isSelected && activeDocument.id === docId))) {
        setActiveDocument(doc);
      }
    }
  };

  return (
    <div className="p-2 w-full border-b bg-white">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-sm font-semibold text-gray-700 mb-1 block">Contract Set</Label>
          <Select onValueChange={handleContractSetChange} value={selectedContractSet}>
            <SelectTrigger className="w-full bg-white border-gray-200 hover:bg-gray-50">
              <SelectValue placeholder="Select a contract set" />
            </SelectTrigger>
            <SelectContent>
              {contractSets.map(set => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentContractSet && (
          <div className="flex-1">
            <Label className="text-sm font-semibold text-gray-700 mb-1 block">Documents</Label>
            <Select
              value={selectedDocuments[0] || ''}
              onValueChange={handleDocumentSelect}
            >
              <SelectTrigger className="w-full bg-white border-gray-200 hover:bg-gray-50">
                <SelectValue placeholder="Select documents">
                  {selectedDocuments.length === 0 
                    ? 'Select documents' 
                    : `${selectedDocuments.length} document${selectedDocuments.length > 1 ? 's' : ''} selected`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {currentContractSet.documents.map(doc => (
                    <div 
                      key={doc.id} 
                      className="p-2 flex items-center gap-2 hover:bg-gray-50"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDocumentSelect(doc.id);
                      }}
                    >
                      <Checkbox
                        checked={selectedDocuments.includes(doc.id)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                      <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                    </div>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-none">
          <Label className="text-sm font-semibold text-gray-700 mb-1 block">Actions</Label>
          <Input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFolderUpload}
            className="hidden"
          />
          <Button 
            asChild 
            variant="default" 
            className="bg-blue-600 hover:bg-blue-700 text-white w-[120px]"
          >
            <label htmlFor="file-upload" className="flex items-center justify-center cursor-pointer h-9">
              {isUploading ? 'Uploading...' : 'Upload'}
            </label>
          </Button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          {error}
        </p>
      )}
    </div>
  );
} 