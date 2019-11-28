module.exports = {
  title: 'Hello VuePress',
  description: 'Just playing around',
  themeConfig: {
    sidebar: 'auto',
  },
  markdown: {
    config: md => {
      md.use(require('markdown-it-footnote'));
    },
  },
};
