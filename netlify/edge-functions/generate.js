// netlify/edge-functions/generate.js
// 네이버 메이트 글쓰기봇 백엔드 (스트리밍 버전)
//
// 일반 함수(10초 제한) 대신 Edge Function을 써서 시간 제한을 우회합니다.
// Claude API의 응답을 받는 족족 그대로 브라우저로 흘려보냅니다.
//
// [Netlify 환경변수] ANTHROPIC_API_KEY  (이미 등록되어 있음)

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 200 });
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const { system, message } = body;
  if (!message || message.length < 5) {
    return new Response("empty input", { status: 400 });
  }

  // Claude API를 스트리밍 모드로 호출
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      stream: true,
      system,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!upstream.ok) {
    const txt = await upstream.text();
    return new Response("AI error: " + txt, { status: 502 });
  }

  // Claude가 보내는 스트림(SSE)을 그대로 브라우저로 전달
  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
};

// 이 함수가 응답할 주소
export const config = { path: "/api/generate" };
