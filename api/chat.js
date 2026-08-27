// Vercel Node 서버리스 함수는 응답을 스트리밍하지 않고 완료된 뒤 한 번에 내려주므로,
// 실시간 타이핑 효과를 위해 Edge Runtime을 사용한다 (표준 Request/Response 기반).
export const config = { runtime: 'edge' }

const MODEL = 'gpt-4o-mini'

// 🛠️ 트러블슈팅: 원래 openai npm SDK를 그대로 썼는데, Vercel에 배포하니
// "The Edge Function 'api/chat' is referencing unsupported modules: openai: #x509-transport-state"
// 에러가 났다. openai SDK가 내부적으로 Edge Runtime에서 지원 안 하는 Node 전용 모듈(TLS 관련)을
// 참조하고 있었던 것. SDK 대신 OpenAI REST API를 fetch로 직접 호출하고, 응답으로 오는
// SSE(Server-Sent Events) 스트림을 직접 파싱하는 방식으로 바꿔서 해결했다.
// (fetch/ReadableStream/TextDecoder는 전부 Edge Runtime에서 지원하는 표준 웹 API)
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

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

    const messages = [
        { role: 'system', content: systemPrompt },
        ...(Array.isArray(history) ? history : []),
        { role: 'user', content: userMessage },
    ]

    let openaiResponse
    try {
        openaiResponse = await fetch(OPENAI_CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages, stream: true }),
        })
    } catch (error) {
        console.error('OpenAI 호출 실패:', error)
        return jsonError('챗봇 응답을 받아오지 못했습니다.', 502)
    }

    if (!openaiResponse.ok || !openaiResponse.body) {
        const errText = await openaiResponse.text().catch(() => '')
        console.error('OpenAI 응답 오류:', openaiResponse.status, errText)
        return jsonError('챗봇 응답을 받아오지 못했습니다.', 502)
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = openaiResponse.body.getReader()

    // OpenAI가 내려주는 SSE 형식(`data: {...}\n\n`, 끝은 `data: [DONE]`)을 직접 파싱해서
    // delta.content만 뽑아 우리 프런트가 기대하는 순수 텍스트 스트림으로 다시 내보낸다
    const stream = new ReadableStream({
        async start(controller) {
            let buffer = ''
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    buffer += decoder.decode(value, { stream: true })

                    const lines = buffer.split('\n')
                    buffer = lines.pop() ?? '' // 아직 안 끝난 마지막 줄은 버퍼에 남겨둔다

                    for (const line of lines) {
                        const trimmed = line.trim()
                        if (!trimmed.startsWith('data:')) continue
                        const data = trimmed.slice(5).trim()
                        if (!data || data === '[DONE]') continue
                        try {
                            const parsed = JSON.parse(data)
                            const delta = parsed.choices?.[0]?.delta?.content
                            if (delta) controller.enqueue(encoder.encode(delta))
                        } catch {
                            // 청크 경계와 SSE 이벤트 경계가 안 맞아 조각난 JSON은 무시
                        }
                    }
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
