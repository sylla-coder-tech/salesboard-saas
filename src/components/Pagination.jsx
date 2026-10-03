/**
 * Composant de pagination réutilisable.
 */
export default function Pagination({ page, totalPages, totalItems, pageSize, onPrev, onNext, onGoTo }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Générer les numéros de pages à afficher (max 5 autour de la page courante)
  function getPageNumbers() {
    const delta = 2;
    const range = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    if (totalPages > 1) range.push(totalPages);

    return range;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination-wrap">
      <span className="pagination-info">
        {start}–{end} sur {totalItems}
      </span>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          onClick={onPrev}
          disabled={page === 1}
          aria-label="Page précédente"
        >
          ‹
        </button>

        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="pagination-dots">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination-btn ${p === page ? 'pagination-btn-active' : ''}`}
              onClick={() => onGoTo(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="pagination-btn"
          onClick={onNext}
          disabled={page === totalPages}
          aria-label="Page suivante"
        >
          ›
        </button>
      </div>
    </div>
  );
}
