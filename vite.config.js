import { defineConfig } from "vite";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import liveReload from "vite-plugin-live-reload";

export default defineConfig({
    build: {
        outDir: path.resolve(__dirname, "dist"),
        rollupOptions: {
            input: {
                embedding_script: path.resolve(
                    __dirname,
                    "src/embedding_script.ts"
                ),
                content_script: path.resolve(
                    __dirname,
                    "src/content_script.ts"
                ),
                background: path.resolve(__dirname, "src/background.ts"),
                // popup: path.resolve(__dirname, "src/popup.js"),
                popup: path.resolve(__dirname, "src/popup.html"),
            },
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "[name].js",
                assetFileNames: "[name].[ext]",
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: [
                        "src/manifest.json",
                        "src/*.css",
                        "src/*.md",
                        "LICENSE",
                    ],
                    dest: ".",
                },
            ],
        }),
        liveReload(["src/**/*.html"]), // 監視対象のHTMLファイルを指定
    ],
    vite: {
        server: {
            watch: {
                usePolling: true,
                interval: 1000,
            },
        },
    },
});
