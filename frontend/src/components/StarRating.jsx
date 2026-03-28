import './StarRating.css'

const StarRating = ({ rating = 0, count, size = '1rem' }) => {
  const stars = []
  const r = Math.round(rating * 2) / 2 // Round to nearest 0.5

  for (let i = 1; i <= 5; i++) {
    if (i <= r) {
      stars.push(<span key={i} className="star-rating-star star-rating-star--full" style={{ fontSize: size }}>★</span>)
    } else if (i - 0.5 === r) {
      stars.push(
        <span key={i} className="star-rating-star star-rating-star--half" style={{ fontSize: size }}>
          <span className="star-rating-half-bg">★</span>
          <span className="star-rating-half-fg">★</span>
        </span>
      )
    } else {
      stars.push(<span key={i} className="star-rating-star star-rating-star--empty" style={{ fontSize: size }}>★</span>)
    }
  }

  return (
    <span className="star-rating">
      <span className="star-rating-value">{rating > 0 ? rating.toFixed(1) : ''}</span>
      <span className="star-rating-stars">{stars}</span>
      {count != null && <span className="star-rating-count">({count})</span>}
    </span>
  )
}

export default StarRating
