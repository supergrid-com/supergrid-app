#!/bin/sh
# Tiles the stills given into a two-column contact sheet: sheet.sh out.jpg a.jpg b.jpg ...
out=$1; shift
ins=""; n=0
for f in "$@"; do ins="$ins -i $f"; n=$((n+1)); last=$f; done
if [ $((n % 2)) -eq 1 ]; then ins="$ins -f lavfi -i color=black:s=960x540:d=1"; n=$((n+1)); fi
ffmpeg -y -v error $ins -filter_complex "xstack=inputs=$n:grid=2x$((n/2))" -frames:v 1 "$out"
