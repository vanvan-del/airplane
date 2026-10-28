// 网页版发布到 GitHub Pages 时，网站在 /airplane/ 路径下，需要设置 baseUrl。
// 本地开发和手机 App 不受影响。
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
