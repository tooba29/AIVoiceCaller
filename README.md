# AI Voice Calling System

This is a monorepo for the AI Voice Calling System, containing both the frontend and backend applications.

## Structure

- `apps/backend`: The Node.js backend application.
- `apps/frontend`: The React frontend application.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)

### Installation

1. Clone the repository.
2. Install all dependencies from the root of the project:

   ```bash
   npm run install:all
   ```

### Running the Application

To run both the frontend and backend concurrently in development mode, use the following command from the root directory:

```bash
npm run dev
```

This will start the backend server and the frontend development server.

### Building for Production

To build both applications for production, run the following command from the root:

```bash
npm run build
```

This will create production-ready builds in the respective `dist` or `build` directories of the frontend and backend packages.
