/**
 * @kailash/prism-compiler — Type definitions
 * Spec: docs/specs/02-token-architecture.md
 */

/** Three-tier token structure parsed from a theme YAML file */
export interface ThemeTokens {
  prism_spec: string;
  design_system_version: string;
  name: string;
  description: string;
  tokens: {
    primitive: PrimitiveTokens;
    semantic: SemanticTokens;
    component: ComponentTokens;
  };
  themes?: ThemeModes;
  constraints?: Record<string, unknown>;
}

export interface PrimitiveTokens {
  color: Record<string, string>;
  spacing: {
    scale: number[];
  };
  typography: {
    families: Record<string, string>;
    scale: number[];
    sizes?: number[];
    weights: number[];
    line_heights: number[];
  };
  radius: {
    scale: number[];
  };
  shadow: Record<string, string>;
  motion: {
    durations: number[];
    easings: Record<string, string>;
  };
  breakpoints: Record<string, number>;
}

export interface SemanticTokens {
  color: Record<string, SemanticColorToken>;
  spacing: Record<string, number | SemanticSpacingToken>;
  typography: Record<string, TypographyComposite>;
  radius: Record<string, number | SemanticRadiusToken>;
  shadow: Record<string, string | SemanticShadowToken>;
  motion: Record<string, MotionComposite>;
}

export interface SemanticColorToken {
  value: string;
  usage: string;
  contrast_min?: number;
}

export interface SemanticSpacingToken {
  value: number;
  usage: string;
}

export interface SemanticRadiusToken {
  value: number;
  usage: string;
}

export interface SemanticShadowToken {
  value: string;
  usage: string;
}

export interface TypographyComposite {
  family: string;
  size: number;
  weight: number;
  line_height: number;
  usage: string;
}

export interface MotionComposite {
  duration: number;
  easing: string;
  usage?: string;
}

export interface ComponentTokens {
  [componentName: string]: Record<string, Record<string, unknown>>;
}

export interface ThemeModes {
  light: Record<string, Record<string, string>>;
  dark: Record<string, Record<string, string>>;
}

export type CompileTarget = 'web' | 'flutter';

export interface CompileOptions {
  theme: string;
  target: CompileTarget;
  specsDir: string;
  outDir: string;
}

export interface CompileResult {
  files: OutputFile[];
  warnings: string[];
  errors: string[];
}

export interface OutputFile {
  path: string;
  content: string;
}
