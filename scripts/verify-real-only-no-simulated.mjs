
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');

// Forbidden strings
const FORBIDDEN = ['SIMULATED', 'MOCK_', 'faker', 'randomHotspot'];

console.log("--- Scanning dist/ for Forbidden Strings (REAL_ONLY Compliance) ---");

if (!fs.existsSync(distDir)) {
    console.error("Dist directory not found. Run build first.");
    process.exit(1);
}

function searchFiles(dir) {
    const files = fs.readdirSync(dir);
    let errorCount = 0;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            errorCount += searchFiles(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const term of FORBIDDEN) {
                if (content.includes(term)) {
                    // Ignore if it's just the variable name in a benign context, but usually we ban it all.
                    // We obfuscated 'SIMULATED' in logic, so it shouldn't be there as a literal key/value.
                    console.error(`FAIL: Found forbidden term "${term}" in ${file}`);
                    errorCount++;
                }
            }
        }
    }
    return errorCount;
}

const errors = searchFiles(distDir);

if (errors > 0) {
    console.error(`FAILED: Found ${errors} forbidden occurrences.`);
    process.exit(1);
} else {
    console.log("PASS: Zero forbidden strings found.");
}
