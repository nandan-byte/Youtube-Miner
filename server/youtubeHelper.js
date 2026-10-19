/**
 * Helper to validate YouTube URLs, extract video IDs, and fetch metadata & duration
 */

function extractVideoId(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function formatDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

async function getVideoPreview(url) {
  const videoId = extractVideoId(url);

  if (!videoId) {
    return {
      valid: false,
      error: 'Invalid YouTube URL. Please enter a valid YouTube video or Shorts link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...)'
    };
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`;

  let title = `YouTube Video [${videoId}]`;
  let author = 'YouTube Creator';
  let authorUrl = null;
  let durationSeconds = null;
  let durationFormatted = null;

  try {
    // 1. Fetch oEmbed metadata
    const oembedPromise = fetch(oembedEndpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000)
    }).then(async r => {
      if (r.ok) {
        const d = await r.json();
        title = d.title || title;
        author = d.author_name || author;
        authorUrl = d.author_url || null;
      }
    }).catch(() => {});

    // 2. Fetch video page HTML to extract duration
    const watchPromise = fetch(standardUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000)
    }).then(async r => {
      if (r.ok) {
        const html = await r.text();
        const durationMatch = html.match(/"approxDurationMs":"(\d+)"/);
        if (durationMatch) {
          durationSeconds = Math.round(parseInt(durationMatch[1], 10) / 1000);
          durationFormatted = formatDuration(durationSeconds);
        }
      }
    }).catch(() => {});

    await Promise.all([oembedPromise, watchPromise]);

    return {
      valid: true,
      videoId,
      canonicalUrl: standardUrl,
      title,
      author,
      authorUrl,
      durationSeconds,
      durationFormatted,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      thumbnailHq: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1`
    };
  } catch (err) {
    return {
      valid: true,
      videoId,
      canonicalUrl: standardUrl,
      title: `YouTube Video [${videoId}]`,
      author: 'YouTube',
      authorUrl: null,
      durationSeconds,
      durationFormatted,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      thumbnailHq: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1`,
      warning: 'Could not fetch full video metadata, but video ID is valid.'
    };
  }
}

module.exports = {
  extractVideoId,
  formatDuration,
  getVideoPreview
};
