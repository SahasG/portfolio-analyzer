// CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Asset files
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Tailwind CSS
declare module 'tailwindcss' {
  interface Config {}
  interface PluginAPI {}
  interface PluginFunction {}
  interface PluginUtils {}
  interface ResolvableTo<T> {
    (theme: any): T;
  }
  interface ThemeConfig {}
  interface VariantsConfig {}
  interface CorePluginFeatures {}
  interface VariantConfig {}
  interface PluginOptions {}
}

// This tells TypeScript that @tailwind and @apply are valid CSS at-rules
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// For CSS files with @tailwind and @apply
declare module '*.css?raw' {
  const content: string;
  export default content;
}
