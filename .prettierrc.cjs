module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
  arrowParens: 'avoid',
  // Prettier v3 requires explicit plugin registration.
  // Keep Tailwind last so it can sort classes after other formatting.
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
};
