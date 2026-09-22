import { jsonResponse, clearAuthCookie } from '../../server/utils/http.js'

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true })
  }

  const cookie = clearAuthCookie()
  return jsonResponse(res, 200, { ok: true, message: '已安全退出登录' }, {
    'Set-Cookie': cookie
  })
}
