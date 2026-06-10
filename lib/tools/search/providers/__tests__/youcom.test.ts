import { beforeEach, describe, expect, it, vi } from 'vitest'

import { YoucomSearchProvider } from '../youcom'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('YoucomSearchProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    process.env.YDC_API_KEY = 'test-api-key'
  })

  it('throws when YDC_API_KEY is not set', async () => {
    delete process.env.YDC_API_KEY
    const provider = new YoucomSearchProvider()
    await expect(provider.search('test query', 5)).rejects.toThrow(
      'YDC_API_KEY is not set'
    )
  })

  it('returns mapped results from You.com API response', async () => {
    const apiResponse = {
      results: [
        {
          title: 'Result One',
          url: 'https://example.com/one',
          snippet: 'Snippet for result one'
        },
        {
          title: 'Result Two',
          url: 'https://example.com/two',
          description: 'Description for result two'
        }
      ]
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => apiResponse
    })

    const provider = new YoucomSearchProvider()
    const results = await provider.search('test query', 10)

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.you.com/v1/agents/search')
    expect(JSON.parse(init.body)).toMatchObject({
      query: 'test query',
      num_web_results: 10
    })
    expect(init.headers['Authorization']).toBe('Bearer test-api-key')

    expect(results.query).toBe('test query')
    expect(results.results).toHaveLength(2)
    expect(results.results[0]).toEqual({
      title: 'Result One',
      url: 'https://example.com/one',
      content: 'Snippet for result one'
    })
    expect(results.results[1]).toEqual({
      title: 'Result Two',
      url: 'https://example.com/two',
      content: 'Description for result two'
    })
    expect(results.images).toEqual([])
  })

  it('respects maxResults limit', async () => {
    const hits = Array.from({ length: 10 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.com/${i}`,
      snippet: `Snippet ${i}`
    }))
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: hits }) })

    const provider = new YoucomSearchProvider()
    const results = await provider.search('query', 3)

    expect(results.results).toHaveLength(3)
  })

  it('passes include_domains and exclude_domains when provided', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [] }) })

    const provider = new YoucomSearchProvider()
    await provider.search('query', 5, 'basic', ['example.com'], ['spam.com'])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.include_domains).toEqual(['example.com'])
    expect(body.exclude_domains).toEqual(['spam.com'])
  })

  it('throws on non-ok API response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    const provider = new YoucomSearchProvider()
    await expect(provider.search('query', 5)).rejects.toThrow('Search failed')
  })
})
