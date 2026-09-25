import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface AppConfig {
    PORT: number;
    META_VERIFY_TOKEN: string;
    META_APP_SECRET: string;
    META_PAGE_ACCESS_TOKEN: string;
    META_GRAPH_API_VERSION: string;
}

const requiredEnvVars = [
    'META_VERIFY_TOKEN',
    'META_APP_SECRET',
    'META_PAGE_ACCESS_TOKEN'
] as const;

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`[Config Warning] La variable de entorno "${envVar}" no está definida en .env.`);
    }
}

export const config: AppConfig = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN || 'playmatic_webhook_secret_2026',
    META_APP_SECRET: process.env.META_APP_SECRET || '',
    META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN || '',
    META_GRAPH_API_VERSION: 'v20.0'
};
