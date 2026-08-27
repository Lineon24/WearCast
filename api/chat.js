import OpenAI from 'openai'

// Vercel Node 서버리스 함수는 응답을 스트리밍하지 않고 완료된 뒤 한 번에 내려주므로,
// 실시간 타이핑 효과를 위해 Edge Runtime을 사용한다 (표준 Request/Response 기반).
export const config = { runtime: 'edge' }

const MODEL = 'gpt-4o-mini'

const jsonError = (message, status) =>
    new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

export default async function handler(req) {
    if (req.method !== 'POST') {
        return jsonError('POST 요청만 지원합니다.', 405)
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        return jsonError('OPENAI_API_KEY가 설정되어 있지 않습니다. Vercel 프로젝트 환경변수를 확인해주세요.', 500)
    }

    const { systemPrompt, history, userMessage } = await req.json()
    if (!systemPrompt || !userMessage) {
        return jsonError('systemPrompt와 userMessage는 필수입니다.', 400)
    }

    const client = new OpenAI({ apiKey })
    const messages = [
        { role: 'system', content: systemPrompt },
        ...(Array.isArray(history) ? history : []),
        { role: 'user', content: userMessage },
    ]

    let openaiStream
    try {
        openaiStream = await client.chat.completions.create({
            model: MODEL,
            max_tokens: 2048,
            messages,
            stream: true,
        })
    } catch (error) {
        console.error('OpenAI 호출 실패:', error)
        return jsonError('챗봇 응답을 받아오지 못했습니다.', 502)
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of openaiStream) {
                    const delta = chunk.choices[0]?.delta?.content
                    if (delta) controller.enqueue(encoder.encode(delta))
                }
            } catch (error) {
                console.error('OpenAI 스트리밍 중 오류:', error)
            } finally {
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
}
