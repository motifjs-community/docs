import { defineConfig } from 'vite';
import compiler from '@motifx/compiler';

export default defineConfig({
    plugins: [compiler()],
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        dedupe: ['@motifx/core', 'marked', 'dompurify'],
    },
    server: {
        port: 3040,
        open: true,
        fs: { allow: ['.'] },
        // Docs come from the .NET server (`dotnet run --project server/MotifJs.Docs`).
        proxy: { '/api': 'http://localhost:5125' },
    }
});
