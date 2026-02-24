import { createRoot } from "react-dom/client";
// @ts-ignore
import '@fontsource-variable/inter';
// @ts-ignore
import '@fontsource/geist-mono';
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
