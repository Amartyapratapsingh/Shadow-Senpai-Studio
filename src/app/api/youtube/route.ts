import { NextRequest, NextResponse } from "next/server";

/**
 * YouTube API — fetches latest videos + view counts + descriptions from REKVON channel.
 * Categorizes into "anime" vs "human" based on video description/tags.
 */

const CHANNEL_HANDLE = "REKVON";

export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get("apiKey");
  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });

  try {
    // Step 1: Get channel ID from handle
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${CHANNEL_HANDLE}&key=${apiKey}`
    );
    if (!channelRes.ok) throw new Error("Failed to fetch channel");
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) throw new Error("Channel not found");

    // Step 2: Get latest 12 videos from uploads playlist
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=12&key=${apiKey}`
    );
    if (!playlistRes.ok) throw new Error("Failed to fetch videos");
    const playlistData = await playlistRes.json();

    const videoIds = playlistData.items?.map((item: { snippet: { resourceId: { videoId: string } } }) =>
      item.snippet.resourceId.videoId
    ).join(",");

    if (!videoIds) return NextResponse.json({ anime: [], human: [] });

    // Step 3: Get view counts + full snippet + tags for each video
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
    );
    if (!statsRes.ok) throw new Error("Failed to fetch stats");
    const statsData = await statsRes.json();

    // Categorize: check title/description/tags for "human", "natural", "real", "realistic"
    const humanKeywords = ["human", "natural", "realistic", "real life", "live action", "drama", "kdrama", "cdrama", "chinese drama"];
    const animeKeywords = ["manhwa", "manhua", "manga", "anime", "recap", "webtoon", "system", "reborn", "regression", "isekai", "op mc"];

    const allVideos = statsData.items?.map((item: {
      id: string;
      snippet: { title: string; description: string; tags?: string[]; thumbnails: { medium: { url: string }; high: { url: string } } };
      statistics: { viewCount: string };
    }) => {
      const title = (item.snippet.title || "").toLowerCase();
      const desc = (item.snippet.description || "").toLowerCase();
      const tags = (item.snippet.tags || []).map((t: string) => t.toLowerCase()).join(" ");
      const all = title + " " + desc + " " + tags;

      // Check if human/natural type
      const isHuman = humanKeywords.some(k => all.includes(k));
      const isAnime = animeKeywords.some(k => all.includes(k));

      // If explicitly human → human. If anime keywords → anime. Default → anime.
      const type = isHuman && !isAnime ? "human" : "anime";

      return {
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
        views: parseInt(item.statistics?.viewCount || "0"),
        type,
      };
    }) || [];

    const anime = allVideos.filter((v: { type: string }) => v.type === "anime").slice(0, 6);
    const human = allVideos.filter((v: { type: string }) => v.type === "human").slice(0, 6);

    // If not enough human videos, fill from anime overflow
    if (human.length < 3) {
      const extra = allVideos.filter((v: { type: string }) => v.type === "anime").slice(6, 6 + (3 - human.length));
      human.push(...extra);
    }

    return NextResponse.json({ anime, human });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "YouTube API failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
