import { describe, expect, it } from 'vitest'
import { blockRegistry, isReferenceBlock, parseBlockData } from './index.js'

// parseBlockData takes the type as a string, so it returns a union of every
// block's shape. Narrow explicitly to the fields each test inspects.
const parse = <T>(type: string, data: unknown) => parseBlockData(type, data) as T

describe('newsTeaser layout', () => {
  it('parses stored data without a layout as grid, so published pages do not change', () => {
    expect(parse<{ layout: string }>('newsTeaser', { heading: 'News', limit: 3, category: null }).layout).toBe('grid')
  })

  it('defaults new blocks to featured', () => {
    expect(blockRegistry.newsTeaser.defaults().layout).toBe('featured')
  })

  it('requires at least three articles for the featured layout', () => {
    expect(() => parseBlockData('newsTeaser', { limit: 2, layout: 'featured' })).toThrow(/at least 3/)
    expect(parse<{ limit: number }>('newsTeaser', { limit: 2, layout: 'grid' }).limit).toBe(2)
  })
})

describe('eventsTeaser layout', () => {
  it('parses stored data without a layout as list', () => {
    expect(parse<{ layout: string }>('eventsTeaser', { limit: 3 }).layout).toBe('list')
  })

  it('defaults new blocks to featured', () => {
    expect(blockRegistry.eventsTeaser.defaults().layout).toBe('featured')
  })
})

describe('storiesColumns', () => {
  const column = (title: string) => ({ title, category: title, limit: 3 })

  it('is a reference block', () => {
    expect(isReferenceBlock('storiesColumns')).toBe(true)
  })

  it('accepts one to three columns', () => {
    const parsed = parse<{ columns: unknown[] }>('storiesColumns', { columns: [column('A'), column('B'), column('C')] })
    expect(parsed.columns).toHaveLength(3)
  })

  it('rejects more than three columns', () => {
    expect(() =>
      parseBlockData('storiesColumns', { columns: [column('A'), column('B'), column('C'), column('D')] }),
    ).toThrow()
  })

  it('rejects zero columns and a column without a category', () => {
    expect(() => parseBlockData('storiesColumns', { columns: [] })).toThrow()
    expect(() => parseBlockData('storiesColumns', { columns: [{ title: 'A', category: '', limit: 3 }] })).toThrow()
  })

  it('caps each column at five articles', () => {
    expect(() =>
      parseBlockData('storiesColumns', { columns: [{ title: 'A', category: 'A', limit: 6 }] }),
    ).toThrow()
  })
})
