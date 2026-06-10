import { SearchResults } from '@/lib/types'

import { BaseSearchProvider } from './base'

const YOUCOM_SEARCH_API = 'https://api.you.com/v1/agents/search'

interface YoucomWebResult {
  title: string
  url: string
  snippet?: string
  description?: string
}

export class YoucomSearchProvider extends BaseSearchProvider {
  async search(
    query: string,
    maxResults: number = 10,
    _searchDepth: 'basic' | 'advanced' = 'basic',
    includeDomains: string[] = [],
    excludeDomains: string[] = []
  ): Promise<SearchResults> {
    const apiKey = process.env.YDC_API_KEY
    this.validateApiKey(apiKey, 'YDC')

    const response = await fetch(YOUCOM_SEARCH_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        num_web_results: maxResults,
        ...(includeDomains.length > 0 && {
          include_domains: includeDomains
        }),
        ...(excludeDomains.length > 0 && {
          exclude_domains: excludeDomains
        })
      })
    })

    if (!response.ok) {
      console.error(
        `You.com Search API error: ${response.status} ${response.statusText}`
      )
      throw new Error('Search failed')
    }

    const data = await response.json()
    const hits: YoucomWebResult[] = data.results ?? []

    return {
      results: hits.slice(0, maxResults).map(hit => ({
        title: hit.title,
        url: hit.url,
        content: hit.snippet ?? hit.description ?? ''
      })),
      query,
      images: [],
      number_of_results: hits.length
    }
  }
}
