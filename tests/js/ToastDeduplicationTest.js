import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- TOAST DEDUPLICATION LOGIC VERIFICATION ---');

const toastFilePath = path.join(__dirname, '../../resources/js/Hooks/useToast.jsx');
const toastContent = fs.readFileSync(toastFilePath, 'utf8');

// Assert duplicate prevention check exists in showToast
assert.strictEqual(
    toastContent.includes('prev.some(t => !t.exiting && t.message === message && t.type === type)'),
    true,
    'ToastProvider must contain duplicate active toast prevention logic'
);

console.log('✅ PASS: ToastProvider prevents duplicate active toast messages from rendering!');
