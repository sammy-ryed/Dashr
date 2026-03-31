import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId, srmId, idCardUrl, expectedName } = await request.json();

    if (!userId || !srmId || !idCardUrl || !expectedName) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Check if SRM ID hash is blocked
    const srmIdHash = crypto.createHash('sha256').update(srmId).digest('hex');
    const { data: existingBlocked } = await supabase
      .from('users')
      .select('id')
      .eq('blocked_id_hash', srmIdHash)
      .single();

    if (existingBlocked) {
      return NextResponse.json({
        ok: false,
        error: 'This SRM ID has been permanently blocked from DASHR due to policy violations.',
      }, { status: 403 });
    }

    // Attempt OCR with tesseract.js (server-side)
    let nameMatchPassed = false;
    try {
      // Dynamic import to avoid bundle issues
      const Tesseract = await import('tesseract.js');
      const { data: { text } } = await Tesseract.default.recognize(idCardUrl, 'eng', {});
      const extractedText = text.toUpperCase();
      const nameParts = expectedName.toUpperCase().split(' ').filter((p: string) => p.length > 2);
      // Check if at least 2 name parts (first + last) appear in extracted text
      const matchCount = nameParts.filter((part: string) => extractedText.includes(part)).length;
      nameMatchPassed = matchCount >= Math.min(2, nameParts.length);
    } catch (ocrError) {
      // OCR failed — fall back to admin manual review (still proceed)
      console.error('OCR failed, falling back to manual review:', ocrError);
      nameMatchPassed = true; // Admin will approve manually
    }

    if (!nameMatchPassed) {
      return NextResponse.json({
        ok: false,
        error: `Name on ID card does not match "${expectedName}". Ensure your ID card matches your registered name exactly.`,
      }, { status: 422 });
    }

    return NextResponse.json({ ok: true, message: 'ID submitted for admin review' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
