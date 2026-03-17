export interface LayoutProfile {
  pagesPerSheet: number;
  cols: number;
  rows: number;
  orientation: 'portrait' | 'landscape';
  rasterDpi: number;
}

export interface AppConfig {
  workDir: string;
  logDir: string;
  outputFilePrefix: string;
  deleteSourcePdfs: boolean;
  maxPagesPerDocument: number;
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
