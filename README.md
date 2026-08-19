# Maintainability Risk Analyzer

VS Code Extension untuk mengidentifikasi kode JavaScript yang berisiko menghambat maintainability menggunakan **Maintainability Index (MI)** berbasis software metrics dan LLM sebagai penjelas kontekstual.

## Ruang Lingkup

Extension ini dibatasi untuk analisis file JavaScript:

- `.js`
- `.mjs`
- `.cjs`

Analisis dilakukan secara statis menggunakan AST. LLM tidak digunakan untuk menghitung metrik, menentukan nilai MI, atau menetapkan kategori risiko. LLM hanya digunakan untuk menjelaskan hasil analisis yang sudah dihitung oleh extension.

## Metrics yang Digunakan

Versi ini menggunakan tiga komponen utama Maintainability Index:

1. **Halstead Volume (HV)**
2. **Cyclomatic Complexity (CC)**
3. **Lines of Code (LOC)**

Rumus yang digunakan:

```text
MI = max(0, ((171 - 5.2 × ln(HV) - 0.23 × CC - 16.2 × ln(LOC)) × 100) / 171)
```

Klasifikasi risiko:

```text
MI >= 20        = Low Risk
10 <= MI < 20   = Medium Risk
MI < 10         = High Risk
```

## Fitur Utama

- Analisis file JavaScript aktif.
- Analisis workspace JavaScript.
- Parsing kode dengan AST.
- Perhitungan Halstead Volume, Cyclomatic Complexity, dan Lines of Code.
- Perhitungan Maintainability Index.
- Klasifikasi risiko Low, Medium, dan High Risk.
- Diagnostic dan highlight pada editor.
- Hover berisi nilai MI, HV, CC, LOC, kategori risiko, dan alasan deterministik.
- Panel ringkasan hasil analisis.
- Penjelasan berbasis LLM melalui backend Vercel dan OpenAI API.
- Export hasil analisis ke JSON.

## Alur LLM

Alur integrasi LLM menggunakan backend Vercel sebagai perantara:

```text
VS Code Extension → Backend Vercel → OpenAI API → Backend Vercel → VS Code Extension
```

Data yang dikirim ke backend berisi potongan kode, nilai HV, CC, LOC, nilai MI, kategori risiko, dan alasan deterministik. Backend meneruskan data tersebut ke OpenAI API untuk menghasilkan penjelasan kontekstual.

## Instalasi Pengembangan

```bash
npm install
npm run compile
```

Untuk backend Vercel:

```bash
cd backend-vercel
npm install
```

Siapkan environment variable pada backend:

```text
OPENAI_API_KEY=isi_api_key_openai
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_MODELS=gpt-4.1-mini,gpt-4o-mini
MAX_SNIPPET_CHARS=6000
```

## Command

- `Maintainability: Analyze Current JavaScript File`
- `Maintainability: Analyze JavaScript Workspace`
- `Maintainability: Show Maintainability Summary`
- `Maintainability: Explain Maintainability Risk`
- `Maintainability: Explain Maintainability Risk at Cursor`
- `Maintainability: Export Workspace Report (JSON)`
- `Maintainability: Test LLM Proxy Connection`

## Catatan Akademik

Nilai metrik, Maintainability Index, dan kategori risiko dihitung secara deterministik oleh extension. Backend Vercel dan OpenAI API hanya berperan sebagai lapisan penjelas agar hasil analisis lebih mudah dipahami pengguna.
