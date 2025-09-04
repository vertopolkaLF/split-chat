import { H3Event } from 'h3'

type LiveLookupResponse = {
    videoId: string | null
    reason?: string
}

function extractYouTubeIdFromUrl(input: string): { videoId?: string, channelId?: string, handle?: string, vanity?: string, username?: string, queryText?: string } {
    if (input.startsWith('@') && !input.startsWith('@http')) {
        return { handle: input.replace(/^@/, '') }
    }
    if (/^UC[a-zA-Z0-9_-]{20,}$/.test(input)) {
        return { channelId: input }
    }
    if (!/^https?:\/\//i.test(input) && !/^(www\.)?youtube\.com\//i.test(input) && !/^youtu\.be\//i.test(input)) {
        return { queryText: input }
    }

    let url: URL | null = null
    try { url = new URL(input) } catch {
        if (/^(www\.)?youtube\.com\//.test(input) || /^youtu\.be\//.test(input)) {
            try { url = new URL('https://' + input) } catch { }
        }
    }
    if (!url) return {}

    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
        const id = url.pathname.replace(/^\//, '')
        if (id) return { videoId: id }
    }
    if (host.endsWith('youtube.com')) {
        const path = url.pathname
        const sp = url.searchParams
        if (path === '/watch') {
            const v = sp.get('v') || undefined
            if (v) return { videoId: v }
        }
        const liveMatch = path.match(/^\/live\/([\w-]{8,})/)
        if (liveMatch) return { videoId: liveMatch[1] }
        const chMatch = path.match(/^\/channel\/([\w-]{8,})/)
        if (chMatch) return { channelId: chMatch[1] }
        const handleMatch = path.match(/^\/@([\w.-]{2,})/)
        if (handleMatch) return { handle: handleMatch[1] }
        const userMatch = path.match(/^\/user\/([\w.-]{2,})/)
        if (userMatch) return { username: userMatch[1] }
        const vanityMatch = path.match(/^\/c\/([\w.-]{2,})/)
        if (vanityMatch) return { vanity: vanityMatch[1] }
    }
    return {}
}

async function resolveChannelId(apiKey: string, channelId?: string, handle?: string, vanity?: string, username?: string, queryText?: string): Promise<string | null> {
    const base = 'https://www.googleapis.com/youtube/v3'
    if (channelId) return channelId

    if (username) {
        const chUrl = new URL(base + '/channels')
        chUrl.searchParams.set('part', 'id')
        chUrl.searchParams.set('forUsername', username)
        chUrl.searchParams.set('key', apiKey)
        const chRes = await fetch(chUrl)
        if (chRes.ok) {
            const chData: any = await chRes.json()
            const id = chData?.items?.[0]?.id
            if (id) return id
        }
    }

    const q = handle ? `@${handle}` : (vanity || queryText)
    if (q) {
        const url = new URL(base + '/search')
        url.searchParams.set('part', 'id')
        url.searchParams.set('q', q)
        url.searchParams.set('type', 'channel')
        url.searchParams.set('maxResults', '1')
        url.searchParams.set('key', apiKey)
        const res = await fetch(url)
        if (!res.ok) return null
        const data: any = await res.json()
        return data?.items?.[0]?.id?.channelId || null
    }
    return null
}

async function findLiveVideoIdByChannel(apiKey: string, channelId: string): Promise<string | null> {
    const base = 'https://www.googleapis.com/youtube/v3'
    const searchUrl = new URL(base + '/search')
    searchUrl.searchParams.set('part', 'id')
    searchUrl.searchParams.set('channelId', channelId)
    searchUrl.searchParams.set('eventType', 'live')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('maxResults', '1')
    searchUrl.searchParams.set('key', apiKey)
    const res2 = await fetch(searchUrl)
    if (!res2.ok) return null
    const data2: any = await res2.json()
    return data2?.items?.[0]?.id?.videoId || null
}

export default defineEventHandler(async (event: H3Event): Promise<LiveLookupResponse> => {
    const query = getQuery(event)
    let input = (query.input as string | undefined)?.trim() || ''
    if (input.startsWith('@https://') || input.startsWith('@http://')) input = input.slice(1)
    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    console.log('[api][routes] youtube/live input:', input)

    const config = useRuntimeConfig()
    const apiKey = config.youtubeApiKey as string | undefined
    if (!apiKey) return { videoId: null, reason: 'Missing YouTube API key' }
    if (!input) return { videoId: null, reason: 'Missing input' }

    const { videoId: urlVideoId, channelId, handle, vanity, username, queryText } = extractYouTubeIdFromUrl(input)
    if (urlVideoId) return { videoId: urlVideoId }

    const resolvedChannelId = await resolveChannelId(apiKey, channelId, handle, vanity, username, queryText)
    const liveVideoId = resolvedChannelId ? await findLiveVideoIdByChannel(apiKey, resolvedChannelId) : null
    return { videoId: liveVideoId }
})


