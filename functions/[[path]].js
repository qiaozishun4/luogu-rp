import handler from '../../worker/worker.js'

export const onRequest = (context) => {
  // 特殊处理根路径请求
  if (context.request.url.endsWith('/') || context.request.url === context.env.SITE_URL) {
    // 重写请求为目标站点的根路径
    const request = new Request(`${context.env.TARGET_URL}/`, context.request);
    return handler({ ...context, request });
  }
  
  // 其他路径保持原有处理
  return handler(context);
}