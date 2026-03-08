# VvvebJs Lite (Angular)

A lightweight, powerful website builder built with Angular 21+ and Tailwind CSS. This project allows users to visually design websites using a drag-and-drop interface, edit code in real-time, and export their creations.

## Features

- **Visual Builder**: Drag and drop components onto a canvas to build pages.
- **Live Preview**: See changes instantly as you edit.
- **Responsive Design Tools**: Switch between Mobile, Tablet, and Desktop views to ensure your site looks great on all devices.
- **Code Editor**: Edit the HTML source code directly with syntax highlighting (PrismJS).
- **Properties Panel**: Customize element attributes, styles, and content.
- **Component Library**: Includes basic HTML elements, Bootstrap-like components, and Tailwind UI blocks.
- **AI Integration**: Built-in AI chat assistant powered by Google Gemini to help generate code and content.
- **Project Management**: Create multiple pages and manage them.
- **Export**: Download your entire project as a ZIP file.
- **Dark Mode**: Toggle between light and dark themes.

## Tech Stack

- **Framework**: Angular 21+ (Standalone Components, Signals)
- **Styling**: Tailwind CSS 4+
- **UI Components**: Angular Material, CDK Drag & Drop
- **Icons**: Material Icons
- **Code Highlighting**: PrismJS
- **File Generation**: JSZip, FileSaver

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the development server:

```bash
npm start
```

Navigate to `http://localhost:3000/`. The application will automatically reload if you change any of the source files.

### Build

To build the project for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Environment Variables

This project uses environment variables for configuration.

- `GEMINI_API_KEY`: Required for the AI Chat functionality.

Copy `.env.example` to `.env` (if supported by your build process) or set the variable in your environment.

## Project Structure

- `src/app/builder`: Core builder logic.
  - `canvas`: Handles the rendering area and drag-and-drop.
  - `sidebar`: Component library and page management.
  - `properties`: Element customization panel.
  - `code-editor`: Raw HTML editor.
  - `ai-chat`: AI assistant interface.
- `src/app/shared`: Shared utilities and components.

## License

[MIT](LICENSE)
