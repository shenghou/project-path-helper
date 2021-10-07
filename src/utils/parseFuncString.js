const { parse } = require('esprima');
const ensureArray = require('ensure-array');


/**
 *  @description parse func
 */
const parseFuncFromString = (content, opts = {}) => {
  const funcs =
    opts.list !== undefined
      ? ensureArray(opts.list)
      : ensureArray(options.func.list);

  if (funcs.length === 0) {
    return;
  }

  const matchFuncs = funcs
    .map((func) => '(?:' + func + ')')
    .join('|')
    .replace(/\./g, '\\.');
  // `\s` matches a single whitespace character, which includes spaces, tabs, form feeds, line feeds and other unicode spaces.
  const matchSpecialCharacters = '[\\r\\n\\s]*';
  const stringGroup =
    matchSpecialCharacters +
    '(' +
    // backtick (``)
    '`(?:[^`\\\\]|\\\\(?:.|$))*`' +
    '|' +
    // double quotes ("")
    '"(?:[^"\\\\]|\\\\(?:.|$))*"' +
    '|' +
    // single quote ('')
    "'(?:[^'\\\\]|\\\\(?:.|$))*'" +
    ')' +
    matchSpecialCharacters;
  const pattern =
    '(?:(?:^\\s*)|[^a-zA-Z0-9_])' +
    '(?:' +
    matchFuncs +
    ')' +
    '\\(' +
    stringGroup +
    '(?:[\\,]' +
    stringGroup +
    ')?' +
    '[\\,\\)]';
  const re = new RegExp(pattern, 'gim');

  let r;
  const keysArray = [];
  while ((r = re.exec(content))) {
    const options = {};
    const full = r[0];

    let key = fixStringAfterRegExp(r[1]);
    if (!key) {
      continue;
    }

    if (r[2] !== undefined) {
      const defaultValue = fixStringAfterRegExp(r[2]);
      if (!defaultValue) {
        continue;
      }
      options.defaultValue = defaultValue;
    }

    const endsWithComma = full[full.length - 1] === ',';
    if (endsWithComma) {
      const { propsFilter } = { ...opts };

      let code = matchBalancedParentheses(content.substr(re.lastIndex));

      if (typeof propsFilter === 'function') {
        code = propsFilter(code);
      }

      try {
        const syntax = code.trim() !== '' ? parse('(' + code + ')') : {};

        const props = syntax['body[0].expression.properties'] || [];
        const supportedOptions = [
          'defaultValue',
          'defaultValue_plural',
          'count',
          'context',
          'ns',
          'keySeparator',
          'nsSeparator',
        ];

        props.forEach((prop) => {
          if (supportedOptions.includes(prop.key.name)) {
            if (prop.value.type === 'Literal') {
              options[prop.key.name] = prop.value.value;
            } else if (prop.value.type === 'TemplateLiteral') {
              options[prop.key.name] = prop.value.quasis
                .map((element) => element.value.cooked)
                .join('');
            } else {
              // Unable to get value of the property
              options[prop.key.name] = '';
            }
          }
        });
      } catch (err) {
        // console.log(`Unable to parse code "${code}"`);
      }
    }

    keysArray.push(key);
  }

  return keysArray;
};

const fixStringAfterRegExp = (strToFix) => {
  let fixedString = String(strToFix).trim();
  const firstChar = fixedString[0];

  // Ignore key with embedded expressions in string literals
  if (firstChar === '`' && fixedString.match(/\${.*?}/)) {
    return null;
  }

  if (["'", '"', '`'].includes(firstChar)) {
    // Remove first and last character
    fixedString = fixedString.slice(1, -1);
  }

  // restore multiline strings
  fixedString = fixedString.replace(/(\\\n|\\\r\n)/g, '');

  // JavaScript character escape sequences
  // https://mathiasbynens.be/notes/javascript-escapes

  // Single character escape sequences
  // Note: IE < 9 treats '\v' as 'v' instead of a vertical tab ('\x0B'). If cross-browser compatibility is a concern, use \x0B instead of \v.
  // Another thing to note is that the \v and \0 escapes are not allowed in JSON strings.
  fixedString = fixedString.replace(
    /(\\b|\\f|\\n|\\r|\\t|\\v|\\0|\\\\|\\"|\\')/g,
    (match) => eval(`"${match}"`)
  );

  // * Octal escapes have been deprecated in ES5.
  // * Hexadecimal escape sequences: \\x[a-fA-F0-9]{2}
  // * Unicode escape sequences: \\u[a-fA-F0-9]{4}
  fixedString = fixedString.replace(
    /(\\x[a-fA-F0-9]{2}|\\u[a-fA-F0-9]{4})/g,
    (match) => eval(`"${match}"`)
  );
  return fixedString;
};

// http://codereview.stackexchange.com/questions/45991/balanced-parentheses
const matchBalancedParentheses = (str = '') => {
  const parentheses = '[]{}()';
  const stack = [];
  let bracePosition;
  let start = -1;
  let i = 0;

  str = '' + str; // ensure string
  for (i = 0; i < str.length; ++i) {
    if (start >= 0 && stack.length === 0) {
      return str.substring(start, i);
    }

    bracePosition = parentheses.indexOf(str[i]);
    if (bracePosition < 0) {
      continue;
    }
    if (bracePosition % 2 === 0) {
      if (start < 0) {
        start = i; // remember the start position
      }
      stack.push(bracePosition + 1); // push next expected brace position
      continue;
    }

    if (stack.pop() !== bracePosition) {
      return str.substring(start, i);
    }
  }

  return str.substring(start, i);
};
