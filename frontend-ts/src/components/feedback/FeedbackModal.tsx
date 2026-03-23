import { useEffect, useMemo, useState } from 'react'

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
  submitText = 'Lưu',
  submitting = false,
  initialValues = defaultValues,
  existingImages = [],
  onClose,
  onSubmit,
}: FeedbackModalProps) => {
  const [comment, setComment] = useState(defaultValues.comment)
  const [rating, setRating] = useState(defaultValues.rating)
  const [fileList, setFileList] = useState<File[]>([])
  const [removedImageIdMap, setRemovedImageIdMap] = useState<Record<string, boolean>>({})

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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-main">{title}</h3>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-[#F5F7F8] border-none cursor-pointer text-sm font-bold text-text-muted flex items-center justify-center hover:bg-[#E8E8E8]"
            onClick={onClose}
          >
            X
          </button>
        </div>

        {/* Comment */}
        <label htmlFor="feedback-comment" className="text-sm font-semibold text-text-secondary">
          Nội dung bình luận
        </label>
        <textarea
          id="feedback-comment"
          className="w-full min-h-[100px] border border-border-medium rounded-lg p-3 text-sm font-[inherit] text-text-main bg-bg-input resize-y outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(0,86,210,0.1)]"
          value={comment}
          placeholder="Nhập bình luận của bạn..."
          onChange={(e) => setComment(e.target.value)}
        />

        {/* Rating */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-secondary">Đánh giá sao</label>
          <div className="flex gap-1" role="radiogroup" aria-label="Đánh giá sao">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating
              return (
                <button
                  key={star}
                  type="button"
                  className={`w-10 h-10 rounded-lg border-none cursor-pointer text-xl transition-all flex items-center justify-center relative ${
                    active
                      ? 'bg-star-active text-white shadow-[0_2px_8px_rgba(242,208,73,0.4)]'
                      : 'bg-[#F5F7F8] text-star-inactive hover:bg-[#E8E8E8]'
                  }`}
                  aria-checked={rating === star}
                  role="radio"
                  onClick={() => setRating(star)}
                >
                  <span>★</span>
                  {rating === star && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-500 text-white text-[0.6rem] flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="text-xs text-text-muted">{rating} / 5 sao</div>
        </div>

        {/* Existing images */}
        {existingImages.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-text-secondary">Hình ảnh hiện có</div>
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
                    Xóa ảnh này
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Add images */}
        <label htmlFor="feedback-images" className="text-sm font-semibold text-text-secondary">
          Thêm hình ảnh
        </label>
        <input
          id="feedback-images"
          type="file"
          className="text-sm"
          accept="image/*"
          multiple
          onChange={(e) => setFileList(Array.from(e.target.files || []))}
        />
        {fileList.length > 0 && (
          <div className="flex flex-wrap gap-1 text-xs text-text-muted">
            {fileList.map((file) => (
              <span key={`${file.name}-${file.lastModified}`} className="bg-[#F5F7F8] px-2 py-1 rounded">
                {file.name}
              </span>
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
            Hủy
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
            {submitting ? 'Đang gửi...' : submitText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
