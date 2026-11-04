import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

Config.overrideWebpackConfig((c) => enableTailwind(c));
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
