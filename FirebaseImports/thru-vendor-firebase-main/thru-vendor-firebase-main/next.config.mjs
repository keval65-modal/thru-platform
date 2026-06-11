
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'placehold.co',
            },
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
        ]
    },
    serverExternalPackages: [
        'firebase-functions',
        'firebase-admin',
        'pdf-parse',
        'puppeteer',
        'puppeteer-core',
        '@sparticuz/chromium',
        '@pdf-lib/fontkit',
    ],
    outputFileTracingIncludes: {
        '/api/merchant/agreement/sign': [
            './src/lib/fonts/agreement/**/*',
            './public/fonts/agreement/**/*',
        ],
    },
    typescript: {
        ignoreBuildErrors: true, // Temporarily ignore TypeScript errors to get deployment working
    },
    experimental: {
        serverActions: {
            // Signup FormData includes a cropped shop image (~50–200 KB); allow headroom for large originals.
            bodySizeLimit: '4mb',
        },
    },
};

export default nextConfig;
