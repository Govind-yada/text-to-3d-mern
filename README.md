# 🚀 Text-to-3D MERN Application

A full-stack MERN application that transforms text prompts (e.g., *"a low-poly wooden chair"*) into interactive, downloadable 3D models using modern generative AI and Three.js / React Three Fiber.

---

## 🌟 Features

- **Text to 3D Generation**: Enter any descriptive text prompt and choose art styles (*Realistic*, *Low-Poly*, *Cartoon*, *Sculpture*, *PBR*).
- **Interactive 3D Viewport**: Built with **React Three Fiber (R3F)** and **Three.js**:
  - **OrbitControls**: Left-click to rotate, right-click to pan, scroll to zoom.
  - **Wireframe Mode**: Inspect underlying mesh topology.
  - **Auto-Rotate**: Showcase turntable presentation.
  - **Grid & Lighting**: Studio lighting with dynamic shadows and ground grid.
  - **Camera Reset**: Instantly restore default camera viewpoint.
- **Model Download**: One-click **Download GLB** button to save the generated 3D asset for Blender, Unity, Unreal Engine, or web projects.
- **Real-Time Progress & States**: Polling mechanism with live percentage feedback (*"Synthesizing latent geometry (25%)"*, *"Generating PBR textures (60%)"*, *"Finalizing GLB (95%)"*).
- **MongoDB History**: Automatically stores generation prompts, timestamps, task IDs, and GLB URLs in MongoDB with instant in-canvas reloading.
- **Resilient Architecture**: Graceful fallback to in-memory caching if MongoDB is temporarily unreachable during local development.
- **Production-Ready**: Configured for seamless deployment on **Vercel** (Frontend) and **Render** (Backend).

---

## 🏗️ Architecture & Tech Stack

```mermaid
flowchart LR
    A[React 18 + Vite Frontend] -->|1. POST /api/models/generate| B[Node.js + Express Backend]
    B -->|2. Task Request via @gradio/client| C[Hugging Face Space: tencent/Hunyuan3D-2]
    C -->|3. Text to 3D Generation| C
    C -->|4. High-Fidelity .GLB Output| B
    B -->|5. Cache & Stream GLB| B
    B -->|6. Save Generation History| D[(MongoDB)]
    B -->|7. Model URL| A
    A -->|8. Render in Three.js Canvas| E[OrbitControls 3D Viewer]
```

- **Frontend**:
  - React 18
  - Three.js (`three`)
  - React Three Fiber (`@react-three/fiber`)
  - Drei (`@react-three/drei`)
  - Vite 6
  - Lucide React (Icons)
  - Pure CSS with modern responsive dark theme
- **Backend**:
  - Node.js (ES Modules)
  - Express.js
  - `@gradio/client` (Direct programmatic client for Hugging Face Spaces)
  - Axios (HTTP streaming & file caching)
  - Mongoose (MongoDB ODM)
  - CORS & Dotenv
- **AI Engine (100% Free — No Credit Card Required)**:
  - **Tencent Hunyuan3D-2.0** (`tencent/Hunyuan3D-2` on Hugging Face Spaces):
    - Advanced two-stage text-to-3D diffusion model generating structured `.glb` meshes with materials.
    - Runs directly via the public Hugging Face Spaces API.
    - Zero cost, no subscription or payment details required.
    - Optional: Add a free `HF_TOKEN` from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) for reduced queue times.
  - Also retains optional support for `Meshy API` (`AI_PROVIDER=meshy`).

---

## 📁 Project Structure

```
text-to-3d-mern/
├── client/                     # Frontend React application
│   ├── public/                 # Static assets & favicons
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Top header with health & AI badge
│   │   │   ├── PromptForm.jsx  # Prompt input, style selector & progress bar
│   │   │   ├── ModelViewer.jsx # Three.js Canvas, OrbitControls & GLB viewer
│   │   │   ├── HistoryList.jsx # Generation history cards
│   │   │   └── InfoModal.jsx   # Interactive setup & configuration guide
│   │   ├── services/
│   │   │   └── api.js          # Backend API & polling service
│   │   ├── App.jsx             # Main layout & application state
│   │   ├── App.css             # Polished UI styles
│   │   ├── index.css           # Base typography & CSS reset
│   │   └── main.jsx            # React root mount
│   ├── .env.example            # Frontend environment variables template
│   ├── package.json
│   ├── vercel.json             # Vercel SPA routing configuration
│   └── vite.config.js
│
├── server/                     # Backend Node.js / Express application
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # Mongoose connection with graceful fallback
│   │   ├── controllers/
│   │   │   └── modelController.js # Generate, status, history, download proxy
│   │   ├── models/
│   │   │   └── Model3D.js      # Mongoose 3D generation schema
│   │   ├── routes/
│   │   │   └── modelRoutes.js  # Express REST API routes
│   │   ├── services/
│   │   │   └── aiService.js    # AI Text-to-3D service (Meshy v2 API)
│   │   └── server.js           # Express app entrypoint & CORS setup
│   ├── .env.example            # Backend environment variables template
│   ├── package.json
│   └── render.yaml             # Render deployment configuration
│
├── package.json                # Root workspace convenience scripts
└── README.md                   # Complete documentation
```

---

## 🔑 Environment Variables

### 1. Server (`server/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Port the Express server listens on | `5000` |
| `MONGODB_URI` | MongoDB connection string (Local or Atlas) | `mongodb://127.0.0.1:27017/text-to-3d` |
| `AI_PROVIDER` | AI service provider | `meshy` |
| `MESHY_API_KEY` | **Required**: API Key from [meshy.ai](https://www.meshy.ai) | `msy_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `CLIENT_ORIGIN` | Allowed CORS frontend URL | `http://localhost:5173` |

### 2. Client (`client/.env`)

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:5000/api` |

---

## ⚡ Quick Start (Local Development)

### Step 1: Clone or Navigate to the Project

```bash
cd text-to-3d-mern
```

### Step 2: Configure Backend Environment Variables

1. Go to [https://www.meshy.ai](https://www.meshy.ai) and sign up for a free account.
2. Navigate to your dashboard, copy your API key.
3. Open `server/.env` (or copy from `server/.env.example`):

```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/text-to-3d
AI_PROVIDER=meshy
MESHY_API_KEY=your_actual_meshy_api_key_here
CLIENT_ORIGIN=http://localhost:5173
```

> **Note on MongoDB**: If you don't have MongoDB installed locally yet, the server will **automatically fall back to in-memory mode** so you can start generating models right away without any crashes! For persistent storage, set `MONGODB_URI` to a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection string.

### Step 3: Install Dependencies

From the project root:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

*(Or simply run `npm run install:all` from the root directory).*

### Step 4: Start Backend and Frontend

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```
Backend will start on `http://localhost:5000`.

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```
Frontend will start on `http://localhost:5173`. Open your browser and visit `http://localhost:5173`.

---

## 🎮 How to Use the Application

1. **Enter a prompt**:
   - Type your prompt in the text area (e.g. *"a low-poly wooden chair with cushions"*), or click one of the quick suggestion chips.
2. **Choose Art Style**:
   - Select *Realistic*, *Low-Poly*, *Cartoon*, *Sculpture*, or *PBR*.
3. **Click "Generate 3D Model"**:
   - The backend creates a task via the AI API.
   - The UI shows live progress updates and status descriptions.
4. **Inspect in 3D**:
   - When generation finishes, the GLB model automatically loads in the interactive 3D viewport.
   - **Rotate**: Left-click and drag.
   - **Pan**: Right-click and drag.
   - **Zoom**: Mouse scroll wheel.
   - **Wireframe Mode**: Click **Wireframe** on the top toolbar to inspect mesh triangles.
   - **Reset**: Click **Reset** to return to the original camera angle.
5. **Download Model**:
   - Click the green **Download GLB** button in the viewport toolbar to download the generated `.glb` asset.
6. **History**:
   - Previous generations appear in the **Generation History** list on the bottom left. Click any completed model to immediately reload it in the 3D viewport.

---

## 🌐 Production Deployment Guide

### Deploying Frontend to Vercel

1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: Select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-service.onrender.com/api` (your deployed backend URL)
6. Click **Deploy**.

> The included `client/vercel.json` ensures client-side routing works without 404 errors.

---

### Deploying Backend to Render

1. Sign in to [Render](https://render.com) and click **"New +" → "Web Service"**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `text-to-3d-server`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In the **Environment Variables** section, add:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `MESHY_API_KEY`: Your Meshy API Key
   - `MONGODB_URI`: Your [MongoDB Atlas](https://www.mongodb.com/atlas) connection string (e.g. `mongodb+srv://user:pass@cluster0.mongodb.net/text-to-3d?retryWrites=true&w=majority`)
   - `CLIENT_ORIGIN`: Your deployed Vercel URL (e.g. `https://your-frontend.vercel.app`)
5. Click **Create Web Service**.

> The backend includes permissive CORS rules that automatically accept requests from `.vercel.app` domains, ensuring seamless cross-origin communication between Vercel and Render.

---

## 📡 API Reference

### `POST /api/models/generate`
Initiates a new 3D model generation task.

**Request Body:**
```json
{
  "prompt": "a low-poly wooden chair",
  "artStyle": "low-poly",
  "negativePrompt": "blurry, low quality"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "3D model generation initiated.",
  "taskId": "018f3a5e-...",
  "status": "PENDING",
  "progress": 0
}
```

---

### `GET /api/models/status/:taskId`
Polls current task generation status, percentage progress, and asset URLs.

**Response (200 OK):**
```json
{
  "success": true,
  "taskId": "018f3a5e-...",
  "status": "SUCCEEDED",
  "progress": 100,
  "modelUrls": {
    "glb": "https://assets.meshy.ai/.../model.glb"
  }
}
```

---

### `GET /api/models/history`
Returns generation history stored in MongoDB.

**Response (200 OK):**
```json
{
  "success": true,
  "history": [
    {
      "_id": "...",
      "prompt": "a low-poly wooden chair",
      "artStyle": "low-poly",
      "taskId": "018f3a5e-...",
      "status": "SUCCEEDED",
      "modelUrls": { "glb": "https://..." },
      "createdAt": "2026-09-30T10:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/models/download/:taskId`
Streams the generated `.glb` file with `Content-Disposition: attachment` headers for cross-origin downloads.

---

### `GET /api/health`
Health check endpoint reporting API status, database connection, and configured AI provider.

---

## 🛡️ License

MIT License. Feel free to use, modify, and distribute for personal or commercial projects.
