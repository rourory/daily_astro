#!/bin/bash

# --- НАСТРОЙКИ ---
domains=(dailyastro.site)
email="rourory@yandex.com"
# -----------------

rsa_key_size=4096
data_path="./certbot"
nginx_path="./nginx"
domain=${domains[0]}

if ! docker compose version >/dev/null 2>&1; then
  echo 'Error: docker compose is not installed.' >&2
  exit 1
fi

echo "### Остановка контейнеров..."
docker compose down

echo "### Очистка старых конфигураций..."
# Удаляем старые сертификаты, чтобы начать с чистого листа
sudo rm -rf "$data_path/conf/live"
sudo rm -rf "$data_path/conf/archive"
sudo rm -rf "$data_path/conf/renewal"

mkdir -p "$nginx_path"
mkdir -p "$data_path/conf/live/$domain"
mkdir -p "$data_path/www"

echo "### Скачивание параметров TLS ..."
mkdir -p "$data_path/conf"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"

# ----------------------------------------------------------------
# ШАГ 1: Создаем конфиг ТОЛЬКО для HTTP (Port 80)
# Это нужно, чтобы Nginx запустился и Certbot мог проверить домен
# ----------------------------------------------------------------
echo "### Создание временной конфигурации Nginx (HTTP only)..."
cat > "$nginx_path/default.conf" << EOF
upstream nextjs_upstream {
    server nextjs-app:3000;
}
upstream pgadmin_upstream {
    server pgadmin:80;
}

server {
    listen 80;
    listen [::]:80;
    server_name $domain www.$domain;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

echo "### Запуск Nginx ..."
docker compose up -d nextjs-app nginx

echo "### Ожидание запуска Nginx..."
sleep 10

# ----------------------------------------------------------------
# ШАГ 2: Запрашиваем сертификат
# ----------------------------------------------------------------
echo "### Запрос реального сертификата Let's Encrypt ..."
domain_args=""
for d in "${domains[@]}"; do
  domain_args="$domain_args -d $d"
done

case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="-m $email" ;;
esac

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot

# ----------------------------------------------------------------
# ШАГ 3: Создаем ПОЛНЫЙ конфиг (HTTP + HTTPS)
# Теперь сертификаты есть, можно включать SSL
# ----------------------------------------------------------------
echo "### Создание боевой конфигурации Nginx (с SSL)..."
cat > "$nginx_path/default.conf" << EOF
upstream nextjs_upstream {
    server nextjs-app:3000;
}
upstream pgadmin_upstream {
    server pgadmin:80;
}

server {
    listen 80;
    listen [::]:80;
    server_name $domain www.$domain;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $domain www.$domain;
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://nextjs_upstream;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /db/ {
        proxy_pass http://pgadmin_upstream/;
        proxy_set_header X-Script-Name /db;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_redirect off;
    }
}
EOF

echo "### Перезагрузка Nginx для применения SSL ..."
docker compose exec nginx nginx -s reload

echo "### Готово! Проверяйте https://$domain"