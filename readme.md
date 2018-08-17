# logda
> A dependency free, flexible logging library that works well with CloudWatch logs and Lambda functions.

**Yup, it's another logging module.**

## Motivation
I've always been a fan of the way [bunyan](https://www.npmjs.com/package/bunyan) handles
logging (outputting JSON and piping to a formatter for human readable output). However—for AWS Lambda—it's a bit overkill and contains dependencies like `moment` that bloat deployment zips.

**This logger focuses on being lightweight, flexible, and produces JSON output.**    
Like bunyan, logda outputs JSON. However, rather than piping output
to another process, you can set the environment variable `LOG_PRETTY=true` and it'll
print human readable text for development purposes.

Since the default output is JSON, you can pretty much redirect your lambda logs to
a number of JSON supported logging systems (logstash, datadog, etc.).

### Sample Logda Output in CloudWatch Logs
```js
log.info('Hello World');
log.debug('User Boz Scaggs logged in...', user);
```

![CloudWatch Logs Example](https://raw.githubusercontent.com/JasonPollman/logda/master/images/cloudwatch-logs.png)


#### Why not these other loggers?
- [debug](https://www.npmjs.com/package/debug)    
  - Lightweight and awesomely simple, but lacks features like settings a level based on environment.
  - When printing objects using tokens like `%O`, output is put on seperate lines and
    very hard to read!
  - Hey, `%j` works well, but is unreadable in terminal.
- [winston](https://www.npmjs.com/package/winston)    
  - Way too heavy for lambda.
  - Contains cool, but unnecessary features.

## Install
```bash
npm install logda --save
```

## Usage
```js
import log from 'logda';

// Default logging levels
log.info('Hello World!');
log.debug('HERE >>>');
log.trace('What the?');
log.warn('Careful!');
log.error('Something bad happened...');

// Interpolated string values
// Prints "My name is Chuck Norris"
log.info('My name is %s', 'Chuck Norris');

// Interpolated numeric values
// Prints "The magic number is 10"
log.info('The magic number is %n', 10);

// Log meta data
// If in "json" mode, this will add a `meta` object to the
// log output object. If in "pretty" mode, this prints the
// *first* object (after all interpolated values) to the
// console using util.inspect.
log.info('message', { foo: 'bar', baz: 'quxx' });
```

## Default Logger
**By default, logda exports a "default" logger.**

```js
import log from 'logda';

log.info('Hello world!');
```

However, you can create loggers with custom options using `log.create` (see the section
[Creating Custom Loggers](#creating-custom-loggers) below).

### Default Logging Methods

| Method | Level | Specialities? |
| ------ | ----- | ------------- |
| error  | `0`   | No            |
| warn   | `10`  | No            |
| info   | `20`  | No            |
| debug  | `30`  | No            |
| trace  | `40`  | Includes a `trace` object on the output JSON containing a stacktrace from where the `log.trace` method was called. In "pretty" mode the stacktrace is printed along with the provided log message. |

### Environment Variables
**Set environment variables to change the behavior of the default logger.**

| Variable   | Default | Description |
| ---------- | ------- | ----------- |
| LOG_LEVEL  | `info`  | The *maximum* log level to log. This can be either a number or a specific log level name. |
| LOG_PRETTY | `false` | If `true`, all output will be printed as human readable text rather than JSON. |
| LOG_DEPTH  | `10`    | The maximum depth to pass to `util.inspect` for printing meta data in "pretty" mode. This has no effect in JSON mode. |
| LOG_COLORS | `true`  | If `true`, prints colors when in "pretty" mode. Has no effect in JSON mode. |

**Examples**

```bash
# Only print log with levels 20 and below (info, warn, error)
LOG_LEVEL=20 node ./my-program.js

# Only print log with levels 30 and below (debug, info, warn, error)
LOG_LEVEL=debug node ./my-program.js

# Effectively print nothing...
LOG_LEVEL=-999 node ./my-program.js
```

### Assertion Logging
All logging methods contain a static `assert` method that you can use to conditionally log messages.

```js
log.info.assert(condition, 'message');

// Doesn't print anything.
log.warn.assert(false, '...');

// Always prints the message.
log.warn.assert(true, '...');

// Print only if error
fs.unlink('...', (err) => {
  log.info.assert(err, 'Couldn\'t remove file: %s', e.message);
});
```

### String Interpolation
Like [debug](https://www.npmjs.com/package/debug), logda allows you to interpolate `%` tokens in
your log message. However, since all log output is JSON, only string and numeric tokens are available.
This is to dissuade users from using things like `%O` and ending up with "double stringified" values
in their log messages. Nonetheless, having just `%s` makes life much easier!

```js
log.info('Fruits: %s, %s, %s', 'apples', 'banannas', 'oranges', { /* meta data */ });
```

#### Interpolation Tokens

| Token      | Description |
| ---------- | ----------- |
| `%s`       | Converts the given value to a string, calls `.toString` where applicable. |
| `%l`       | Converts the given value to a lower-cased string. |
| `%u`       | Converts the given value to a upper-cased string. |
| `%i`       | Converts the given value to an integer using `Math.trunc`. |
| `%n`       | Converts the given value to a number using `Number(value)`. |
| `%x`       | Converts the given value to a hex number. |

## Creating Custom Loggers
Use the default logger's `create` method to create new instances of the `Logda` class.

```js
import fs from 'fs';
import log from 'logda';

const customLog = log.create({ /* options */ });
```

### Logda Options

| Option                 | Default                          | Description |
| ---------------------- | -------------------------------- | ----------- |
| level                  | `process.env.LOG_LEVEL`          | The logging level. This will only log message types with a corresponding level >= this value. |
| depth                  | `process.env.LOG_DEPTH`          | The maximum depth when pretty printing and using inspect. This is passed directly to `util.inspect`. |
| pretty                 | `process.env.LOG_PRETTY`         | True to pretty print log messages. If false, raw JSON will be output. |
| colorize               | `process.env.LOG_COLORS`         | True to print messages using colors (if `pretty` is also true). |
| timestampGenerator     | `() => new Date().toISOString()` | A function that defines how timestamps are generated for each log message. |
| stdout                 | `process.env.LOG_COLORS`         | The stream to log stdout messages to. |
| srderr                 | `process.env.LOG_COLORS`         | The stream to log stderr messages to. |
| levels                 | `{ error: 0, warn: 10, ... }`    | A mapping of logging levels to their "logging level weight". |
| colors                 | `{ error: 125, warn: 172, ... }` | A mapping of logging levels to the ANSI terminal color code to use when `pretty` and `colorize` are both set. |

### Logging To File
**You can pass any `Writable` stream to to the `stdout` and `stderr` options.**

```js
import fs from 'fs';
import log from 'logda';

const logFileStream = fs.createWriteStream('./logs.log', 'a');
const errFileStream = fs.createWriteStream('./error.log', 'a');

// Create custom file logger.
// You can pass any writable stream to `stdout` and `stderr` options.
const filelog = log.create({
  stdout: logFileStream,
  stderr: errFileStream,
});

filelog.info('Logged to disk!');
```