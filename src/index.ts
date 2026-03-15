import express from 'express'
import cors from 'cors'
import { createAgent, streamAgentResponse } from './agent.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

const app = express()

// Enable CORS
app.use(cors())

// Parse JSON bodies
app.use(express.json())

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')))

// API Routes
app.get('/api/users/:id', (_req, res) => {
    res.json({ id: _req.params.id })
})

app.get('/api/posts/:postId/comments/:commentId', (_req, res) => {
    res.json({ postId: _req.params.postId, commentId: _req.params.commentId })
})

/**
 * Stream endpoint for AI chat interaction
 * POST /stream
 * Body: { "prompt": "your prompt here" }
 * Returns: Plain text streaming response
 */
app.post('/stream', async (req, res) => {
    const { prompt } = req.body

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).send('Error: No prompt provided. Please provide a "prompt" field.')
    }

    if (prompt.length > 500) {
        return res.status(400).send('Error: Prompt must be less than 500 characters')
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')

    try {
        // Create agent instance
        const agent = await createAgent()

        // Stream the agent's response
        for await (const chunk of streamAgentResponse(prompt, agent)) {
            res.write(chunk)
        }

        // End the response
        res.end()
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        res.write(`\n\nError: ${errorMessage}`)
        res.end()
    }
})

export default app