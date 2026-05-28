import { NextRequest, NextResponse } from "next/server";

/**
 * YouTube API — fetches latest videos + view counts from a channel.
 * Uses YouTube Data API v3 with the user's Google/Gemini API key.
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

    // Step 2: Get latest 9 videos from uploads playlist
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=9&key=${apiKey}`
    );
    if (!playlistRes.ok) throw new Error("Failed to fetch videos");
    const playlistData = await playlistRes.json();

    const videoIds = playlistData.items?.map((item: { snippet: { resourceId: { videoId: string } } }) =>
      item.snippet.resourceId.videoId
    ).join(",");

    if (!videoIds) return NextResponse.json({ videos: [] });

    // Step 3: Get view counts for each video
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
    );
    if (!statsRes.ok) throw new Error("Failed to fetch stats");
    const statsData = await statsRes.json();

    const videos = statsData.items?.map((item: {
      id: string;
      snippet: { title: string; thumbnails: { medium: { url: string } } };
      statistics: { viewCount: string };
    }) => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
      views: parseInt(item.statistics?.viewCount || "0"),
    })) || [];

    return NextResponse.json({ videos });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "YouTube API failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
