import { apiGet } from './client'

export interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
}

export function listDirectory(path?: string): Promise<DirectoryEntry[]> {
  const query = path ? `?path=${encodeURIComponent(path)}` : ''
  return apiGet<DirectoryEntry[]>(`/filesystem${query}`)
}
