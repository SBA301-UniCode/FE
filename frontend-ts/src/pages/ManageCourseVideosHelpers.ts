export type AnyObj = Record<string, unknown>
export const unwrap = (res: unknown) => { const r = res as { data?: { data?: unknown } }; return r?.data?.data ?? r?.data ?? r }
export const getApiErrorMessage = (err: unknown, fallback: string) => { const e = err as { response?: { data?: { message?: string; errorCode?: string; data?: { message?: string } } }; message?: string }; return e?.response?.data?.message || e?.response?.data?.errorCode || e?.response?.data?.data?.message || e?.message || fallback }
export const getContentId = (c: AnyObj) => (c?.contentId || c?.id || '') as string
export const DELETED_CONTENT_STORAGE_KEY = 'unicode_deleted_content_ids_v1'
export const readJsonStorage = (key: string, fallback: AnyObj) => { try { const raw = localStorage.getItem(key); if (!raw) return fallback; const parsed = JSON.parse(raw); return parsed && typeof parsed === 'object' ? parsed : fallback } catch { return fallback } }
export const readDeletedContentIdMap = () => readJsonStorage(DELETED_CONTENT_STORAGE_KEY, {}) as Record<string, string[]>
export const writeDeletedContentIdMap = (map: Record<string, string[]>) => localStorage.setItem(DELETED_CONTENT_STORAGE_KEY, JSON.stringify(map))
export const CONTENT_LABELS: Record<string, string> = { VIDEO: '▶ Video', DOCUMENT: '📄 Document', QUIZ: '✏️ Quiz', PRACTICE: '💻 Practice' }
export const isHlsUrl = (url: string) => String(url || '').toLowerCase().includes('.m3u8')
export const defaultPracticeInputTypes = 'int, int'
export const defaultPracticeReturnType = 'int'
export const defaultPracticeTodoByLang = (lang: string) => (lang === 'PYTHON' ? 'return 0' : 'return 0;')
export const parseInputTypeList = (raw: string) => String(raw || '').split(',').map((i) => i.trim()).filter(Boolean)
export const getPracticeArgCount = (inputTypeRaw: string) => Math.max(1, parseInputTypeList(inputTypeRaw).length)
export const buildArgNames = (types: string[]) => types.map((_, idx) => `arg${idx + 1}`)
export const buildStarterCode = (lang: string, inputTypeRaw: string, returnTypeRaw: string) => { const types = parseInputTypeList(inputTypeRaw); const argNames = buildArgNames(types); const returnType = String(returnTypeRaw || '').trim() || defaultPracticeReturnType; if (lang === 'PYTHON') { const pyArgs = argNames.join(', ') || 'arg1'; return `class Solution:\n    def solve(self, ${pyArgs}):\n        # TODO` }; const javaParams = types.length > 0 ? types.map((t, idx) => `${t} ${argNames[idx]}`).join(', ') : 'int arg1'; return `class Solution {\n    public ${returnType} solve(${javaParams}) {\n        // TODO\n    }\n}` }
export const buildRightCode = (lang: string, inputTypeRaw: string, returnTypeRaw: string, todoBody: string) => { const types = parseInputTypeList(inputTypeRaw); const argNames = buildArgNames(types); const returnType = String(returnTypeRaw || '').trim() || defaultPracticeReturnType; const todo = String(todoBody || '').trim() || defaultPracticeTodoByLang(lang); if (lang === 'PYTHON') { const pyArgs = argNames.join(', ') || 'arg1'; return `class Solution:\n    def solve(self, ${pyArgs}):\n        ${todo}` }; const javaParams = types.length > 0 ? types.map((t, idx) => `${t} ${argNames[idx]}`).join(', ') : 'int arg1'; return `class Solution {\n    public ${returnType} solve(${javaParams}) {\n        ${todo}\n    }\n}` }
export const extractPlaybackUrl = (payload: unknown) => { if (!payload) return ''; if (typeof payload === 'string') return payload; const p = payload as AnyObj; return String(p.url || p.videoUrl || p.playbackUrl || p.signedUrl || '').trim() }
export const getVideoDurationSecondsFromFile = (file: File): Promise<number> => new Promise((resolve, reject) => { try { if (!file) return reject(new Error('No video file')); if (!file.type || !String(file.type).startsWith('video/')) return reject(new Error('Invalid video type')); const video = document.createElement('video'); video.preload = 'metadata'; video.muted = true; video.playsInline = true; const objectUrl = URL.createObjectURL(file); let done = false; const cleanup = () => { if (done) return; try { URL.revokeObjectURL(objectUrl) } catch {} }; video.onloadedmetadata = () => { done = true; const d = video.duration; cleanup(); if (!Number.isFinite(d) || d <= 0) return reject(new Error('Cannot read video duration')); resolve(d) }; video.onerror = () => { done = true; cleanup(); reject(new Error('Cannot read video metadata')) }; video.src = objectUrl } catch (e) { reject(e) } })

export const safeList = (res: unknown) => { const d = unwrap(res); return Array.isArray(d) ? d as AnyObj[] : [] }

export const uploadFileToS3WithProgress = (uploadUrl: string, file: File, onProgress: (p: number) => void): Promise<void> => new Promise((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open('PUT', uploadUrl, true); xhr.setRequestHeader('Content-Type', file.type || 'video/mp4'); xhr.upload.onprogress = (event) => { if (!event.lengthComputable) return; onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100))) }; xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); return }; reject(new Error(`Upload S3 failed (${xhr.status}).`)) }; xhr.onerror = () => reject(new Error('Network error during upload.')); xhr.onabort = () => reject(new Error('Upload was cancelled.')); xhr.send(file) })

export interface QuizQuestion { id: string; text: string; type: string; options: { id: string; text: string }[]; correctId: string }
export interface PracticeCase { id: string; inputValues: string[]; expectedOutput: string; outputType: string; hidden: boolean; description: string }

export const createEmptyQuestion = (): QuizQuestion => ({ id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: '', type: 'MULTIPLE_CHOICE', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }], correctId: 'a' })
export const createEmptyPracticeCase = (argCount = 1): PracticeCase => ({ id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, inputValues: Array.from({ length: Math.max(1, argCount) }, () => ''), expectedOutput: '', outputType: 'STRING', hidden: false, description: '' })

// Tailwind shared classes
export const btnP = 'px-3.5 py-2 rounded-[10px] font-semibold border-none cursor-pointer text-[0.82rem] transition-all bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed'
export const btnG = 'px-3.5 py-2 rounded-[10px] font-semibold cursor-pointer text-[0.82rem] transition-all bg-bg-deep text-text-main border border-border-medium'
export const btnD = 'px-3.5 py-2 rounded-[10px] font-semibold cursor-pointer text-[0.82rem] transition-all bg-red-500/[0.08] text-red-600 border-none'
export const inputC = 'bg-bg-deep border border-border-medium rounded-[10px] px-3 py-2 text-text-main text-sm outline-none w-full focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]'
export const sectionC = 'bg-white border border-border-medium rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-4'
export const hint = 'text-[0.85rem] text-text-muted m-0'
export const gk = (c: AnyObj) => String(c?.chapterId ?? c?.id ?? '')
export const gt = (c: AnyObj) => (c?.title ?? c?.chapterTitle ?? 'Chapter') as string
export const lk = (l: AnyObj) => String(l?.lessonId ?? l?.id ?? '')
export const lt = (l: AnyObj) => (l?.title ?? l?.lessonTitle ?? 'Lesson') as string
