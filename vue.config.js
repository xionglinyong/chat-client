module.exports = {
  devServer: {
    https: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://nls-gateway.cn-shanghai.aliyuncs.com/stream/',
        ws: true,
        changeOrigin: true,
        pathRewrite: {
          '^/api': 'v1'
        }
      }
    }
  },
  publicPath: '/',
  transpileDependencies: [
    'vuetify'
  ]
}
