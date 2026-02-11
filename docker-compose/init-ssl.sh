#!/bin/bash

# --- НАСТРОЙКИ ---
domains=(dailyastro.site) 
email="rourory@yandex.com"
# -----------------

rsa_key_size=4096
data_path="./certbot"
nginx_path="./nginx"
domain=${domains[0]} 

if ! [ -x "$(command -v docker compose)" ]; then
  echo 'Error: docker compose is not installed.' >&2
  exit 1
fi

echo "### Очистка старых конфигураций..."
sudo rm -rf "$nginx_path/default.conf"
# Для чистого старта удаляем старые сертификаты, если скрипт ранее падал
sudo rm -rf "$data_path/conf/live"
sudo rm -rf "$data_path/conf/archive"
sudo rm -rf "$data_path/conf/renewal"

mkdir -p "$nginx_path"
mkdir -p "$data_path/conf/live/$domain"

echo "### Создание конфигурации Nginx..."
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

echo "### Скачивание параметров TLS ..."
mkdir -p "$data_path/conf"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"

echo "### Создание ВРЕМЕННОГО самоподписанного сертификата ..."
path="/etc/letsencrypt/live/$domain"
mkdir -p "$data_path/conf/live/$domain"

docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Запуск Nginx ..."
docker compose up --force-recreate -d nextjs-app nginx

echo "### Удаление временного сертификата ..."
# ИСПРАВЛЕНИЕ: Удаляем всю папку, чтобы Certbot создал правильные симлинки
sudo rm -rf "$data_path/conf/live/$domain"
sudo rm -rf "$data_path/conf/archive/$domain"
sudo rm -rf "$data_path/conf/renewal/$domain.conf"

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

echo "### Перезагрузка Nginx ..."
docker compose exec nginx nginx -s reload

echo "### Готово! Проверяйте https://$domain"