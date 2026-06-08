import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { Project } from '../stores/appStore'

export const projectsQueryKey = ['projects'] as const

export function fetchProjects(): Promise<Project[]> {
  return apiGet<Project[]>('/projects')
}

export function useProjects() {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
    staleTime: 30_000,
  })
}
