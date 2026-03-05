#!/bin/bash

# --- НАСТРОЙКИ ---
email="rourory@yandex.com"
rsa_key_size=4096
data_path="./certbot"
nginx_path="./nginx"

# Определяем списки доменов для каждого проекта
# Первый домен в списке будет названием папки сертификата
domains_1=(dailyastro.site www.dailyastro.site)
domains_2=(netnext.site www.netnext.site)
# -----------------

if ! docker compose version >/dev/null 2>&1; then
  echo 'Error: docker compose is not installed.' >&2
  exit 1
fi

echo "### Остановка контейнеров..."
docker compose down

echo "### Очистка старых конфигураций..."
# ВНИМАНИЕ: Это удалит все текущие сертификаты!
sudo rm -rf "$data_path/conf/live"
sudo rm -rf "$data_path/conf/archive"
sudo rm -rf "$data_path/conf/renewal"

mkdir -p "$nginx_path"
mkdir -p "$data_path/conf/live"
mkdir -p "$data_path/www"

echo "### Скачивание параметров TLS ..."
mkdir -p "$data_path/conf"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"

# ----------------------------------------------------------------
# ШАГ 1: Создаем конфиг ТОЛЬКО для HTTP (Port 80)
# Нам нужно, чтобы Nginx ответил на challenge для ОБОИХ доменов
# ----------------------------------------------------------------
echo "### Создание временной конфигурации Nginx (HTTP only)..."
cat > "$nginx_path/default.conf" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${domains_1[*]};  # dailyastro
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${domains_2[*]}; # netnext
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
docker compose up -d nextjs-app netnext nginx

echo "### Ожидание запуска Nginx..."
sleep 10

# ----------------------------------------------------------------
# ШАГ 2: Функция для запроса сертификата
# ----------------------------------------------------------------
request_cert() {
  local domains=("$@")
  local domain_args=""
  for d in "${domains[@]}"; do
    domain_args="$domain_args -d $d"
  done

  case "$email" in
    "") email_arg="--register-unsafely-without-email" ;;
    *) email_arg="-m $email" ;;
  esac

  echo "### Запрос сертификата для: ${domains[*]} ..."
  docker compose run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot \
      $email_arg \
      $domain_args \
      --rsa-key-size $rsa_key_size \
      --agree-tos \
      --force-renewal" certbot
}

# Запрашиваем сертификаты по очереди
request_cert "${domains_1[@]}"
request_cert "${domains_2[@]}"

# ----------------------------------------------------------------
# ШАГ 3: Создаем ПОЛНЫЙ конфиг (HTTP + HTTPS)
# ----------------------------------------------------------------
echo "### Создание боевой конфигурации Nginx (с SSL)..."

# Основной домен для путей (первый в массиве)
d1=${domains_1[0]}
d2=${domains_2[0]}

cat > "$nginx_path/default.conf" << EOF
# --- Upstreams ---
upstream nextjs_upstream {
    server nextjs-app:3000;
}
upstream pgadmin_upstream {
    server pgadmin:80;
}
upstream netnext_upstream {
    server netnext:3000;
}

# --- HTTP Redirects ---
server {
    listen 80;
    listen [::]:80;
    server_name ${domains_1[*]};
    server_tokens off;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 80;
    listen [::]:80;
    server_name ${domains_2[*]};
    server_tokens off;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

# --- HTTPS: Daily Astro ---
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${domains_1[*]};
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/$d1/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$d1/privkey.pem;
    
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

# --- HTTPS: NetNext ---
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${domains_2[*]};
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/$d2/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$d2/privkey.pem;
    
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://netnext_upstream;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "### Перезагрузка Nginx для применения SSL ..."
docker compose exec nginx nginx -s reload

echo "### Готово!"
echo "1. https://$d1"
echo "2. https://$d2"