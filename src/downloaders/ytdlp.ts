import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const YTDLP_BIN = "yt-dlp";
const MAX_SIZE_BYTES = 45 * 1024 * 1024;

export interface DownloadResult {
  filePath: string;
  title: string;
  ext: string;
  fileSize: number;
}

export interface MediaInfo {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  ext: string;
}

async function getTempDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `tgbot_${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function getMediaInfo(url: string): Promise<MediaInfo> {
  const { stdout } = await execFileAsync(
    YTDLP_BIN,
    [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      url,
    ],
    { timeout: 30000 }
  );

  const info = JSON.parse(stdout.trim());
  return {
    title: info.title || "Unknown",
    duration: info.duration || 0,
    thumbnail: info.thumbnail || "",
    uploader: info.uploader || info.channel || "Unknown",
    ext: info.ext || "mp4",
  };
}

export async function downloadVideo(
  url: string,
  quality: "360" | "480" | "720" = "720"
): Promise<DownloadResult> {
  const tmpDir = await getTempDir();
  const outTemplate = path.join(tmpDir, "%(title).50s.%(ext)s");

  const formatSelector = [
    `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]`,
    `bestvideo[height<=${quality}]+bestaudio`,
    `best[height<=${quality}][ext=mp4]`,
    `best[height<=${quality}]`,
    `best[ext=mp4]`,
    `best`,
  ].join("/");

  await execFileAsync(
    YTDLP_BIN,
    [
      "-f", formatSelector,
      "--merge-output-format", "mp4",
      "--no-playlist",
      "--no-warnings",
      "--max-filesize", `${MAX_SIZE_BYTES}`,
      "-o", outTemplate,
      url,
    ],
    { timeout: 180000 }
  );

  const files = await fs.readdir(tmpDir);
  if (files.length === 0) throw new Error("Download failed - no file created");

  const filePath = path.join(tmpDir, files[0]);
  const stat = await fs.stat(filePath);
  const ext = path.extname(files[0]).replace(".", "");
  const title = path.basename(files[0], path.extname(files[0]));

  return { filePath, title, ext, fileSize: stat.size };
}

export async function downloadAudio(url: string): Promise<DownloadResult> {
  const tmpDir = await getTempDir();
  const outTemplate = path.join(tmpDir, "%(title).50s.%(ext)s");

  await execFileAsync(
    YTDLP_BIN,
    [
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", "5",
      "--no-playlist",
      "--no-warnings",
      "--max-filesize", `${MAX_SIZE_BYTES}`,
      "-o", outTemplate,
      url,
    ],
    { timeout: 180000 }
  );

  const files = await fs.readdir(tmpDir);
  if (files.length === 0) throw new Error("Audio download failed");

  const filePath = path.join(tmpDir, files[0]);
  const stat = await fs.stat(filePath);
  const title = path.basename(files[0], ".mp3");

  return { filePath, title, ext: "mp3", fileSize: stat.size };
}

export async function downloadGeneric(url: string): Promise<DownloadResult[]> {
  const tmpDir = await getTempDir();
  const outTemplate = path.join(tmpDir, "%(autonumber)s_%(title).40s.%(ext)s");

  await execFileAsync(
    YTDLP_BIN,
    [
      "--no-warnings",
      "--no-playlist",
      "--max-filesize", `${MAX_SIZE_BYTES}`,
      "-o", outTemplate,
      url,
    ],
    { timeout: 180000 }
  );

  const files = await fs.readdir(tmpDir);
  if (files.length === 0) throw new Error("Download failed - no file created");

  const results: DownloadResult[] = [];
  for (const file of files.slice(0, 5)) {
    const filePath = path.join(tmpDir, file);
    const stat = await fs.stat(filePath);
    const ext = path.extname(file).replace(".", "");
    const title = path.basename(file, path.extname(file));
    results.push({ filePath, title, ext, fileSize: stat.size });
  }

  return results;
}

export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    await fs.rmdir(path.dirname(filePath));
  } catch {
  }
}
