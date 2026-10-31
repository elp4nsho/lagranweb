#!/usr/bin/env bash
# Respaldo diario de la base del cliente (Supabase Cloud o autohospedado) con rotación.
# cron (crontab -e):  17 4 * * *  /srv/lgw/backup.sh >> /var/log/lgw-backup.log 2>&1
# Requiere: postgresql-client-16. Variables en /srv/lgw/backup.env:
#   DB_URL="postgresql://postgres.xxxx:CLAVE@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
#   DESTINO=/srv/lgw/respaldos   DIAS=30   (opcional) RCLONE_REMOTO="b2:mi-bucket/cliente"
set -euo pipefail
source "$(dirname "$0")/backup.env"
mkdir -p "$DESTINO"
f="$DESTINO/$(date +%F_%H%M).dump"
pg_dump "$DB_URL" -Fc --no-owner --no-privileges -n public -t auth.users -f "$f"
echo "$(date -Is) ok $(du -h "$f" | cut -f1) $f"
find "$DESTINO" -name '*.dump' -mtime +"${DIAS:-30}" -delete
if [ -n "${RCLONE_REMOTO:-}" ]; then rclone copy "$f" "$RCLONE_REMOTO"; fi
# Restaurar en otra base (probar al menos una vez al mes):
#   pg_restore --no-owner --clean --if-exists -d "$DB_URL_RESTORE" archivo.dump
