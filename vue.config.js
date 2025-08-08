module.exports = {
  configureWebpack: {
    name: 'vue Element Admin',
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          default: false,
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          elementUI: {
            name: 'chunk-elementUI',
            priority: 20,
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/
          },
          commons: {
            name: 'chunk-commons',
            test: resolve('src/components'),
            minChunks: 3,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
      runtimeChunk: 'single'
    }
  },
  chainWebpack: config => {
    config.plugin('preload').tap(options => {
      // Modify the options here
      return options;
    });
    config.plugins.delete('prefetch');
    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end();
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end();
  },
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV === 'development',
  productionSourceMap: false,
  devServer: {
    port: process.env.port || process.env.npm_config_port || 9527,
    open: true,
    overlay: {
      warnings: false,
      errors: true
    },
    before: require('./mock/mock-server.js')
  }
}

function resolve(dir) {
  const path = require('path');
  return path.join(__dirname, dir);
}

const name = 'vue Element Admin'; // page title