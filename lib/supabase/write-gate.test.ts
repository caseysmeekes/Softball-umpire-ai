import { describe, expect, it, vi } from 'vitest'
import { persistAfterSuccess, persistInOrder } from './write-gate'

describe('Supabase persistence gate', () => {
  it('resolves only when the persistence operation succeeds', async () => {
    const write = vi.fn().mockResolvedValue({ ok: true })

    await expect(persistAfterSuccess(write)).resolves.toEqual({ ok: true })
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('propagates a Supabase write failure instead of reporting success', async () => {
    const error = new Error('Supabase write failed')
    const write = vi.fn().mockRejectedValue(error)

    await expect(persistAfterSuccess(write)).rejects.toBe(error)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('stops ordered persistence at the first failed write', async () => {
    const first = vi.fn().mockResolvedValue('first')
    const second = vi.fn().mockRejectedValue(new Error('second failed'))
    const third = vi.fn().mockResolvedValue('third')

    await expect(persistInOrder([first, second, third])).rejects.toThrow('second failed')
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(third).not.toHaveBeenCalled()
  })
})
