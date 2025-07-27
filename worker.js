addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 1. 目标域名配置
  const TARGET_HOST = 'luogu.com'; 

  // 2. 构造新 URL
  const proxyUrl = new URL(request.url);
  proxyUrl.host = TARGET_HOST;
  proxyUrl.protocol = 'https:';

  // 3. 请求头处理
  const headers = new Headers(request.headers);
  headers.set('Host', TARGET_HOST); // 关键：覆盖 Host 头
  headers.delete('X-Forwarded-For'); // 安全考虑

  // 4. 转发请求
  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual' // 禁用自动重定向
  });

  // 5. 获取响应并处理
  let response = await fetch(proxyRequest);
  
  // 6. 响应头修正
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*'); // 解决 CORS
  responseHeaders.delete('Strict-Transport-Security'); // 移除 HSTS

  // 7. 返回代理响应
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}