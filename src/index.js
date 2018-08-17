/**
 * A dependency free, but flexible logging library that works well
 * with CloudWatch logs and lambda functions.
 * @since 8/13/18
 * @file
 */

/* eslint-disable class-methods-use-this */

import util from 'util';
import { Console } from 'console';

const {
  LOG_LEVEL = 'info',
  LOG_DEPTH = 10,
  LOG_PRETTY = false,
  LOG_COLORS = true,
} = process.env;

const NEWLINE_SPLITTER = /\r?\n/g;
const NATIVE_CONSOLE_METHODS = ['log', 'info', 'error', 'warn'];

const isObject = thing => thing && typeof thing === 'object';
const isFunction = thing => typeof thing === 'function';

/**
 * Attempts to execute `method` and return the invocation.
 * If the execution throws `fallback` is returned.
 * @param {function} method The method to "attempt".
 * @param {any} fallback The fallback value if method throws.
 * @param {...any} args A list of arguments to pass to `method`'s invocation.
 * @returns {any} The results of `method` or the `fallback` value.
 */
function attempt(method, fallback, ...args) {
  try {
    return method(...args);
  } catch (e) {
    return fallback;
  }
}

/**
 * Returns true if the given level is a native console level. Using a hard coded
 * array here to selectively omit some console methods (like Console#trace).
 * @param {string} level The log level to see if a console method exists for.
 * @returns {boolean} True is the given level is a console method, false otherwise.
 */
const isNativeConsoleMethod = (
  level => Boolean(NATIVE_CONSOLE_METHODS.find(lvl => lvl === level))
);

/**
 * Converts hrtime to fractional milliseconds with a precision of 3.
 * @param {Array<number>} hrtime The hrtime to convert. An hrtime tuple.
 * @returns {number} The processed hrtime.
 */
const hrtimeToMS = ([seconds, nanoseconds]) => (
  Number((seconds * 1000) + (nanoseconds / 1e6).toFixed(3))
);

/**
 * "Colorizes" message by wrapping it in a escape color code, that is
 * if code is provided. If not `message` is simply returned.
 * @param {number} code The color code of the color to use.
 * @param {string} message The string message to colorize.
 * @returns {string} The colorized message.
 */
const colorize = (code, message) => (
  code ? `\u001b[3${code < 8 ? code : `8;5;${code}`};1m${message}\u001b[0m` : message
);

/**
 * Voids a _.has lodash dependency.
 * @param {Object} thing The thing to assert property assistance of.
 * @param {string} property The property to assert existence of.
 * @returns {boolean} True if `thing` has `prop`, false otherwise.
 */
const has = (thing, property) => Object.hasOwnProperty.call(thing, property);

/**
 * Used to serialize error objects.
 * @param {Error} e The error to serialize.
 * @returns {Object} An object that represents the error.
 */
function serializableErrorObject(e) {
  return {
    name: e.name,
    code: e.code,
    message: e.message,
    stack: (e.stack || '').split(NEWLINE_SPLITTER),
  };
}

/**
 * Voids the _.mapValues lodash dependency.
 * Creates a new object by mapping over each item in the object and building
 * a new object with the same keys and the results of the call `iteratee` with that item.
 * @param {Object} collection The collection to map the values of.
 * @param {function} iteratee The function to use to map the values of the given object.
 * @returns {Object} A new object with the keys of the provided object and its values mapped.
 */
function mapValues(collection, iteratee) {
  const results = {};
  Object.keys(collection).forEach((key) => {
    results[key] = iteratee(collection[key], key, collection);
  });

  return results;
}

/**
 * The default logging level value (weight).
 * @type {number}
 */
const DEFAULT_LOG_LEVEL = 20;

/**
 * Default set of colors.
 * @type {Object<number>}
 */
const COLORS = {
  dim: 239,
  error: 124,
  warn: 172,
  info: 38,
  debug: 55,
  trace: 77,
};

/**
 * Default logging options, to be merged with
 * the user defined options.
 * @type {Object}
 */
const DEFAULT_LOGGING_OPTIONS = {
  // The logging level. This will only log message types
  // with a corresponding level >= this value.
  level: LOG_LEVEL,
  // The maximum depth when pretty printing and using inspect.
  // This is passed directly to util.inspect.
  depth: Number(LOG_DEPTH) || 10,
  // True to pretty print log messages.
  // If false, raw JSON will be output.
  pretty: Boolean(attempt(JSON.parse, false, LOG_PRETTY)),
  // True to colorize message (if `pretty` is also true).
  // If pretty isn't true this has no effect.
  colorize: LOG_COLORS,
  // A function that defines how timestamps are
  // generated for each log message.
  timestampGenerator: () => new Date().toISOString(),
  // The stream to log stdout messages to.
  stdout: process.stdout,
  // The stream to log stderr messages to.
  stderr: process.stderr,
  // The logging levels to define and their corresponding
  // levels.
  levels: {
    error: DEFAULT_LOG_LEVEL - 20,
    warn: DEFAULT_LOG_LEVEL - 10,
    info: DEFAULT_LOG_LEVEL,
    debug: DEFAULT_LOG_LEVEL + 10,
    trace: DEFAULT_LOG_LEVEL + 20,
  },
  // The colors to use for each logging level type.
  // This only has effect when `pretty` is `true`.
  colors: COLORS,
};

/**
 * The set of functions to replace when
 * interpolating a log message.
 */
const TOKEN_REPLACERS = {
  '%i': Math.trunc,
  '%n': Number,
  '%x': value => Number(value).toString(16),
  '%s': value => value,
  '%u': value => (value && isFunction(value.toUpperCase) ? value.toUpperCase() : value),
  '%l': value => (value && isFunction(value.toLowerCase) ? value.toLowerCase() : value),
};

/**
 * The regular expression used to interpolate log messages.
 * @type {RegExp}
 */
const TOKEN_REGEXP = (() => {
  const tokens = Object.keys(TOKEN_REPLACERS).map(token => token[1]).join('');
  return new RegExp(`(%[${tokens}])`, 'g');
})();

/**
 * Used to pretty print stack trace names.
 * @class
 */
class StackTrace {
  /**
   * String representation of this object.
   * @returns {string} The constant 'StackTrace'.
   * @memberof StackTrace
   */
  toString() {
    return 'StackTrace';
  }
}

/**
 * A logger.
 * @class Logda
 * @export
 */
class Logda {
  /**
   * Creates an instance of Logda.
   * @param {Object} opts Logging options.
   * @memberof Logda
   */
  constructor(opts = {}) {
    Object.defineProperties(this, {
      options: {
        writable: true,
        enumerable: false,
        configurable: false,
        value: {},
      },
    });

    this.configure({ ...DEFAULT_LOGGING_OPTIONS, ...opts });
  }

  /**
   * Sets logging options.
   * @param {Object} options The options to set/override.
   * @returns {Logda} The current Logda instance for chaining.
   * @memberof Logda
   */
  configure(options = {}) {
    const lastLevelMapping = this.options.levels || {};

    this.options = {
      ...this.options,
      ...options,
      levels: {
        ...this.options.levels,
        ...options.levels,
      },
      colors: {
        ...this.options.levels,
        ...options.colors,
      },
    };

    const {
      stdout,
      stderr,
      levels,
    } = this.options;

    // Reinitialize the console if stdout or stderr is changed.
    if (stderr || stdout) this.console = new Console(stdout, stderr);
    if (!options.levels) return this;

    // Assign all the logging methods to this object, but
    // make sure the user isn't trying to override some
    // important proto function (like log.create or something
    // stupid.)
    Object.assign(this, mapValues(levels, (weight, level) => {
      if (level in this && !has(lastLevelMapping, level)) {
        throw new Error(`Cannot overwrite Logda#${level} method.`);
      }

      const logger = this.logFunctionForLevel(weight, level);
      logger.assert = this.assert(logger, level);
      return logger;
    }));

    [this.padding] = Object.keys(levels).map(v => v.length).sort(Math.max);
    return this;
  }

  /**
   * Calls util.inspect with the current instance's options.
   * @param {any} data The data to inspect.
   * @param {Object} options The options to set/override on the call to util.inspect.
   * @returns {string} Results of util.inspect.
   * @memberof Logda
   */
  inspect(data, options = {}) {
    return util.inspect(data, {
      depth: this.options.depth,
      colors: this.options.colorize,
      compact: false,
      ...options,
    });
  }

  /**
   * Converts a string log level name into it's numeric level equivalent.
   * @param {string} levelString The log leve name to get the weight for.
   * @returns {number} The numeric log level value.
   * @memberof Logda
   */
  getNumericLogLevel(levelString) {
    const value = this.options.levels[levelString];
    return Math.max(value || value === 0 ? value : DEFAULT_LOG_LEVEL, -Infinity);
  }

  /**
   * Interpolates %[char] in within message strings.
   * @param {string} message The message to interpolate.
   * @param {Array<any>} tokens The tokens that can be used as a replacement.
   * @returns {string} The interpolated message.
   * @memberof Logda
   */
  interpolateLogMessage(message, tokens) {
    return message.replace(TOKEN_REGEXP, ($0, $1) => (
      TOKEN_REPLACERS[$1] ? TOKEN_REPLACERS[$1](tokens.shift(), this) : $0
    ));
  }

  /**
   * Used to create a logging function for each log level.
   * @param {number} weight The level's logging weight.
   * @param {string} level The logging level's name.
   * @returns {function} A logging function to the given level.
   */
  logFunctionForLevel(weight = DEFAULT_LOG_LEVEL, level) {
    return (message, ...metadata) => this.write({
      level,
      weight,
      message,
      metadata,
    });
  }

  /**
   * Used by all logging functions to log messages.
   * This is the method that acutally prints stuff.
   * @param {Object} definition A set of properties that define
   * the current log message.
   * @returns {undefined}
   * @memberof Logda
   */
  write({
    level,
    weight,
    message,
    metadata,
  } = {}) {
    const {
      colors,
      pretty,
      replacer,
      timestampGenerator,
    } = this.options;

    const numericLoggingLevel = typeof this.options.level === 'number'
      ? this.options.level
      : this.getNumericLogLevel(level);

    // The level set by the user in options is less than
    // the defined level for this logging level function.
    if (numericLoggingLevel < weight) return;

    const metaObject = metadata[metadata.length - 1];
    const serializeableMetaObject = metaObject && metaObject instanceof Error
      ? serializableErrorObject(metaObject)
      : metaObject;

    const results = {
      level,
      timestamp: timestampGenerator(),
      message: this.interpolateLogMessage(message, metadata),
      meta: metaObject && isObject(serializeableMetaObject) ? serializeableMetaObject : undefined,
      delta: hrtimeToMS(this.delta ? process.hrtime(this.delta) : [0, 0]),
    };

    let trace;

    // If the level name is "trace" it will include
    // a stack track in the output log message/json.
    if (level === 'trace') {
      const stack = new StackTrace();
      Error.captureStackTrace(stack, this.trace);
      results.trace = stack.stack.split(NEWLINE_SPLITTER);
      trace = stack.stack;
    }

    // Select console.log, console.info, console.error, etc.
    const log = isNativeConsoleMethod(level) && isFunction(this.console[level])
      ? this.console[level]
      : this.console.log;

    this.delta = process.hrtime();

    if (!pretty) {
      log(attempt(JSON.stringify, '[Circular]', results, replacer));
      return;
    }

    // Pretty print the results in non-json format.
    // This indicates the user passed `pretty` to a new
    // logger or LL_PRETTY was flagged as `true`.
    const { meta, delta } = results;

    const padded = `${' '.repeat(this.padding)}${level.toUpperCase()}`.slice(-this.padding);
    const prefix = this.colorize(colors[level], padded);
    const suffix = this.colorize(colors[level], `+${delta.toFixed(3)}`);

    const inspect = meta ? this.inspect(meta) : '';
    const stack = trace ? `\r\n\r\n${this.colorize(COLORS.dim, trace)}\r\n` : '';

    log(`${prefix} ${results.message} ${suffix} ${inspect}${stack}`);
  }

  /**
   * Colorizes `message` using `color` if `options.colorize` is true.
   * @param {number} color The color to use to colorize `message`.
   * @param {string} message The message to colorize.
   * @returns {string} The message, colorized if options permit.
   */
  colorize(color, message) {
    return this.options.colorize ? colorize(color, message) : message;
  }

  /**
   * Creates a new logger.
   * @param {Object} options Logging options.
   * @returns {Logda} A new Logda instance.
   * @memberof Logda
   */
  create(options) {
    return new Logda(options);
  }

  /**
   * Creates a child logger
   * @param {Object} options Logging options.
   * @returns {Logda} A new Logda instance.
   * @memberof Logda
   */
  clone(options) {
    return new Logda({ ...this.options, ...options });
  }

  /**
   * Returns a a special logging function that logs only if `condition` is truthy.
   * @param {function} logger The logging method to use to log.
   * @returns {undefined}
   */
  assert(logger) {
    return (condition, ...messages) => condition && logger(...messages);
  }
}

module.exports = new Logda(/* default options */);
