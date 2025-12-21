type TranslateFn = (key: string, params?: Record<string, unknown>) => string

export const paginationMeta = <T extends { page: number; itemsPerPage: number }>(
  options: T,
  total: number,
  t?: TranslateFn,
) => {
  const start = (options.page - 1) * options.itemsPerPage + 1
  const end = Math.min(options.page * options.itemsPerPage, total)

  const normalizedStart = total === 0 ? 0 : start

  if (t)
    return t('common.pagination.showing', { start: normalizedStart, end, total })

  return `Showing ${normalizedStart} to ${end} of ${total} entries`
}
