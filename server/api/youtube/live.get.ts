import { H3Event } from 'h3'

type LiveLookupResponse = {
    videoId: string | null
    reason?: string
}

type CacheEntry = {
    videoId: string | null
    timestamp: number
    reason?: string
}

// In-memory cache for channel lookups (1 hour expiration)
const channelCache = new Map<string, CacheEntry>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

function generateCacheKey(channelId?: string, handle?: string, vanity?: string, username?: string, queryText?: string): string | null {
    // Create a unique key for caching based on channel identifiers
    if (channelId) return `channel:${channelId}`
    if (handle) return `handle:${handle}`
    if (vanity) return `vanity:${vanity}`
    if (username) return `username:${username}`
    if (queryText) return `query:${queryText}`
    return null
}

function isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < CACHE_DURATION
}

function extractYouTubeIdFromUrl(input: string): { videoId?: string, channelId?: string, handle?: string, vanity?: string, username?: string, queryText?: string } {
    // support raw handle and raw channel id
    if (input.startsWith('@')) {
        return { handle: input.replace(/^@/, '') }
    }
    if (/^UC[a-zA-Z0-9_-]{20,}$/.test(input)) {
        return { channelId: input }
    }

    // treat plain text as @handle (as if input was youtube.com/@<handle>)
    if (!/^https?:\/\//i.test(input) && !/^(www\.)?youtube\.com\//i.test(input) && !/^youtu\.be\//i.test(input)) {
        return { handle: input.replace(/^@/, '') }
    }

    let url: URL | null = null
    try {
        url = new URL(input)
    } catch {
        // maybe missing protocol
        if (/^(www\.)?youtube\.com\//.test(input) || /^youtu\.be\//.test(input)) {
            try { url = new URL('https://' + input) } catch { }
        }
    }

    if (!url) return {}

    const host = url.hostname.replace(/^www\./, '')
    if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'music.youtube.com' && host !== 'studio.youtube.com' && host !== 'youtu.be') {
        return {}
    }

    // youtu.be/<id>
    if (host === 'youtu.be') {
        const id = url.pathname.replace(/^\//, '')
        if (id) return { videoId: id }
    }

    const path = url.pathname
    const searchParams = url.searchParams

    // /watch?v=<id>
    if (path === '/watch') {
        const v = searchParams.get('v') || undefined
        if (v) return { videoId: v }
    }

    // /live/<id>
    const liveMatch = path.match(/^\/live\/([a-zA-Z0-9_-]{8,})/)
    if (liveMatch) return { videoId: liveMatch[1] }

    // /channel/<channelId>
    const channelMatch = path.match(/^\/channel\/([a-zA-Z0-9_-]{8,})/)
    if (channelMatch) return { channelId: channelMatch[1] }

    // /@handle or /@handle/live
    const handleMatch = path.match(/^\/@([a-zA-Z0-9._-]{2,})/)
    if (handleMatch) return { handle: handleMatch[1] }

    // /user/<username>
    const userMatch = path.match(/^\/user\/([a-zA-Z0-9._-]{2,})/)
    if (userMatch) return { username: userMatch[1] }

    // /c/<vanity>
    const vanityMatch = path.match(/^\/c\/([a-zA-Z0-9._-]{2,})/)
    if (vanityMatch) return { vanity: vanityMatch[1] }

    return {}
}

async function findLiveVideoIdByChannel(apiKey: string, channelId?: string, handle?: string, vanity?: string, username?: string, queryText?: string): Promise<string | null> {
    const base = 'https://www.googleapis.com/youtube/v3'

    // Resolve to channelId
    let resolvedChannelId = channelId
    let attemptedHandleVerify = false
    console.log('[api] Resolving channel for:', { channelId, handle, vanity, username, queryText })

    // If we have a handle, prefer resolving it precisely via search + channels(snippet.customUrl)
    if (!resolvedChannelId && handle) {
        attemptedHandleVerify = true
        // Primary, precise resolution: channels.list with forHandle
        const forHandleUrl = new URL(base + '/channels')
        forHandleUrl.searchParams.set('part', 'id')
        forHandleUrl.searchParams.set('forHandle', handle)
        forHandleUrl.searchParams.set('key', apiKey)
        console.log('[api] Resolving channelId via forHandle:', forHandleUrl.toString())
        const fhRes = await fetch(forHandleUrl)
        if (fhRes.ok) {
            const fhData: any = await fhRes.json()
            resolvedChannelId = fhData?.items?.[0]?.id || null
            console.log('[api] forHandle resolved channelId:', resolvedChannelId)
        }
        // Fallback verification if forHandle didn't resolve
        if (!resolvedChannelId) {
            const searchUrl = new URL(base + '/search')
            searchUrl.searchParams.set('part', 'id')
            searchUrl.searchParams.set('q', `@${handle}`)
            searchUrl.searchParams.set('type', 'channel')
            searchUrl.searchParams.set('maxResults', '5')
            searchUrl.searchParams.set('key', apiKey)
            console.log('[api] Searching candidates for handle:', searchUrl.toString())
            const sRes = await fetch(searchUrl)
            if (sRes.ok) {
                const data: any = await sRes.json()
                const ids: string[] = (data?.items || []).map((it: any) => it?.id?.channelId).filter(Boolean)
                if (ids.length) {
                    const chUrl = new URL(base + '/channels')
                    chUrl.searchParams.set('part', 'snippet')
                    chUrl.searchParams.set('id', ids.join(','))
                    chUrl.searchParams.set('key', apiKey)
                    console.log('[api] Verifying handle via channels(snippet):', chUrl.toString())
                    const cRes = await fetch(chUrl)
                    if (cRes.ok) {
                        const cData: any = await cRes.json()
                        const match = (cData?.items || []).find((it: any) => String(it?.snippet?.customUrl || '').toLowerCase() === ('@' + handle).toLowerCase())
                        resolvedChannelId = match?.id || null
                        console.log('[api] Handle resolved to channelId (verified):', resolvedChannelId)
                    }
                }
            }
        }
    }

    // If vanity/username/query provided, search for channel (fallback).
    // Do NOT fallback to arbitrary handle search if exact handle verification failed.
    if (!resolvedChannelId && (vanity || username || queryText || (!attemptedHandleVerify && handle))) {
        const url = new URL(base + '/search')
        url.searchParams.set('part', 'id')
        url.searchParams.set('q', handle && !attemptedHandleVerify ? `@${handle}` : String(vanity || username || queryText))
        url.searchParams.set('type', 'channel')
        url.searchParams.set('maxResults', '1')
        url.searchParams.set('key', apiKey)
        console.log('[api] Searching for channel:', url.toString())
        const res = await fetch(url)
        if (!res.ok) {
            console.log('[api] Channel search failed:', res.status)
            return null
        }
        const data: any = await res.json()
        resolvedChannelId = data?.items?.[0]?.id?.channelId
        console.log('[api] Resolved to channelId:', resolvedChannelId)
    }

    if (!resolvedChannelId) {
        console.log('[api] No channelId resolved')
        return null
    }

    const searchUrl = new URL(base + '/search')
    searchUrl.searchParams.set('part', 'id')
    searchUrl.searchParams.set('channelId', resolvedChannelId)
    searchUrl.searchParams.set('eventType', 'live')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('maxResults', '1')
    searchUrl.searchParams.set('key', apiKey)

    console.log('[api] Searching for live video:', searchUrl.toString())
    const res2 = await fetch(searchUrl)
    if (!res2.ok) {
        console.log('[api] Live video search failed:', res2.status)
        return null
    }
    const data2: any = await res2.json()
    const videoId: string | undefined = data2?.items?.[0]?.id?.videoId
    console.log('[api] Found live videoId:', videoId)
    return videoId || null
}

export default defineEventHandler(async (event: H3Event): Promise<LiveLookupResponse> => {
    const query = getQuery(event)
    let input = (query.input as string | undefined)?.trim() || ''
    if (input.startsWith('@https://') || input.startsWith('@http://')) {
        input = input.slice(1)
    }
    console.log('[api] youtube/live input:', input)

    const config = useRuntimeConfig()
    const apiKey = config.youtubeApiKey as string | undefined
    console.log('[api] API key present:', !!apiKey)

    if (!apiKey) {
        console.log('[api] Missing YouTube API key')
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        return { videoId: null, reason: 'Missing YouTube API key' }
    }

    if (!input) {
        console.log('[api] Missing input')
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        return { videoId: null, reason: 'Missing input' }
    }

    const { videoId: urlVideoId, channelId, handle, vanity, username, queryText } = extractYouTubeIdFromUrl(input)
    console.log('[api] Parsed input:', { urlVideoId, channelId, handle, vanity, username, queryText })

    if (urlVideoId) {
        console.log('[api] Direct video ID found:', urlVideoId)
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        return { videoId: urlVideoId }
    }

    // Check cache for channel lookups only
    const cacheKey = generateCacheKey(channelId, handle, vanity, username, queryText)
    if (cacheKey) {
        const cachedEntry = channelCache.get(cacheKey)
        if (cachedEntry && isCacheValid(cachedEntry) && cachedEntry.videoId) {
            console.log('[api] Returning cached result:', { videoId: cachedEntry.videoId, cacheKey, age: Math.round((Date.now() - cachedEntry.timestamp) / 1000) + 's' })
            setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
            return { videoId: cachedEntry.videoId, reason: cachedEntry.reason }
        }
    }

    console.log('[api] Searching for live video on channel...')
    const liveVideoId = await findLiveVideoIdByChannel(apiKey, channelId, handle, vanity, username, queryText)
    console.log('[api] Final result:', { videoId: liveVideoId })

    // Cache the result if we have a cache key (channel lookup)
    // only cache positive results; never cache empty/null
    if (cacheKey && liveVideoId) {
        const cacheEntry: CacheEntry = {
            videoId: liveVideoId,
            timestamp: Date.now()
        }
        channelCache.set(cacheKey, cacheEntry)
        console.log('[api] Cached result for key:', cacheKey)
    }

    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    return { videoId: liveVideoId }
})


