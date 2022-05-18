const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/script.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.(glb|bin|gltf|png)$/,
        type: "asset/resource",
      },
      {
        test: /\.(css)$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    contentBase: "./src",
    hot: true,
  },
};
