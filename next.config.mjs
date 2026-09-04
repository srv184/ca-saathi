/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "unpdf", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/notices": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/unpdf/**",
    ],
    "/api/client-documents/confirm": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/unpdf/**",
      "./node_modules/@napi-rs/canvas/**",
    ],
    "/api/client-documents/[id]/retry": [
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/unpdf/**",
      "./node_modules/@napi-rs/canvas/**",
    ],
  },
};

export default nextConfig;
