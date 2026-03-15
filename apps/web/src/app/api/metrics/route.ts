import { NextResponse } from 'next/server';
import client from 'prom-client';

const register = client.register;

declare global {
  var __metrics_init: boolean | undefined;
}
const initialized = globalThis.__metrics_init;
if (!initialized) {
  client.collectDefaultMetrics({ register });
  globalThis.__metrics_init = true;
}

export async function GET() {
  const body = await register.metrics();
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': register.contentType },
  });
}
