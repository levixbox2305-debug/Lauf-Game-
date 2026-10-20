// Extends app.json. BASE_URL lets the web build live in a sub-path, e.g. /laufwelt on GitHub Pages.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.BASE_URL ? { baseUrl: process.env.BASE_URL } : {}),
  },
});
