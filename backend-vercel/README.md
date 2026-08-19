# Backend Proxy LLM - Maintainability Risk Analyzer

Backend ini dipakai agar responden dapat langsung menjalankan fitur **Explain Maintainability Risk** tanpa memasukkan API key OpenAI. API key disimpan sebagai environment variable pada backend, bukan di dalam file extension.

## Opsi gratis yang disarankan

Default project ini memakai **Vercel Hobby** karena mudah untuk Node.js serverless function dan tersedia free tier. Alternatif yang juga gratis adalah Cloudflare Workers, tetapi membutuhkan adaptasi kode ke format Worker.

## Setup lokal

1. Masuk folder backend:

```bash
cd backend-vercel
```

2. Install Vercel CLI lokal:

```bash
npm install
```

3. Buat file `.env.local` dari `.env.example`:

```bash
cp .env.example .env.local
```

4. Isi `OPENAI_API_KEY` di `.env.local`.

5. Jalankan backend lokal:

```bash
npm run dev
```

Endpoint lokal default:

```text
http://localhost:3000/api/explain
```

## Deploy ke Vercel

1. Login Vercel:

```bash
npx vercel login
```

2. Deploy dari folder `backend-vercel`:

```bash
npx vercel
```

3. Tambahkan environment variable di dashboard Vercel:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` = `gpt-4.1-mini`
- `MAX_SNIPPET_CHARS` = `6000`
- `PROXY_ACCESS_TOKEN` opsional

4. Deploy production:

```bash
npm run deploy
```

5. Salin URL production, misalnya:

```text
https://maintainability-risk-proxy.vercel.app/api/explain
```

6. Masukkan URL tersebut ke setting extension:

```json
"maintainabilityRiskAnalyzer.llm.proxyEndpoint": "https://maintainability-risk-proxy.vercel.app/api/explain"
```

Agar responden tidak perlu setting apa pun, ubah nilai default `maintainabilityRiskAnalyzer.llm.proxyEndpoint` pada `package.json` extension sebelum membuat file `.vsix`.
