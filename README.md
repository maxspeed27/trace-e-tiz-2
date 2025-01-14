# trace-e-tiz-2
Here is the full remade version starting with step #1:

---

### 1. Prerequisites

Before starting, ensure you have the following installed:

- **Python 3.7+**: To manage backend dependencies.
- **Node.js 16+**: For frontend development.
- **Docker**: To run Qdrant as a container.
- **Git**: To clone the repository.

---

### 2. Clone and Setup Project

```bash
# Clone the project (replace with your repo URL)
git clone <your-repo-url>
cd <project-directory>

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install
```

---

### 3. Setup Environment Variables

Create a `.env` file in the root directory and add the following:

```
OPENAI_API_KEY=your_openai_key
COHERE_API_KEY=your_cohere_key
UPLOAD_DIR=uploads
QDRANT_HOST=localhost
QDRANT_PORT=6333
BACKEND_URL=http://localhost:8000
```

---

### 4. Start Qdrant with Docker

```bash
# Pull and run Qdrant
docker pull qdrant/qdrant
docker run -p 6333:6333 -p 6334:6334 \
-v $(pwd)/qdrant_storage:/qdrant/storage \
qdrant/qdrant
```

---

### 5. Start Backend Server

In a new terminal:

```bash
# Activate virtual environment
source venv/bin/activate

# Start FastAPI server
python -m uvicorn app.main:app --reload --port 8000
```

---

### 6. Start Frontend Development Server

In another terminal:

```bash
# Start Next.js development server
npm run dev
```

---

### 7. Access the Application

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Qdrant Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

---

### 8. Directory Structure Setup

```bash
# Create required directories
mkdir -p uploads
mkdir -p qdrant_storage
```

---

### 9. Troubleshooting Tips

- **CORS Errors**: Ensure the backend CORS settings match your frontend URL.
- **PDF Uploads Fail**: Check the `uploads` directory permissions.
- **Qdrant Connection Fails**: Ensure the container is running using `docker ps`.
- **Backend Fails to Start**: Check the Python version and ensure all dependencies are installed.

---

Let me know if you need further clarification or assistance!