[DocuMorph-README.md](https://github.com/user-attachments/files/34381477/DocuMorph-README.md)
<div align="center">

# 📄 DocuMorph

**A multi-tool PDF processing platform that runs right in your browser.**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://documorph-pdf.vercel.app)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

[Live Demo](https://documorph-pdf.vercel.app) · [Report a Bug](https://github.com/Sadik044/DocuMorph/issues) · [Request a Feature](https://github.com/Sadik044/DocuMorph/issues)

</div>

---

## 📖 About

**DocuMorph** is an all-in-one toolkit for working with PDF files. Instead of juggling several websites for different jobs, you get a single, fast web app built with **React, TypeScript and Vite**.

> 🌐 **Try it live:** [documorph-pdf.vercel.app](https://documorph-pdf.vercel.app)

<!-- TODO: Add a screenshot or GIF of the app here.
     Example: ![DocuMorph Screenshot](./docs/screenshot.png) -->

## ✨ Features

<!-- TODO: Confirm this list against the tools that are actually implemented in src/ and edit as needed. -->

- 🧩 **Multiple PDF tools in one place**: a single platform for common PDF tasks
- ✂️ **Edit PDF structure**: powered by [`pdf-lib`](https://pdf-lib.js.org/)
- 👁️ **PDF rendering and preview**: powered by [`pdf.js`](https://mozilla.github.io/pdf.js/)
- 🔍 **OCR (text recognition)**: powered by [`Tesseract.js`](https://tesseract.projectnaptha.com/)
- 📝 **Word (.docx) generation**: powered by [`docx`](https://docx.js.org/)
- 📦 **ZIP export for batch results**: powered by [`JSZip`](https://stuk.github.io/jszip/)
- 🖱️ **Drag-and-drop reordering**: powered by [`dnd-kit`](https://dndkit.com/)
- 🎨 **Clean, responsive UI** built with Tailwind CSS
- ✅ **Unit-tested** with Vitest and React Testing Library

## 🛠️ Tech Stack

| Category        | Technology                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| Framework       | [React 18](https://react.dev/)                                                 |
| Language        | [TypeScript](https://www.typescriptlang.org/)                                  |
| Build Tool      | [Vite](https://vite.dev/)                                                      |
| Styling         | [Tailwind CSS](https://tailwindcss.com/), `clsx`, `tailwind-merge`             |
| PDF Processing  | `pdf-lib`, `pdfjs-dist`                                                        |
| OCR             | `tesseract.js`                                                                 |
| Document Export | `docx`, `jszip`                                                                |
| Interactions    | `@dnd-kit` (core, sortable, utilities)                                         |
| Icons           | [Lucide React](https://lucide.dev/)                                            |
| Testing         | [Vitest](https://vitest.dev/), Testing Library, jsdom                          |
| Hosting         | [Vercel](https://vercel.com/)                                                  |

## 📂 Project Structure

```
DocuMorph/
├── public/              # Static assets
├── src/                 # Application source code
├── tests/               # Unit and component tests
├── index.html           # App entry HTML
├── vite.config.ts       # Vite configuration
├── vercel.json          # Vercel deployment configuration
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
└── tsconfig.json        # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **18 or newer** (20+ recommended)
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Sadik044/DocuMorph.git
cd DocuMorph

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open the URL shown in your terminal (usually `http://localhost:5173`).

## 📜 Available Scripts

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with hot reload            |
| `npm run build`      | Type-check and create an optimized production build  |
| `npm run preview`    | Preview the production build locally                 |
| `npm test`           | Run the test suite once                              |
| `npm run test:watch` | Run tests in watch mode                              |
| `npm run typecheck`  | Run the TypeScript compiler without emitting files   |
| `npm run deploy`     | Deploy to production on Vercel                       |

## 🧪 Testing

```bash
npm test
```

Tests live in the [`tests/`](./tests) directory and run with [Vitest](https://vitest.dev/) in a jsdom environment.

## ☁️ Deployment

DocuMorph is deployed on **Vercel**, and the repository includes a `vercel.json` config.

**Option A: Vercel dashboard**
1. Fork this repository.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Deploy. Vercel auto-detects Vite.

**Option B: Vercel CLI**
```bash
npm run deploy
```

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the project
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests where it makes sense
4. Run `npm run typecheck && npm test`
5. Commit: `git commit -m "Add amazing feature"`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 🗺️ Roadmap

<!-- TODO: Update with your real plans. -->

- [ ] Add screenshots and demo GIF
- [ ] Add more PDF tools
- [ ] Add CI workflow (type-check, test, build)

## 📄 License

<!-- TODO: Add a LICENSE file (e.g. MIT) and update this section. -->

No license has been specified yet. Add a `LICENSE` file to let others know how they can use this project.

## 👤 Author

**Sadik**

- GitHub: [@Sadik044](https://github.com/Sadik044)

---

<div align="center">

If you find DocuMorph useful, please consider giving it a ⭐!

</div>
