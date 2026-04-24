# Text-to-Speech Converter

A modern, feature-rich text-to-speech converter built with React and OpenAI's TTS API. Convert text into natural-sounding speech with multiple voice options.

![Text-to-Speech Converter](https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=2000&h=600)

## Features

- 🎯 Convert text to natural-sounding speech
- 🧠 Model selection (`tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`)
- 🎭 Full voice set — voices filter automatically based on the chosen model
- 📁 Upload multiple `.txt` files — each generates its own audio, then all are concatenated into one merged MP3
- 🎨 Responsive UI with dark mode support
- 🚀 Real-time progress indicators
- ⬇️ Download each individual audio or the merged track
- 🔒 API key stored locally in your browser

## Prerequisites

- [Bun](https://bun.sh) 1.2.x or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd text-to-speech-converter
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

4. Build for production:
```bash
bun run build
```

5. Preview the production build:
```bash
bun run preview
```

## Usage

1. Enter your OpenAI API key in the designated input field
2. Either:
   - Type or paste your text directly into the text area
   - Upload a text using the upload button
3. Select your preferred voice from the dropdown menu
4. Click "Convert Text to Speech" to generate audio
5. Use the audio player to preview the result
6. Download the generated audio file if desired

## Tech Stack

- ⚛️ React 18
- 🥟 Bun — runtime, bundler, dev server, and package manager (Vite-free)
- 🎨 Tailwind CSS v4 (CSS-first config via `@theme`)
- 🎯 TypeScript
- 🎭 shadcn/ui
- 🔄 Axios

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Live Demo

Visit the live demo: [Text-to-Speech Converter](https://vite-upgrade-text-to-speech.vercel.app/)

## Support

For support, please open an issue in the repository.

## Acknowledgments

- OpenAI for their Text-to-Speech API
- shadcn/ui for the beautiful UI components
