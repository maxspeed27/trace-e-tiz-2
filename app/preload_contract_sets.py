"""
Script to process PDFs from data/contract_sets and index them into Qdrant.
Run this script manually when you want to process/reprocess the documents.

Usage:
    python -m app.preload_contract_sets
"""

import os
import sys
import logging
import asyncio
from pathlib import Path
from app.document_processing.processor import DocumentProcessor
from app.document_processing.indexer import DocumentIndexer
from app.models.document import DocumentMetadata, HierarchyContext
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize processor and indexer
processor = DocumentProcessor()
indexer = DocumentIndexer()

# Constants
DATA_DIR = Path("data/contract_sets")

async def process_contract_sets():
    """Process all PDFs in data/contract_sets and index them in Qdrant"""
    try:
        if not DATA_DIR.exists():
            logger.error(f"Directory not found: {DATA_DIR}")
            return

        # Process each contract set folder
        for folder in DATA_DIR.iterdir():
            if not folder.is_dir():
                continue

            contract_set_id = folder.name.lower()
            logger.info(f"\nProcessing contract set: {contract_set_id}")

            # Get all PDFs in this folder
            pdfs = list(folder.glob("*.pdf"))
            if not pdfs:
                logger.info(f"No PDFs found in {folder}")
                continue

            # Process each PDF
            for idx, pdf_path in enumerate(pdfs, 1):
                try:
                    logger.info(f"\nProcessing [{idx}/{len(pdfs)}]: {pdf_path.name}")
                    
                    # Create stable document ID
                    doc_id = f"{contract_set_id}_{pdf_path.stem}".lower()
                    
                    # Create metadata
                    metadata = DocumentMetadata(
                        document_id=doc_id,
                        contract_set_id=contract_set_id,
                        name=pdf_path.name,
                        document_type="contract",
                        level=1,
                        hierarchy_context=HierarchyContext(
                            total_docs_in_set=len(pdfs),
                            doc_position=idx,
                            has_children=False
                        )
                    )

                    # Process document with late chunking
                    logger.info("Processing document...")
                    section_chunks, detail_chunks = await processor.process_document_late_chunking(
                        str(pdf_path),
                        metadata
                    )
                    chunks = section_chunks + detail_chunks
                    logger.info(f"Generated {len(chunks)} chunks")

                    # Index chunks in Qdrant
                    logger.info("Indexing chunks...")
                    await indexer.index_nodes(chunks)
                    logger.info(f"Successfully processed: {pdf_path.name}")

                except Exception as e:
                    logger.error(f"Error processing {pdf_path.name}: {e}")
                    continue

        logger.info("\nFinished processing all contract sets")

    except Exception as e:
        logger.error(f"Error during processing: {e}")
        raise

def main():
    """Entry point for the script"""
    try:
        logger.info("Starting document processing...")
        asyncio.run(process_contract_sets())
        logger.info("Processing completed successfully")
    except KeyboardInterrupt:
        logger.info("\nProcessing cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 