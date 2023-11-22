import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import { version } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        monkey({
            entry: "src/main.ts",
            userscript: {
                author: "LeviOP",
                version,
                namespace: "npm/vite-plugin-monkey",
                match: ["*://www.google.com/search?*"]
            }
        })
    ]
});
