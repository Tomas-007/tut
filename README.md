# Чат-бот займов (Telegram)

Сценарий: сумма → подходящие офферы с лого → «взяли?» → Fin5 → Т-Заем.

## Локально

```bash
cp .env.example .env
# впишите TELEGRAM_BOT_TOKEN и CALCULATOR_URL
npm install
npm start
```

## Railway

1. Зайдите на [railway.app](https://railway.app) и войдите.
2. **New Project** → **Deploy from GitHub** (или `railway up` из этой папки).
3. В **Variables** добавьте:

| Переменная | Значение |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | токен от [@BotFather](https://t.me/BotFather) |
| `CALCULATOR_URL` | публичная ссылка на калькулятор (Netlify и т.п.) |
| `MIN_AMOUNT` | `3000` (по желанию) |
| `MAX_AMOUNT` | `100000` (по желанию) |

4. Start command: `npm start` (уже в `railway.toml`).
5. После деплоя откройте бота в Telegram → `/start`.

CLI:

```bash
railway login
railway init
railway variables set TELEGRAM_BOT_TOKEN=... CALCULATOR_URL=...
railway up
```

## Калькулятор

Папка `calculator/` — выложите на Netlify Drop, URL впишите в `CALCULATOR_URL`.

## Команды бота

- `/start` — начать  
- `/summa` — снова спросить сумму  
