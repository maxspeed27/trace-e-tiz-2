# PDF Viewer Implementation Research

## Current Versions
- pdfjs-dist: 3.11.174
- react-pdf: 7.7.3
- next: 14.1.0
- react: 18.0.0

## Perplexity Research Findings
[Insert answers to the 7 questions here]

1. **"What is the latest stable version of PDF.js that supports the default layout plugin and is compatible with react-pdf 7.7.3? I'm currently using pdfjs-dist 3.11.174."**
- You should use pdfjs-dist version 4.2.67 and react-pdf version 7.7.3
- Based on the recent security advisories and version compatibility information, here's what you need to know:

## Security and Version Compatibility

The version you're currently using (pdfjs-dist 3.11.174) has a critical security vulnerability that allows arbitrary code execution through malicious PDFs[7][9]. 

## Recommended Versions

For a secure setup with react-pdf 7.7.3, you should use:
- react-pdf: version 7.7.3 (security patched version)[8]
- pdfjs-dist: version 4.2.67 or higher (fully patched version)[7]

## Important Security Notes

- All versions of pdfjs-dist below 4.2.67 are vulnerable to arbitrary code injection[9]
- The vulnerability is only exploitable when `isEvalSupported` is set to `true` (which was the default)[8]
- React-PDF version 7.7.3 automatically sets `isEvalSupported` to `false` as a security measure[8]

## Configuration Requirements

For proper setup with the default layout plugin, you'll need:
```javascript
import { Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Initialize the default layout plugin
const defaultLayoutPluginInstance = defaultLayoutPlugin();

// Configure the worker
<Worker workerUrl="https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js">
  <Viewer plugins={[defaultLayoutPluginInstance]} />
</Worker>
```


2. **"How do I properly implement PDF.js default layout plugin with react-pdf 7.7.3 while maintaining custom text layer for citations?"**
- Based on the current compatibility and security requirements, here's how to implement the PDF.js default layout plugin with react-pdf 7.7.3:

## Basic Setup

First, install the required dependencies:
```bash
npm install react-pdf@7.7.3 @react-pdf-viewer/core @react-pdf-viewer/default-layout
```

## Implementation

```jsx
import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import { Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import required styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

const PDFViewer = () => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => defaultTabs,
  });

  const [numPages, setNumPages] = useState(null);

  return (
    <Worker workerUrl={`https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js`}>
      <Document
        file="your-pdf-file.pdf"
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        options={{
          cMapUrl: `https://unpkg.com/pdfjs-dist@4.2.67/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@4.2.67/standard_fonts`
        }}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <Page 
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            renderTextLayer={true}
          />
        ))}
      </Document>
    </Worker>
  );
};
```

## Security Considerations

It's crucial to set `isEvalSupported: false` in your options to prevent potential security vulnerabilities[9]:

```jsx
options={{
  isEvalSupported: false,
  // ... other options
}}
```

## Custom Text Layer Implementation

For custom text layer rendering while maintaining citation functionality:

```jsx
const customTextRenderer = ({ str, itemIndex }) => {
  return (
    <span 
      key={itemIndex}
      className="custom-text-layer"
    >
      {str}
    </span>
  );
};

<Page
  pageNumber={pageNumber}
  customTextRenderer={customTextRenderer}
  renderTextLayer={true}
/>
```

## CSS Requirements

Add these styles to ensure proper text layer alignment[10]:

```css
.custom-text-layer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  line-height: 1.0;
  text-align: initial;
}
```

This implementation provides a secure, performant PDF viewer with proper text layer support for citations while maintaining compatibility with react-pdf 7.7.3[1][3].

3. **"What are the best practices for caching PDF documents in Next.js 14.1.0 with the App Router, specifically for large contract sets?"**
- Based on the current Next.js 14.1 architecture and caching considerations, here's how to effectively cache PDF documents:

## Server-Side Implementation

**Worker Configuration**
- Use a local worker file instead of CDN for better reliability and performance[1][17]
```javascript
// next.config.js
const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")

const nextConfig = {
  webpack: (config) => {
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: require.resolve("pdfjs-dist/build/pdf.worker.min.js"),
            to: path.join(__dirname, "public/static/js"),
          },
        ],
      }),
    )
    return config
  }
}
```

## Caching Strategy

**Data Cache Implementation**
- Implement route caching for PDF metadata and small documents[8]
- Use revalidation periods based on document update frequency[19]
```javascript
async function fetchPDFMetadata(contractId) {
  return await fetch(`/api/contracts/${contractId}/metadata`, {
    cache: 'force-cache',
    next: { revalidate: 3600 } // Revalidate hourly
  });
}
```

**Large Document Sets**
- Implement progressive loading for large contract sets[6]
- Cache individual PDF chunks using the Router Cache for faster subsequent access[8]
- Use partial prerendering for immediate display of metadata while loading full content[6]

## Client-Side Optimization

**Router Cache Configuration**
- Enable caching for PDF preview components[19]
- Implement stale-while-revalidate strategy for frequently accessed documents[19]
```javascript
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-cache';
export const revalidate = 3600; // 1 hour
```

## Security Considerations

- Set `isEvalSupported: false` in PDF.js configuration to prevent code injection[1]
- Implement proper access control before serving cached PDFs[3]
- Use server-side validation for all PDF operations[4]

This implementation provides optimal performance while maintaining security and reliability for large contract sets in Next.js 14.1.0.


4. **"How to implement efficient PDF preloading in react-pdf 7.7.3 without impacting memory usage?"**
- Based on the latest performance optimization techniques and memory management strategies, here's how to implement efficient PDF preloading in react-pdf 7.7.3:

## Core Implementation

**Worker Configuration**
```javascript
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFViewer = () => {
  const [visiblePages, setVisiblePages] = useState(new Set([1]));
  const [numPages, setNumPages] = useState(null);

  const handleVisibilityChange = useCallback((entries) => {
    entries.forEach(entry => {
      const pageNumber = parseInt(entry.target.dataset.pageNumber);
      if (entry.isIntersecting) {
        setVisiblePages(prev => new Set([...prev, pageNumber]));
      }
    });
  }, []);
```

## Optimization Strategies

**Viewport Management**
- Implement intersection observer to track visible pages[3]
- Render only pages within the viewport plus one page buffer
- Unmount pages that are no longer visible to free up memory[3]

**Memory Management**
- Cache rendered pages in a limited-size LRU cache[1]
- Clear cached pages when memory pressure is detected[2]
- Implement cleanup on component unmount to prevent memory leaks[2]

## Performance Enhancements

**Document Loading**
```javascript
const onDocumentLoadSuccess = ({ numPages }) => {
  setNumPages(numPages);
  setVisiblePages(new Set([1])); // Load first page initially
};

return (
  <Document
    file={pdfUrl}
    onLoadSuccess={onDocumentLoadSuccess}
    options={{
      cMapUrl: `https://unpkg.com/pdfjs-dist@4.2.67/cmaps/`,
      cMapPacked: true,
      isEvalSupported: false
    }}
  >
    {Array.from(new Array(numPages), (_, index) => (
      visiblePages.has(index + 1) && (
        <Page
          key={`page_${index + 1}`}
          pageNumber={index + 1}
          loading={<PageLoader />}
          error={<PageError />}
        />
      )
    ))}
  </Document>
);
```

## Security Considerations

- Set `isEvalSupported: false` to prevent potential security vulnerabilities[1]
- Implement proper error handling for failed page loads[3]
- Use content range headers for efficient partial loading of large PDFs[8]

This implementation provides optimal performance while maintaining memory efficiency for large PDF documents in react-pdf 7.7.3.


5. **"What are the current best practices for optimizing input performance in React 18.0.0, specifically for controlled inputs with heavy rendering?"**
- Based on the latest React 18 performance optimization techniques, here's how to optimize input performance:

## State Management Strategies

**Component-Level State**
- Keep input state at the lowest possible level in the component tree[9]
- Move input state into individual components rather than managing it in a parent component[19]
- Use uncontrolled inputs for forms that don't require immediate validation or synchronization[21]

## Performance Optimization Techniques

**Concurrent Features**
- Utilize `useTransition` for non-urgent state updates that might trigger expensive re-renders[2]
- Implement `useDeferredValue` for input values that trigger expensive computations[19]

**Code Implementation**
```javascript
function OptimizedForm() {
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState('');
  
  const handleChange = (e) => {
    // Immediate update for input value
    setInputValue(e.target.value);
    
    // Defer expensive updates
    startTransition(() => {
      // Heavy computations or updates
      processExpensiveOperation(e.target.value);
    });
  };

  return (
    <input
      value={inputValue}
      onChange={handleChange}
    />
  );
}
```

## Rendering Optimization

**Component Structure**
- Split form into smaller, focused components[9]
- Implement form fields as separate components to prevent unnecessary re-renders[27]
- Use uncontrolled components for forms with many fields (>50) that don't require immediate validation[1]

**State Updates**
- Leverage automatic batching in React 18 for multiple state updates[3]
- Use local state for individual inputs instead of global form state when possible[9]

## Advanced Techniques

**Performance Monitoring**
- Monitor long tasks using the React Profiler[7]
- Implement proper error boundaries for input validation[21]
- Use Chrome DevTools Performance tab to identify bottlenecks[9]

This implementation provides optimal performance while maintaining good user experience and responsiveness in React 18.0.0 applications with heavy rendering requirements.


6. **"What's the recommended file structure and loading strategy for pre-uploaded contract sets in Next.js 14.1.0, considering both development and production environments?"**
- Based on the latest Next.js 14.1 architecture and performance considerations, here's how to structure and load pre-uploaded contract sets:

## Project Structure

**Core Organization**
- Place contract-related files under `src/app/(contracts)` to isolate contract routing[7]
- Use private folders with underscore prefix (`_components`, `_lib`) for implementation details[7]
- Keep shared utilities in `src/lib` outside the app directory[1]

## File Organization

**Contract Sets Structure**
```
src/
├── app/
│   ├── (contracts)/
│   │   ├── _components/
│   │   │   ├── ContractViewer.tsx
│   │   │   └── ContractList.tsx
│   │   ├── _lib/
│   │   │   └── contract-utils.ts
│   │   └── page.tsx
│   └── layout.tsx
└── lib/
    └── contracts/
        ├── cache.ts
        └── types.ts
```

## Loading Strategy

**Development Environment**
- Implement custom cache handlers for consistency across development instances[26]
- Use local file system caching during development to reduce build times[17]
```javascript
// next.config.js
module.exports = {
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 0 // disable default in-memory caching
}
```

**Production Environment**
- Enable granular data caching for the App Router[26]
- Implement stale-while-revalidate strategy for frequently accessed contracts[9]
- Use partial prerendering for immediate display of contract metadata[9]

## Performance Optimizations

**Contract Loading**
- Implement progressive loading for large contract sets[22]
- Use intersection observers for lazy loading off-screen content[22]
- Cache individual contract chunks using the Router Cache[25]

**Data Transfer**
- Compress contract data using Brotli or Gzip[22]
- Implement cursor-based pagination for large datasets[22]
- Use optimistic UI updates to improve perceived performance[22]

This implementation provides optimal performance while maintaining reliability for both development and production environments in Next.js 14.1.0.


7. **"What is the correct webpack configuration for PDF.js worker in Next.js 14.1.0 with pdfjs-dist 3.11.174?"**
- Based on the latest Next.js 14.1.0 requirements and security considerations, here's the correct webpack configuration for PDF.js worker:

## Base Configuration

**Next.js Config Setup**
```javascript
const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: require.resolve("pdfjs-dist/build/pdf.worker.min.js"),
            to: path.join(__dirname, "public/static/js"),
          },
        ],
      }),
    )
    return config
  }
}

module.exports = nextConfig
```

## Required Dependencies

First, install the necessary packages:
```bash
npm install --save-dev copy-webpack-plugin @ungap/with-resolvers
```

## Worker Implementation

**Client Component Setup**
```javascript
import "@ungap/with-resolvers";
import { pdfjs } from 'react-pdf';

// Set worker path to match copied worker file
pdfjs.GlobalWorkerOptions.workerSrc = `/static/js/pdf.worker.min.js`;
```

## Version Matching

**Worker Configuration**
```javascript
const options = {
  isEvalSupported: false,
  cMapUrl: `https://unpkg.com/pdfjs-dist@3.11.174/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/'
};
```

This configuration ensures proper worker initialization while maintaining security and performance in Next.js 14.1.0[1][2][3].
