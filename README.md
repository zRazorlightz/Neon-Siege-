# ⚡ NEON SIEGE

Top-down survival shooter. Cyberpunk. Neo-Shinjuku 2087.

## Deploy to Vercel (3 шага)

```bash
# 1. Установить зависимости
npm install

# 2. Проверить локально
npm run dev

# 3. Задеплоить на Vercel
npx vercel --prod
```

Или через GitHub:
1. `git init && git add . && git commit -m "init"`
2. Создай репо на github.com
3. `git remote add origin <url> && git push -u origin main`
4. Зайди на vercel.com → Import → выбери репо → Deploy

## Управление

| | Desktop | Mobile |
|---|---|---|
| Движение | WASD / Стрелки | Левый джойстик |
| Прицел | Мышь | Правый джойстик |
| Стрельба | ЛКМ (зажать) | Правый джойстик (тянуть) |
| Скилл | Пробел | Кнопка TOP CENTER |
| Пауза | - | - |

## Геймплей

- Собирай ◆ XP кристаллы для левел-апа
- При левел-апе: выбор из нового оружия / апгрейда / пассивки
- **Стреляй в бочки** для активации зональных эффектов:
  - 🔥 Огонь — поджигает масляные бочки цепочкой
  - ⚫ Масло — замедление 72%
  - ❄ Заморозка — полная остановка врагов
  - ⚡ EMP — цепные молнии + стан
  - 💜 Нейро-бомба — большой радиус стана
- Боссы каждые 5 волн

## Стек

- React 18 + Vite
- Tone.js (synthwave soundtrack)
- Canvas 2D API
