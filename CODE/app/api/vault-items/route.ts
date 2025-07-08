import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory storage for vault items (in production, use a database)
const vaultStorage = new Map<string, any[]>();

function validateMasterPassword(request: NextRequest): string | null {
  const masterPassword = request.headers.get('x-master-password');
  if (!masterPassword) {
    return null;
  }
  return masterPassword;
}

function getStorageKey(masterPassword: string): string {
  // Create a hash of the master password to use as storage key
  return crypto.createHash('sha256').update(masterPassword).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const masterPassword = validateMasterPassword(request);
    if (!masterPassword) {
      return NextResponse.json(
        { error: 'Master password required' },
        { status: 401 }
      );
    }

    const storageKey = getStorageKey(masterPassword);
    const items = vaultStorage.get(storageKey) || [];

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error getting vault items:', error);
    return NextResponse.json(
      { error: 'Failed to get vault items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const masterPassword = validateMasterPassword(request);
    if (!masterPassword) {
      return NextResponse.json(
        { error: 'Master password required' },
        { status: 401 }
      );
    }

    const { items } = await request.json();
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      );
    }

    const storageKey = getStorageKey(masterPassword);
    vaultStorage.set(storageKey, items);

    return NextResponse.json({
      success: true,
      itemCount: items.length,
      savedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving vault items:', error);
    return NextResponse.json(
      { error: 'Failed to save vault items' },
      { status: 500 }
    );
  }
}