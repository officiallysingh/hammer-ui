import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
    logger.info({ route: 'health' }, 'health ok');
    return NextResponse.json({ status: 'ok', ts: Date.now() }, { status: 200 });
}
