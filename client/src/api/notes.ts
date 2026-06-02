import api from './axios'
import type { Note } from '../types'

type ListResponse = { data: Note[] }
type SingleResponse = { data: Note }

export type NoteInput = {
  content: string
  clientId?: string
  projectId?: string
}

export async function getNotes(): Promise<Note[]> {
  const { data } = await api.get<ListResponse>('/notes')
  return data.data
}

export async function createNote(input: NoteInput): Promise<Note> {
  const { data } = await api.post<SingleResponse>('/notes', input)
  return data.data
}

export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`)
}
