# Foliant

Фоновая утилита для Windows, которая автоматически обрабатывает папки с PDF-задачами — растрирует страницы и собирает их в готовый к печати документ с автоматическим выбором макета.

## Как это работает

Foliant сканирует рабочую директорию на наличие вложенных папок. Каждая папка — это отдельная задача, содержащая один или несколько PDF-файлов. При запуске утилита обрабатывает все задачи и отображает прогресс через иконку в системном трее Windows.

### Логика выбора макета

Макет выбирается автоматически на основе суммарного количества страниц всех PDF в задаче:

| Кол-во страниц | Макет | Ориентация листа | DPI растрировки |
|---|---|---|---|
| ≤ 19 | 1 страница на лист | Книжная | 200 DPI |
| 20 – 38 | 2 страницы на лист | Альбомная | 300 DPI |
| > 38 | 4 страницы на лист (2×2) | Книжная | 600 DPI |

Страницы вписываются в ячейки без обрезки с сохранением пропорций.

### Структура рабочей директории

```
C:/tasks/
├── order_001/
│   ├── document.pdf
│   └── processed_order_001.pdf   ← результат
├── order_002/
│   ├── part1.pdf
│   ├── part2.pdf
│   └── processed_order_002.pdf   ← результат
└── logs/
    └── run_2026-03-17T10-35-00.log
```

## Требования

- [Node.js](https://nodejs.org/) версии 18 и выше
- Windows 10 / 11

## Установка

```bash
# Клонировать или скачать репозиторий
git clone https://github.com/AlexanderKuzikov/Foliant.git
cd Foliant

# Установить зависимости
npm install

# Собрать проект
npm run build
```

## Настройка

Перед первым запуском отредактируйте `config.json`:

```json
{
  "workDir": "C:/tasks",
  "logDir": "C:/tasks/logs",
  "outputFilePrefix": "processed",
  "deleteSourcePdfs": false,
  "maxPagesPerDocument": 19,
  "margins": {
    "top": 15,
    "right": 15,
    "bottom": 15,
    "left": 15
  },
  "layout": {
    "single": {
      "pagesPerSheet": 1,
      "cols": 1,
      "rows": 1,
      "orientation": "portrait",
      "rasterDpi": 200,
      "jpegQuality": 80
    },
    "twoPerSheet": {
      "pagesPerSheet": 2,
      "cols": 2,
      "rows": 1,
      "orientation": "landscape",
      "rasterDpi": 300,
      "jpegQuality": 80
    },
    "fourPerSheet": {
      "pagesPerSheet": 4,
      "cols": 2,
      "rows": 2,
      "orientation": "portrait",
      "rasterDpi": 600,
      "jpegQuality": 80
    }
  }
}
```

| Параметр | Описание |
|---|---|
| `workDir` | Рабочая директория с папками задач |
| `logDir` | Директория для сохранения логов |
| `outputFilePrefix` | Префикс имени выходного файла (пустая строка — без префикса) |
| `deleteSourcePdfs` | Удалять исходные PDF после обработки |
| `maxPagesPerDocument` | Порог страниц для выбора макета |
| `margins` | Поля страницы в миллиметрах (top, right, bottom, left) |
| `layout.*.rasterDpi` | DPI растрировки для каждого макета |
| `layout.*.jpegQuality` | Качество JPEG для каждого макета (1–100) |

Пути поддерживают как прямой слэш (`C:/tasks`), так и обратный (`C:\tasks`).

## Использование

**Для пользователя** — двойной клик по `run.vbs`. Окно терминала не появляется. В системном трее появится иконка с текущим статусом обработки. По завершении всех задач иконка автоматически исчезает через 10 секунд.

Меню иконки в трее:
- Текущий статус обработки
- Открыть папку задач
- Открыть логи
- Выход

**Для разработчика:**

```bash
# Режим разработки (без предварительной сборки)
npm run dev

# Продакшн
npm run build
npm start
```

## Логирование

Каждый запуск создаёт лог-файл с временной меткой в директории `logDir`:

```
[2026-03-17 10:35:00] INFO: Foliant started
[2026-03-17 10:35:00] INFO: Found 2 task(s)
[2026-03-17 10:35:00] INFO: === Task start: order_001 ===
[2026-03-17 10:35:00] INFO: PDFs: document.pdf
[2026-03-17 10:35:00] INFO: Total pages: 12
[2026-03-17 10:35:00] INFO: Layout: single | 1 per sheet | 200 DPI | quality 80
[2026-03-17 10:35:02] INFO: Rasterized: 12 images
[2026-03-17 10:35:03] INFO: Saved: processed_order_001.pdf
[2026-03-17 10:35:03] INFO: Task done in 3.21s
```

## Стек технологий

- **[pdf-lib](https://pdf-lib.js.org/)** — сборка PDF и компоновка страниц
- **[@hyzyla/pdfium](https://github.com/hyzyla/pdfium)** — растрировка через Google PDFium (WebAssembly)
- **[sharp](https://sharp.pixelplumbing.com/)** — конвертация растровых изображений в JPEG
- **[systray2](https://github.com/felixneufeld/systray2)** — иконка в системном трее Windows
- **[winston](https://github.com/winstonjs/winston)** — логирование

## Лицензия

Распространяется под лицензией [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

Copyright 2026 Alexander Kuzikov
