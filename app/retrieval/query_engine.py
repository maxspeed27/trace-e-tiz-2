from typing import List, Tuple, NamedTuple
from qdrant_client import QdrantClient
from qdrant_client.http import models
from openai import AsyncOpenAI, OpenAIError
import cohere
import voyageai
from typing import Optional
import os
from fastapi import HTTPException
import logging
from collections import Counter
import math
import re

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class Citation(NamedTuple):
    document_id: str
    text_snippet: str
    page_number: Optional[int] = None
    section_reference: Optional[str] = None
    document_name: Optional[str] = None

class QueryEngine:
    def __init__(self, qdrant_client: Optional[QdrantClient] = None):
        self.qdrant_client = qdrant_client or QdrantClient(
            url=os.getenv("QDRANT_CLOUD_URL"),
            api_key=os.getenv("QDRANT_API_KEY"),
            timeout=60  # Increased timeout for cloud operations
        )
        self.cohere_client = cohere.Client(os.getenv("COHERE_API_KEY"))
        self.voyage_client = voyageai.Client(os.getenv("VOYAGE_API_KEY"))
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.collection_name = "documents"
        
    async def query(
        self,
        query: str,
        document_ids: List[str] = [],
        top_k: int = 5
    ) -> dict:
        logger.debug(f"Querying with document_ids: {document_ids}")
        
        if not document_ids:
            return {
                "answer": "No documents selected for search.",
                "citations": [],
                "confidence": 0.0
            }

        try:
            # First try to get metadata for basic document info queries
            if any(keyword in query.lower() for keyword in ['type', 'level', 'document type', 'hierarchy']):
                # Get document metadata directly
                docs_info = self.qdrant_client.scroll(
                    collection_name=self.collection_name,
                    scroll_filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="document_id",
                                match=models.MatchAny(any=document_ids)
                            )
                        ]
                    ),
                    limit=100,
                    with_payload=True
                )[0]  # First element is the points list

                if docs_info:
                    # Group by document ID to avoid duplicates
                    doc_metadata = {}
                    for doc in docs_info:
                        doc_id = doc.payload.get('document_id')
                        if doc_id not in doc_metadata:
                            doc_metadata[doc_id] = {
                                'name': doc.payload.get('name', 'Unknown'),
                                'type': doc.payload.get('document_type', 'Unknown'),
                                'level': doc.payload.get('level', 'Unknown'),
                                'parent_id': doc.payload.get('parent_document_id', 'None')
                            }

                    # Format the response
                    metadata_response = "Here are the document details:\n\n"
                    for doc_id, meta in doc_metadata.items():
                        metadata_response += f"""Document: {meta['name']}
Type: {meta['type']}
Level: {meta['level']}
Parent Document: {meta['parent_id']}\n\n"""

                    return {
                        "answer": metadata_response.strip(),
                        "citations": [],  # Metadata queries don't need citations
                        "confidence": 1.0
                    }

            # Continue with regular semantic search for other queries...
            # 1. Get embeddings using Voyage instead of Cohere
            query_embedding = self.voyage_client.embed(
                texts=[query],
                model="voyage-law-2",
                input_type="query",
                truncation=True
            ).embeddings[0]

            # 3. Do the vector search
            search_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchAny(any=document_ids)
                    )
                ]
            )

            search_result = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter=search_filter,
                limit=100,
                with_payload=True,
                score_threshold=0.0  # No threshold filtering
            )

            logger.debug(f"""
            Search Results:
            - Total results: {len(search_result)}
            - Documents found: {set(hit.payload.get('document_id') for hit in search_result)}
            - Score range: {min(hit.score for hit in search_result) if search_result else 'N/A'} to {max(hit.score for hit in search_result) if search_result else 'N/A'}
            - Results per document: {dict(Counter(hit.payload.get('document_id') for hit in search_result))}
            """)

            if not search_result:
                return {
                    "answer": "No relevant information found in the selected documents.",
                    "citations": [],
                    "confidence": 0.0
                }

            # 4. Extract contexts and rerank
            contexts = [hit.payload.get("text", "") for hit in search_result]
            
            # Add debug logging for contexts
            logger.debug(f"Contexts found: {len(contexts)}")
            logger.debug(f"First context sample: {contexts[0][:200] if contexts else 'No contexts'}")

            # 2. Rerank with Cohere - get top 30 for filtering
            reranked = self.cohere_client.rerank(
                query=query,
                documents=contexts,
                model="rerank-v3.5",
                top_n=30
            )

            # After reranking
            logger.debug(f"Reranking results:")
            logger.debug(f"Total reranked: {len(reranked.results)}")
            logger.debug(f"Top 5 relevance scores: {[r.relevance_score for r in reranked.results[:5]]}")
            logger.debug(f"Document distribution before filtering: {[search_result[r.index].payload.get('document_id') for r in reranked.results[:5]]}")

            # 3. Apply stricter filtering
            relevant_results = []
            doc_citation_counts = {}  # Track citations per document

            # First pass: Get at least one result from each document
            for result in reranked.results:
                doc_id = search_result[result.index].payload.get("document_id", "")
                
                if (result.relevance_score > 0.01 and
                    doc_id in document_ids and
                    doc_id not in doc_citation_counts):  # Only get first citation from each doc
                    
                    relevant_results.append(result)
                    doc_citation_counts[doc_id] = 1
                    
                    # Break if we have at least one result from each doc
                    if len(doc_citation_counts) == len(document_ids):
                        break

            # Second pass: Fill remaining slots with best results
            for result in reranked.results:
                doc_id = search_result[result.index].payload.get("document_id", "")
                
                if (result.relevance_score > 0.01 and
                    doc_id in document_ids and
                    doc_citation_counts.get(doc_id, 0) < 2 and  # Max 2 citations per doc
                    len(relevant_results) < 15):  # Total limit of 15 results
                    
                    if result not in relevant_results:  # Avoid duplicates
                        relevant_results.append(result)
                        doc_citation_counts[doc_id] = doc_citation_counts.get(doc_id, 0) + 1

            # Log the distribution
            logger.debug(f"""
            Final distribution:
            - Documents with citations: {len(doc_citation_counts)} of {len(document_ids)}
            - Citations per document: {doc_citation_counts}
            - Total relevant results: {len(relevant_results)}
            """)

            # No need to limit citations further since we've already controlled the distribution
            top_results = relevant_results

            if not top_results:
                logger.debug("No relevant results found")
                return {
                    "answer": "I couldn't find any highly relevant citations in the selected documents to support an answer. Could you please rephrase your question or specify which aspects you'd like me to focus on?",
                    "citations": [],
                    "confidence": 0.0
                }

            # Add hierarchy info to the prompt
            hierarchy_info = []
            context_chunks = []
            chunk_map = {}  # Map to store the full chunk info for later citation creation
            
            for i, result in enumerate(top_results, 1):
                hit = search_result[result.index]
                text = hit.payload.get("text", "").strip()
                doc_name = hit.payload.get("name", "Unnamed")
                # Clearly label each chunk with its document source
                context_chunks.append(f"""Document: {doc_name}
Source {i}:
{text}
---""")  # Add separator between chunks
                # Store the full chunk info for later citation creation
                chunk_map[str(i)] = {
                    "document_id": hit.payload.get("document_id", ""),
                    "text": text,
                    "page_number": int(hit.payload.get("page_number", 1)),
                    "section_reference": hit.payload.get("section_reference", None),
                    "document_name": hit.payload.get("name", None)
                }
                
                hierarchy_info.append(f"""
Document: {hit.payload.get('name', 'Unnamed')}
Type: {hit.payload.get('document_type', 'Unknown')}
Level: {hit.payload.get('level', 'Unknown')}
Position: {hit.payload.get('doc_position', 'Unknown')} of {hit.payload.get('total_docs_in_set', 'Unknown')}
Parent Document: {hit.payload.get('parent_document_id', 'None')}
""")

            # Construct the dynamic parts separately
            available_documents = '\n'.join(f"- {hit.payload.get('name', 'Unnamed')}" for hit in search_result[:1] if hit.payload.get('document_id') in document_ids)
            document_hierarchy = '\n'.join(set(hierarchy_info))
            context_from_documents = '\n'.join(context_chunks)

            # First, the core citation control
            citation_instructions = (
                "CITATION RULES (CRITICAL - DO NOT MODIFY):\n"
                "1. PROVIDE EXACTLY 4-10 CITATIONS\n"
                "2. USE ONLY THIS FORMAT: In [Document Name], [[exact quote]]\n"
                "3. NEVER modify text inside [[]] brackets\n"
                "4. Citations must be evenly distributed in your response\n\n"
            )

            # Then, the analysis instructions
            analysis_instructions = (
                "ANALYSIS REQUIREMENTS:\n"
                "1. Analyze ALL documents equally\n"
                "2. Compare multiple documents when topics overlap\n"
                "3. State explicitly when only one document has information\n"
                "4. Keep quotes concise but complete\n\n"
            )

            # Combine into main prompt
            prompt = (
                f"Answer the following question using information from {len(document_ids)} selected documents: {query}\n\n"
                f"Available Documents:\n{available_documents}\n\n"
                f"Document Hierarchy Information:\n{document_hierarchy}\n\n"
                f"Context from Documents:\n{context_from_documents}\n\n"
                f"{citation_instructions}"
                f"{analysis_instructions}"
                "RESPONSE STRUCTURE:\n"
                "1. Start with a brief summary\n"
                "2. Provide detailed analysis with citations\n"
                "3. Compare documents where relevant\n"
                "4. End with any limitations or gaps\n"
            )

            # System message reinforces critical requirements
            messages=[
                {"role": "system", "content": """You are a specialized document analysis assistant.
CRITICAL REQUIREMENTS:
1. MUST provide 4-10 citations using format: In [Document Name], [[exact quote]]
2. NEVER modify text inside [[]] brackets
3. Analyze all documents equally
4. Compare overlapping content
5. State when information is from single source

Format Enforcement:
- RIGHT: In [Document A], [[exact text here]]
- WRONG: In [Document A], [[modified text]] (Page 1)
- WRONG: In [Document A], any paraphrasing

Every response MUST have at least 4 and no more than 10 citations."""},
                {"role": "user", "content": prompt}
            ]

            # Adjust temperature to encourage more comprehensive responses
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.1,  # Slightly increased from 0.0 to encourage more comprehensive responses
                max_tokens=1500  # Increased to allow for longer, more detailed responses
            )
            
            answer = response.choices[0].message.content
            logger.debug("Successfully generated answer")

            # Extract citations used in the response and create them from the quoted text
            used_citations = []
            quote_pattern = r'\[\[(.*?)\]\]'
            matches = re.finditer(quote_pattern, answer)
            seen_texts = set()
            
            logger.debug(f"LLM Response: {answer}")
            
            def normalize_text(text: str) -> str:
                # Remove extra whitespace between words and normalize quotes/spaces
                return ' '.join(text.split())
            
            for match in matches:
                quote = normalize_text(match.group(1).strip())
                logger.debug(f"Found normalized quote: {quote}")
                if quote in seen_texts:
                    logger.debug(f"Skipping duplicate quote: {quote}")
                    continue
                    
                # Find which source contains this quote
                for source_id, chunk_info in chunk_map.items():
                    logger.debug(f"Checking source {source_id} for quote")
                    source_text = normalize_text(chunk_info["text"])
                    if quote in source_text:
                        logger.debug(f"Found matching source {source_id} for quote: {quote}")
                        seen_texts.add(quote)
                        
                        # Simplified: Just use the normalized quote directly
                        used_citations.append({
                            "document_id": chunk_info["document_id"],
                            "page_number": chunk_info["page_number"],
                            "section_reference": chunk_info["section_reference"],
                            "text_snippet": quote,  # Use the normalized quote directly
                            "document_name": chunk_info["document_name"]
                        })
                        break
                    else:
                        logger.debug(f"Quote not found in normalized source {source_id}")

            logger.debug(f"Final citations: {used_citations}")

            # Return with ONLY the citations that were actually used in the response
            return {
                "answer": answer,
                "citations": used_citations,
                "confidence": 1.0 if used_citations else 0.5
            }

        except Exception as e:
            error_str = str(e)
            if "cohere" in error_str.lower():
                logger.error(f"Cohere API error: {error_str}")
                raise HTTPException(status_code=500, detail=f"Cohere API error: {error_str}")
            elif isinstance(e, OpenAIError):
                logger.error(f"OpenAI API error: {error_str}")
                raise HTTPException(status_code=500, detail=f"OpenAI API error: {error_str}")
            else:
                logger.error(f"Unexpected error: {error_str}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Query engine error: {error_str}") 

            # Add debug logging
            logger.debug(f"Search results by document: {[hit.payload.get('document_id') for hit in search_result]}")

            # Add more logging to help debug
            logger.debug(f"Reranked results: {len(reranked.results)}")
            logger.debug(f"Relevant results after filtering: {len(relevant_results)}")
            logger.debug(f"Final citations: {len(top_results)}")
            logger.debug(f"Document distribution: {doc_citation_counts}") 

    def verify_embeddings(self, text: str) -> bool:
        """Verify embedding generation works correctly"""
        try:
            embedding = self.cohere_client.embed(
                texts=[text],
                model="embed-multilingual-v3.0",
                input_type="search_query",
                truncate="END"
            ).embeddings[0]
            
            # Check embedding dimensions
            expected_dim = 1024  # Cohere v3 dimension
            if len(embedding) != expected_dim:
                logger.error(f"Wrong embedding dimension: got {len(embedding)}, expected {expected_dim}")
                return False
            
            # Check for NaN values
            if any(math.isnan(x) for x in embedding):
                logger.error("Embedding contains NaN values")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Error verifying embeddings: {e}")
            return False 