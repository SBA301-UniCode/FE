import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import Hls from 'hls.js'
import Header from '../components/layout/Header'
import { chapterApi, contentApi, lessonApi, videoApi, examApi, questionBankApi, documentApi, practiceApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import './ManageCourseVideos.css'

const unwrap = (res) => res?.data?.data ?? res?.data ?? res
const getApiErrorMessage = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.errorCode ||
  err?.response?.data?.data?.message ||
  err?.message ||
  fallback
const getContentId = (content) => content?.contentId || content?.id || ''
const DELETED_CONTENT_STORAGE_KEY = 'unicode_deleted_content_ids_v1'

const readJsonStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

const readDeletedContentIdMap = () => readJsonStorage(DELETED_CONTENT_STORAGE_KEY, {})
const writeDeletedContentIdMap = (map) => localStorage.setItem(DELETED_CONTENT_STORAGE_KEY, JSON.stringify(map))

const CONTENT_LABELS = { VIDEO: '▶ Video', DOCUMENT: '📄 Tài liệu', QUIZ: '✏️ Bài kiểm tra', PRACTICE: '💻 Bài thực hành' }
const isHlsUrl = (url) => String(url || '').toLowerCase().includes('.m3u8')
const defaultPracticeInputTypes = 'int, int'
const defaultPracticeReturnType = 'int'
const defaultPracticeTodoByLang = (lang) => (lang === 'PYTHON' ? 'return 0' : 'return 0;')
const parseInputTypeList = (raw) =>
  String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
const getPracticeArgCount = (inputTypeRaw) => Math.max(1, parseInputTypeList(inputTypeRaw).length)
const buildArgNames = (types) => types.map((_, idx) => `arg${idx + 1}`)
const buildStarterCode = (lang, inputTypeRaw, returnTypeRaw) => {
  const types = parseInputTypeList(inputTypeRaw)
  const argNames = buildArgNames(types)
  const returnType = String(returnTypeRaw || '').trim() || defaultPracticeReturnType
  if (lang === 'PYTHON') {
    const pyArgs = argNames.join(', ') || 'arg1'
    return `class Solution:\n    def solve(self, ${pyArgs}):\n        # TODO`
  }
  const javaParams = types.length > 0
    ? types.map((t, idx) => `${t} ${argNames[idx]}`).join(', ')
    : 'int arg1'
  return `class Solution {\n    public ${returnType} solve(${javaParams}) {\n        // TODO\n    }\n}`
}
const buildRightCode = (lang, inputTypeRaw, returnTypeRaw, todoBody) => {
  const types = parseInputTypeList(inputTypeRaw)
  const argNames = buildArgNames(types)
  const returnType = String(returnTypeRaw || '').trim() || defaultPracticeReturnType
  const todo = String(todoBody || '').trim() || defaultPracticeTodoByLang(lang)
  if (lang === 'PYTHON') {
    const pyArgs = argNames.join(', ') || 'arg1'
    return `class Solution:\n    def solve(self, ${pyArgs}):\n        ${todo}`
  }
  const javaParams = types.length > 0
    ? types.map((t, idx) => `${t} ${argNames[idx]}`).join(', ')
    : 'int arg1'
  return `class Solution {\n    public ${returnType} solve(${javaParams}) {\n        ${todo}\n    }\n}`
}
const extractPlaybackUrl = (payload) => {
  if (!payload) return ''
  if (typeof payload === 'string') return payload
  return String(payload.url || payload.videoUrl || payload.playbackUrl || payload.signedUrl || '').trim()
}

const getVideoDurationSecondsFromFile = (file) =>
  new Promise((resolve, reject) => {
    try {
      if (!file) return reject(new Error('No video file'))
      if (!file.type || !String(file.type).startsWith('video/')) return reject(new Error('Invalid video type'))

      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true

      const objectUrl = URL.createObjectURL(file)
      let done = false

      const cleanup = () => {
        if (done) return
        try { URL.revokeObjectURL(objectUrl) } catch { /* ignore */ }
      }

      video.onloadedmetadata = () => {
        done = true
        const d = video.duration
        cleanup()
        if (!Number.isFinite(d) || d <= 0) return reject(new Error('Cannot read video duration'))
        resolve(d)
      }

      video.onerror = () => {
        done = true
        cleanup()
        reject(new Error('Cannot read video metadata'))
      }

      video.src = objectUrl
    } catch (e) {
      reject(e)
    }
  })

function HlsPreviewVideo({ src, className }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return undefined

    let hls = null
    if (isHlsUrl(src)) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
      } else if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true })
        hls.loadSource(src)
        hls.attachMedia(video)
      } else {
        video.src = src
      }
    } else {
      video.src = src
    }

    return () => {
      if (hls) hls.destroy()
    }
  }, [src])

  if (!src) return null
  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      playsInline
      className={className}
    />
  )
}

const ManageCourseVideos = () => {
  const { courseId } = useParams()
  const { user } = useAuth()
  const roleCode = user?.roles?.[0]?.roleCode
  const canManage = roleCode === 'INSTRUCTOR' || roleCode === 'ADMIN'

  const [chapters, setChapters] = useState([])
  const [lessons, setLessons] = useState([])
  const [contents, setContents] = useState([])
  const [videoMap, setVideoMap] = useState({})
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [loadingChapters, setLoadingChapters] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [loadingContents, setLoadingContents] = useState(false)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [creatingChapter, setCreatingChapter] = useState(false)
  const [renamingChapter, setRenamingChapter] = useState(false)
  const [deletingChapter, setDeletingChapter] = useState(false)
  const [chapterEditTitle, setChapterEditTitle] = useState('')
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [renamingLesson, setRenamingLesson] = useState(false)
  const [deletingLesson, setDeletingLesson] = useState(false)
  const [lessonEditTitle, setLessonEditTitle] = useState('')

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadStep, setUploadStep] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const [showQuizEditor, setShowQuizEditor] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [quizTitle, setQuizTitle] = useState('Bài kiểm tra')
  const [quizDuration, setQuizDuration] = useState(600)
  const [quizPassScore, setQuizPassScore] = useState(60)
  const [quizNumQuestions, setQuizNumQuestions] = useState(0)
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [quizStep, setQuizStep] = useState('')
  const [questionBankLoading, setQuestionBankLoading] = useState(false)
  const [questionBankError, setQuestionBankError] = useState('')
  const [questionBankItems, setQuestionBankItems] = useState([])
  const [showPracticeEditor, setShowPracticeEditor] = useState(false)
  const [savingPractice, setSavingPractice] = useState(false)
  const [practiceStep, setPracticeStep] = useState('')
  const [practiceTitle, setPracticeTitle] = useState('Bài thực hành')
  const [practiceDescription, setPracticeDescription] = useState('')
  const [practiceLanguage, setPracticeLanguage] = useState('JAVA')
  const [practiceDifficulty, setPracticeDifficulty] = useState('NORMAL')
  const [practiceStarterCode, setPracticeStarterCode] = useState('')
  const [practiceRightCode, setPracticeRightCode] = useState('')
  const [practiceInputType, setPracticeInputType] = useState(defaultPracticeInputTypes)
  const [practiceReturnType, setPracticeReturnType] = useState(defaultPracticeReturnType)
  const [practiceRightTodo, setPracticeRightTodo] = useState(defaultPracticeTodoByLang('JAVA'))
  const [practiceCases, setPracticeCases] = useState([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [uploadDocFile, setUploadDocFile] = useState(null)
  const [documentMap, setDocumentMap] = useState({})
  const [deletedContentIdMap, setDeletedContentIdMap] = useState(() => readDeletedContentIdMap())

  const clearMessages = () => { setError(''); setUploadError(''); setActionMsg(''); setQuestionBankError('') }

  const safeList = (res) => {
    const d = unwrap(res)
    return Array.isArray(d) ? d : []
  }

  // ── Fetch helpers with fallback ──
  const fetchChapters = useCallback(async () => {
    try {
      const res = await chapterApi.getByCourseId(courseId)
      return safeList(res)
    } catch { return null }
  }, [courseId])

  const fetchLessons = useCallback(async (chId) => {
    try {
      const res = await lessonApi.getByChapterId(chId)
      return safeList(res)
    } catch { return null }
  }, [])

  const fetchContents = useCallback(async (lId) => {
    try {
      const res = await contentApi.getByLessonId(lId)
      return safeList(res)
    } catch { return null }
  }, [])

  const fetchQuestionBank = useCallback(async (lessonId) => {
    if (!lessonId) {
      setQuestionBankItems([])
      return []
    }
    setQuestionBankLoading(true)
    setQuestionBankError('')
    try {
      const res = await questionBankApi.getByLessonId(lessonId, 0, 200)
      const payload = unwrap(res)
      const list = Array.isArray(payload?.content) ? payload.content : (Array.isArray(payload) ? payload : [])
      setQuestionBankItems(list)
      return list
    } catch (err) {
      setQuestionBankItems([])
      setQuestionBankError(err.response?.data?.message || err.message || 'Không tải được ngân hàng câu hỏi.')
      return []
    } finally {
      setQuestionBankLoading(false)
    }
  }, [])

  const fetchVideoMap = useCallback(async (contentList) => {
    const vMap = {}
    const videoItems = contentList.filter((c) => c.contentType === 'VIDEO')
    if (videoItems.length === 0) return vMap
    try {
      // Backend detail endpoint now expects videoId, so map by list endpoint.
      const allRes = await videoApi.getAllActiveVideos()
      const allVideos = Array.isArray(unwrap(allRes)) ? unwrap(allRes) : []
      const validContentIds = new Set(videoItems.map((c) => String(getContentId(c))))
      allVideos.forEach((v) => {
        const cId = String(v?.contentId || '')
        if (cId && validContentIds.has(cId)) vMap[cId] = v
      })
      // Enrich with signed playback URLs when available.
      await Promise.all(Object.entries(vMap).map(async ([cId, v]) => {
        const videoId = v?.videoId
        if (!videoId) return
        try {
          const detailRes = await videoApi.getVideoPlaybackUrl(videoId)
          const detail = unwrap(detailRes)
          const playbackUrl = extractPlaybackUrl(detail)
          if (playbackUrl) vMap[cId] = { ...v, ...detail, url: playbackUrl }
        } catch { /* fallback to list URL */ }
      }))
    } catch { /* keep empty */ }
    return vMap
  }, [])

  const fetchDocumentMap = useCallback(async (lessonId, contentList) => {
    if (!lessonId) return {}
    try {
      const res = await documentApi.getByLessonId(lessonId)
      const docs = Array.isArray(unwrap(res)) ? unwrap(res) : []
      const validContentIds = new Set((contentList || []).map((c) => String(getContentId(c))))
      const nextMap = {}
      docs.forEach((doc) => {
        const cId = String(doc?.contentId || '')
        if (cId && validContentIds.has(cId)) nextMap[cId] = doc
      })
      return nextMap
    } catch {
      return {}
    }
  }, [])

  // ── Initial load chapters ──
  useEffect(() => {
    if (!courseId || !canManage) { setLoadingChapters(false); return }
    setLoadingChapters(true); clearMessages()
    fetchChapters().then((list) => {
      setChapters(list || [])
      setSelectedChapterId(''); setLessons([]); setSelectedLessonId(''); setContents([]); setVideoMap({})
      if (!list) setError('Không tải được danh sách chương. Backend có thể đang lỗi.')
    }).finally(() => setLoadingChapters(false))
  }, [courseId, canManage, fetchChapters])

  // ── Load lessons when chapter changes ──
  useEffect(() => {
    if (!selectedChapterId) { setLessons([]); setSelectedLessonId(''); setContents([]); setVideoMap({}); return }
    setLoadingLessons(true)
    fetchLessons(selectedChapterId).then((list) => {
      setLessons(list || [])
      setSelectedLessonId(''); setContents([]); setVideoMap({})
    }).finally(() => setLoadingLessons(false))
  }, [selectedChapterId, fetchLessons])

  // ── Load contents when lesson changes ──
  const loadLessonContents = useCallback(async (lId) => {
    if (!lId) { setContents([]); setVideoMap({}); return }
    setLoadingContents(true)
    const list = await fetchContents(lId) || []
    const hiddenIds = Array.isArray(deletedContentIdMap[lId]) ? deletedContentIdMap[lId] : []
    const visibleList = hiddenIds.length > 0 ? list.filter((ct) => !hiddenIds.includes(getContentId(ct))) : list
    setContents(visibleList)
    const vMap = await fetchVideoMap(visibleList)
    setVideoMap(vMap)
    const dMap = await fetchDocumentMap(lId, visibleList)
    setDocumentMap(dMap)
    setLoadingContents(false)
  }, [fetchContents, fetchVideoMap, fetchDocumentMap, deletedContentIdMap])

  useEffect(() => {
    loadLessonContents(selectedLessonId)
    fetchQuestionBank(selectedLessonId)
  }, [selectedLessonId, loadLessonContents, fetchQuestionBank])

  // ═══════════════════════════════════════════════
  //  CREATE CHAPTER
  // ═══════════════════════════════════════════════
  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim() || !courseId) return
    setCreatingChapter(true); clearMessages()
    try {
      const createRes = await chapterApi.create({
        courseId,
        title: newChapterTitle.trim(),
        orderIndex: chapters.length,
      })
      const created = unwrap(createRes)
      if (!created) throw new Error('Không nhận được dữ liệu chương vừa tạo.')
      setNewChapterTitle('')
      setActionMsg('Tạo chương thành công!')

      const refreshed = await fetchChapters()
      if (refreshed) {
        setChapters(refreshed)
      } else {
        setChapters((prev) => [...prev, created])
      }
      const newId = String(created.chapterId || created.id || '')
      if (newId) setSelectedChapterId(newId)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo chương thất bại.')
    } finally { setCreatingChapter(false) }
  }

  // ═══════════════════════════════════════════════
  //  CREATE LESSON
  // ═══════════════════════════════════════════════
  const handleCreateLesson = async () => {
    if (!newLessonTitle.trim() || !selectedChapterId) return
    setCreatingLesson(true); clearMessages()
    try {
      const createRes = await lessonApi.create({
        chapterId: selectedChapterId,
        title: newLessonTitle.trim(),
        orderIndex: lessons.length,
      })
      const created = unwrap(createRes)
      if (!created) throw new Error('Không nhận được dữ liệu bài giảng vừa tạo.')
      setNewLessonTitle('')
      setActionMsg('Tạo bài giảng thành công!')

      const refreshed = await fetchLessons(selectedChapterId)
      if (refreshed) {
        setLessons(refreshed)
      } else {
        setLessons((prev) => [...prev, created])
      }
      const newId = String(created.lessonId || created.id || '')
      if (newId) setSelectedLessonId(newId)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tạo bài giảng thất bại.')
    } finally { setCreatingLesson(false) }
  }

  // ═══════════════════════════════════════════════
  //  UPLOAD VIDEO (S3 Presigned PUT) + CREATE RECORD
  // ═══════════════════════════════════════════════
  const uploadFileToS3WithProgress = (uploadUrl, file, onProgress) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(percent)
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
        return
      }
      reject(new Error(`Upload lên S3 thất bại (${xhr.status}).`))
    }

    xhr.onerror = () => reject(new Error('Lỗi mạng khi upload file lên S3.'))
    xhr.onabort = () => reject(new Error('Upload đã bị hủy.'))
    xhr.send(file)
  })

  const handleUploadVideo = async (e) => {
    e.preventDefault()
    if (!selectedLessonId || !uploadFile) { setUploadError('Chọn bài giảng và file video.'); return }
    setUploadProgress(0)
    setUploading(true); clearMessages()
    try {
      setUploadStep('Bước 1/3: Tạo link upload...')
      const presignRes = await videoApi.generateUploadUrl({
        fileName: uploadFile.name,
        contentType: uploadFile.type || 'video/mp4',
        size: String(uploadFile.size || 0),
      })
      const presign = unwrap(presignRes)
      const uploadUrl = presign?.uploadUrl
      const key = presign?.key
      if (!uploadUrl || !key) throw new Error('Backend không trả về uploadUrl/key.')

      setUploadStep('Bước 2/3: Đang upload lên S3...')
      await uploadFileToS3WithProgress(uploadUrl, uploadFile, setUploadProgress)

      setUploadStep('Bước 3/3: Đọc thời lượng & lưu record...')
      const durationSeconds = await getVideoDurationSecondsFromFile(uploadFile)
      // Lưu duration theo PHÚT (int). Mặc định tối thiểu 1 phút để tránh 0 khi video < 60s.
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60))

      const vRes = await videoApi.createVideoRecord({
        lessonId: selectedLessonId,
        duration: durationMinutes,
        key,
      })
      const video = unwrap(vRes)
      const contentId = video?.contentId

      setUploadStep(''); setUploadFile(null)
      setActionMsg('Upload video thành công!')

      if (video && contentId) setVideoMap((prev) => ({ ...prev, [contentId]: video }))
      if (contentId) {
        setContents((prev) => {
          if (prev.some((c) => c.contentId === contentId)) return prev
          return [...prev, { contentId, contentType: 'VIDEO', lessonId: selectedLessonId }]
        })
      }

      const refreshed = await fetchContents(selectedLessonId)
      if (refreshed) {
        setContents(refreshed)
        setVideoMap(await fetchVideoMap(refreshed))
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Upload thất bại.')
      setUploadError(msg)
      setUploadStep('')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // ═══════════════════════════════════════════════
  //  CREATE DOCUMENT
  // ═══════════════════════════════════════════════
  const [creatingDoc, setCreatingDoc] = useState(false)

  const handleCreateDocument = async (e) => {
    e.preventDefault()
    if (!selectedLessonId) return
    if (!uploadDocFile) {
      setUploadError('Vui lòng chọn file tài liệu trước khi tạo.')
      return
    }
    setCreatingDoc(true); clearMessages()
    try {
      const res = await documentApi.create({
        lessonId: selectedLessonId,
        title: documentTitle.trim() || 'Tài liệu bài giảng'
      }, uploadDocFile)
      
      const created = unwrap(res)
      const contentId = created?.contentId
      if (!contentId) throw new Error('Backend không trả về contentId của tài liệu.')
      setDocumentTitle('')
      setUploadDocFile(null)
      setActionMsg('Tạo tài liệu thành công!')

      if (contentId) {
        setContents((prev) => {
          if (prev.some((c) => c.contentId === contentId)) return prev
          return [...prev, { contentId: created.contentId, contentType: 'DOCUMENT', lessonId: selectedLessonId }]
        })
      }

      await loadLessonContents(selectedLessonId)
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Tạo tài liệu thất bại.')
    } finally { setCreatingDoc(false) }
  }

  // ═══════════════════════════════════════════════
  //  CREATE QUIZ: QuestionBank → Exam (auto Content)
  // ═══════════════════════════════════════════════
  const handleCreateQuiz = async () => {
    if (!selectedLessonId) return
    const validQs = quizQuestions.filter((q) => q.text.trim() && q.options.some((o) => o.text.trim()))
    if (validQs.length === 0 && quizNumQuestions <= 0 && questionBankItems.length === 0) {
      setUploadError('Cần ít nhất 1 câu hỏi mới hoặc phải có câu hỏi sẵn trong ngân hàng câu hỏi.')
      return
    }

    setSavingQuiz(true); clearMessages()
    try {
      if (validQs.length > 0) {
        setQuizStep(`Bước 1/2: Lưu ${validQs.length} câu hỏi vào ngân hàng...`)
        for (const q of validQs) {
          const opts = q.options.filter((o) => o.text.trim()).map((o) => ({
            answerText: o.text.trim(),
            isCorrect: o.id === q.correctId,
          }))
          await questionBankApi.createQuestion(selectedLessonId, {
            questionText: q.text.trim(),
            imageUrl: null,
            numberAnswers: opts.length,
            questionType: q.type,
            options: opts,
          })
        }
      }

      const latestQuestionBank = await fetchQuestionBank(selectedLessonId)
      const availableQuestions = Array.isArray(latestQuestionBank) ? latestQuestionBank.length : 0
      const numQ = quizNumQuestions > 0
        ? quizNumQuestions
        : availableQuestions

      if (availableQuestions <= 0) {
        setUploadError('Bài giảng này chưa có câu hỏi nào trong ngân hàng.')
        setQuizStep('')
        return
      }
      if (numQ > availableQuestions) {
        setUploadError(`Ngân hàng hiện có ${availableQuestions} câu, nhưng đề đang yêu cầu ${numQ} câu.`)
        setQuizStep('')
        return
      }

      setQuizStep(validQs.length > 0 ? 'Bước 2/2: Tạo bài kiểm tra...' : 'Tạo bài kiểm tra...')
      await examApi.createExam(selectedLessonId, {
        name: quizTitle.trim() || 'Bài kiểm tra',
        duration: quizDuration,
        passScore: quizPassScore,
        numberQuestions: numQ,
      })

      setActionMsg('Tạo bài kiểm tra thành công!')
      setShowQuizEditor(false); setQuizStep('')

      const refreshed = await fetchContents(selectedLessonId)
      if (refreshed) {
        setContents(refreshed)
      } else {
        setUploadError('Đã tạo quiz nhưng chưa tải lại được danh sách nội dung. Vui lòng bấm "Tải lại nội dung".')
      }
      await fetchQuestionBank(selectedLessonId)
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Tạo quiz thất bại.')
      setQuizStep('')
    } finally { setSavingQuiz(false) }
  }

  // ═══════════════════════════════════════════════
  //  DELETE CONTENT
  // ═══════════════════════════════════════════════
  const handleDeleteContent = async (ct) => {
    const contentId = getContentId(ct)
    if (!contentId) {
      setUploadError('Không xác định được contentId để xóa.')
      return
    }
    const label = CONTENT_LABELS[ct.contentType] || ct.contentType
    if (!window.confirm(`Xóa ${label}?`)) return
    clearMessages()
    try {
      if (ct.contentType === 'DOCUMENT') {
        const doc = documentMap[contentId]
        const documentId = doc?.documentId
        if (!documentId) throw new Error('Không tìm thấy documentId để xóa tài liệu.')
        await documentApi.delete(documentId)
      } else {
        await contentApi.delete(contentId)
      }
      const lessonId = selectedLessonId || ct.lessonId
      if (lessonId) {
        const nextDeletedMap = { ...readDeletedContentIdMap() }
        const currentDeleted = Array.isArray(nextDeletedMap[lessonId]) ? nextDeletedMap[lessonId] : []
        if (!currentDeleted.includes(contentId)) nextDeletedMap[lessonId] = [...currentDeleted, contentId]
        writeDeletedContentIdMap(nextDeletedMap)
        setDeletedContentIdMap(nextDeletedMap)
      }
      const docMap = { ...documentMap }
      if (docMap[contentId]) {
        delete docMap[contentId]
        setDocumentMap(docMap)
      }
      setContents((prev) => prev.filter((item) => getContentId(item) !== contentId))
      setVideoMap((prev) => {
        const next = { ...prev }
        delete next[contentId]
        return next
      })
      setActionMsg(`Đã xóa ${label}`)
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Xóa thất bại.'))
    }
  }

  // ── Quiz editor helpers ──
  const openQuizEditor = () => {
    setQuizQuestions([createEmptyQuestion()])
    setQuizTitle('Bài kiểm tra')
    setQuizDuration(600)
    setQuizPassScore(60)
    setQuizNumQuestions(0)
    setShowQuizEditor(true)
  }

  const createEmptyQuestion = () => ({
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: '',
    type: 'MULTIPLE_CHOICE',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correctId: 'a',
  })

  const updateQuestion = (idx, field, value) => {
    setQuizQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))
  }

  const updateOption = (qIdx, optIdx, text) => {
    setQuizQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, options: q.options.map((o, j) => (j === optIdx ? { ...o, text } : o)) }
    }))
  }

  const addQuestion = () => setQuizQuestions((prev) => [...prev, createEmptyQuestion()])
  const removeQuestion = (idx) => {
    if (quizQuestions.length <= 1) return
    setQuizQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  const createEmptyPracticeCase = (argCount = 1) => ({
    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    inputValues: Array.from({ length: Math.max(1, argCount) }, () => ''),
    expectedOutput: '',
    outputType: 'STRING',
    hidden: false,
    description: '',
  })

  const openPracticeEditor = () => {
    setPracticeTitle('Bài thực hành')
    setPracticeDescription('')
    setPracticeLanguage('JAVA')
    setPracticeDifficulty('NORMAL')
    setPracticeInputType(defaultPracticeInputTypes)
    setPracticeReturnType(defaultPracticeReturnType)
    setPracticeRightTodo(defaultPracticeTodoByLang('JAVA'))
    setPracticeStarterCode(buildStarterCode('JAVA', defaultPracticeInputTypes, defaultPracticeReturnType))
    setPracticeRightCode(buildRightCode('JAVA', defaultPracticeInputTypes, defaultPracticeReturnType, defaultPracticeTodoByLang('JAVA')))
    setPracticeCases([createEmptyPracticeCase(getPracticeArgCount(defaultPracticeInputTypes))])
    setPracticeStep('')
    setShowPracticeEditor(true)
  }

  useEffect(() => {
    setPracticeStarterCode(buildStarterCode(practiceLanguage, practiceInputType, practiceReturnType))
    setPracticeRightCode(buildRightCode(practiceLanguage, practiceInputType, practiceReturnType, practiceRightTodo))
  }, [practiceLanguage, practiceInputType, practiceReturnType, practiceRightTodo])

  const addPracticeCase = () =>
    setPracticeCases((prev) => [...prev, createEmptyPracticeCase(getPracticeArgCount(practiceInputType))])
  const removePracticeCase = (idx) => {
    if (practiceCases.length <= 1) return
    setPracticeCases((prev) => prev.filter((_, i) => i !== idx))
  }
  const updatePracticeCase = (idx, field, value) => {
    setPracticeCases((prev) => prev.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc)))
  }
  const updatePracticeCaseInput = (caseIdx, inputIdx, value) => {
    setPracticeCases((prev) =>
      prev.map((tc, i) => {
        if (i !== caseIdx) return tc
        const current = Array.isArray(tc.inputValues) ? tc.inputValues : []
        const next = [...current]
        while (next.length <= inputIdx) next.push('')
        next[inputIdx] = value
        return { ...tc, inputValues: next }
      })
    )
  }

  useEffect(() => {
    const argCount = getPracticeArgCount(practiceInputType)
    setPracticeCases((prev) =>
      prev.map((tc) => {
        const current = Array.isArray(tc.inputValues) ? tc.inputValues : []
        const next = current.slice(0, argCount)
        while (next.length < argCount) next.push('')
        return { ...tc, inputValues: next }
      })
    )
  }, [practiceInputType])

  const handleCreatePractice = async () => {
    if (!selectedLessonId) return
    const title = practiceTitle.trim()
    if (!title) {
      setUploadError('Vui lòng nhập tiêu đề bài thực hành.')
      return
    }
    const validCases = practiceCases
      .map((tc) => ({
        inputData: JSON.stringify((Array.isArray(tc.inputValues) ? tc.inputValues : []).map((v) => String(v || ''))),
        expectedOutput: tc.expectedOutput.trim(),
        outputType: tc.outputType,
        hidden: Boolean(tc.hidden),
        description: tc.description.trim(),
      }))
      .filter((tc) => tc.expectedOutput)

    if (validCases.length === 0) {
      setUploadError('Cần ít nhất 1 test case có expectedOutput.')
      return
    }
    const invalidArrayCaseIndex = validCases.findIndex((tc) => {
      if (tc.outputType !== 'ARRAY') return false
      const normalized = String(tc.expectedOutput || '').trim()
      return !(normalized.startsWith('[') && normalized.endsWith(']'))
    })
    if (invalidArrayCaseIndex >= 0) {
      setUploadError(`Test case ${invalidArrayCaseIndex + 1}: expectedOutput kiểu ARRAY phải có dạng [ ... ].`)
      return
    }

    setSavingPractice(true)
    clearMessages()
    try {
      setPracticeStep('Đang tạo bài thực hành...')
      const normalizedInputTypes = parseInputTypeList(practiceInputType)
      await practiceApi.createPractice(selectedLessonId, {
        title,
        description: practiceDescription.trim(),
        language: practiceLanguage,
        difficulty: practiceDifficulty,
        starterCode: practiceStarterCode,
        rightCode: practiceRightCode,
        inputType: JSON.stringify(normalizedInputTypes),
        returnType: String(practiceReturnType || '').trim() || defaultPracticeReturnType,
        testCases: validCases,
      })
      setActionMsg('Tạo bài thực hành thành công!')
      setShowPracticeEditor(false)
      setPracticeStep('')
      const refreshed = await fetchContents(selectedLessonId)
      if (refreshed) {
        setContents(refreshed)
      }
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Tạo bài thực hành thất bại.'))
      setPracticeStep('')
    } finally {
      setSavingPractice(false)
    }
  }

  const gk = (c) => String(c?.chapterId ?? c?.id ?? '')
  const gt = (c) => c?.title ?? c?.chapterTitle ?? 'Chương'
  const lk = (l) => String(l?.lessonId ?? l?.id ?? '')
  const lt = (l) => l?.title ?? l?.lessonTitle ?? 'Bài giảng'
  const selectedChapter = chapters.find((c) => gk(c) === String(selectedChapterId))
  const selectedLesson = lessons.find((l) => lk(l) === String(selectedLessonId))

  useEffect(() => {
    if (!selectedChapter) {
      setChapterEditTitle('')
      return
    }
    setChapterEditTitle(gt(selectedChapter))
  }, [selectedChapter])

  useEffect(() => {
    if (!selectedLesson) {
      setLessonEditTitle('')
      return
    }
    setLessonEditTitle(lt(selectedLesson))
  }, [selectedLesson])

  const handleRenameChapter = async () => {
    if (!selectedChapterId || !chapterEditTitle.trim()) return
    setRenamingChapter(true)
    clearMessages()
    try {
      await chapterApi.update(selectedChapterId, { title: chapterEditTitle.trim() })
      setActionMsg('Đã cập nhật tên chương.')
      const refreshed = await fetchChapters()
      setChapters(refreshed || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật chương thất bại.')
    } finally {
      setRenamingChapter(false)
    }
  }

  const handleDeleteChapter = async () => {
    if (!selectedChapterId) return
    if (!window.confirm('Xóa chương này? Các bài giảng/nội dung liên quan có thể bị ảnh hưởng.')) return
    setDeletingChapter(true)
    clearMessages()
    try {
      await chapterApi.delete(selectedChapterId)
      setActionMsg('Đã xóa chương.')
      const refreshed = await fetchChapters()
      setChapters(refreshed || [])
      setSelectedChapterId('')
      setSelectedLessonId('')
      setLessons([])
      setContents([])
      setVideoMap({})
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xóa chương thất bại.')
    } finally {
      setDeletingChapter(false)
    }
  }

  const handleRenameLesson = async () => {
    if (!selectedLessonId || !lessonEditTitle.trim()) return
    setRenamingLesson(true)
    clearMessages()
    try {
      await lessonApi.update(selectedLessonId, { title: lessonEditTitle.trim() })
      setActionMsg('Đã cập nhật tên bài giảng.')
      const refreshed = await fetchLessons(selectedChapterId)
      setLessons(refreshed || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Cập nhật bài giảng thất bại.')
    } finally {
      setRenamingLesson(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!selectedLessonId) return
    if (!window.confirm('Xóa bài giảng này? Nội dung trong bài giảng có thể bị ảnh hưởng.')) return
    setDeletingLesson(true)
    clearMessages()
    try {
      await lessonApi.delete(selectedLessonId)
      setActionMsg('Đã xóa bài giảng.')
      const refreshed = await fetchLessons(selectedChapterId)
      setLessons(refreshed || [])
      setSelectedLessonId('')
      setContents([])
      setVideoMap({})
      setQuestionBankItems([])
    } catch (err) {
      const shouldTryForceDelete = window.confirm(
        `${getApiErrorMessage(err, 'Xóa bài giảng thất bại.')}\n\nBạn có muốn thử xóa toàn bộ nội dung trong bài giảng rồi xóa lại bài giảng không?`
      )
      if (!shouldTryForceDelete) {
        setError(getApiErrorMessage(err, 'Xóa bài giảng thất bại.'))
        setDeletingLesson(false)
        return
      }
      try {
        const lessonContents = await fetchContents(selectedLessonId)
        const contentList = Array.isArray(lessonContents) ? lessonContents : []
        for (const ct of contentList) {
          await contentApi.delete(ct.contentId)
        }
        await lessonApi.delete(selectedLessonId)
        setActionMsg('Đã xóa bài giảng (đã xóa nội dung liên quan).')
        const refreshed = await fetchLessons(selectedChapterId)
        setLessons(refreshed || [])
        setSelectedLessonId('')
        setContents([])
        setVideoMap({})
        setQuestionBankItems([])
      } catch (forceErr) {
        setError(getApiErrorMessage(forceErr, 'Xóa bài giảng thất bại sau khi thử xóa nội dung.'))
      }
    } finally {
      setDeletingLesson(false)
    }
  }

  if (!canManage) {
    return (
      <div className="manage-videos"><Header />
        <main className="manage-videos-main">
          <div className="manage-videos-empty">Trang này dành cho Instructor/Admin.</div>
          <Link to="/my-courses" className="manage-videos-back">← My Courses</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="manage-videos">
      <Header />
      <main className="manage-videos-main">
        <div className="manage-videos-header">
          <div>
            <h1>Quản lý nội dung khóa học</h1>
            <p>Chọn chương → bài giảng → thêm Video, Tài liệu hoặc Bài kiểm tra.</p>
          </div>
          <Link to="/my-courses" className="manage-videos-btn manage-videos-btn-ghost">← My Courses</Link>
        </div>

        {error && <div className="manage-videos-error">{error}</div>}
        {uploadError && <div className="manage-videos-error">{uploadError}</div>}
        {actionMsg && (
          <div className="mv-success-msg">
            {actionMsg}
            <button type="button" onClick={() => setActionMsg('')}>✕</button>
          </div>
        )}

        {loadingChapters && <div className="manage-videos-loading">Đang tải chương...</div>}

        {!loadingChapters && (
          <>
            {/* ═══ STEP 1: CHAPTER ═══ */}
            <section className="manage-videos-section">
              <h2>1. Chọn hoặc tạo chương</h2>
              {chapters.length > 0 ? (
                <select className="manage-videos-select" value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)}>
                  <option value="">-- Chọn chương --</option>
                  {chapters.map((c) => <option key={gk(c)} value={gk(c)}>{gt(c)}</option>)}
                </select>
              ) : (
                <p className="manage-videos-hint">Chưa có chương nào. Tạo mới bên dưới.</p>
              )}
              <div className="mv-inline-create">
                <input className="manage-videos-input" placeholder="Tên chương mới..." value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()} />
                <button type="button" className="manage-videos-btn manage-videos-btn-primary"
                  onClick={handleCreateChapter} disabled={creatingChapter || !newChapterTitle.trim()}>
                  {creatingChapter ? 'Đang tạo...' : '+ Tạo chương'}
                </button>
              </div>
              {selectedChapterId && (
                <div className="mv-inline-edit">
                  <input
                    className="manage-videos-input"
                    placeholder="Đổi tên chương..."
                    value={chapterEditTitle}
                    onChange={(e) => setChapterEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameChapter()}
                  />
                  <button
                    type="button"
                    className="manage-videos-btn manage-videos-btn-ghost"
                    onClick={handleRenameChapter}
                    disabled={renamingChapter || !chapterEditTitle.trim()}
                  >
                    {renamingChapter ? 'Đang lưu...' : 'Sửa tên chương'}
                  </button>
                  <button
                    type="button"
                    className="manage-videos-btn manage-videos-btn-danger"
                    onClick={handleDeleteChapter}
                    disabled={deletingChapter}
                  >
                    {deletingChapter ? 'Đang xóa...' : 'Xóa chương'}
                  </button>
                </div>
              )}
            </section>

            {/* ═══ STEP 2: LESSON ═══ */}
            <section className="manage-videos-section">
              <h2>2. Chọn hoặc tạo bài giảng</h2>
              {!selectedChapterId && <p className="manage-videos-hint">Chọn chương trước.</p>}
              {selectedChapterId && loadingLessons && <p className="manage-videos-hint">Đang tải...</p>}
              {selectedChapterId && !loadingLessons && (
                <>
                  {lessons.length > 0 ? (
                    <select className="manage-videos-select" value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)}>
                      <option value="">-- Chọn bài giảng --</option>
                      {lessons.map((l) => <option key={lk(l)} value={lk(l)}>{lt(l)}</option>)}
                    </select>
                  ) : (
                    <p className="manage-videos-hint">Chương này chưa có bài giảng. Tạo mới bên dưới.</p>
                  )}
                  <div className="mv-inline-create">
                    <input className="manage-videos-input" placeholder="Tên bài giảng mới..." value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateLesson()} />
                    <button type="button" className="manage-videos-btn manage-videos-btn-primary"
                      onClick={handleCreateLesson} disabled={creatingLesson || !newLessonTitle.trim()}>
                      {creatingLesson ? 'Đang tạo...' : '+ Tạo bài giảng'}
                    </button>
                  </div>
                  {selectedLessonId && (
                    <div className="mv-inline-edit">
                      <input
                        className="manage-videos-input"
                        placeholder="Đổi tên bài giảng..."
                        value={lessonEditTitle}
                        onChange={(e) => setLessonEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameLesson()}
                      />
                      <button
                        type="button"
                        className="manage-videos-btn manage-videos-btn-ghost"
                        onClick={handleRenameLesson}
                        disabled={renamingLesson || !lessonEditTitle.trim()}
                      >
                        {renamingLesson ? 'Đang lưu...' : 'Sửa tên bài giảng'}
                      </button>
                      <button
                        type="button"
                        className="manage-videos-btn manage-videos-btn-danger"
                        onClick={handleDeleteLesson}
                        disabled={deletingLesson}
                      >
                        {deletingLesson ? 'Đang xóa...' : 'Xóa bài giảng'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ═══ STEP 3: ADD CONTENT ═══ */}
            {selectedLessonId && (
              <>
                <section className="manage-videos-section">
                  <h2>3. Thêm nội dung</h2>
                  <div className="mv-add-btns">
                    {/* Video */}
                    <div className="mv-add-card">
                      <span className="mv-add-card-icon">▶</span>
                      <span className="mv-add-card-title">Upload Video</span>
                      <p className="mv-add-card-desc">Upload MP4 lên S3 → backend chuyển HLS; xem bài học bằng .m3u8</p>
                      <form className="mv-upload-form" onSubmit={handleUploadVideo}>
                        <input type="file" accept="video/*"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="manage-videos-input" />
                        <button type="submit" className="manage-videos-btn manage-videos-btn-primary"
                          disabled={uploading}>
                          {uploading ? 'Đang xử lý...' : 'Upload'}
                        </button>
                        {!uploading && !uploadFile && (
                          <p className="manage-videos-hint">Chọn file video để bật upload.</p>
                        )}
                        {uploading && uploadStep && <p className="manage-videos-hint" style={{ color: '#a5b4fc' }}>{uploadStep}</p>}
                        {uploading && (
                          <div className="mv-upload-progress">
                            <div className="mv-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                            <span className="mv-upload-progress-text">{uploadProgress}%</span>
                          </div>
                        )}
                      </form>
                    </div>

                    {/* Document */}
                    <div className="mv-add-card">
                      <span className="mv-add-card-icon">📄</span>
                      <span className="mv-add-card-title">Upload Tài Liệu</span>
                      <p className="mv-add-card-desc">Tải file tài liệu (PDF, Word, Ảnh...) từ máy tính</p>
                      <form className="mv-upload-form" onSubmit={handleCreateDocument}>
                        <input
                          type="text"
                          placeholder="Tiêu đề tài liệu (không bắt buộc)"
                          className="manage-videos-input"
                          value={documentTitle}
                          onChange={(e) => setDocumentTitle(e.target.value)}
                          disabled={creatingDoc}
                        />
                        <input 
                          type="file"
                          className="manage-videos-input"
                          onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                          disabled={creatingDoc}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                        />
                        <button type="submit" className="manage-videos-btn manage-videos-btn-primary"
                          disabled={creatingDoc || !uploadDocFile}>
                          {creatingDoc ? 'Đang tải lên...' : '+ Tạo tài liệu'}
                        </button>
                      </form>
                    </div>

                    {/* Quiz */}
                    <div className="mv-add-card">
                      <span className="mv-add-card-icon">✏️</span>
                      <span className="mv-add-card-title">Thêm Bài kiểm tra</span>
                      <p className="mv-add-card-desc">Tạo câu hỏi mới hoặc lấy từ ngân hàng câu hỏi của bài giảng</p>
                      {questionBankLoading && <p className="manage-videos-hint">Đang tải câu hỏi...</p>}
                      {!questionBankLoading && (
                        <p className="manage-videos-hint">
                          Câu hỏi sẵn có: <strong>{questionBankItems.length}</strong>
                        </p>
                      )}
                      {!questionBankLoading && questionBankItems.length > 0 && (
                        <div className="mv-question-bank-preview">
                          {questionBankItems.slice(0, 5).map((q, idx) => (
                            <p key={q.questionBankId || `${idx}-${q.questionText}`} className="manage-videos-hint">
                              {idx + 1}. {q.questionText}
                            </p>
                          ))}
                          {questionBankItems.length > 5 && (
                            <p className="manage-videos-hint">... và {questionBankItems.length - 5} câu hỏi khác</p>
                          )}
                        </div>
                      )}
                      {questionBankError && <p className="manage-videos-hint" style={{ color: '#fca5a5' }}>{questionBankError}</p>}
                      <button
                        type="button"
                        className="manage-videos-btn manage-videos-btn-ghost"
                        onClick={() => fetchQuestionBank(selectedLessonId)}
                        disabled={questionBankLoading}
                      >
                        {questionBankLoading ? 'Đang tải...' : 'Tải lại ngân hàng câu hỏi'}
                      </button>
                      <button type="button" className="manage-videos-btn manage-videos-btn-primary" onClick={openQuizEditor}>
                        + Tạo bài kiểm tra
                      </button>
                    </div>

                    {/* Practice */}
                    <div className="mv-add-card">
                      <span className="mv-add-card-icon">💻</span>
                      <span className="mv-add-card-title">Thêm Bài thực hành</span>
                      <p className="mv-add-card-desc">Tạo bài code kèm test case cho bài giảng hiện tại</p>
                      <button
                        type="button"
                        className="manage-videos-btn manage-videos-btn-primary"
                        onClick={openPracticeEditor}
                      >
                        + Tạo bài thực hành
                      </button>
                    </div>
                  </div>
                </section>

                {/* ═══ STEP 4: CURRENT CONTENTS ═══ */}
                <section className="manage-videos-section">
                  <h2>4. Nội dung hiện tại</h2>
                  {loadingContents && <p className="manage-videos-hint">Đang tải...</p>}
                  {!loadingContents && contents.length === 0 && <p className="manage-videos-hint">Chưa có nội dung nào.</p>}
                  {!loadingContents && contents.length > 0 && (
                    <div className="mv-content-list">
                      {contents.map((ct, idx) => {
                        const contentId = getContentId(ct)
                        const vid = ct.contentType === 'VIDEO' ? videoMap[contentId] : null
                        const docData = ct.contentType === 'DOCUMENT' ? documentMap[contentId] : null
                        return (
                          <div key={contentId || `${ct.contentType}-${idx}`} className={`mv-content-card mv-content-card--${(ct.contentType || '').toLowerCase()}`}>
                            <div className="mv-content-card-header">
                              <span className="mv-content-card-type">{CONTENT_LABELS[ct.contentType] || ct.contentType}</span>
                              <button type="button" className="manage-videos-btn manage-videos-btn-danger" onClick={() => handleDeleteContent(ct)}>Xóa</button>
                            </div>
                            {ct.contentType === 'VIDEO' && vid && (
                              <div className="manage-videos-video-wrap">
                                <HlsPreviewVideo src={vid.url || vid.videoUrl} className="manage-videos-video" />
                              </div>
                            )}
                            {ct.contentType === 'VIDEO' && !vid && <p className="manage-videos-hint">Video chưa được upload.</p>}
                            {ct.contentType === 'DOCUMENT' && (
                              <div className="manage-videos-hint">
                                <p><strong>{docData?.title || 'Tài liệu bài giảng'}</strong></p>
                                {docData?.documentUrl ? (
                                  <a href={docData.documentUrl} target="_blank" rel="noreferrer">{docData.documentUrl}</a>
                                ) : (
                                  <p>Chưa có URL tài liệu cho nội dung này.</p>
                                )}
                              </div>
                            )}
                            {ct.contentType === 'QUIZ' && <p className="manage-videos-hint">Bài kiểm tra đã tạo.</p>}
                            {ct.contentType === 'PRACTICE' && <p className="manage-videos-hint">Bài thực hành đã tạo.</p>}
                            <div className="mv-content-card-id">ID: {contentId || 'N/A'}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <button type="button" className="manage-videos-btn manage-videos-btn-ghost" style={{ marginTop: '0.5rem' }}
                    onClick={() => loadLessonContents(selectedLessonId)}>
                    🔄 Tải lại nội dung
                  </button>
                </section>
              </>
            )}
          </>
        )}

        {/* ═══════ Quiz Editor Modal ═══════ */}
        {showQuizEditor && (
          <div className="mv-modal-overlay" onClick={() => !savingQuiz && setShowQuizEditor(false)}>
            <div className="mv-quiz-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mv-quiz-modal-header">
                <h2>Tạo bài kiểm tra</h2>
                <button type="button" className="mv-modal-close" onClick={() => !savingQuiz && setShowQuizEditor(false)}>✕</button>
              </div>

              <div className="mv-quiz-modal-body">
                <div className="mv-quiz-meta-row">
                  <label className="mv-quiz-meta-field">
                    <span>Tên bài kiểm tra</span>
                    <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
                  </label>
                  <label className="mv-quiz-meta-field">
                    <span>Thời gian (giây)</span>
                    <input type="number" min={60} value={quizDuration} onChange={(e) => setQuizDuration(Number(e.target.value))} />
                  </label>
                  <label className="mv-quiz-meta-field">
                    <span>Điểm đạt (%)</span>
                    <input type="number" min={0} max={100} value={quizPassScore} onChange={(e) => setQuizPassScore(Number(e.target.value))} />
                  </label>
                  <label className="mv-quiz-meta-field">
                    <span>Số câu trong đề (0 = lấy hết)</span>
                    <input type="number" min={0} value={quizNumQuestions} onChange={(e) => setQuizNumQuestions(Number(e.target.value))} />
                  </label>
                </div>

                <div className="mv-quiz-questions">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={q.id} className="mv-quiz-q-card">
                      <div className="mv-quiz-q-top">
                        <span className="mv-quiz-q-num">Câu {qIdx + 1}</span>
                        <div className="mv-quiz-q-top-right">
                          <select value={q.type} onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)} className="mv-quiz-q-type-select">
                            <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
                            <option value="TRUE_FALSE">Đúng/Sai</option>
                          </select>
                          {quizQuestions.length > 1 && (
                            <button type="button" className="mv-quiz-q-remove" onClick={() => removeQuestion(qIdx)}>✕</button>
                          )}
                        </div>
                      </div>
                      <input className="mv-quiz-q-input" placeholder="Nhập nội dung câu hỏi..."
                        value={q.text} onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)} />
                      <div className="mv-quiz-q-options">
                        {q.options.map((opt, oIdx) => (
                          <div key={opt.id} className="mv-quiz-q-opt">
                            <input type="radio" name={`correct-${q.id}`} checked={q.correctId === opt.id}
                              onChange={() => updateQuestion(qIdx, 'correctId', opt.id)} title="Đáp án đúng" />
                            <span className="mv-quiz-q-opt-letter">{String.fromCharCode(65 + oIdx)}</span>
                            <input className="mv-quiz-q-opt-input" placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}...`}
                              value={opt.text} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} />
                          </div>
                        ))}
                      </div>
                      <p className="mv-quiz-q-correct-hint">
                        Đáp án đúng: <strong>{String.fromCharCode(65 + q.options.findIndex((o) => o.id === q.correctId))}</strong>
                      </p>
                    </div>
                  ))}
                  <button type="button" className="mv-quiz-add-q" onClick={addQuestion}>+ Thêm câu hỏi</button>
                </div>
              </div>

              <div className="mv-quiz-modal-footer">
                <div className="mv-quiz-modal-summary">
                  {quizQuestions.filter((q) => q.text.trim()).length} câu hỏi mới • Ngân hàng: {questionBankItems.length} câu • Đề: {quizNumQuestions || 'tự động'} câu • {Math.floor(quizDuration / 60)} phút • Đạt: {quizPassScore}%
                  {savingQuiz && quizStep && <span style={{ color: '#a5b4fc', marginLeft: 8 }}>{quizStep}</span>}
                </div>
                <div className="mv-quiz-modal-actions">
                  <button type="button" className="manage-videos-btn manage-videos-btn-ghost"
                    onClick={() => setShowQuizEditor(false)} disabled={savingQuiz}>Hủy</button>
                  <button type="button" className="manage-videos-btn manage-videos-btn-primary"
                    onClick={handleCreateQuiz} disabled={savingQuiz}>
                    {savingQuiz ? 'Đang tạo...' : 'Tạo bài kiểm tra'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPracticeEditor && (
          <div className="mv-modal-overlay" onClick={() => !savingPractice && setShowPracticeEditor(false)}>
            <div className="mv-quiz-modal" onClick={(e) => e.stopPropagation()}>
              <div className="mv-quiz-modal-header">
                <h2>Tạo bài thực hành</h2>
                <button type="button" className="mv-modal-close" onClick={() => !savingPractice && setShowPracticeEditor(false)}>✕</button>
              </div>

              <div className="mv-quiz-modal-body">
                <div className="mv-quiz-meta-row">
                  <label className="mv-quiz-meta-field">
                    <span>Tiêu đề</span>
                    <input value={practiceTitle} onChange={(e) => setPracticeTitle(e.target.value)} />
                  </label>
                  <label className="mv-quiz-meta-field">
                    <span>Ngôn ngữ</span>
                    <select className="mv-quiz-q-type-select" value={practiceLanguage} onChange={(e) => setPracticeLanguage(e.target.value)}>
                      <option value="JAVA">JAVA</option>
                      <option value="PYTHON">PYTHON</option>
                    </select>
                  </label>
                  <label className="mv-quiz-meta-field">
                    <span>Độ khó</span>
                    <select className="mv-quiz-q-type-select" value={practiceDifficulty} onChange={(e) => setPracticeDifficulty(e.target.value)}>
                      <option value="EASY">EASY</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="HARD">HARD</option>
                    </select>
                  </label>
                </div>

                <label className="mv-quiz-meta-field" style={{ marginBottom: '0.35rem' }}>
                  <span>Input type (phân tách bằng dấu phẩy)</span>
                  <input
                    value={practiceInputType}
                    onChange={(e) => setPracticeInputType(e.target.value)}
                    placeholder="int[], int"
                  />
                </label>
                <label className="mv-quiz-meta-field" style={{ marginBottom: '0.35rem' }}>
                  <span>Return type</span>
                  <input
                    value={practiceReturnType}
                    onChange={(e) => setPracticeReturnType(e.target.value)}
                    placeholder="int"
                  />
                </label>
                <p className="manage-videos-hint" style={{ marginBottom: '0.8rem' }}>
                  `inputType` sẽ được lưu thành chuỗi JSON, ví dụ: ["int[]","int"].
                </p>
                <p className="manage-videos-hint" style={{ marginBottom: '0.8rem' }}>
                  Mỗi test case sẽ tự tạo {getPracticeArgCount(practiceInputType)} dòng input tương ứng với số kiểu dữ liệu ở inputType.
                </p>

                <label className="mv-quiz-meta-field" style={{ marginBottom: '0.8rem' }}>
                  <span>Starter code</span>
                  <textarea
                    className="mv-practice-textarea mv-practice-textarea--code"
                    value={practiceStarterCode}
                    readOnly
                    rows={6}
                    placeholder="Code khởi tạo (khóa cứng, tự sinh theo language + inputType + returnType)"
                  />
                </label>

                <label className="mv-quiz-meta-field" style={{ marginBottom: '0.8rem' }}>
                  <span>Right code TODO (chỉ sửa phần TODO)</span>
                  <textarea
                    className="mv-practice-textarea mv-practice-textarea--code"
                    value={practiceRightTodo}
                    onChange={(e) => setPracticeRightTodo(e.target.value)}
                    rows={4}
                    placeholder={practiceLanguage === 'PYTHON' ? 'return 0' : 'return 0;'}
                  />
                </label>

                <label className="mv-quiz-meta-field" style={{ marginBottom: '0.8rem' }}>
                  <span>Right code preview</span>
                  <textarea
                    className="mv-practice-textarea mv-practice-textarea--code"
                    value={practiceRightCode}
                    readOnly
                    rows={8}
                    placeholder="Code đáp án (tự ghép)"
                  />
                </label>

                <label className="mv-quiz-meta-field" style={{ marginBottom: '0.8rem' }}>
                  <span>Mô tả</span>
                  <textarea
                    className="mv-practice-textarea"
                    value={practiceDescription}
                    onChange={(e) => setPracticeDescription(e.target.value)}
                    rows={3}
                    placeholder="Mô tả đề bài..."
                  />
                </label>

                <div className="mv-quiz-questions">
                  {practiceCases.map((tc, idx) => (
                    <div key={tc.id} className="mv-quiz-q-card">
                      <div className="mv-quiz-q-top">
                        <span className="mv-quiz-q-num">Test case {idx + 1}</span>
                        <div className="mv-quiz-q-top-right">
                          <select
                            value={tc.outputType}
                            onChange={(e) => updatePracticeCase(idx, 'outputType', e.target.value)}
                            className="mv-quiz-q-type-select"
                          >
                            <option value="NUMBER">NUMBER</option>
                            <option value="STRING">STRING</option>
                            <option value="ARRAY">ARRAY</option>
                          </select>
                          {practiceCases.length > 1 && (
                            <button type="button" className="mv-quiz-q-remove" onClick={() => removePracticeCase(idx)}>✕</button>
                          )}
                        </div>
                      </div>
                      {(Array.isArray(tc.inputValues) ? tc.inputValues : []).map((v, inputIdx) => (
                        <input
                          key={`${tc.id}-in-${inputIdx}`}
                          className="mv-quiz-q-input"
                          placeholder={`Input ${inputIdx + 1}`}
                          value={v}
                          onChange={(e) => updatePracticeCaseInput(idx, inputIdx, e.target.value)}
                        />
                      ))}
                      <input
                        className="mv-quiz-q-input"
                        placeholder="Expected output (bắt buộc, ARRAY thì nhập dạng [1,2,3])"
                        value={tc.expectedOutput}
                        onChange={(e) => updatePracticeCase(idx, 'expectedOutput', e.target.value)}
                      />
                      <input
                        className="mv-quiz-q-input"
                        placeholder="Mô tả test case (không bắt buộc)"
                        value={tc.description}
                        onChange={(e) => updatePracticeCase(idx, 'description', e.target.value)}
                      />
                      <label className="manage-videos-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="checkbox"
                          checked={tc.hidden}
                          onChange={(e) => updatePracticeCase(idx, 'hidden', e.target.checked)}
                        />
                        Test ẩn (hidden)
                      </label>
                    </div>
                  ))}
                  <button type="button" className="mv-quiz-add-q" onClick={addPracticeCase}>+ Thêm test case</button>
                </div>
              </div>

              <div className="mv-quiz-modal-footer">
                <div className="mv-quiz-modal-summary">
                  {practiceCases.length} test case • {practiceLanguage} • {practiceDifficulty}
                  {savingPractice && practiceStep && <span style={{ color: '#a5b4fc', marginLeft: 8 }}>{practiceStep}</span>}
                </div>
                <div className="mv-quiz-modal-actions">
                  <button type="button" className="manage-videos-btn manage-videos-btn-ghost" onClick={() => setShowPracticeEditor(false)} disabled={savingPractice}>Hủy</button>
                  <button type="button" className="manage-videos-btn manage-videos-btn-primary" onClick={handleCreatePractice} disabled={savingPractice}>
                    {savingPractice ? 'Đang tạo...' : 'Tạo bài thực hành'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ManageCourseVideos
