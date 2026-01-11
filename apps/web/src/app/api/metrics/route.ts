import { NextResponse } from 'next/server';
import client from 'prom-client';

const register = client.register;

let initialized = (globalThis as any).__metrics_init;
if (!initialized) {
    client.collectDefaultMetrics({ register });
    (globalThis as any).__metrics_init = true;
}

export async function GET() {
    const body = await register.metrics();
    return new NextResponse(body, {
        status: 200,
        headers: { 'Content-Type': register.contentType }
    });
}
