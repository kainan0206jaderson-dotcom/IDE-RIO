/** @type {import('next').NextConfig} */
// Exporta como site estático. No GitHub Pages o site mora em /IDE-RIO, então
// BASE_PATH vem do workflow; localmente fica vazio.
const base = process.env.BASE_PATH || '';
export default {
  output: 'export',
  basePath: base,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: false,
};
