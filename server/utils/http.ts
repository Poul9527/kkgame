export function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body)
    }
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body))
      } catch {
        return resolve({})
      }
    }
    let data = ''
    req.on('data', (chunk: any) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch {
        resolve({})
      }
    })
  })
}

export function getCookie(req: any, name: string): string | null {
  const cookieHeader = req.headers?.cookie || req.headers?.Cookie || ''
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';')
  for (const c of cookies) {
    const [k, v] = c.trim().split('=')
    if (k === name) return decodeURIComponent(v || '')
  }
  return null
}

export function setAuthCookie(token: string, maxAge = 2592000): string {
  return `token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
}

export function clearAuthCookie(): string {
  return `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function jsonResponse(res: any, status: number, data: any, customHeaders: Record<string, string | string[]> = {}) {
  res.setHeader('Content-Type', 'application/json')
  for (const [k, v] of Object.entries(customHeaders)) {
    res.setHeader(k, v)
  }
  res.statusCode = status
  res.end(JSON.stringify(data))
}
