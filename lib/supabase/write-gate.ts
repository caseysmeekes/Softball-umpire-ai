/**
 * Persistence gate used by the Phase 5B integration.
 *
 * This deliberately has no side effects of its own. Callers update their
 * application state only after the supplied Supabase persistence operation
 * resolves successfully. Errors are allowed to propagate unchanged so the
 * caller cannot accidentally report a successful save after a failed write.
 */
export async function persistAfterSuccess<T>(write: () => Promise<T>): Promise<T> {
  return await write()
}

/**
 * Run a set of persistence operations in order and stop at the first failure.
 * This is intentionally not presented as a database transaction. It provides
 * deterministic error propagation for Phase 5B while database-level atomicity
 * remains the responsibility of the Supabase data-access layer where needed.
 */
export async function persistInOrder<T>(writes: Array<() => Promise<T>>): Promise<T[]> {
  const results: T[] = []
  for (const write of writes) {
    results.push(await persistAfterSuccess(write))
  }
  return results
}
