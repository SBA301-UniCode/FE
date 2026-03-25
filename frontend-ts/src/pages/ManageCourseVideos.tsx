import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { resolveToId, isUuid, setSlugMap } from '../utils/slug'
import { courseApi } from '../api'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { chapterApi, contentApi, lessonApi, videoApi, examApi, questionBankApi, documentApi, practiceApi } from '../api'
import { useAuth } from '../contexts/useAuth'
import { useTranslation } from 'react-i18next'
import HlsPreviewVideo from './HlsPreviewVideo'
import {
  unwrap, getApiErrorMessage, getContentId, CONTENT_LABELS, safeList,
  readDeletedContentIdMap, writeDeletedContentIdMap, extractPlaybackUrl,
  getVideoDurationSecondsFromFile, uploadFileToS3WithProgress,
  defaultPracticeInputTypes, defaultPracticeReturnType, defaultPracticeTodoByLang,
  parseInputTypeList, getPracticeArgCount, buildStarterCode, buildRightCode,
  createEmptyQuestion, createEmptyPracticeCase,
  btnP, btnG, btnD, inputC, sectionC, hint, gk, gt, lk, lt,
} from './ManageCourseVideosHelpers'
import type { AnyObj, QuizQuestion, PracticeCase } from './ManageCourseVideosHelpers'

const ManageCourseVideos = () => {
  const { courseSlug } = useParams()
  const [courseId, setCourseId] = useState(resolveToId(courseSlug || ''))
  const { user } = useAuth()
  const { t } = useTranslation()
  const roleCode = (user?.roles as unknown as AnyObj[])?.[0]?.roleCode as string | undefined
  const canManage = roleCode === 'INSTRUCTOR' || roleCode === 'ADMIN'

  const [chapters, setChapters] = useState<AnyObj[]>([])
  const [lessons, setLessons] = useState<AnyObj[]>([])
  const [contents, setContents] = useState<AnyObj[]>([])
  const [videoMap, setVideoMap] = useState<Record<string, AnyObj>>({})
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
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStep, setUploadStep] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showQuizEditor, setShowQuizEditor] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizTitle, setQuizTitle] = useState('Bài kiểm tra')
  const [quizDuration, setQuizDuration] = useState(600)
  const [quizPassScore, setQuizPassScore] = useState(60)
  const [quizNumQuestions, setQuizNumQuestions] = useState(0)
  const [savingQuiz, setSavingQuiz] = useState(false)
  const [quizStep, setQuizStep] = useState('')
  const [questionBankLoading, setQuestionBankLoading] = useState(false)
  const [questionBankError, setQuestionBankError] = useState('')
  const [questionBankItems, setQuestionBankItems] = useState<AnyObj[]>([])
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
  const [practiceCases, setPracticeCases] = useState<PracticeCase[]>([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null)
  const [documentMap, setDocumentMap] = useState<Record<string, AnyObj>>({})
  const [examDataMap, setExamDataMap] = useState<Record<string, AnyObj>>({})
  const [editingQuizName, setEditingQuizName] = useState<Record<string, string>>({})
  const [savingQuizName, setSavingQuizName] = useState<Record<string, boolean>>({})
  const [deletedContentIdMap, setDeletedContentIdMap] = useState(() => readDeletedContentIdMap())
  const [creatingDoc, setCreatingDoc] = useState(false)

  const clearMessages = () => { setError(''); setUploadError(''); setActionMsg(''); setQuestionBankError('') }

  const fetchChapters = useCallback(async () => { try { return safeList(await chapterApi.getByCourseId(courseId!)) } catch { return null } }, [courseId])
  const fetchLessons = useCallback(async (chId: string) => { try { return safeList(await lessonApi.getByChapterId(chId)) } catch { return null } }, [])
  const fetchContents = useCallback(async (lId: string) => { try { return safeList(await contentApi.getByLessonId(lId)) } catch { return null } }, [])
  const fetchQuestionBank = useCallback(async (lessonId: string) => { if (!lessonId) { setQuestionBankItems([]); return [] }; setQuestionBankLoading(true); setQuestionBankError(''); try { const p = unwrap(await questionBankApi.getByLessonId(lessonId, 0, 200)) as AnyObj; const list = Array.isArray(p?.content) ? p.content as AnyObj[] : Array.isArray(p) ? p as AnyObj[] : []; setQuestionBankItems(list); return list } catch (err: unknown) { setQuestionBankItems([]); setQuestionBankError(getApiErrorMessage(err, t('manageContent.fetchQuestionBankFailed'))); return [] } finally { setQuestionBankLoading(false) } }, [t])
  const fetchVideoMap = useCallback(async (contentList: AnyObj[]) => { const vMap: Record<string, AnyObj> = {}; const videoItems = contentList.filter((c) => c.contentType === 'VIDEO'); if (!videoItems.length) return vMap; try { const allVideos = Array.isArray(unwrap(await videoApi.getAllActiveVideos())) ? unwrap(await videoApi.getAllActiveVideos()) as AnyObj[] : []; const validIds = new Set(videoItems.map((c) => String(getContentId(c)))); allVideos.forEach((v) => { const cId = String(v?.contentId || ''); if (cId && validIds.has(cId)) vMap[cId] = v }); await Promise.all(Object.entries(vMap).map(async ([cId, v]) => { const vid = v?.videoId as string; if (!vid) return; try { const d = unwrap(await videoApi.getVideoPlaybackUrl(vid)) as AnyObj; const url = extractPlaybackUrl(d); if (url) vMap[cId] = { ...v, ...d, url } } catch {} })) } catch {}; return vMap }, [])
  const fetchDocumentMap = useCallback(async (lessonId: string, contentList: AnyObj[]) => { if (!lessonId) return {}; try { const docs = Array.isArray(unwrap(await documentApi.getByLessonId(lessonId))) ? unwrap(await documentApi.getByLessonId(lessonId)) as AnyObj[] : []; const validIds = new Set((contentList || []).map((c) => String(getContentId(c)))); const m: Record<string, AnyObj> = {}; docs.forEach((doc) => { const cId = String(doc?.contentId || ''); if (cId && validIds.has(cId)) m[cId] = doc }); return m } catch { return {} } }, [])

  /* ── Resolve slug→UUID if needed ── */
  useEffect(() => {
    if (!courseSlug || isUuid(courseSlug)) return // already a UUID
    const resolved = resolveToId(courseSlug)
    if (isUuid(resolved)) { setCourseId(resolved); return } // cache hit
    // Cache miss — fetch courses to populate slug→UUID mapping
    courseApi.getAll(0, 200).then((res) => {
      const list = Array.isArray(unwrap(res)) ? unwrap(res) as AnyObj[] : ((unwrap(res) as AnyObj)?.content as AnyObj[]) || []
      setSlugMap(list.map((x) => ({ id: String(x.courseId || x.id), title: String(x.title || '') })))
      const realId = resolveToId(courseSlug)
      if (isUuid(realId)) setCourseId(realId)
    }).catch(() => {})
  }, [courseSlug])

  useEffect(() => { if (!courseId || !canManage) { setLoadingChapters(false); return }; setLoadingChapters(true); clearMessages(); fetchChapters().then((list) => { setChapters(list || []); setSelectedChapterId(''); setLessons([]); setSelectedLessonId(''); setContents([]); setVideoMap({}); if (!list) setError(t('manageContent.loadChaptersFailed')) }).finally(() => setLoadingChapters(false)) }, [courseId, canManage, fetchChapters, t])
  useEffect(() => { if (!selectedChapterId) { setLessons([]); setSelectedLessonId(''); setContents([]); setVideoMap({}); return }; setLoadingLessons(true); fetchLessons(selectedChapterId).then((list) => { setLessons(list || []); setSelectedLessonId(''); setContents([]); setVideoMap({}) }).finally(() => setLoadingLessons(false)) }, [selectedChapterId, fetchLessons])

  const loadLessonContents = useCallback(async (lId: string) => { if (!lId) { setContents([]); setVideoMap({}); return }; setLoadingContents(true); const list = await fetchContents(lId) || []; const hiddenIds = Array.isArray(deletedContentIdMap[lId]) ? deletedContentIdMap[lId] : []; const visible = hiddenIds.length > 0 ? list.filter((ct) => !hiddenIds.includes(getContentId(ct))) : list; setContents(visible); setVideoMap(await fetchVideoMap(visible)); setDocumentMap(await fetchDocumentMap(lId, visible)); setLoadingContents(false) }, [fetchContents, fetchVideoMap, fetchDocumentMap, deletedContentIdMap])
  useEffect(() => { loadLessonContents(selectedLessonId); fetchQuestionBank(selectedLessonId) }, [selectedLessonId, loadLessonContents, fetchQuestionBank])

  /* Fetch exam info for quiz content items */
  useEffect(() => { if (!contents.length) return; const quizItems = contents.filter((c) => c.contentType === 'QUIZ'); if (!quizItems.length) return; quizItems.forEach(async (ct) => { const cid = getContentId(ct); if (!cid || examDataMap[cid]) return; try { const res = await examApi.getExamById(cid); const exam = unwrap(res) as AnyObj; if (exam) setExamDataMap((p) => ({ ...p, [cid]: exam })) } catch {} }) }, [contents])

  const handleRenameQuiz = async (cid: string) => { const newName = editingQuizName[cid]?.trim(); if (!newName) return; const examId = (examDataMap[cid]?.examId || examDataMap[cid]?.id || cid) as string; setSavingQuizName((p) => ({ ...p, [cid]: true })); try { await examApi.updateExam(examId, { name: newName }); setExamDataMap((p) => ({ ...p, [cid]: { ...p[cid], name: newName, examName: newName } })); setActionMsg(t('manageContent.renamedLesson').replace('bài giảng', 'bài kiểm tra')) } catch (err) { setUploadError(getApiErrorMessage(err, t('manageContent.updateFailed'))) } finally { setSavingQuizName((p) => ({ ...p, [cid]: false })) } }

  const selectedChapter = chapters.find((c) => gk(c) === String(selectedChapterId))
  const selectedLesson = lessons.find((l) => lk(l) === String(selectedLessonId))
  useEffect(() => { setChapterEditTitle(selectedChapter ? gt(selectedChapter) : '') }, [selectedChapter])
  useEffect(() => { setLessonEditTitle(selectedLesson ? lt(selectedLesson) : '') }, [selectedLesson])

  const handleCreateChapter = async () => { if (!newChapterTitle.trim() || !courseId) return; setCreatingChapter(true); clearMessages(); try { const created = unwrap(await chapterApi.create({ courseId, title: newChapterTitle.trim(), orderIndex: chapters.length })) as AnyObj; if (!created) throw new Error(t('manageContent.noDataReceived')); setNewChapterTitle(''); setActionMsg(t('manageContent.createChapterSuccess')); const r = await fetchChapters(); setChapters(r || [...chapters, created]); const nId = String(created.chapterId || created.id || ''); if (nId) setSelectedChapterId(nId) } catch (err) { setError(getApiErrorMessage(err, t('manageContent.createChapterFailed'))) } finally { setCreatingChapter(false) } }
  const handleCreateLesson = async () => { if (!newLessonTitle.trim() || !selectedChapterId) return; setCreatingLesson(true); clearMessages(); try { const created = unwrap(await lessonApi.create({ chapterId: selectedChapterId, title: newLessonTitle.trim(), orderIndex: lessons.length })) as AnyObj; if (!created) throw new Error(t('manageContent.noDataReceived')); setNewLessonTitle(''); setActionMsg(t('manageContent.createLessonSuccess')); const r = await fetchLessons(selectedChapterId); setLessons(r || [...lessons, created]); const nId = String(created.lessonId || created.id || ''); if (nId) setSelectedLessonId(nId) } catch (err) { setError(getApiErrorMessage(err, t('manageContent.createLessonFailed'))) } finally { setCreatingLesson(false) } }
  const handleRenameChapter = async () => { if (!selectedChapterId || !chapterEditTitle.trim()) return; setRenamingChapter(true); clearMessages(); try { await chapterApi.update(selectedChapterId, { title: chapterEditTitle.trim() }); setActionMsg(t('manageContent.renamedChapter')); setChapters(await fetchChapters() || []) } catch (err) { setError(getApiErrorMessage(err, t('manageContent.updateFailed'))) } finally { setRenamingChapter(false) } }
  const handleDeleteChapter = async () => { if (!selectedChapterId || !window.confirm(t('manageContent.confirmDeleteChapter'))) return; setDeletingChapter(true); clearMessages(); try { await chapterApi.delete(selectedChapterId); setActionMsg(t('manageContent.deletedChapter')); setChapters(await fetchChapters() || []); setSelectedChapterId(''); setSelectedLessonId(''); setLessons([]); setContents([]); setVideoMap({}) } catch (err) { setError(getApiErrorMessage(err, t('manageContent.deleteContentFailed'))) } finally { setDeletingChapter(false) } }
  const handleRenameLesson = async () => { if (!selectedLessonId || !lessonEditTitle.trim()) return; setRenamingLesson(true); clearMessages(); try { await lessonApi.update(selectedLessonId, { title: lessonEditTitle.trim() }); setActionMsg(t('manageContent.renamedLesson')); setLessons(await fetchLessons(selectedChapterId) || []) } catch (err) { setError(getApiErrorMessage(err, t('manageContent.updateFailed'))) } finally { setRenamingLesson(false) } }
  const handleDeleteLesson = async () => { if (!selectedLessonId || !window.confirm(t('manageContent.confirmDeleteLesson'))) return; setDeletingLesson(true); clearMessages(); try { await lessonApi.delete(selectedLessonId); setActionMsg(t('manageContent.deletedLesson')); const r = await fetchLessons(selectedChapterId); setLessons(r || []); setSelectedLessonId(''); setContents([]); setVideoMap({}); setQuestionBankItems([]) } catch (err: unknown) { const shouldForce = window.confirm(`${getApiErrorMessage(err, t('manageContent.deleteContentFailed'))}\n\n${t('manageContent.forceDeletePrompt')}`); if (!shouldForce) { setError(getApiErrorMessage(err, t('manageContent.deleteContentFailed'))); setDeletingLesson(false); return }; try { const lc = await fetchContents(selectedLessonId) || []; for (const ct of lc) await contentApi.delete(ct.contentId as string); await lessonApi.delete(selectedLessonId); setActionMsg(t('manageContent.deletedContent')); setLessons(await fetchLessons(selectedChapterId) || []); setSelectedLessonId(''); setContents([]); setVideoMap({}); setQuestionBankItems([]) } catch (fe) { setError(getApiErrorMessage(fe, t('manageContent.deleteContentFailed'))) } } finally { setDeletingLesson(false) } }

  const handleUploadVideo = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedLessonId || !uploadFile) { setUploadError(t('manageContent.selectVideoFile')); return }; setUploadProgress(0); setUploading(true); clearMessages(); try { setUploadStep(t('manageContent.uploadStep1')); const presign = unwrap(await videoApi.generateUploadUrl({ fileName: uploadFile.name, contentType: uploadFile.type || 'video/mp4', size: String(uploadFile.size || 0) })) as AnyObj; const uploadUrl = presign?.uploadUrl as string; const key = presign?.key as string; if (!uploadUrl || !key) throw new Error(t('manageContent.noUploadUrl')); setUploadStep(t('manageContent.uploadStep2')); await uploadFileToS3WithProgress(uploadUrl, uploadFile, setUploadProgress); setUploadStep(t('manageContent.uploadStep3')); const dur = await getVideoDurationSecondsFromFile(uploadFile); const durMin = Math.max(1, Math.round(dur / 60)); const video = unwrap(await videoApi.createVideoRecord({ lessonId: selectedLessonId, duration: durMin, key })) as AnyObj; const cid = video?.contentId as string; setUploadStep(''); setUploadFile(null); setActionMsg(t('manageContent.uploadSuccess')); if (video && cid) setVideoMap((p) => ({ ...p, [cid]: video })); if (cid) setContents((p) => p.some((c) => c.contentId === cid) ? p : [...p, { contentId: cid, contentType: 'VIDEO', lessonId: selectedLessonId }]); const r = await fetchContents(selectedLessonId); if (r) { setContents(r); setVideoMap(await fetchVideoMap(r)) } } catch (err) { setUploadError(getApiErrorMessage(err, t('manageContent.uploadFailed'))); setUploadStep('') } finally { setUploading(false); setUploadProgress(0) } }
  const handleCreateDocument = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedLessonId) return; if (!uploadDocFile) { setUploadError(t('manageContent.selectDocFile')); return }; setCreatingDoc(true); clearMessages(); try { const created = unwrap(await documentApi.create({ lessonId: selectedLessonId, title: documentTitle.trim() || t('manageContent.docDefaultTitle') }, uploadDocFile)) as AnyObj; const cid = created?.contentId as string; if (!cid) throw new Error(t('manageContent.noContentIdReceived')); setDocumentTitle(''); setUploadDocFile(null); setActionMsg(t('manageContent.createDocSuccess')); if (cid) setContents((p) => p.some((c) => c.contentId === cid) ? p : [...p, { contentId: cid, contentType: 'DOCUMENT', lessonId: selectedLessonId }]); await loadLessonContents(selectedLessonId) } catch (err) { setUploadError(getApiErrorMessage(err, t('manageContent.createDocFailed'))) } finally { setCreatingDoc(false) } }
  const handleDeleteContent = async (ct: AnyObj) => { const cid = getContentId(ct); if (!cid) { setUploadError(t('manageContent.noContentId')); return }; const label = CONTENT_LABELS[ct.contentType as string] || ct.contentType; if (!window.confirm(t('manageContent.confirmDeleteContent', { label }))) return; clearMessages(); try { if (ct.contentType === 'DOCUMENT') { const doc = documentMap[cid]; if (!doc?.documentId) throw new Error(t('manageContent.noDocId')); await documentApi.delete(doc.documentId as string) } else { await contentApi.delete(cid) }; const lid = selectedLessonId || (ct.lessonId as string); if (lid) { const nm = { ...readDeletedContentIdMap() }; const cd = Array.isArray(nm[lid]) ? nm[lid] : []; if (!cd.includes(cid)) nm[lid] = [...cd, cid]; writeDeletedContentIdMap(nm); setDeletedContentIdMap(nm) }; const dm = { ...documentMap }; if (dm[cid]) { delete dm[cid]; setDocumentMap(dm) }; setContents((p) => p.filter((i) => getContentId(i) !== cid)); setVideoMap((p) => { const n = { ...p }; delete n[cid]; return n }); setActionMsg(t('manageContent.deletedContentMsg', { label })) } catch (err) { setUploadError(getApiErrorMessage(err, t('manageContent.deleteContentFailed'))) } }

  // Quiz editor helpers
  const openQuizEditor = () => { setQuizQuestions([createEmptyQuestion()]); setQuizTitle('Bài kiểm tra'); setQuizDuration(600); setQuizPassScore(60); setQuizNumQuestions(0); setShowQuizEditor(true) }
  const updateQuestion = (idx: number, field: string, value: string) => setQuizQuestions((p) => p.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  const updateOption = (qi: number, oi: number, text: string) => setQuizQuestions((p) => p.map((q, i) => i !== qi ? q : { ...q, options: q.options.map((o, j) => j === oi ? { ...o, text } : o) }))
  const addQuestion = () => setQuizQuestions((p) => [...p, createEmptyQuestion()])
  const removeQuestion = (idx: number) => { if (quizQuestions.length <= 1) return; setQuizQuestions((p) => p.filter((_, i) => i !== idx)) }

  const handleCreateQuiz = async () => { if (!selectedLessonId) return; const vQs = quizQuestions.filter((q) => q.text.trim() && q.options.some((o) => o.text.trim())); if (vQs.length === 0 && quizNumQuestions <= 0 && questionBankItems.length === 0) { setUploadError(t('manageContent.quizNeedQuestion')); return }; setSavingQuiz(true); clearMessages(); try { if (vQs.length > 0) { setQuizStep(t('manageContent.quizSaving', { count: vQs.length })); for (const q of vQs) { const opts = q.options.filter((o) => o.text.trim()).map((o) => ({ answerText: o.text.trim(), isCorrect: o.id === q.correctId })); await questionBankApi.createQuestion(selectedLessonId, { questionText: q.text.trim(), imageUrl: null, numberAnswers: opts.length, questionType: q.type, options: opts }) } }; const latest = await fetchQuestionBank(selectedLessonId); const avail = Array.isArray(latest) ? latest.length : 0; const numQ = quizNumQuestions > 0 ? quizNumQuestions : avail; if (avail <= 0) { setUploadError(t('manageContent.quizNoQuestions')); setQuizStep(''); return }; if (numQ > avail) { setUploadError(t('manageContent.quizBankInsufficient', { avail, numQ })); setQuizStep(''); return }; setQuizStep(t('manageContent.quizCreating')); await examApi.createExam(selectedLessonId, { name: quizTitle.trim() || t('manageContent.quizDefault'), duration: quizDuration, passScore: quizPassScore, numberQuestions: numQ }); setActionMsg(t('manageContent.quizCreateSuccess')); setShowQuizEditor(false); setQuizStep(''); const r = await fetchContents(selectedLessonId); if (r) setContents(r); else setUploadError(t('manageContent.quizReloadFailed')); await fetchQuestionBank(selectedLessonId) } catch (err) { setUploadError(getApiErrorMessage(err, t('manageContent.quizCreateFailed'))); setQuizStep('') } finally { setSavingQuiz(false) } }

  // Practice editor helpers
  const openPracticeEditor = () => { setPracticeTitle('Bài thực hành'); setPracticeDescription(''); setPracticeLanguage('JAVA'); setPracticeDifficulty('NORMAL'); setPracticeInputType(defaultPracticeInputTypes); setPracticeReturnType(defaultPracticeReturnType); setPracticeRightTodo(defaultPracticeTodoByLang('JAVA')); setPracticeStarterCode(buildStarterCode('JAVA', defaultPracticeInputTypes, defaultPracticeReturnType)); setPracticeRightCode(buildRightCode('JAVA', defaultPracticeInputTypes, defaultPracticeReturnType, defaultPracticeTodoByLang('JAVA'))); setPracticeCases([createEmptyPracticeCase(getPracticeArgCount(defaultPracticeInputTypes))]); setPracticeStep(''); setShowPracticeEditor(true) }
  useEffect(() => { setPracticeStarterCode(buildStarterCode(practiceLanguage, practiceInputType, practiceReturnType)); setPracticeRightCode(buildRightCode(practiceLanguage, practiceInputType, practiceReturnType, practiceRightTodo)) }, [practiceLanguage, practiceInputType, practiceReturnType, practiceRightTodo])
  const addPracticeCase = () => setPracticeCases((p) => [...p, createEmptyPracticeCase(getPracticeArgCount(practiceInputType))])
  const removePracticeCase = (idx: number) => { if (practiceCases.length <= 1) return; setPracticeCases((p) => p.filter((_, i) => i !== idx)) }
  const updatePracticeCase = (idx: number, field: string, value: unknown) => setPracticeCases((p) => p.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc))
  const updatePracticeCaseInput = (ci: number, ii: number, value: string) => setPracticeCases((p) => p.map((tc, i) => { if (i !== ci) return tc; const next = [...(Array.isArray(tc.inputValues) ? tc.inputValues : [])]; while (next.length <= ii) next.push(''); next[ii] = value; return { ...tc, inputValues: next } }))
  useEffect(() => { const ac = getPracticeArgCount(practiceInputType); setPracticeCases((p) => p.map((tc) => { const c = Array.isArray(tc.inputValues) ? tc.inputValues : []; const n = c.slice(0, ac); while (n.length < ac) n.push(''); return { ...tc, inputValues: n } })) }, [practiceInputType])

  const handleCreatePractice = async () => { if (!selectedLessonId) return; const title = practiceTitle.trim(); if (!title) { setUploadError('Nhập tiêu đề.'); return }; const vCases = practiceCases.map((tc) => ({ inputData: JSON.stringify((Array.isArray(tc.inputValues) ? tc.inputValues : []).map((v) => String(v || ''))), expectedOutput: tc.expectedOutput.trim(), outputType: tc.outputType, hidden: Boolean(tc.hidden), description: tc.description.trim() })).filter((tc) => tc.expectedOutput); if (!vCases.length) { setUploadError('Cần ít nhất 1 test case có expectedOutput.'); return }; const badArr = vCases.findIndex((tc) => tc.outputType === 'ARRAY' && !(tc.expectedOutput.startsWith('[') && tc.expectedOutput.endsWith(']'))); if (badArr >= 0) { setUploadError(`Test case ${badArr + 1}: ARRAY phải có dạng [ ... ].`); return }; setSavingPractice(true); clearMessages(); try { setPracticeStep('Đang tạo...'); await practiceApi.createPractice(selectedLessonId, { title, description: practiceDescription.trim(), language: practiceLanguage, difficulty: practiceDifficulty, starterCode: practiceStarterCode, rightCode: practiceRightCode, inputType: JSON.stringify(parseInputTypeList(practiceInputType)), returnType: String(practiceReturnType || '').trim() || defaultPracticeReturnType, testCases: vCases }); setActionMsg('Tạo bài thực hành thành công!'); setShowPracticeEditor(false); setPracticeStep(''); const r = await fetchContents(selectedLessonId); if (r) setContents(r) } catch (err) { setUploadError(getApiErrorMessage(err, 'Tạo thất bại.')); setPracticeStep('') } finally { setSavingPractice(false) } }

  if (!canManage) return <div className="min-h-screen bg-bg-page text-text-main"><Header /><main className="max-w-[1200px] mx-auto px-6 py-8"><div className={sectionC}>{t('manageContent.roleRequired')}</div><Link to="/my-courses" className={`${btnG} no-underline inline-flex items-center gap-1`}>{t('manageContent.backMyCourses')}</Link></main></div>

  return (
    <div className="min-h-screen bg-bg-page text-text-main">
      <Header />
      <div className="bg-[linear-gradient(135deg,#312e81_0%,#4338ca_50%,#6366f1_100%)] px-6 py-6 pb-7 text-white"><div className="max-w-[1200px] mx-auto"><div className="flex items-center gap-1.5 text-[0.82rem] mb-2 text-white/65"><Link to="/" className="text-white/85 no-underline hover:underline">{t('manageContent.breadcrumbHome')}</Link><span>/</span><Link to="/my-courses" className="text-white/85 no-underline hover:underline">{t('manageContent.breadcrumbMyCourses')}</Link><span>/</span><span>{t('manageContent.breadcrumbContent')}</span></div><h1 className="m-0 text-2xl font-extrabold">{t('manageContent.title')}</h1><p className="mt-1 mb-0 text-white/70 text-sm">{t('manageContent.desc')}</p></div></div>

      <main className="max-w-[1200px] mx-auto px-6 py-6 pb-16">
        <div className="flex items-center justify-between mb-4"><div /><Link to="/my-courses" className={`${btnG} no-underline`}>{t('manageContent.backMyCourses')}</Link></div>
        {error && <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-red-600 text-sm mb-3">{error}</div>}
        {uploadError && <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-red-600 text-sm mb-3">{uploadError}</div>}
        {actionMsg && <div className="bg-emerald-50 border border-emerald-200 rounded-[10px] px-4 py-3 text-green-600 text-sm mb-3 flex items-center justify-between">{actionMsg}<button type="button" className="bg-transparent border-none cursor-pointer text-green-600" onClick={() => setActionMsg('')}>✕</button></div>}
        {loadingChapters && <div className="p-4 text-center text-text-muted">{t('manageContent.loadingChapters')}</div>}
        {!loadingChapters && <>
          {/* Step 1: Chapter */}
          <section className={sectionC}><h2 className="m-0 mb-3 text-lg font-bold">{t('manageContent.selectChapter')}</h2>
            {chapters.length > 0 ? <select className={`${inputC} mb-3`} value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)}><option value="">{t('manageContent.chapterSelect')}</option>{chapters.map((c) => <option key={gk(c)} value={gk(c)}>{gt(c)}</option>)}</select> : <p className={hint}>{t('manageContent.noChapters')}</p>}
            <div className="flex gap-2 items-center flex-wrap"><input className={inputC} placeholder="Tên chương mới..." value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()} /><button type="button" className={btnP} onClick={handleCreateChapter} disabled={creatingChapter || !newChapterTitle.trim()}>{creatingChapter ? 'Đang tạo...' : '+ Tạo chương'}</button></div>
            {selectedChapterId && <div className="flex gap-2 items-center flex-wrap mt-3"><input className={inputC} placeholder="Đổi tên chương..." value={chapterEditTitle} onChange={(e) => setChapterEditTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameChapter()} /><button type="button" className={btnG} onClick={handleRenameChapter} disabled={renamingChapter || !chapterEditTitle.trim()}>{renamingChapter ? '...' : 'Sửa tên'}</button><button type="button" className={btnD} onClick={handleDeleteChapter} disabled={deletingChapter}>{deletingChapter ? '...' : 'Xóa chương'}</button></div>}
          </section>

          {/* Step 2: Lesson */}
          <section className={sectionC}><h2 className="m-0 mb-3 text-lg font-bold">{t('manageContent.selectLesson')}</h2>
            {!selectedChapterId && <p className={hint}>Chọn chương trước.</p>}
            {selectedChapterId && loadingLessons && <p className={hint}>Đang tải...</p>}
            {selectedChapterId && !loadingLessons && <>
              {lessons.length > 0 ? <select className={`${inputC} mb-3`} value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)}><option value="">{t('manageContent.lessonSelect')}</option>{lessons.map((l) => <option key={lk(l)} value={lk(l)}>{lt(l)}</option>)}</select> : <p className={hint}>{t('manageContent.noLessons')}</p>}
              <div className="flex gap-2 items-center flex-wrap"><input className={inputC} placeholder="Tên bài giảng mới..." value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateLesson()} /><button type="button" className={btnP} onClick={handleCreateLesson} disabled={creatingLesson || !newLessonTitle.trim()}>{creatingLesson ? '...' : '+ Tạo bài giảng'}</button></div>
              {selectedLessonId && <div className="flex gap-2 items-center flex-wrap mt-3"><input className={inputC} placeholder="Đổi tên..." value={lessonEditTitle} onChange={(e) => setLessonEditTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameLesson()} /><button type="button" className={btnG} onClick={handleRenameLesson} disabled={renamingLesson || !lessonEditTitle.trim()}>{renamingLesson ? '...' : 'Sửa tên'}</button><button type="button" className={btnD} onClick={handleDeleteLesson} disabled={deletingLesson}>{deletingLesson ? '...' : 'Xóa bài giảng'}</button></div>}
            </>}
          </section>

          {selectedLessonId && <>
            {/* Step 3: Add content */}
            <section className={sectionC}><h2 className="m-0 mb-3 text-lg font-bold">{t('manageContent.addContent')}</h2>
              <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
                {/* Video */}
                <div className="border border-border-subtle rounded-xl p-4"><span className="text-2xl">▶</span><div className="font-bold text-sm mt-1">Upload Video</div><p className={`${hint} mt-1`}>Upload MP4 lên S3 → HLS</p><form className="flex flex-col gap-2 mt-2" onSubmit={handleUploadVideo}><input type="file" accept="video/*" className={inputC} onChange={(e) => setUploadFile(e.target.files?.[0] || null)} /><button type="submit" className={btnP} disabled={uploading}>{uploading ? 'Đang xử lý...' : 'Upload'}</button>{!uploading && !uploadFile && <p className={hint}>Chọn file video.</p>}{uploading && uploadStep && <p className="text-[0.82rem] text-indigo-400 m-0">{uploadStep}</p>}{uploading && <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} /></div>}</form></div>
                {/* Document */}
                <div className="border border-border-subtle rounded-xl p-4"><span className="text-2xl">📄</span><div className="font-bold text-sm mt-1">Upload Tài Liệu</div><p className={`${hint} mt-1`}>PDF, Word, Ảnh...</p><form className="flex flex-col gap-2 mt-2" onSubmit={handleCreateDocument}><input type="text" className={inputC} placeholder="Tiêu đề (tùy chọn)" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} disabled={creatingDoc} /><input type="file" className={inputC} onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)} disabled={creatingDoc} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" /><button type="submit" className={btnP} disabled={creatingDoc || !uploadDocFile}>{creatingDoc ? '...' : '+ Tạo tài liệu'}</button></form></div>
                {/* Quiz */}
                <div className="border border-border-subtle rounded-xl p-4"><span className="text-2xl">✏️</span><div className="font-bold text-sm mt-1">Thêm Bài kiểm tra</div><p className={`${hint} mt-1`}>Tạo câu hỏi hoặc lấy từ ngân hàng</p>{questionBankLoading && <p className={hint}>Đang tải câu hỏi...</p>}{!questionBankLoading && <p className={hint}>Câu hỏi sẵn có: <strong>{questionBankItems.length}</strong></p>}{questionBankError && <p className="text-[0.82rem] text-red-400 m-0">{questionBankError}</p>}<div className="flex gap-2 flex-wrap mt-2"><button type="button" className={btnG} onClick={() => fetchQuestionBank(selectedLessonId)} disabled={questionBankLoading}>Tải lại</button><button type="button" className={btnP} onClick={openQuizEditor}>+ Tạo bài kiểm tra</button></div></div>
                {/* Practice */}
                <div className="border border-border-subtle rounded-xl p-4"><span className="text-2xl">💻</span><div className="font-bold text-sm mt-1">Thêm Bài thực hành</div><p className={`${hint} mt-1`}>Tạo bài code kèm test case</p><button type="button" className={`${btnP} mt-2`} onClick={openPracticeEditor}>+ Tạo bài thực hành</button></div>
              </div>
            </section>

            {/* Step 4: Current contents */}
            <section className={sectionC}><h2 className="m-0 mb-3 text-lg font-bold">4. Nội dung hiện tại</h2>
              {loadingContents && <p className={hint}>Đang tải...</p>}
              {!loadingContents && contents.length === 0 && <p className={hint}>Chưa có nội dung nào.</p>}
              {!loadingContents && contents.length > 0 && <div className="flex flex-col gap-3">{contents.map((ct, idx) => { const cid = getContentId(ct); const vid = ct.contentType === 'VIDEO' ? videoMap[cid] : null; const docData = ct.contentType === 'DOCUMENT' ? documentMap[cid] : null; const examData = ct.contentType === 'QUIZ' ? examDataMap[cid] : null; const quizName = (examData?.name || examData?.examName || '') as string; return <div key={cid || `${ct.contentType}-${idx}`} className="border border-border-subtle rounded-xl p-4"><div className="flex items-center justify-between mb-2"><span className="text-sm font-bold">{CONTENT_LABELS[ct.contentType as string] || String(ct.contentType)}</span><button type="button" className={btnD} onClick={() => handleDeleteContent(ct)}>Xóa</button></div>{ct.contentType === 'VIDEO' && vid && <div className="rounded-lg overflow-hidden bg-black"><HlsPreviewVideo src={(vid.url || vid.videoUrl) as string} className="w-full max-h-[300px]" /></div>}{ct.contentType === 'VIDEO' && !vid && <p className={hint}>Video chưa upload.</p>}{ct.contentType === 'DOCUMENT' && <div><p className="m-0 text-sm font-semibold">{(docData?.title || 'Tài liệu') as string}</p>{docData?.documentUrl ? <a href={docData.documentUrl as string} target="_blank" rel="noreferrer" className="text-primary-500 text-sm">{docData.documentUrl as string}</a> : <p className={hint}>Chưa có URL.</p>}</div>}{ct.contentType === 'QUIZ' && <div><div className="flex items-center gap-2 flex-wrap"><input className={`${inputC} flex-1 min-w-[180px]`} value={editingQuizName[cid] ?? quizName} onChange={(e) => setEditingQuizName((p) => ({ ...p, [cid]: e.target.value }))} placeholder="Tên bài kiểm tra" /><button type="button" className={btnG} disabled={savingQuizName[cid] || !(editingQuizName[cid]?.trim()) || editingQuizName[cid]?.trim() === quizName} onClick={() => handleRenameQuiz(cid)}>{savingQuizName[cid] ? '...' : 'Đổi tên'}</button></div>{!quizName && !editingQuizName[cid] && <p className={`${hint} mt-1`}>Bài kiểm tra đã tạo.</p>}</div>}{ct.contentType === 'PRACTICE' && <p className={hint}>Bài thực hành đã tạo.</p>}<div className="text-[0.72rem] text-text-muted mt-1">ID: {cid || 'N/A'}</div></div> })}</div>}
              <button type="button" className={`${btnG} mt-2`} onClick={() => loadLessonContents(selectedLessonId)}>🔄 Tải lại nội dung</button>
            </section>
          </>}
        </>}

        {/* Quiz Editor Modal */}
        {showQuizEditor && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[900]" onClick={() => !savingQuiz && setShowQuizEditor(false)}><div className="bg-white rounded-[18px] w-[95%] max-w-[700px] max-h-[90vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle"><h2 className="m-0 text-lg font-extrabold">Tạo bài kiểm tra</h2><button type="button" className="bg-transparent border-none cursor-pointer text-xl text-text-muted" onClick={() => !savingQuiz && setShowQuizEditor(false)}>✕</button></div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-3 mb-4 max-[640px]:grid-cols-1"><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">Tên<input className={inputC} value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} /></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">Thời gian (giây)<input className={inputC} type="number" min={60} value={quizDuration} onChange={(e) => setQuizDuration(Number(e.target.value))} /></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">Điểm đạt (%)<input className={inputC} type="number" min={0} max={100} value={quizPassScore} onChange={(e) => setQuizPassScore(Number(e.target.value))} /></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">Số câu (0=hết)<input className={inputC} type="number" min={0} value={quizNumQuestions} onChange={(e) => setQuizNumQuestions(Number(e.target.value))} /></label></div>
            {quizQuestions.map((q, qi) => <div key={q.id} className="border border-border-subtle rounded-xl p-4 mb-3"><div className="flex items-center justify-between mb-2"><span className="text-sm font-bold">Câu {qi + 1}</span><div className="flex items-center gap-2"><select className={inputC + ' !w-auto'} value={q.type} onChange={(e) => updateQuestion(qi, 'type', e.target.value)}><option value="MULTIPLE_CHOICE">Trắc nghiệm</option><option value="TRUE_FALSE">Đúng/Sai</option></select>{quizQuestions.length > 1 && <button type="button" className="bg-transparent border-none text-red-500 cursor-pointer text-lg" onClick={() => removeQuestion(qi)}>✕</button>}</div></div><input className={`${inputC} mb-2`} placeholder="Nội dung câu hỏi..." value={q.text} onChange={(e) => updateQuestion(qi, 'text', e.target.value)} />{q.options.map((opt, oi) => <div key={opt.id} className="flex items-center gap-2 mb-1.5"><input type="radio" name={`correct-${q.id}`} checked={q.correctId === opt.id} onChange={() => updateQuestion(qi, 'correctId', opt.id)} /><span className="text-[0.82rem] font-bold w-5">{String.fromCharCode(65 + oi)}</span><input className={inputC} placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`} value={opt.text} onChange={(e) => updateOption(qi, oi, e.target.value)} /></div>)}<p className="text-[0.78rem] text-text-muted mt-1 mb-0">Đáp án đúng: <strong>{String.fromCharCode(65 + q.options.findIndex((o) => o.id === q.correctId))}</strong></p></div>)}
            <button type="button" className={`${btnG} w-full`} onClick={addQuestion}>+ Thêm câu hỏi</button>
          </div>
          <div className="px-6 py-4 border-t border-border-subtle"><div className="text-[0.82rem] text-text-muted mb-2">{quizQuestions.filter((q) => q.text.trim()).length} câu mới • Ngân hàng: {questionBankItems.length} • {Math.floor(quizDuration / 60)} phút • Đạt: {quizPassScore}%{savingQuiz && quizStep && <span className="text-indigo-500 ml-2">{quizStep}</span>}</div><div className="flex gap-3 justify-end"><button type="button" className={btnG} onClick={() => setShowQuizEditor(false)} disabled={savingQuiz}>Hủy</button><button type="button" className={btnP} onClick={handleCreateQuiz} disabled={savingQuiz}>{savingQuiz ? '...' : 'Tạo bài kiểm tra'}</button></div></div>
        </div></div>}

        {/* Practice Editor Modal */}
        {showPracticeEditor && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[900]" onClick={() => !savingPractice && setShowPracticeEditor(false)}><div className="bg-white rounded-[18px] w-[95%] max-w-[700px] max-h-[90vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle"><h2 className="m-0 text-lg font-extrabold">Tạo bài thực hành</h2><button type="button" className="bg-transparent border-none cursor-pointer text-xl text-text-muted" onClick={() => !savingPractice && setShowPracticeEditor(false)}>✕</button></div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-3 gap-3 mb-4 max-[640px]:grid-cols-1"><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">Tiêu đề<input className={inputC} value={practiceTitle} onChange={(e) => setPracticeTitle(e.target.value)} /></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">Ngôn ngữ<select className={inputC} value={practiceLanguage} onChange={(e) => setPracticeLanguage(e.target.value)}><option value="JAVA">JAVA</option><option value="PYTHON">PYTHON</option></select></label><label className="flex flex-col gap-1 text-[0.82rem] font-semibold">Độ khó<select className={inputC} value={practiceDifficulty} onChange={(e) => setPracticeDifficulty(e.target.value)}><option value="EASY">EASY</option><option value="NORMAL">NORMAL</option><option value="HARD">HARD</option></select></label></div>
            <label className="flex flex-col gap-1 text-[0.82rem] font-semibold mb-2">Input type (phân tách bằng dấu phẩy)<input className={inputC} value={practiceInputType} onChange={(e) => setPracticeInputType(e.target.value)} placeholder="int[], int" /></label>
            <label className="flex flex-col gap-1 text-[0.82rem] font-semibold mb-2">Return type<input className={inputC} value={practiceReturnType} onChange={(e) => setPracticeReturnType(e.target.value)} placeholder="int" /></label>
            <p className={`${hint} mb-3`}>Mỗi test case sẽ có {getPracticeArgCount(practiceInputType)} dòng input.</p>
            <label className="flex flex-col gap-1 text-[0.82rem] font-semibold mb-2">Starter code<textarea className={`${inputC} font-mono text-[0.8rem]`} value={practiceStarterCode} readOnly rows={5} /></label>
            <label className="flex flex-col gap-1 text-[0.82rem] font-semibold mb-2">Right code TODO<textarea className={`${inputC} font-mono text-[0.8rem]`} value={practiceRightTodo} onChange={(e) => setPracticeRightTodo(e.target.value)} rows={3} /></label>
            <label className="flex flex-col gap-1 text-[0.82rem] font-semibold mb-2">Right code preview<textarea className={`${inputC} font-mono text-[0.8rem]`} value={practiceRightCode} readOnly rows={6} /></label>
            <label className="flex flex-col gap-1 text-[0.82rem] font-semibold mb-3">Mô tả<textarea className={inputC} value={practiceDescription} onChange={(e) => setPracticeDescription(e.target.value)} rows={3} placeholder="Mô tả đề bài..." /></label>
            {practiceCases.map((tc, idx) => <div key={tc.id} className="border border-border-subtle rounded-xl p-4 mb-3"><div className="flex items-center justify-between mb-2"><span className="text-sm font-bold">Test case {idx + 1}</span><div className="flex items-center gap-2"><select className={inputC + ' !w-auto'} value={tc.outputType} onChange={(e) => updatePracticeCase(idx, 'outputType', e.target.value)}><option value="NUMBER">NUMBER</option><option value="STRING">STRING</option><option value="ARRAY">ARRAY</option></select>{practiceCases.length > 1 && <button type="button" className="bg-transparent border-none text-red-500 cursor-pointer text-lg" onClick={() => removePracticeCase(idx)}>✕</button>}</div></div>{(Array.isArray(tc.inputValues) ? tc.inputValues : []).map((v, ii) => <input key={`${tc.id}-in-${ii}`} className={`${inputC} mb-1.5`} placeholder={`Input ${ii + 1}`} value={v} onChange={(e) => updatePracticeCaseInput(idx, ii, e.target.value)} />)}<input className={`${inputC} mb-1.5`} placeholder="Expected output (bắt buộc)" value={tc.expectedOutput} onChange={(e) => updatePracticeCase(idx, 'expectedOutput', e.target.value)} /><input className={`${inputC} mb-1.5`} placeholder="Mô tả (tùy chọn)" value={tc.description} onChange={(e) => updatePracticeCase(idx, 'description', e.target.value)} /><label className="inline-flex items-center gap-1.5 text-[0.82rem] text-text-muted"><input type="checkbox" checked={tc.hidden} onChange={(e) => updatePracticeCase(idx, 'hidden', e.target.checked)} />Test ẩn</label></div>)}
            <button type="button" className={`${btnG} w-full`} onClick={addPracticeCase}>+ Thêm test case</button>
          </div>
          <div className="px-6 py-4 border-t border-border-subtle"><div className="text-[0.82rem] text-text-muted mb-2">{practiceCases.length} test case • {practiceLanguage} • {practiceDifficulty}{savingPractice && practiceStep && <span className="text-indigo-500 ml-2">{practiceStep}</span>}</div><div className="flex gap-3 justify-end"><button type="button" className={btnG} onClick={() => setShowPracticeEditor(false)} disabled={savingPractice}>Hủy</button><button type="button" className={btnP} onClick={handleCreatePractice} disabled={savingPractice}>{savingPractice ? '...' : 'Tạo bài thực hành'}</button></div></div>
        </div></div>}
      </main>
      <Footer />
    </div>
  )
}

export default ManageCourseVideos
