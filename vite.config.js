import { defineConfig } from "vite";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import liveReload from "vite-plugin-live-reload";

export default defineConfig(({command, mode}) => {
    console.log({command, mode});
    let bool_sourcemap = true;

    if (mode === 'production') {
        console.log('Production build');
        bool_sourcemap = false;
    }    
    return {
        esbuild: {
            // drop: ["console", "debugger"],
        },
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
                    popup: path.resolve(__dirname, "src/popup.html"),
                    options: path.resolve(__dirname, "src/options.html"),
                },
                output: {
                    format: "es",
                    entryFileNames: "[name].js",
                    chunkFileNames: "[name].js",
                    assetFileNames: "[name].[ext]",
                },
            },
            sourcemap: bool_sourcemap, // sourcemapを有効にする
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
        server: {
            watch: {
                usePolling: true,
                interval: 1000,
            },
        },
    }
});
