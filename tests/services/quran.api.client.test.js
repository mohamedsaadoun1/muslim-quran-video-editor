import { describe, it, expect, vi } from 'vitest'
import { fetchQuranData } from '../../services/quran.api.client.js'

// Mock the global fetch API
global.fetch = vi.fn()

describe('Quran API Client', () => {
  const mockSuccessResponse = {
    verses: [
      {
        verse_key: '2:255',
        text_uthmani: 'آية الكرسي',
        translations: [
          {
            language_name: 'ar',
            text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۖ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۖ لَّهُ مَا فِي السَّمَٰوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَٰوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ'
          }
        ]
      }
    ]
  }

  const mockErrorResponse = {
    error: 'Internal Server Error'
  }

  it('should fetch quran data successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResponse
    })

    const data = await fetchQuranData('chapters/2/verses/255')

    expect(data).toEqual(mockSuccessResponse)
    expect(fetch).toHaveBeenCalledWith('https://api.quran.com/api/v4/verses/by_key/2 :255')
  })

  it('should handle API errors gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => mockErrorResponse
    })

    await expect(fetchQuranData('invalid/route')).rejects.toThrow('API request failed with status 500')
  })

  it('should throw error on network failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network Error'))

    await expect(fetchQuranData('chapters/2/verses/255')).rejects.toThrow('Network Error')
  })
})
