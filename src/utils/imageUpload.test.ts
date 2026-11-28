import { describe, it, expect } from 'vitest'
import { esHeic } from './imageUpload'

describe('esHeic', () => {
  it('detecta HEIC/HEIF por tipo MIME', () => {
    expect(esHeic(new File(['x'], 'foto', { type: 'image/heic' }))).toBe(true)
    expect(esHeic(new File(['x'], 'foto', { type: 'image/heif' }))).toBe(true)
  })

  it('detecta HEIC por extensión cuando el navegador no da tipo (Windows/Chrome)', () => {
    expect(esHeic(new File(['x'], 'IMG_0001.HEIC', { type: '' }))).toBe(true)
    expect(esHeic(new File(['x'], 'IMG_0002.heif'))).toBe(true)
  })

  it('no confunde JPEG, PNG ni blobs sin nombre', () => {
    expect(esHeic(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))).toBe(false)
    expect(esHeic(new File(['x'], 'foto.png', { type: 'image/png' }))).toBe(false)
    expect(esHeic(new Blob(['x'], { type: 'image/webp' }))).toBe(false)
  })
})
