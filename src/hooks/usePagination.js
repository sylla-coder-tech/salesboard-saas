import { useMemo, useState } from 'react';

/**
 * Hook de pagination côté client.
 * @param {Array} items - Liste complète des éléments
 * @param {number} pageSize - Nombre d'éléments par page
 */
export function usePagination(items = [], pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Recalibrer si la page courante dépasse le total après un filtre
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  function goToPage(p) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  function nextPage() {
    goToPage(safePage + 1);
  }

  function prevPage() {
    goToPage(safePage - 1);
  }

  function resetPage() {
    setPage(1);
  }

  return {
    page: safePage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}
