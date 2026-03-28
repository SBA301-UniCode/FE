interface StarRatingProps {
  rating?: number
  count?: number | null
  size?: string
}

const StarRating = ({ rating = 0, count, size = '1rem' }: StarRatingProps) => {
  const r = Math.round(rating * 2) / 2

  const stars = Array.from({ length: 5 }, (_, i) => {
    const star = i + 1
    if (star <= r) {
      return (
        <span key={star} className="leading-none text-star-active" style={{ fontSize: size }}>★</span>
      )
    }
    if (star - 0.5 === r) {
      return (
        <span key={star} className="relative inline-block leading-none" style={{ fontSize: size }}>
          <span className="text-star-inactive">★</span>
          <span className="absolute left-0 top-0 w-1/2 overflow-hidden text-star-active">★</span>
        </span>
      )
    }
    return (
      <span key={star} className="leading-none text-star-inactive" style={{ fontSize: size }}>★</span>
    )
  })

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold text-sm text-text-main">{rating > 0 ? rating.toFixed(1) : ''}</span>
      <span className="inline-flex items-center gap-px">{stars}</span>
      {count != null && <span className="text-xs text-text-muted font-medium">({count})</span>}
    </span>
  )
}

export default StarRating
