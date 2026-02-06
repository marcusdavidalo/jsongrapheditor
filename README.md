# NodeFlow JSON Editor

NodeFlow is a professional-grade JSON editor that visualizes data as an interactive node graph. It provides a seamless way to explore, edit, and restructure complex JSON objects through a highly visual and intuitive interface.

![NodeFlow Screenshot](https://via.placeholder.com/800x450?text=NodeFlow+JSON+Editor+UI) *(Actual screenshot to be added)*

## 🚀 Features

- **Interactive Node Graph**: Visualize your JSON structure as a dynamic, zoomable graph of nodes and edges.
- **Bi-directional Editing**: Edit JSON in the raw text editor or directly within the nodes. Changes are synced in real-time.
- **Drag-and-Drop Reparenting**: Easily restructure your data by dragging nodes onto objects or arrays.
- **History Management**: Comprehensive undo/redo support for all structural and value changes.
- **Modern UI**: A sleek, dark-themed interface built with React and Tailwind CSS, featuring smooth animations and glassmorphism.
- **Smart Formatting**: Automatic hierarchical layout that keeps your data organized and readable.

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Visuals**: [D3.js](https://d3js.org/) for graph logic, [Lucide React](https://lucide.dev/) for iconography.
- **Styling**: Vanilla CSS with modern aesthetics.

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nodeflow-json-editor.git
   cd nodeflow-json-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`.

## 📖 Usage

- **Edit Keys & Values**: Click on any node label or value to edit it directly.
- **Panning**: Hold the **Right Mouse Button** and drag to move the canvas.
- **Rearrange Nodes**: Drag and drop nodes to organize your view.
- **Reparenting**: Drop a node onto an 'object' or 'array' type node to move it under that parent.
- **Add Nodes**: Use the context menus or buttons to add new items to your structured data.
- **Undo/Redo**: Use `Ctrl+Z` to undo and `Ctrl+Y` (or `Ctrl+Shift+Z`) to redo.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
