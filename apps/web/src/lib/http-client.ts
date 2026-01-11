export function getBaseUrl() {
    const env = process.env.NEXT_PUBLIC_SITE_URL;
    if (env) return env;

    return 'http://localhost:3000';
}