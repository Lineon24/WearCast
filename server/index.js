import { config } from 'dotenv'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'

// Vite 관례를 따라 .env.local을 사용하므로(기본 dotenv는 .env만 읽음) 명시적으로 지정
config({ path: '.env.local' })

const PORT = process.env.SERVER_PORT || 8787
const API_KEY = process.env.OPENAI_API_KEY
const MODEL = 'gpt-4o-mini'

// API 키는 서버(Node) 프로세스에만 존재하고, 클라이언트(브라우저) 번들에는 절대 포함되지 않는다.
const client = API_KEY ? new OpenAI({ apiKey: API_KEY }) : null

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.post('/api/chat', async (req, res) => {
    if (!client) {
        return res.status(500).json({
            error: 'OPENAI_API_KEY가 설정되어 있지 않습니다. 서버의 .env.local 파일을 확인해주세요.',
        })
    }

    const { systemPrompt, history, userMessage } = req.body || {}
    if (!systemPrompt || !userMessage) {
        return res.status(400).json({ error: 'systemPrompt와 userMessage는 필수입니다.' })
    }

    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...(Array.isArray(history) ? history : []),
            { role: 'user', content: userMessage },
        ]

        const stream = await client.chat.completions.create({
            model: MODEL,
            max_tokens: 2048,
            messages,
            stream: true,
        })

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) res.write(delta)
        }
        res.end()
    } catch (error) {
        console.error('OpenAI 호출 실패:', error)
        if (!res.headersSent) {
            res.status(502).json({ error: '챗봇 응답을 받아오지 못했습니다.' })
        } else {
            res.end()
        }
    }
})

app.listen(PORT, () => {
    console.log(`[chat proxy] listening on http://localhost:${PORT}`)
})
