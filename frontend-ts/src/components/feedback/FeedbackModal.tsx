import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface FeedbackImage {
  imageId?: string
  imageUrl: string
}

interface FeedbackValues {
  comment: string
  rating: number
}

interface SubmitPayload {
  comment: string
  rating: number
  fileList: File[]
  imageRemoveId?: string[]
}

interface FeedbackModalProps {
  open: boolean
  title: string
  submitText?: string
  submitting?: boolean
  initialValues?: FeedbackValues
  existingImages?: FeedbackImage[]
  onClose: () => void
  onSubmit: (payload: SubmitPayload) => void
}

const defaultValues: FeedbackValues = { comment: '', rating: 5 }

const FeedbackModal = ({
  open,
  title,
  submitText,
  submitting = false,
  initialValues = defaultValues,
  existingImages = [],
  onClose,
  onSubmit,
}: FeedbackModalProps) => {
  const { t } = useTranslation()
  const [comment, setComment] = useState(defaultValues.comment)
  const [rating, setRating] = useState(defaultValues.rating)
  const [fileList, setFileList] = useState<File[]>([])
  const [removedImageIdMap, setRemovedImageIdMap] = useState<Record<string, boolean>>({})

  const ratingLabels = ['', t('feedback.ratingVeryBad'), t('feedback.ratingBad'), t('feedback.ratingNormal'), t('feedback.ratingGood'), t('feedback.ratingExcellent')]

  useEffect(() => {
    if (!open) return
    setComment(initialValues?.comment || '')
    setRating(Number(initialValues?.rating) || 5)
    setFileList([])
    setRemovedImageIdMap({})
  }, [open, initialValues])

  const removedImageIdList = useMemo(
    () =>
      Object.entries(removedImageIdMap)
        .filter(([id, checked]) => Boolean(id) && checked)
        .map(([id]) => id),
    [removedImageIdMap],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="flex items-center justify-between bg-[linear-gradient(135deg,#0056D2,#003E99)] rounded-t-xl -mx-6 -mt-6 px-6 py-4 mb-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><span className="text-xl">💬</span> {title}</h3>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white/20 border-none cursor-pointer text-sm font-bold text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Comment */}
        <label htmlFor="feedback-comment" className="text-sm font-semibold text-text-secondary">
          {t('feedback.commentLabel')}
        </label>
        <textarea
          id="feedback-comment"
          className="w-full min-h-[100px] border border-border-medium rounded-lg p-3 text-sm font-[inherit] text-text-main bg-bg-input resize-y outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]"
          value={comment}
          placeholder={t('feedback.commentPlaceholder')}
          onChange={(e) => setComment(e.target.value)}
        />

        {/* Rating */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-secondary">{t('feedback.ratingLabel')}</label>
          <div className="flex gap-2" role="radiogroup" aria-label={t('feedback.ratingLabel')}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating
              return (
                <button
                  key={star}
                  type="button"
                  className={`w-12 h-12 rounded-xl border-2 cursor-pointer text-2xl transition-all flex items-center justify-center relative ${
                    active
                      ? 'bg-amber-50 text-amber-500 border-amber-400 shadow-[0_2px_12px_rgba(245,158,11,0.3)] scale-110'
                      : 'bg-[#F5F7F8] text-gray-300 border-transparent hover:bg-amber-50 hover:text-amber-400 hover:border-amber-200 hover:scale-105'
                  }`}
                  aria-checked={rating === star}
                  role="radio"
                  onClick={() => setRating(star)}
                >
                  <span>★</span>
                  {rating === star && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 text-white text-[0.65rem] flex items-center justify-center shadow-sm">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="text-xs text-text-muted">{t('feedback.ratingDesc', { rating })} — {ratingLabels[rating]}</div>
        </div>

        {/* Existing images */}
        {existingImages.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-text-secondary">{t('feedback.existingImages')}</div>
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((img) => (
                <label key={img.imageId || img.imageUrl} className="cursor-pointer relative rounded-lg overflow-hidden">
                  <img src={img.imageUrl} alt="feedback" className="w-full h-20 object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[0.65rem] px-1.5 py-1 flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="accent-danger-500"
                      checked={Boolean(removedImageIdMap[String(img.imageId || '')])}
                      onChange={(e) =>
                        setRemovedImageIdMap((prev) => ({
                          ...prev,
                          [String(img.imageId || '')]: e.target.checked,
                        }))
                      }
                    />
                    {t('feedback.removeImage')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Add images */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-secondary">{t('feedback.addImages')}</label>
          <label htmlFor="feedback-images" className="flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-dashed border-border-medium rounded-xl bg-[#FAFAFA] cursor-pointer transition-colors hover:border-primary-500 hover:bg-blue-50/50">
            <span className="text-2xl">📷</span>
            <span className="text-sm text-text-muted">{t('feedback.addImageDesc')}</span>
            <span className="text-[0.75rem] text-text-dim">{t('feedback.addImageHint')}</span>
          </label>
          <input
            id="feedback-images"
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={(e) => setFileList(Array.from(e.target.files || []))}
          />
        </div>
        {fileList.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {fileList.map((file) => (
              <div key={`${file.name}-${file.lastModified}`} className="relative rounded-lg overflow-hidden border border-border-medium">
                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-16 object-cover block" />
                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[0.6rem] px-1 py-0.5 truncate">{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
          <button
            type="button"
            className="px-4 py-2 rounded-[var(--radius-btn)] text-sm font-semibold border border-border-medium bg-transparent text-text-secondary cursor-pointer transition-colors hover:bg-[#F5F7F8]"
            onClick={onClose}
          >
            {t('feedback.cancelBtn')}
          </button>
          <button
            type="button"
            className="px-5 py-2 rounded-[var(--radius-btn)] text-sm font-semibold border-none bg-primary-500 text-white cursor-pointer transition-all hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || !comment.trim()}
            onClick={() => {
              const submitPayload: SubmitPayload = {
                comment: comment.trim(),
                rating: Number(rating) || 5,
                fileList,
                ...(removedImageIdList.length > 0 ? { imageRemoveId: removedImageIdList } : {}),
              }
              onSubmit(submitPayload)
            }}
          >
            {submitting ? t('feedback.submitting') : (submitText || t('common.save'))}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
