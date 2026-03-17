# Foliant

A silent Windows utility that automatically processes PDF task folders — rasterizing pages and assembling them into optimized print-ready documents using smart layout logic.

## How It Works

Foliant monitors a configured working directory for task subfolders. Each subfolder is treated as an independent task containing one or more PDF files. On launch, Foliant processes all pending tasks and notifies the user upon completion via a Windows toast notification.

### Layout Logic

The output layout is selected automatically based on the total page count across all PDFs in a task:

| Total Pages | Layout | Orientation | Output DPI |
|---|---|---|---|
| ≤ 19 | 1 page per sheet | Portrait | 200 DPI |
| 20 – 38 | 2 pages per sheet | Landscape | 300 DPI |
| > 38 | 4 pages per sheet (2×2) | Portrait | 600 DPI |

### Working Directory Structure

```
C:/tasks/
├── order_001/
│   ├── document.pdf
│   └── processed_order_001.pdf   ← generated output
├── order_002/
│   ├── part1.pdf
│   ├── part2.pdf
│   └── processed_order_002.pdf   ← generated output
└── logs/
    └── run_2026-03-17T10-35-00.log
```

## Requirements

- [Node.js](https://nodejs.org/) 18 or higher
- Windows 10 / 11

## Installation

```bash
# Clone or download the repository
git clone https://github.com/AlexanderKuzikov/Foliant.git
cd Foliant

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

Edit `config.json` before first use:

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

| Option | Description |
|---|---|
| `workDir` | Root directory scanned for task folders |
| `logDir` | Directory where log files are saved |
| `outputFilePrefix` | Prefix for generated PDF filenames |
| `deleteSourcePdfs` | Remove source PDFs after processing |
| `maxPagesPerDocument` | Page threshold for layout selection |
| `layout.*.rasterDpi` | Rasterization DPI per layout profile |

Paths support both forward slashes (`C:/tasks`) and backslashes (`C:\tasks`).

## Usage

**For end users** — double-click `run.vbs`. No terminal window will appear. A Windows notification will appear when all tasks are complete.

**For developers:**

```bash
# Development mode (no build required)
npm run dev

# Production
npm run build
npm start
```

## Logging

Each run creates a timestamped log file in `logDir`:

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

## Tech Stack

- **[pdf-lib](https://pdf-lib.js.org/)** — PDF assembly and page composition
- **[@hyzyla/pdfium](https://github.com/hyzyla/pdfium)** — PDF rasterization via Google PDFium (WebAssembly)
- **[winston](https://github.com/winstonjs/winston)** — Logging
- **[node-notifier](https://github.com/mikaelbr/node-notifier)** — Windows toast notifications

## License

Licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

Copyright 2026 Alexander Kuzikov
