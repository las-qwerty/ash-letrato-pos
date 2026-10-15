'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Client-side pagination. `resetDeps` should list any filters —
 * page snaps back to 1 when they change.
 */
export function usePager<T>(items: T[], initialPerPage = 10, resetDeps: unknown[] = []) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);

  const pageCount = Math.max(1, Math.ceil(items.length / perPage));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), [perPage, ...resetDeps]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * perPage, page * perPage),
    [items, page, perPage],
  );

  return {
    pageItems,
    page,
    perPage,
    pageCount,
    total: items.length,
    setPage,
    setPerPage,
  };
}
