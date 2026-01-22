# Contentstack Health Check Bot

An AI-powered Virtual Solution Architect Bot for analyzing Contentstack Stack Health Check reports.

![Health Check Bot](https://img.shields.io/badge/AI-Gemini%202.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

##  Features

- **📄 Report Upload**: Support for PDF, DOC, DOCX, and TXT files
- **🤖 AI-Powered Analysis**: Automatic section-by-section summary generation
- **💬 Interactive Q&A**: Ask questions about your health check report
- **🎯 Grounded Responses**: Answers strictly based on uploaded report content
- **📊 Section-by-Section Analysis**: Preserves the original report structure

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ File Upload  │  │   Summary    │  │    Chat Interface        │  │
│  │  Component   │  │   Display    │  │    (Q&A)                 │  │
│  └──────┬───────┘  └──────▲───────┘  └──────────┬───────────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────────┘
          │                 │                     │
          ▼                 │                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js API Routes)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │/api/upload   │  │/api/summarize│  │    /api/chat             │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AI PIPELINE                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │
│  │   Parser    │─▶│   Report    │─▶│     Gemini 2.0 Flash      │  │
│  │(PDF/DOC/TXT)│  │   Store     │  │     (Analysis & Q&A)      │  │
│  └─────────────┘  └─────────────┘  └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
AIBOT_Healthcheck/
├── app/
│   ├── api/
│   │   ├── upload-report/route.ts  # File upload & parsing
│   │   ├── summarize/route.ts      # Summary generation
│   │   └── chat/route.ts           # Q&A endpoint
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Main page
│   └── globals.css                 # Global styles
├── components/
│   ├── FileUpload.tsx              # Drag & drop upload
│   ├── Summary.tsx                 # Summary display
│   ├── ChatInterface.tsx           # Chat UI
│   └── Message.tsx                 # Chat message bubble
├── lib/
│   ├── gemini.ts                   # Gemini API client
│   └── reportStore.ts              # In-memory report store
├── utils/
│   ├── types.ts                    # TypeScript types
│   └── reportParser.ts             # File parsing
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## 🛠️ Prerequisites

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or select a project
3. Generate an API key

##  Getting Started

### 1. Install Dependencies

```bash
cd AIBOT_Healthcheck
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run the Development Server

```bash
npm run dev
```

### 4. Open the Application

Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Usage

1. **Upload Report**: Drag and drop or click to upload a health check report (PDF, DOC, DOCX, or TXT)

2. **View Summary**: The AI automatically generates a section-by-section summary with:
   - Overview
   - Section-by-section analysis (in report order)
   - Key Findings
   - Risk Areas
   - Recommendations

3. **Ask Questions**: Use the chat interface to ask specific questions about your report

##  Prompt Guardrails

The system uses strict guardrails to prevent hallucinations:

```
"You are a Contentstack Solution Architect AI.
You must answer strictly using the provided health check report context.
Do not assume, infer, or use external knowledge.
If the answer is not present, respond:
'This information is not covered in the current health check report.'"
```

##  API Endpoints

### POST /api/upload-report

Upload and process a health check report.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "success": true,
  "sessionId": "uuid",
  "filename": "report.pdf",
  "chunksCreated": 1,
  "message": "Report uploaded successfully"
}
```

### POST /api/summarize

Generate an AI summary of the uploaded report.

**Request**:
```json
{
  "sessionId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "summary": "Section-by-section analysis...",
  "keyFindings": ["Finding 1", "Finding 2"],
  "recommendations": ["Recommendation 1"],
  "riskAreas": ["Risk 1"]
}
```

### POST /api/chat

Ask questions about the report.

**Request**:
```json
{
  "sessionId": "uuid",
  "query": "What content types are configured?",
  "conversationHistory": []
}
```

**Response**:
```json
{
  "success": true,
  "answer": "Based on the report...",
  "citations": [],
  "isGrounded": true
}
```

## Technical Details

### AI Pipeline

1. **Document Parsing**: Extracts text from PDF/DOC/TXT using `pdf-parse` and `mammoth`
2. **Storage**: In-memory report store per session
3. **Analysis**: Gemini 2.0 Flash processes the full report
4. **Response**: Section-by-section summary preserving original structure

### Why Gemini 2.0 Flash?

- **Fast**: Optimized for quick responses
- **Accurate**: High-quality language understanding
- **Large Context**: Can process full reports in a single call
- **Cost-effective**: Affordable API pricing

## ⚙️ Configuration

### Environment Variables

```bash
# Required: Gemini API Key
GEMINI_API_KEY=your_api_key_here
```

### Report Store Settings

Edit `lib/reportStore.ts` to adjust:
- `maxSessions`: Maximum concurrent sessions (default: 10)

##  Troubleshooting

### "GEMINI_API_KEY environment variable is not set"

Create a `.env.local` file with your API key:
```bash
GEMINI_API_KEY=your_key_here
```

### Upload Fails

- Check file size (max 10MB)
- Ensure file type is supported (PDF, DOC, DOCX, TXT)
- Check console for specific error messages

### Slow Responses

- Gemini 2.0 Flash is optimized for speed
- Large reports may take longer to process
- Check your network connection

## License

MIT License - Feel free to use and modify for your needs.

##  Contributing

Contributions welcome! Please read the contributing guidelines first.

---

Built with  for Contentstack Solution Architects
