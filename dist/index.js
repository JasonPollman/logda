'use strict';var _extends=Object.assign||function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i];for(var key in source){if(Object.prototype.hasOwnProperty.call(source,key)){target[key]=source[key]}}}return target};var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();var _slicedToArray=function(){function sliceIterator(arr,i){var _arr=[];var _n=true;var _d=false;var _e=undefined;try{for(var _i=arr[Symbol.iterator](),_s;!(_n=(_s=_i.next()).done);_n=true){_arr.push(_s.value);if(i&&_arr.length===i)break}}catch(err){_d=true;_e=err}finally{try{if(!_n&&_i['return'])_i['return']()}finally{if(_d)throw _e}}return _arr}return function(arr,i){if(Array.isArray(arr)){return arr}else if(Symbol.iterator in Object(arr)){return sliceIterator(arr,i)}else{throw new TypeError('Invalid attempt to destructure non-iterable instance')}}}();var _typeof=typeof Symbol==='function'&&typeof Symbol.iterator==='symbol'?function(obj){return typeof obj}:function(obj){return obj&&typeof Symbol==='function'&&obj.constructor===Symbol&&obj!==Symbol.prototype?'symbol':typeof obj};/**
 * A dependency free, but flexible logging library that works well
 * with CloudWatch logs and lambda functions.
 * @since 8/13/18
 * @file
 *//* eslint-disable class-methods-use-this */var _util=require('util');var _util2=_interopRequireDefault(_util);var _console=require('console');function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function')}}var _process$env=process.env,_process$env$LOG_LEVE=_process$env.LOG_LEVEL,LOG_LEVEL=_process$env$LOG_LEVE===undefined?'info':_process$env$LOG_LEVE,_process$env$LOG_DEPT=_process$env.LOG_DEPTH,LOG_DEPTH=_process$env$LOG_DEPT===undefined?10:_process$env$LOG_DEPT,_process$env$LOG_PRET=_process$env.LOG_PRETTY,LOG_PRETTY=_process$env$LOG_PRET===undefined?false:_process$env$LOG_PRET,_process$env$LOG_COLO=_process$env.LOG_COLORS,LOG_COLORS=_process$env$LOG_COLO===undefined?true:_process$env$LOG_COLO;var NEWLINE_SPLITTER=/\r?\n/g;var NATIVE_CONSOLE_METHODS=['log','info','error','warn'];var isObject=function isObject(thing){return thing&&(typeof thing==='undefined'?'undefined':_typeof(thing))==='object'};var isFunction=function isFunction(thing){return typeof thing==='function'};/**
 * Attempts to execute `method` and return the invocation.
 * If the execution throws `fallback` is returned.
 * @param {function} method The method to "attempt".
 * @param {any} fallback The fallback value if method throws.
 * @param {...any} args A list of arguments to pass to `method`'s invocation.
 * @returns {any} The results of `method` or the `fallback` value.
 */function attempt(method,fallback){try{for(var _len=arguments.length,args=Array(_len>2?_len-2:0),_key=2;_key<_len;_key++){args[_key-2]=arguments[_key]}return method.apply(undefined,args)}catch(e){return fallback}}/**
 * Returns true if the given level is a native console level. Using a hard coded
 * array here to selectively omit some console methods (like Console#trace).
 * @param {string} level The log level to see if a console method exists for.
 * @returns {boolean} True is the given level is a console method, false otherwise.
 */var isNativeConsoleMethod=function isNativeConsoleMethod(level){return Boolean(NATIVE_CONSOLE_METHODS.find(function(lvl){return lvl===level}))};/**
 * Converts hrtime to fractional milliseconds with a precision of 3.
 * @param {Array<number>} hrtime The hrtime to convert. An hrtime tuple.
 * @returns {number} The processed hrtime.
 */var hrtimeToMS=function hrtimeToMS(_ref){var _ref2=_slicedToArray(_ref,2),seconds=_ref2[0],nanoseconds=_ref2[1];return Number(seconds*1000+(nanoseconds/1e6).toFixed(3))};/**
 * "Colorizes" message by wrapping it in a escape color code, that is
 * if code is provided. If not `message` is simply returned.
 * @param {number} code The color code of the color to use.
 * @param {string} message The string message to colorize.
 * @returns {string} The colorized message.
 */var _colorize=function _colorize(code,message){return code?'\x1B[3'+(code<8?code:'8;5;'+code)+';1m'+message+'\x1B[0m':message};/**
 * Voids a _.has lodash dependency.
 * @param {Object} thing The thing to assert property assistance of.
 * @param {string} property The property to assert existence of.
 * @returns {boolean} True if `thing` has `prop`, false otherwise.
 */var has=function has(thing,property){return Object.hasOwnProperty.call(thing,property)};/**
 * Used to serialize error objects.
 * @param {Error} e The error to serialize.
 * @returns {Object} An object that represents the error.
 */function serializableErrorObject(e){return{name:e.name,code:e.code,message:e.message,stack:(e.stack||'').split(NEWLINE_SPLITTER)}}/**
 * Voids the _.mapValues lodash dependency.
 * Creates a new object by mapping over each item in the object and building
 * a new object with the same keys and the results of the call `iteratee` with that item.
 * @param {Object} collection The collection to map the values of.
 * @param {function} iteratee The function to use to map the values of the given object.
 * @returns {Object} A new object with the keys of the provided object and its values mapped.
 */function mapValues(collection,iteratee){var results={};Object.keys(collection).forEach(function(key){results[key]=iteratee(collection[key],key,collection)});return results}/**
 * The default logging level value (weight).
 * @type {number}
 */var DEFAULT_LOG_LEVEL=20;/**
 * Default set of colors.
 * @type {Object<number>}
 */var COLORS={dim:239,error:124,warn:172,info:38,debug:55,trace:77};/**
 * Default logging options, to be merged with
 * the user defined options.
 * @type {Object}
 */var DEFAULT_LOGGING_OPTIONS={// The logging level. This will only log message types
// with a corresponding level >= this value.
level:LOG_LEVEL,// The maximum depth when pretty printing and using inspect.
// This is passed directly to util.inspect.
depth:Number(LOG_DEPTH)||10,// True to pretty print log messages.
// If false, raw JSON will be output.
pretty:Boolean(attempt(JSON.parse,false,LOG_PRETTY)),// True to colorize message (if `pretty` is also true).
// If pretty isn't true this has no effect.
colorize:LOG_COLORS,// A function that defines how timestamps are
// generated for each log message.
timestampGenerator:function timestampGenerator(){return new Date().toISOString()},// The stream to log stdout messages to.
stdout:process.stdout,// The stream to log stderr messages to.
stderr:process.stderr,// The logging levels to define and their corresponding
// levels.
levels:{error:DEFAULT_LOG_LEVEL-20,warn:DEFAULT_LOG_LEVEL-10,info:DEFAULT_LOG_LEVEL,debug:DEFAULT_LOG_LEVEL+10,trace:DEFAULT_LOG_LEVEL+20},// The colors to use for each logging level type.
// This only has effect when `pretty` is `true`.
colors:COLORS};/**
 * The set of functions to replace when
 * interpolating a log message.
 */var TOKEN_REPLACERS={'%i':Math.trunc,'%n':Number,'%x':function x(value){return Number(value).toString(16)},'%s':function s(value){return value},'%u':function u(value){return value&&isFunction(value.toUpperCase)?value.toUpperCase():value},'%l':function l(value){return value&&isFunction(value.toLowerCase)?value.toLowerCase():value}};/**
 * The regular expression used to interpolate log messages.
 * @type {RegExp}
 */var TOKEN_REGEXP=function(){var tokens=Object.keys(TOKEN_REPLACERS).map(function(token){return token[1]}).join('');return new RegExp('(%['+tokens+'])','g')}();/**
 * Used to pretty print stack trace names.
 * @class
 */var StackTrace=function(){function StackTrace(){_classCallCheck(this,StackTrace)}_createClass(StackTrace,[{key:'toString',/**
   * String representation of this object.
   * @returns {string} The constant 'StackTrace'.
   * @memberof StackTrace
   */value:function toString(){return'StackTrace'}}]);return StackTrace}();/**
 * A logger.
 * @class Logda
 * @export
 */var Logda=function(){/**
   * Creates an instance of Logda.
   * @param {Object} opts Logging options.
   * @memberof Logda
   */function Logda(){var opts=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};_classCallCheck(this,Logda);Object.defineProperties(this,{options:{writable:true,enumerable:false,configurable:false,value:{}}});this.configure(_extends({},DEFAULT_LOGGING_OPTIONS,opts))}/**
   * Sets logging options.
   * @param {Object} options The options to set/override.
   * @returns {Logda} The current Logda instance for chaining.
   * @memberof Logda
   */_createClass(Logda,[{key:'configure',value:function configure(){var _this=this;var options=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var lastLevelMapping=this.options.levels||{};this.options=_extends({},this.options,options,{levels:_extends({},this.options.levels,options.levels),colors:_extends({},this.options.levels,options.colors)});var _options=this.options,stdout=_options.stdout,stderr=_options.stderr,levels=_options.levels;// Reinitialize the console if stdout or stderr is changed.
if(stderr||stdout)this.console=new _console.Console(stdout,stderr);if(!options.levels)return this;// Assign all the logging methods to this object, but
// make sure the user isn't trying to override some
// important proto function (like log.create or something
// stupid.)
Object.assign(this,mapValues(levels,function(weight,level){if(level in _this&&!has(lastLevelMapping,level)){throw new Error('Cannot overwrite Logda#'+level+' method.')}var logger=_this.logFunctionForLevel(weight,level);logger.assert=_this.assert(logger,level);return logger}));var _Object$keys$map$sort=Object.keys(levels).map(function(v){return v.length}).sort(Math.max);var _Object$keys$map$sort2=_slicedToArray(_Object$keys$map$sort,1);this.padding=_Object$keys$map$sort2[0];return this}/**
   * Calls util.inspect with the current instance's options.
   * @param {any} data The data to inspect.
   * @param {Object} options The options to set/override on the call to util.inspect.
   * @returns {string} Results of util.inspect.
   * @memberof Logda
   */},{key:'inspect',value:function inspect(data){var options=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};return _util2.default.inspect(data,_extends({depth:this.options.depth,colors:this.options.colorize,compact:false},options))}/**
   * Converts a string log level name into it's numeric level equivalent.
   * @param {string} levelString The log leve name to get the weight for.
   * @returns {number} The numeric log level value.
   * @memberof Logda
   */},{key:'getNumericLogLevel',value:function getNumericLogLevel(levelString){var value=this.options.levels[levelString];return Math.max(value||value===0?value:DEFAULT_LOG_LEVEL,-Infinity)}/**
   * Interpolates %[char] in within message strings.
   * @param {string} message The message to interpolate.
   * @param {Array<any>} tokens The tokens that can be used as a replacement.
   * @returns {string} The interpolated message.
   * @memberof Logda
   */},{key:'interpolateLogMessage',value:function interpolateLogMessage(message,tokens){var _this2=this;return message.replace(TOKEN_REGEXP,function($0,$1){return TOKEN_REPLACERS[$1]?TOKEN_REPLACERS[$1](tokens.shift(),_this2):$0})}/**
   * Used to create a logging function for each log level.
   * @param {number} weight The level's logging weight.
   * @param {string} level The logging level's name.
   * @returns {function} A logging function to the given level.
   */},{key:'logFunctionForLevel',value:function logFunctionForLevel(){var _this3=this;var weight=arguments.length>0&&arguments[0]!==undefined?arguments[0]:DEFAULT_LOG_LEVEL;var level=arguments[1];return function(message){for(var _len2=arguments.length,metadata=Array(_len2>1?_len2-1:0),_key2=1;_key2<_len2;_key2++){metadata[_key2-1]=arguments[_key2]}return _this3.write({level:level,weight:weight,message:message,metadata:metadata})}}/**
   * Used by all logging functions to log messages.
   * This is the method that acutally prints stuff.
   * @param {Object} definition A set of properties that define
   * the current log message.
   * @returns {undefined}
   * @memberof Logda
   */},{key:'write',value:function write(){var _ref3=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{},level=_ref3.level,weight=_ref3.weight,message=_ref3.message,metadata=_ref3.metadata;var _options2=this.options,colors=_options2.colors,pretty=_options2.pretty,replacer=_options2.replacer,timestampGenerator=_options2.timestampGenerator;var numericLoggingLevel=typeof this.options.level==='number'?this.options.level:this.getNumericLogLevel(level);// The level set by the user in options is less than
// the defined level for this logging level function.
if(numericLoggingLevel<weight)return;var metaObject=metadata[metadata.length-1];var serializeableMetaObject=metaObject&&metaObject instanceof Error?serializableErrorObject(metaObject):metaObject;var results={level:level,timestamp:timestampGenerator(),message:this.interpolateLogMessage(message,metadata),meta:metaObject&&isObject(serializeableMetaObject)?serializeableMetaObject:undefined,delta:hrtimeToMS(this.delta?process.hrtime(this.delta):[0,0])};var trace=void 0;// If the level name is "trace" it will include
// a stack track in the output log message/json.
if(level==='trace'){var _stack=new StackTrace;Error.captureStackTrace(_stack,this.trace);results.trace=_stack.stack.split(NEWLINE_SPLITTER);trace=_stack.stack}// Select console.log, console.info, console.error, etc.
var log=isNativeConsoleMethod(level)&&isFunction(this.console[level])?this.console[level]:this.console.log;this.delta=process.hrtime();if(!pretty){log(attempt(JSON.stringify,'[Circular]',results,replacer));return}// Pretty print the results in non-json format.
// This indicates the user passed `pretty` to a new
// logger or LL_PRETTY was flagged as `true`.
var meta=results.meta,delta=results.delta;var padded=(''+' '.repeat(this.padding)+level.toUpperCase()).slice(-this.padding);var prefix=this.colorize(colors[level],padded);var suffix=this.colorize(colors[level],'+'+delta.toFixed(3));var inspect=meta?this.inspect(meta):'';var stack=trace?'\r\n\r\n'+this.colorize(COLORS.dim,trace)+'\r\n':'';log(prefix+' '+results.message+' '+suffix+' '+inspect+stack)}/**
   * Colorizes `message` using `color` if `options.colorize` is true.
   * @param {number} color The color to use to colorize `message`.
   * @param {string} message The message to colorize.
   * @returns {string} The message, colorized if options permit.
   */},{key:'colorize',value:function colorize(color,message){return this.options.colorize?_colorize(color,message):message}/**
   * Creates a new logger.
   * @param {Object} options Logging options.
   * @returns {Logda} A new Logda instance.
   * @memberof Logda
   */},{key:'create',value:function create(options){return new Logda(options)}/**
   * Creates a child logger
   * @param {Object} options Logging options.
   * @returns {Logda} A new Logda instance.
   * @memberof Logda
   */},{key:'clone',value:function clone(options){return new Logda(_extends({},this.options,options))}/**
   * Returns a a special logging function that logs only if `condition` is truthy.
   * @param {function} logger The logging method to use to log.
   * @returns {undefined}
   */},{key:'assert',value:function assert(logger){return function(condition){for(var _len3=arguments.length,messages=Array(_len3>1?_len3-1:0),_key3=1;_key3<_len3;_key3++){messages[_key3-1]=arguments[_key3]}return condition&&logger.apply(undefined,messages)}}}]);return Logda}();module.exports=new Logda;