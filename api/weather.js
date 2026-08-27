import { handleWeatherProxy } from './_lib/weatherProxy.js'

// Vercel 서버리스 함수(Node 런타임 기본값). 스트리밍이 필요 없는 단순 프록시라
// 챗봇(api/chat.js)과 달리 Edge Runtime으로 옮길 이유가 없다.
export default handleWeatherProxy
