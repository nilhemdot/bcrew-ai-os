const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com'

function getCredentials() {
  const username = String(process.env.DATAFORSEO_USERNAME || '').trim()
  const password = String(process.env.DATAFORSEO_PASSWORD || '').trim()
  if (!username || !password) throw new Error('DATAFORSEO_USERNAME and DATAFORSEO_PASSWORD are required.')
  return { username, password }
}

function getAuthHeader() {
  const { username, password } = getCredentials()
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
}

async function dataForSeoPost(path, payload, { attempts = 3 } = {}) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${DATAFORSEO_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const text = await response.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        throw new Error(`DataForSEO returned non-JSON response (${response.status}).`)
      }
      if (!response.ok) {
        throw new Error(`DataForSEO HTTP ${response.status}: ${json?.status_message || response.statusText}`)
      }
      if (Number(json?.status_code) !== 20000) {
        throw new Error(`DataForSEO status ${json?.status_code || 'unknown'}: ${json?.status_message || 'unknown error'}`)
      }
      return json
    } catch (error) {
      lastError = error
      if (attempt === attempts) break
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }
  throw lastError
}

function getTask(response) {
  const task = Array.isArray(response?.tasks) ? response.tasks[0] : null
  if (!task) throw new Error('DataForSEO response did not include a task.')
  if (Number(task.status_code) !== 20000) {
    throw new Error(`DataForSEO task status ${task.status_code || 'unknown'}: ${task.status_message || 'unknown error'}`)
  }
  return task
}

export async function getYouTubeSubtitles(videoId, {
  languageCode = 'en',
  locationCode = 2840,
  subtitlesLanguage = '',
  subtitlesTranslateLanguage = '',
} = {}) {
  const task = {
    video_id: videoId,
    language_code: languageCode,
    location_code: Number(locationCode) || 2840,
  }
  if (subtitlesLanguage) task.subtitles_language = subtitlesLanguage
  if (subtitlesTranslateLanguage) task.subtitles_translate_language = subtitlesTranslateLanguage

  const response = await dataForSeoPost('/v3/serp/youtube/video_subtitles/live/advanced', [task])
  return {
    response,
    task: getTask(response),
  }
}
