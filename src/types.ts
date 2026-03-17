export interface LayoutProfile {
  pagesPerSheet: number;
  cols: number;
  rows: number;
  orientation: 'portrait' | 'landscape';
  rasterDpi: number;
  jpegQuality: number;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AppConfig {
  workDir: string;
  logDir: string;
  outputFilePrefix: string;
  deleteSourcePdfs: boolean;
  maxPagesPerDocument: number;
  margins: Margins;
  layout: {
    single: LayoutProfile;
    twoPerSheet: LayoutProfile;
    fourPerSheet: LayoutProfile;
  };
}

export type LayoutKey = keyof AppConfig['layout'];

export interface TaskResult {
  taskName: string;
  success: boolean;
  totalPages?: number;
  layoutUsed?: LayoutKey;
  outputFile?: string;
  durationMs?: number;
  error?: string;
}
