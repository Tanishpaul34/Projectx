import { createClient } from './client'
import { createBrowserClient } from '@supabase/ssr'

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}))

describe('createClient', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should call createBrowserClient with correct environment variables', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-url.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    createClient()

    expect(createBrowserClient).toHaveBeenCalledTimes(1)
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test-url.supabase.co',
      'test-anon-key'
    )
  })
})
