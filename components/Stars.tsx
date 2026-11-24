// "★ 4.8 (12)" or "New" when a company has no reviews yet.
export default function Stars({ rating, reviews }: { rating: number | null | undefined; reviews: number | null | undefined }) {
  if (!reviews || rating == null) return <span className="stars new">New</span>;
  return <span className="stars" aria-label={`${rating} out of 5 stars from ${reviews} reviews`}>★ {Number(rating).toFixed(1)} <span className="mute">({reviews})</span></span>;
}
