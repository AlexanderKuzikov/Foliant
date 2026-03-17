# Foliant

Фоновая утилита для Windows, которая автоматически обрабатывает папки с PDF-задачами — растрирует страницы и собирает их в готовый к печати документ с автоматическим выбором макета.

## Как это работает

Foliant сканирует рабочую директорию на наличие вложенных папок. Каждая папка — это отдельная задача, содержащая один или несколько PDF-файлов. При запуске утилита обрабатывает все задачи и уведомляет пользователя о завершении через системное уведомление Windows.

### Логика выбора макета

Макет выбирается автоматически на основе суммарного количества страниц всех PDF в задаче:

| Кол-во страниц | Макет | Ориентация листа | DPI вывода |
|---|---|---|---|
| ≤ 19 | 1 страница на лист | Книжная | 200 DPI |
| 20 – 38 | 2 страницы на лист | Альбомная | 300 DPI |
| > 38 | 4 страницы на лист (2×2) | Книжная | 600 DPI |

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
  "layout": {
    "single": {
      "pagesPerSheet": 1,
      "cols": 1,
      "rows": 1,
      "orientation": "portrait",
      "rasterDpi": 200
    },
    "twoPerSheet": {
      "pagesPerSheet": 2,
      "cols": 2,
      "rows": 1,
      "orientation": "landscape",
      "rasterDpi": 300
    },
    "fourPerSheet": {
      "pagesPerSheet": 4,
      "cols": 2,
      "rows": 2,
      "orientation": "portrait",
      "rasterDpi": 600
    }
  }
}
```

| Параметр | Описание |
|---|---|
| `workDir` | Рабочая директория с папками задач |
| `logDir` | Директория для сохранения логов |
| `outputFilePrefix` | Префикс имени выходного файла |
| `deleteSourcePdfs` | Удалять исходные PDF после обработки |
| `maxPagesPerDocument` | Порог страниц для выбора макета |
| `layout.*.rasterDpi` | DPI растрировки для каждого макета |

Пути поддерживают как прямой слэш (`C:/tasks`), так и обратный (`C:\tasks`).

## Использование

**Для пользователя** — двойной клик по `run.vbs`. Окно терминала не появляется. По завершении всех задач придёт системное уведомление Windows.

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
[2026-03-17 10:35:00] INFO: PDF Processor started
[2026-03-17 10:35:00] INFO: Found 2 task(s): order_001, order_002
[2026-03-17 10:35:00] INFO: === Task start: order_001 ===
[2026-03-17 10:35:00] INFO: PDFs: document.pdf
[2026-03-17 10:35:00] INFO: Total pages: 12
[2026-03-17 10:35:00] INFO: Layout: single | 1 per sheet | 200 DPI
[2026-03-17 10:35:02] INFO: Rasterized: 12 images
[2026-03-17 10:35:03] INFO: Saved: processed_order_001.pdf
[2026-03-17 10:35:03] INFO: Task done in 3.21s
```

## Стек технологий

- **[pdf-lib](https://pdf-lib.js.org/)** — сборка PDF и компоновка страниц
- **[@hyzyla/pdfium](https://github.com/hyzyla/pdfium)** — растрировка через Google PDFium (WebAssembly)
- **[winston](https://github.com/winstonjs/winston)** — логирование
- **[node-notifier](https://github.com/mikaelbr/node-notifier)** — системные уведомления Windows

## Лицензия

Распространяется под лицензией [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

Copyright 2026 Alexander Kuzikov
