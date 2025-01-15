# Simple Brainstorm to O1 Prompt

## Your Brainstorm
```
[Paste your thoughts here. Include:
- What you're trying to do
- Any tech preferences
- Your experience level
- Important context]
```

## O1 Format

### Goal
One clear sentence about what needs to be done.

### Return Format
What exactly you want returned (code, setup steps, etc.)

### Warnings
Key things to watch out for.

### Context
Background info that helps understand the task.

---

## Example

### Input Brainstorm:
```
Need to switch from Cohere to OpenAI embeddings in the doc processing system. 
Using Qdrant for vector storage. Main worry is the dimension change from 1024 
to 1536 for OpenAI. Want to keep the reranking step. Never used OpenAI 
embeddings before but familiar with the API.
```

### O1 Prompt:
I need to replace Cohere embeddings with OpenAI's text-embedding-ada-002 model in my document processing pipeline while maintaining Qdrant integration.

Return:
- Code changes needed in processor.py and query_engine.py
- Updated dimension settings for Qdrant (1536)
- OpenAI embedding API integration code
- How to handle the reranking step
- Migration steps for existing embeddings

Be careful to:
- Handle batch processing efficiently
- Update all dimension references
- Maintain existing chunking logic
- Consider costs and rate limits
- Preserve reranking quality

For context: Current system uses Cohere for embeddings (1024d) and reranking, with Qdrant as vector store. Need to switch to OpenAI embeddings (1536d) while keeping the reranking functionality. Familiar with OpenAI API but haven't used their embeddings before.

## Usage Tips:
1. Keep your brainstorm focused but informal
2. Include technical constraints
3. Mention your experience level
4. Use example as rough guide 