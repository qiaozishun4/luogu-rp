async function handleRequest(request, targetUrl) {
  // 0. 错误回退HTML定义（必须在函数顶部声明）
  const fallbackHTML = `<html><body><h1>代理服务暂时不可用</h1></body></html>`;

  // 1. 构造代理URL
  const proxyUrl = new URL(request.url);
  proxyUrl.hostname = new URL(targetUrl).hostname;
  proxyUrl.protocol = 'https:';

  // 2. 请求头处理（关键修复：必须覆盖Host头）
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(targetUrl).hostname);
  
  // 3. 添加X-Forwarded头
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Forwarded-Host', new URL(request.url).hostname);

  // 4. 代理请求构造
  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual'
  });

  try {
    // 5. 获取响应
    let response = await fetch(proxyRequest);
    
    // 6. 处理重定向
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location) {
        const fixedUrl = location.replace(
          new URL(targetUrl).origin,
          new URL(request.url).origin
        );
        response.headers.set('Location', fixedUrl);
      }
    }
    
    // ▼▼▼ 关键修复1：修正HTML重写顺序 ▼▼▼
    // 7. HTML内容重写
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      let body = await response.text();
      // 先替换内容中的URL
      body = body.replace(
        new RegExp(`https?://${new URL(targetUrl).hostname}`, 'g'),
        new URL(request.url).origin
      );
      // 再添加Canonical标签
      body = body.replace(
        '</head>', 
        `<link rel="canonical" href="${request.url}" /></head>`
      );
      return new Response(body, {
        status: response.status,
        headers: response.headers
      });
    }

    // ▼▼▼ 关键修复2：静态资源缓存处理 ▼▼▼
    // 8. 静态资源缓存
    if (request.url.match(/\.(js|css|png|jpg|jpeg|webp|gif|svg|ico)$/)) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    }

    // ▼▼▼ 关键修复3：确保其他类型响应正确处理 ▼▼▼
    // 9. 返回普通响应
    return new Response(response.body, {
      status: response.status,
      headers: response.headers
    });

  } catch (error) {
    // 10. 错误回退（补充完整实现）
    return new Response(fallbackHTML, {
      status: 502,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  }
}


export const onRequest = (context) => {
  // 特殊处理根路径请求
  if (context.request.url.endsWith('/') || context.request.url === context.env.SITE_URL) {
    // 重写请求为目标站点的根路径
    const request = new Request(`${context.env.TARGET_URL}/`, context.request);
    return handleRequest({ ...context, request });
  }
  
  // 其他路径保持原有处理
  return handleRequest(context);
}