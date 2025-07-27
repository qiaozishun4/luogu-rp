async function handleRequest(request, targetUrl) {
  // 1. 构造代理URL
  const proxyUrl = new URL(request.url);
  proxyUrl.hostname = new URL(targetUrl).hostname;
  proxyUrl.protocol = 'https:';

  // 2. 请求头处理
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(targetUrl).hostname);
  
  // 3. 添加X-Forwarded头用于追踪真实客户端
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP'));
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Forwarded-Host', new URL(request.url).hostname);

  // 4. 代理请求
  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual'
  });

  // 5. 获取响应
  const response = await fetch(proxyRequest);
  
  // 6. 处理重定向 (301/302等)
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('Location');
    if (location) {
      const redirectedUrl = new URL(location);
      const fixedUrl = location.replace(
        redirectedUrl.origin,
        new URL(request.url).origin
      );
      response.headers.set('Location', fixedUrl);
    }
  }
  // 在 handleRequest 函数中添加
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    const body = await response.text();
    const rewrittenBody = body.replace(
      new RegExp(`https?://${new URL(targetUrl).hostname}`, 'g'),
      new URL(request.url).origin
    );
    return new Response(rewrittenBody, response);
  }

  // 在 worker.js 中添加静态资源缓存
if (request.url.match(/\.(js|css|png|jpg|webp|gif)$/)) {
  response.headers.set('Cache-Control', 'public, max-age=31536000');
}

  // 7. 返回响应
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
  

}

// 主处理函数
export default async function (context) {
  const { request, env } = context;
  return handleRequest(request, env.TARGET_URL);
}