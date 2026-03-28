import { useEffect, useMemo, useState } from 'react'
import './FeedbackModal.css'

const defaultValues = {
  comment: '',
  rating: 5,
}

const FeedbackModal = ({
  open,
  title,
  submitText = 'Lưu',
  submitting = false,
  initialValues = defaultValues,
  existingImages = [],
  onClose,
  onSubmit,
}) => {
  const [comment, setComment] = useState(defaultValues.comment)
  const [rating, setRating] = useState(defaultValues.rating)
  const [fileList, setFileList] = useState([])
  const [removedImageIdMap, setRemovedImageIdMap] = useState({})

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
    [removedImageIdMap]
  )

  if (!open) return null

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-head">
          <h3>{title}</h3>
          <button type="button" className="feedback-modal-close" onClick={onClose}>X</button>
        </div>

        <label htmlFor="feedback-comment" className="feedback-modal-label">Nội dung bình luận</label>
        <textarea
          id="feedback-comment"
          className="feedback-modal-textarea"
          value={comment}
          placeholder="Nhập bình luận của bạn..."
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="feedback-modal-row">
          <label className="feedback-modal-label">Đánh giá sao</label>
          <div className="feedback-modal-stars" role="radiogroup" aria-label="Đánh giá sao">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= rating
              return (
                <button
                  key={star}
                  type="button"
                  className={`feedback-modal-star-btn ${active ? 'is-active' : ''}`}
                  aria-checked={rating === star}
                  role="radio"
                  onClick={() => setRating(star)}
                >
                  <span className="feedback-modal-star-icon">★</span>
                  {rating === star && <span className="feedback-modal-star-check">✓</span>}
                </button>
              )
            })}
          </div>
          <div className="feedback-modal-rating-text">{rating} / 5 sao</div>
        </div>

        {existingImages.length > 0 && (
          <div className="feedback-modal-existing">
            <div className="feedback-modal-label">Hình ảnh hiện có</div>
            <div className="feedback-modal-existing-grid">
              {existingImages.map((img) => (
                <label key={img.imageId || img.imageUrl} className="feedback-modal-existing-item">
                  <img src={img.imageUrl} alt="feedback" />
                  <span className="feedback-modal-remove-wrap">
                    <input
                      className="feedback-modal-remove-checkbox"
                      type="checkbox"
                      checked={Boolean(removedImageIdMap[String(img.imageId || '')])}
                      onChange={(e) =>
                        setRemovedImageIdMap((prev) => ({
                          ...prev,
                          [String(img.imageId || '')]: e.target.checked,
                        }))
                      }
                    />
                    <span className="feedback-modal-remove-icon">✓</span>
                    Xoa anh nay
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <label htmlFor="feedback-images" className="feedback-modal-label">Thêm hình ảnh</label>
        <input
          id="feedback-images"
          type="file"
          className="feedback-modal-file"
          accept="image/*"
          multiple
          onChange={(e) => setFileList(Array.from(e.target.files || []))}
        />
        {fileList.length > 0 && (
          <div className="feedback-modal-files">
            {fileList.map((file) => (
              <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>
            ))}
          </div>
        )}

        <div className="feedback-modal-actions">
          <button type="button" className="feedback-modal-btn feedback-modal-btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="feedback-modal-btn feedback-modal-btn-primary"
            disabled={submitting || !comment.trim()}
            onClick={() => {
              const submitPayload = {
                comment: comment.trim(),
                rating: Number(rating) || 5,
                fileList,
                ...(removedImageIdList.length > 0 ? { imageRemoveId: removedImageIdList } : {}),
              }
              console.log('[FeedbackModal] image ids selected for removal:', submitPayload.imageRemoveId || [])
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
