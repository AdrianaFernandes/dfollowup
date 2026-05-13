import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpack = require("webpack") as {
  NormalModuleReplacementPlugin: new (resourceRegExp: RegExp, newResource: string) => object;
};
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const nodeStub = path.join(rootDir, "lib", "node-stub.js");

const nextConfig: NextConfig = {
  outputFileTracingRoot: rootDir,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:fs$/, nodeStub),
        new webpack.NormalModuleReplacementPlugin(/^node:https$/, nodeStub),
        new webpack.NormalModuleReplacementPlugin(/^node:http$/, nodeStub),
        new webpack.NormalModuleReplacementPlugin(/^node:path$/, nodeStub),
      );
    }
    return config;
  },
};

export default nextConfig;
