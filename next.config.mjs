/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Tesseract starts its worker and selects its WASM core at runtime. Neither
    // path can be inferred by Next's output tracer, so without these entries
    // the deployed notices function is missing the worker/core files on Vercel.
    serverComponentsExternalPackages: ["tesseract.js", "tesseract.js-core", "unpdf", "@napi-rs/canvas"],
    outputFileTracingIncludes: {
      "/api/notices": [
        "./node_modules/tesseract.js/**",
        "./node_modules/tesseract.js-core/**",
        "./node_modules/unpdf/**",
      ],
      "/api/queues/client-document-extraction": [
        "./node_modules/tesseract.js/**",
        "./node_modules/tesseract.js-core/**",
        "./node_modules/unpdf/**",
        "./node_modules/@napi-rs/canvas/**",
      ],
    },
  },
};

export default nextConfig;
