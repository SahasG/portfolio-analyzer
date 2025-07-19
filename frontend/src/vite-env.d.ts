/// <reference types="vite/client" />

// CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// CSS files
declare module '*.css' {
  const content: string;
  export default content;
}

// For CSS files with @tailwind and @apply
declare module '*.css?raw' {
  const content: string;
  export default content;
}

// For CSS files with @tailwind and @apply
declare module '*.module.css?raw' {
  const content: string;
  export default content;
}
