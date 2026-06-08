#!/usr/bin/env bash
# Encode web-optimized versions of the site videos from the raw masters in
# assets/_video-masters/ to their referenced paths. Sized to stay under the
# 100 MB GitHub per-file limit so they can be committed and deployed via Netlify.
set -e
FF=node_modules/ffmpeg-static/ffmpeg.exe
M=assets/_video-masters

echo "[1/3] hello-eva (4K portrait, 9min, with sound) -> 720x1280"
"$FF" -y -hide_banner -loglevel error -stats -i "$M/hello-eva.mp4" \
  -vf scale=720:-2 -c:v libx264 -preset medium -crf 26 -maxrate 1.2M -bufsize 2.4M \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart \
  "assets/meet-eva-here/hello-eva.mp4"

echo "[2/3] ophelia-reassembled (4K landscape, 15s) -> 1920x1080"
"$FF" -y -hide_banner -loglevel error -stats -i "$M/ophelia-reassembled.mp4" \
  -vf scale=1920:-2 -c:v libx264 -preset medium -crf 23 \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart \
  "assets/after-ophelia/ophelia-reassembled.mp4"

echo "[3/3] ophelia-retold (1080p, 78s) -> recompress"
"$FF" -y -hide_banner -loglevel error -stats -i "$M/ophelia-retold.mp4" \
  -c:v libx264 -preset medium -crf 24 \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart \
  "assets/after-ophelia/ophelia-retold.mp4"

echo "=== DONE. optimized sizes: ==="
ls -lh assets/meet-eva-here/hello-eva.mp4 \
       assets/after-ophelia/ophelia-reassembled.mp4 \
       assets/after-ophelia/ophelia-retold.mp4
