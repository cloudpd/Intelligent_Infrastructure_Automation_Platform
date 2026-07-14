const Handlebars = require('handlebars');

let registered = false;

function registerHelpers() {
  if (registered) return Handlebars;
  registered = true;

  Handlebars.registerHelper('eq', (a, b) => a === b);

  Handlebars.registerHelper('b64', (value) =>
    Buffer.from(String(value ?? '')).toString('base64')
  );

  // Renders a block only for the last item of an #each iteration —
  // handy to avoid trailing blank lines in list-heavy YAML sections.
  Handlebars.registerHelper('isLast', function isLast(index, array, options) {
    return index === array.length - 1 ? options.fn(this) : options.inverse(this);
  });

  return Handlebars;
}

module.exports = { registerHelpers };
