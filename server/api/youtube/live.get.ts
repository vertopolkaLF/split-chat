import { H3Event } from 'h3'

type LiveLookupResponse = {
    videoId: string | null
    reason?: string
}

function extractYouTubeIdFromUrl(input: string): { videoId?: string, channelId?: string, handle?: string, vanity?: string, username?: string, queryText?: string } {
    // support raw handle and raw channel id
    if (input.startsWith('@')) {
        return { handle: input.replace(/^@/, '') }
    }
    if (/^UC[a-zA-Z0-9_-]{20,}$/.test(input)) {
        return { channelId: input }
    }

    // treat plain text as channel search query
    if (!/^https?:\/\//i.test(input) && !/^(www\.)?youtube\.com\//i.test(input) && !/^youtu\.be\//i.test(input)) {
        return { queryText: input }
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

    // If we have a handle, resolve to channelId
    let resolvedChannelId = channelId
    // try legacy username via channels.forUsername
    if (!resolvedChannelId && username) {
        const chUrl = new URL(base + '/channels')
        chUrl.searchParams.set('part', 'id')
        chUrl.searchParams.set('forUsername', username)
        chUrl.searchParams.set('key', apiKey)
        const chRes = await fetch(chUrl)
        if (chRes.ok) {
            const chData: any = await chRes.json()
            resolvedChannelId = chData?.items?.[0]?.id || null
        }
    }

    if (!resolvedChannelId && (handle || vanity || queryText)) {
        const url = new URL(base + '/search')
        url.searchParams.set('part', 'snippet')
        url.searchParams.set('q', handle ? `@${handle}` : String(vanity || queryText))
        url.searchParams.set('type', 'channel')
        url.searchParams.set('maxResults', '1')
        url.searchParams.set('key', apiKey)
        const res = await fetch(url)
        if (!res.ok) return null
        const data: any = await res.json()
        resolvedChannelId = data?.items?.[0]?.snippet?.channelId || data?.items?.[0]?.id?.channelId
    }

    if (!resolvedChannelId) return null

    const searchUrl = new URL(base + '/search')
    searchUrl.searchParams.set('part', 'id')
    searchUrl.searchParams.set('channelId', resolvedChannelId)
    searchUrl.searchParams.set('eventType', 'live')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('maxResults', '1')
    searchUrl.searchParams.set('key', apiKey)

    const res2 = await fetch(searchUrl)
    if (!res2.ok) return null
    const data2: any = await res2.json()
    const videoId: string | undefined = data2?.items?.[0]?.id?.videoId
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
    if (!apiKey) {
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        return { videoId: null, reason: 'Missing YouTube API key' }
    }

    if (!input) {
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        return { videoId: null, reason: 'Missing input' }
    }

    const { videoId: urlVideoId, channelId, handle, vanity, username, queryText } = extractYouTubeIdFromUrl(input)

    if (urlVideoId) {
        setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
        return { videoId: urlVideoId }
    }

    const liveVideoId = await findLiveVideoIdByChannel(apiKey, channelId, handle, vanity, username, queryText)
    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    return { videoId: liveVideoId }
})


