# Brainstorm to O1 Prompt Template

## Input Section
```
[Paste your informal brainstorm here. Include your rough thoughts about:]
- What you want to build/modify/fix
- Key functionality or changes needed
- Technical preferences or constraints
- Your experience level with relevant technologies
- What success looks like
- Any important context or background
```

## Output Format

Your brainstorm will be automatically structured into the following O1 prompt format:

### Goal
[One clear, specific sentence stating exactly what needs to be built/modified/fixed]

### Return Format
[Precise specification of what you want returned, including:]
- Code structure and organization
- Required files and their locations
- Setup steps and dependencies
- Implementation details to include
- Expected outputs or behaviors

### Warnings
[Critical considerations and constraints:]
- Technical limitations to consider
- Potential pitfalls to avoid
- Performance requirements
- Security considerations
- Version compatibility issues

### Context Dump
[Relevant background information:]
- Current system state or codebase structure
- Your technical experience level
- Related systems or dependencies
- Previous attempts or existing solutions
- Team preferences or conventions
- Scale and performance needs

---

## Example 1: Feature Addition

### Input Brainstorm:
```
Need to add user authentication to my Flask API. Thinking of using JWT tokens, 
should work with my React frontend. Never done auth before but familiar with 
Python/Flask. Want to make sure it's secure and scalable. Currently have about 
1000 users but expecting growth.
```

### Structured O1 Prompt:
I need a secure JWT-based authentication system implemented in my Flask API that integrates with my React frontend.

The implementation should provide:
- Complete Flask authentication endpoints (login, register, refresh)
- JWT token generation and validation code
- Database schema for user management
- Security middleware for protected routes
- Integration instructions for React frontend

Be careful to:
- Follow OAuth 2.0 best practices
- Implement proper password hashing
- Handle token expiration and refresh
- Include rate limiting
- Validate all user inputs
- Use secure token storage methods

For context: I'm a Flask developer with no prior auth implementation experience. The system needs to handle 1000+ users and scale for growth. Current stack is Flask/Python backend with React frontend, using PostgreSQL for data storage. Security and scalability are top priorities.

## Example 2: Bug Fix

### Input Brainstorm:
```
Got a memory leak in my Node.js app, keeps crashing after running for a few days. 
Using Express and MongoDB, lots of user sessions. Need to figure out what's causing 
it and how to fix it. Monitoring shows memory usage steadily increasing.
```

### Structured O1 Prompt:
I need to identify and fix a memory leak in my Node.js/Express application that's causing crashes after extended runtime.

Provide:
- Diagnostic steps to identify the leak source
- Memory profiling configuration
- Code fixes for common leak patterns
- Monitoring setup for verification
- Testing methodology to confirm the fix

Be careful to:
- Check session handling
- Verify MongoDB connection management
- Examine event listener cleanup
- Review cache implementation
- Consider garbage collection patterns

For context: Production Express/Node.js application with MongoDB, handling multiple concurrent user sessions. Application runs stable initially but crashes after several days due to memory exhaustion. Current monitoring shows steady memory growth without release. Need a solution that maintains application stability under extended runtime.

## Instructions for Use:
1. Paste your brainstorm in the Input Section
2. Include enough context for clear understanding
3. Be specific about technical constraints
4. Mention your experience level
5. Describe what success looks like
6. Use the examples as guides for detail level 