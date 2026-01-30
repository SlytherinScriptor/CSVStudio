# CSV Studio

A modern web application for performing CSV operations with a beautiful, responsive UI. Built with React, TypeScript, and Vite.

![CSV Studio](https://img.shields.io/badge/CSV-Studio-blue)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-5.4-646cff)

## Features

### 🔄 Upsert Tool
Update existing rows and insert new ones based on a unique key column.
- Upload original CSV and modifications CSV
- Select unique key column for matching rows
- Choose output schema: keep original columns or union with new columns
- Preview updates and inserts before applying
- Copy result to clipboard

### 🗑️ Delete Tool
Remove rows from CSV based on a list of IDs.
- Paste IDs (supports multiple formats: newline, comma, semicolon, tab separated)
- Options: Trim whitespace, Dedupe IDs, Case-insensitive matching
- Preview rows to be deleted and IDs not found
- Copy filtered result to clipboard

### 🔀 Compare Tool
Diff two CSV files to find added, removed, and changed rows.
- Upload base CSV and compare CSV
- Select key column for matching
- Options: Trim whitespace, Case-insensitive comparison
- View categorized results: Added, Removed, Changed rows
- Export diff results as CSV with change annotations

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 5
- **CSV Parsing**: PapaParse
- **Icons**: Lucide React
- **Styling**: Custom CSS with light/dark theme support

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/CSVStudio.git
cd CSVStudio

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
CSVStudio/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ColumnPicker.tsx
│   │   │   ├── DropZone.tsx
│   │   │   ├── Stepper.tsx
│   │   │   └── Table.tsx
│   │   ├── UpsertPanel.tsx
│   │   ├── DeletePanel.tsx
│   │   └── ComparePanel.tsx
│   ├── lib/
│   │   └── csv.ts        # CSV parsing utilities
│   ├── App.tsx           # Main application
│   ├── App.css           # Application styles
│   ├── index.css         # Global styles
│   └── main.tsx          # Entry point
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Usage

1. **Select a tool** from the sidebar (Upsert, Delete, or Compare)
2. **Upload your CSV files** using drag-and-drop or click to browse
3. **Configure options** like key column and comparison settings
4. **Preview changes** before applying
5. **Export or copy** the results

## Theme

Toggle between light and dark mode using the theme button in the sidebar footer.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
