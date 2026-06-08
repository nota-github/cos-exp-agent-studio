import { Router, Request, Response } from 'express'
import { resolve, sep } from 'path'
import { homedir } from 'os'
import { readdirSync, statSync, existsSync } from 'fs'

const filesystemRouter = Router()

filesystemRouter.get('/', (req: Request, res: Response) => {
  const homeDir = homedir()
  const homeDirPrefix = homeDir.endsWith(sep) ? homeDir : homeDir + sep

  const rawPath = typeof req.query.path === 'string' ? req.query.path : homeDir
  const resolvedPath = resolve(rawPath)

  // Security: reject paths outside home directory (prevents traversal)
  if (resolvedPath !== homeDir && !resolvedPath.startsWith(homeDirPrefix)) {
    res.status(403).json({ error: '홈 디렉토리 밖의 경로는 접근할 수 없습니다' })
    return
  }

  if (!existsSync(resolvedPath)) {
    res.status(404).json({ error: '경로가 존재하지 않습니다' })
    return
  }

  let names: string[]
  try {
    names = readdirSync(resolvedPath)
  } catch {
    res.status(403).json({ error: '디렉토리를 읽을 수 없습니다' })
    return
  }

  const entries: { name: string; path: string; isDirectory: boolean }[] = []
  for (const name of names) {
    const fullPath = resolve(resolvedPath, name)
    try {
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        entries.push({ name, path: fullPath, isDirectory: true })
      }
    } catch {
      // skip un-stat-able entries (permission errors, broken symlinks)
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  res.json(entries.slice(0, 200))
})

export { filesystemRouter }
