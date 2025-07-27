const TARGET_HOST = 'luogu.com'; // 目标域名

async function handleRequest(request) {
  // 1. 重构代理URL
  const proxyUrl = new URL(request.url);
  proxyUrl.host = TARGET_HOST;
  proxyUrl.protocol = 'https:';

  // 2. 处理请求头
  const headers = new Headers(request.headers);
  headers.set('Host', TARGET_HOST);
  headers.delete('X-Forwarded-For');

  // 3. 发送代理请求
  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual'
  });

  // 4. 获取响应并修正头信息
  const response = await fetch(proxyRequest);
  
  // 5. 处理重定向 (重要！)
  if ([301, 302, 307, 308].includes(response.status)) {
    const location = response.headers.get('Location') || '';
    const fixedLocation = location.replace(
      `https://${TARGET_HOST}`, 
      `https://${new URL(request.url).host}`
    );
    response.headers.set('Location', fixedLocation);
  }

  // 6. 返回代理响应
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// Pages Functions 兼容
export default async function (context) {
  return handleRequest(context.request);
}