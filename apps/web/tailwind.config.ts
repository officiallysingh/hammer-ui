import type { Config } from 'tailwindcss';
import uiConfig from '@repo/ui/tailwind.config';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  presets: [uiConfig as Config],
  plugins: [import('tailwindcss-animate')],
};

export default config;
