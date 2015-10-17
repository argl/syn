/* */ 
(function(Buffer, process) {
  var Yaml = null,
      VisionmediaYaml = null,
      Coffee = null,
      Iced = null,
      CSON = null,
      PPARSER = null,
      JSON5 = null,
      TOML = null,
      HJSON = null,
      deferConfig = require("../defer").deferConfig,
      DeferredConfig = require("../defer").DeferredConfig,
      Utils = require("util"),
      Path = require("path"),
      FileSystem = require("fs");
  var DEFAULT_CLONE_DEPTH = 20,
      NODE_CONFIG,
      CONFIG_DIR,
      RUNTIME_JSON_FILENAME,
      NODE_ENV,
      APP_INSTANCE,
      HOST,
      HOSTNAME,
      ALLOW_CONFIG_MUTATIONS,
      env = {},
      privateUtil = {},
      deprecationWarnings = {},
      configSources = [],
      checkMutability = true;
  var Config = function() {
    var t = this;
    for (var fnName in util) {
      util[fnName] = util[fnName].bind(t);
    }
    util.extendDeep(t, util.loadFileConfigs());
    util.attachProtoDeep(t);
    util.runStrictnessChecks(t);
  };
  var util = Config.prototype.util = {};
  var getImpl = function(object, property) {
    var t = this,
        elems = Array.isArray(property) ? property : property.split('.'),
        name = elems[0],
        value = object[name];
    if (elems.length <= 1) {
      return value;
    }
    if (typeof value !== 'object') {
      return undefined;
    }
    return getImpl(value, elems.slice(1));
  };
  Config.prototype.get = function(property) {
    if (property === null || property === undefined) {
      throw new Error("Calling config.get with null or undefined argument");
    }
    var t = this,
        value = getImpl(t, property);
    if (value === undefined) {
      throw new Error('Configuration property "' + property + '" is not defined');
    }
    if (checkMutability) {
      if (!util.initParam('ALLOW_CONFIG_MUTATIONS', false)) {
        util.makeImmutable(config);
      }
      checkMutability = false;
    }
    return value;
  };
  Config.prototype.has = function(property) {
    if (property === null || property === undefined) {
      return false;
    }
    var t = this;
    return (getImpl(t, property) !== undefined);
  };
  util.watch = function(object, property, handler, depth) {
    var t = this,
        o = object;
    var allProperties = property ? [property] : Object.keys(o);
    if (!deprecationWarnings.watch) {
      console.error('WARNING: config.' + fnName + '() is deprecated, and will not be supported in release 2.0.');
      console.error('WARNING: See https://github.com/lorenwest/node-config/wiki/Future-Compatibility#upcoming-incompatibilities');
      deprecationWarnings.watch = true;
    }
    depth = (depth === null ? DEFAULT_CLONE_DEPTH : depth);
    if (depth < 0) {
      return ;
    }
    if (!o.__watchers)
      util.makeHidden(o, '__watchers', {});
    if (!o.__propertyValues)
      util.makeHidden(o, '__propertyValues', {});
    allProperties.forEach(function(prop) {
      if (typeof(o.__propertyValues[prop]) === 'undefined') {
        var descriptor = Object.getOwnPropertyDescriptor(o, prop);
        if (descriptor && descriptor.writable === false)
          return ;
        o.__propertyValues[prop] = [o[prop]];
        o.__watchers[prop] = [];
        Object.defineProperty(o, prop, {
          enumerable: true,
          get: function() {
            if (o.__propertyValues[prop].length === 1)
              return o.__propertyValues[prop][0];
            else
              return o.__propertyValues[prop][1];
          },
          set: function(newValue) {
            var origValue = o[prop];
            if (util.equalsDeep(origValue, newValue))
              return ;
            o.__propertyValues[prop].push(newValue);
            if (o.__propertyValues[prop].length > 2)
              return ;
            var numIterations = 0;
            while (o.__propertyValues[prop].length > 1) {
              if (++numIterations > 20) {
                o.__propertyValues[prop] = [origValue];
                throw new Error('Recursion detected while setting [' + prop + ']');
              }
              var oldValue = o.__propertyValues[prop][0];
              newValue = o.__propertyValues[prop][1];
              o.__watchers[prop].forEach(function(watcher) {
                try {
                  watcher(o, prop, oldValue, newValue);
                } catch (e) {
                  console.error("Exception in object watcher for " + prop, e);
                }
              });
              o.__propertyValues[prop].splice(0, 1);
            }
          }
        });
      }
      o.__watchers[prop].push(handler);
      if (o[prop] && typeof(o[prop]) === 'object') {
        util.watch(o[prop], null, handler, depth - 1);
      }
    });
    return o;
  };
  util.setModuleDefaults = function(moduleName, defaultProperties) {
    var t = this,
        moduleConfig = util.cloneDeep(defaultProperties);
    if (configSources.length === 0 || configSources[0].name !== 'Module Defaults') {
      configSources.splice(0, 0, {
        name: 'Module Defaults',
        parsed: {}
      });
    }
    configSources[0].parsed[moduleName] = {};
    util.extendDeep(configSources[0].parsed[moduleName], defaultProperties);
    t[moduleName] = t[moduleName] || {};
    util.extendDeep(moduleConfig, t[moduleName]);
    util.extendDeep(t[moduleName], moduleConfig);
    if (!util.initParam('ALLOW_CONFIG_MUTATIONS', false)) {
      checkMutability = true;
    }
    return util.attachProtoDeep(t[moduleName]);
  };
  util.makeHidden = function(object, property, value) {
    if (typeof value === 'undefined') {
      Object.defineProperty(object, property, {enumerable: false});
    } else {
      Object.defineProperty(object, property, {
        value: value,
        enumerable: false
      });
    }
    return object;
  };
  util.makeImmutable = function(object, property, value) {
    var properties = null;
    if (typeof property === 'string') {
      return Object.defineProperty(object, property, {
        value: (typeof value === 'undefined') ? object[property] : value,
        writable: false,
        configurable: false
      });
    }
    if (Array.isArray(property)) {
      properties = property;
    } else {
      properties = Object.keys(object);
    }
    for (var i = 0; i < properties.length; i++) {
      var propertyName = properties[i],
          value = object[propertyName];
      Object.defineProperty(object, propertyName, {
        value: value,
        writable: false,
        configurable: false
      });
      if (util.isObject(value)) {
        util.makeImmutable(value);
      }
    }
    return object;
  };
  util.getConfigSources = function() {
    var t = this;
    return configSources.slice(0);
  };
  util.loadFileConfigs = function() {
    var t = this,
        config = {};
    NODE_ENV = util.initParam('NODE_ENV', 'development');
    CONFIG_DIR = util.initParam('NODE_CONFIG_DIR', Path.join(process.cwd(), 'config'));
    if (CONFIG_DIR.indexOf('.') === 0) {
      CONFIG_DIR = Path.join(process.cwd(), CONFIG_DIR);
    }
    APP_INSTANCE = util.initParam('NODE_APP_INSTANCE');
    HOST = util.initParam('HOST');
    HOSTNAME = util.initParam('HOSTNAME');
    RUNTIME_JSON_FILENAME = util.initParam('NODE_CONFIG_RUNTIME_JSON', Path.join(CONFIG_DIR, 'runtime.json'));
    try {
      var hostName = HOST || HOSTNAME;
      env.HOSTNAME = hostName;
      if (!hostName) {
        var OS = require("os");
        hostName = OS.hostname();
      }
    } catch (e) {
      hostName = '';
    }
    var baseNames = ['default', NODE_ENV];
    if (hostName) {
      var firstDomain = hostName.split('.')[0];
      baseNames.push(firstDomain, firstDomain + '-' + NODE_ENV);
      if (hostName != firstDomain) {
        baseNames.push(hostName, hostName + '-' + NODE_ENV);
      }
    }
    baseNames.push('local', 'local-' + NODE_ENV);
    var extNames = ['js', 'json', 'json5', 'hjson', 'toml', 'coffee', 'iced', 'yaml', 'yml', 'cson', 'properties'];
    baseNames.forEach(function(baseName) {
      extNames.forEach(function(extName) {
        var fullFilename = Path.join(CONFIG_DIR, baseName + '.' + extName);
        var configObj = util.parseFile(fullFilename);
        if (configObj) {
          util.extendDeep(config, configObj);
        }
        if (APP_INSTANCE) {
          fullFilename = Path.join(CONFIG_DIR, baseName + '-' + APP_INSTANCE + '.' + extName);
          configObj = util.parseFile(fullFilename);
          if (configObj) {
            util.extendDeep(config, configObj);
          }
        }
      });
    });
    var envConfig = {};
    if (process.env.NODE_CONFIG) {
      try {
        envConfig = JSON.parse(process.env.NODE_CONFIG);
      } catch (e) {
        console.error('The $NODE_CONFIG environment variable is malformed JSON');
      }
      util.extendDeep(config, envConfig);
      configSources.push({
        name: "$NODE_CONFIG",
        parsed: envConfig
      });
    }
    var cmdLineConfig = util.getCmdLineArg('NODE_CONFIG');
    if (cmdLineConfig) {
      try {
        cmdLineConfig = JSON.parse(cmdLineConfig);
      } catch (e) {
        console.error('The --NODE_CONFIG={json} command line argument is malformed JSON');
      }
      util.extendDeep(config, cmdLineConfig);
      configSources.push({
        name: "--NODE_CONFIG argument",
        parsed: cmdLineConfig
      });
    }
    var customEnvVars = util.getCustomEnvVars(CONFIG_DIR, extNames);
    util.extendDeep(config, customEnvVars);
    env['NODE_CONFIG'] = JSON.stringify(util.extendDeep(envConfig, cmdLineConfig, {}));
    var runtimeJson = util.parseFile(RUNTIME_JSON_FILENAME) || {};
    util.extendDeep(config, runtimeJson);
    util.resolveDeferredConfigs(config);
    return config;
  };
  util.resolveDeferredConfigs = function(config) {
    var completeConfig = config;
    function _iterate(prop) {
      for (var property in prop) {
        if (prop.hasOwnProperty(property) && prop[property] != null) {
          if (prop[property].constructor == Object) {
            _iterate(prop[property]);
          } else if (prop[property].constructor == Array) {
            for (var i = 0; i < prop[property].length; i++) {
              _iterate(prop[property][i]);
            }
          } else {
            if (prop[property] instanceof DeferredConfig) {
              prop[property] = prop[property].resolve.call(completeConfig, completeConfig);
            } else {}
          }
        }
      }
    }
    _iterate(config);
  };
  util.parseFile = function(fullFilename) {
    var t = this,
        extension = fullFilename.substr(fullFilename.lastIndexOf('.') + 1),
        configObject = null,
        fileContent = null;
    try {
      var stat = FileSystem.statSync(fullFilename);
      if (!stat || stat.size < 1) {
        return null;
      }
    } catch (e1) {
      return null;
    }
    try {
      fileContent = FileSystem.readFileSync(fullFilename, 'UTF-8');
      fileContent = fileContent.replace(/^\uFEFF/, '');
    } catch (e2) {
      throw new Error('Config file ' + fullFilename + ' cannot be read');
    }
    try {
      if (extension === 'js') {
        configObject = require(fullFilename);
      } else if (extension === 'coffee') {
        if (!Coffee) {
          Coffee = {};
          Coffee = require("coffee-script");
          if (Coffee.register) {
            Coffee.register();
          }
        }
        configObject = require(fullFilename);
      } else if (extension === 'iced') {
        Iced = require("iced-coffee-script");
        if (Iced.register) {
          Iced.register();
        }
      } else {
        configObject = util.parseString(fileContent, extension);
      }
    } catch (e3) {
      throw new Error("Cannot parse config file: '" + fullFilename + "': " + e3);
    }
    if (typeof configObject === 'object') {
      configSources.push({
        name: fullFilename,
        original: fileContent,
        parsed: configObject
      });
    }
    return configObject;
  };
  util.parseString = function(content, format) {
    var configObject = null;
    if (format === 'yaml' || format === 'yml') {
      if (!Yaml && !VisionmediaYaml) {
        try {
          Yaml = require("js-yaml");
        } catch (e) {
          try {
            VisionmediaYaml = require("yaml");
          } catch (e) {}
        }
      }
      if (Yaml) {
        configObject = Yaml.load(content);
      } else if (VisionmediaYaml) {
        content += '\n';
        configObject = VisionmediaYaml.eval(util.stripYamlComments(content));
      } else {
        console.error("No YAML parser loaded.  Suggest adding js-yaml dependency to your package.json file.");
      }
    } else if (format === 'json') {
      configObject = JSON.parse(util.stripComments(content));
    } else if (format === 'json5') {
      if (!JSON5) {
        JSON5 = require("json5");
      }
      configObject = JSON5.parse(content);
    } else if (format === 'hjson') {
      if (!HJSON) {
        HJSON = require("hjson");
      }
      configObject = HJSON.parse(content);
    } else if (format === 'toml') {
      if (!TOML) {
        TOML = require("toml");
      }
      configObject = TOML.parse(content);
    } else if (format === 'cson') {
      if (!CSON) {
        CSON = require("cson");
      }
      if (typeof CSON.parseSync === 'function') {
        configObject = CSON.parseSync(util.stripComments(content));
      } else {
        configObject = CSON.parse(util.stripComments(content));
      }
    } else if (format === 'properties') {
      if (!PPARSER) {
        PPARSER = require("properties");
      }
      configObject = PPARSER.parse(content, {
        namespaces: true,
        variables: true,
        sections: true
      });
    }
    return configObject;
  };
  util.attachProtoDeep = function(toObject, depth) {
    var t = this;
    depth = (depth === null ? DEFAULT_CLONE_DEPTH : depth);
    if (depth < 0) {
      return toObject;
    }
    for (var fnName in Config.prototype) {
      if (!toObject[fnName]) {
        util.makeHidden(toObject, fnName, Config.prototype[fnName]);
      }
    }
    for (var prop in toObject) {
      if (util.isObject(toObject[prop])) {
        util.attachProtoDeep(toObject[prop], depth - 1);
      }
    }
    return toObject;
  };
  util.cloneDeep = function cloneDeep(parent, depth, circular, prototype) {
    var allParents = [];
    var allChildren = [];
    var useBuffer = typeof Buffer != 'undefined';
    if (typeof circular === 'undefined')
      circular = true;
    if (typeof depth === 'undefined')
      depth = 20;
    function _clone(parent, depth) {
      if (parent === null)
        return null;
      if (depth === 0)
        return parent;
      var child;
      if (typeof parent != 'object') {
        return parent;
      }
      if (Utils.isArray(parent)) {
        child = [];
      } else if (Utils.isRegExp(parent)) {
        child = new RegExp(parent.source, util.getRegExpFlags(parent));
        if (parent.lastIndex)
          child.lastIndex = parent.lastIndex;
      } else if (Utils.isDate(parent)) {
        child = new Date(parent.getTime());
      } else if (useBuffer && Buffer.isBuffer(parent)) {
        child = new Buffer(parent.length);
        parent.copy(child);
        return child;
      } else {
        if (typeof prototype === 'undefined')
          child = Object.create(Object.getPrototypeOf(parent));
        else
          child = Object.create(prototype);
      }
      if (circular) {
        var index = allParents.indexOf(parent);
        if (index != -1) {
          return allChildren[index];
        }
        allParents.push(parent);
        allChildren.push(child);
      }
      for (var i in parent) {
        var propDescriptor = Object.getOwnPropertyDescriptor(parent, i);
        var hasGetter = ((propDescriptor !== undefined) && (propDescriptor.get !== undefined));
        if (hasGetter) {
          Object.defineProperty(child, i, propDescriptor);
        } else {
          child[i] = _clone(parent[i], depth - 1);
        }
      }
      return child;
    }
    return _clone(parent, depth);
  };
  util.setPath = function(object, path, value) {
    var nextKey = null;
    if (value === null || path.length === 0) {
      return ;
    } else if (path.length === 1) {
      object[path.shift()] = value;
    } else {
      nextKey = path.shift();
      if (!object.hasOwnProperty(nextKey)) {
        object[nextKey] = {};
      }
      util.setPath(object[nextKey], path, value);
    }
  };
  util.substituteDeep = function(substitutionMap, variables) {
    var result = {};
    function _substituteVars(map, vars, pathTo) {
      for (var prop in map) {
        var value = map[prop];
        if (typeof(value) === 'string') {
          if (vars[value]) {
            util.setPath(result, pathTo.concat(prop), vars[value]);
          }
        } else if (util.isObject(value)) {
          if ('__name' in value && '__format' in value && vars[value.__name]) {
            var parsedValue = util.parseString(vars[value.__name], value.__format);
            util.setPath(result, pathTo.concat(prop), parsedValue);
          } else {
            _substituteVars(value, vars, pathTo.concat(prop));
          }
        } else {
          msg = "Illegal key type for substitution map at " + pathTo.join('.') + ': ' + typeof(value);
          throw Error(msg);
        }
      }
    }
    _substituteVars(substitutionMap, variables, []);
    return result;
  };
  util.getCustomEnvVars = function(CONFIG_DIR, extNames) {
    var result = {};
    extNames.forEach(function(extName) {
      var fullFilename = Path.join(CONFIG_DIR, 'custom-environment-variables' + '.' + extName);
      var configObj = util.parseFile(fullFilename);
      if (configObj) {
        var environmentSubstitutions = util.substituteDeep(configObj, process.env);
        util.extendDeep(result, environmentSubstitutions);
      }
    });
    return result;
  };
  util.equalsDeep = function(object1, object2, depth) {
    var t = this;
    depth = (depth === null ? DEFAULT_CLONE_DEPTH : depth);
    if (depth < 0) {
      return {};
    }
    if (!object1 || !object2) {
      return false;
    }
    if (object1 === object2) {
      return true;
    }
    if (typeof(object1) != 'object' || typeof(object2) != 'object') {
      return false;
    }
    if (Object.keys(object1).length != Object.keys(object2).length) {
      return false;
    }
    for (var prop in object1) {
      if (object1[prop] && typeof(object1[prop]) === 'object') {
        if (!util.equalsDeep(object1[prop], object2[prop], depth - 1)) {
          return false;
        }
      } else {
        if (object1[prop] !== object2[prop]) {
          return false;
        }
      }
    }
    return true;
  };
  util.diffDeep = function(object1, object2, depth) {
    var t = this,
        diff = {};
    depth = (depth === null ? DEFAULT_CLONE_DEPTH : depth);
    if (depth < 0) {
      return {};
    }
    for (var parm in object2) {
      var value1 = object1[parm];
      var value2 = object2[parm];
      if (value1 && value2 && util.isObject(value2)) {
        if (!(util.equalsDeep(value1, value2))) {
          diff[parm] = util.diffDeep(value1, value2, depth - 1);
        }
      } else if (Array.isArray(value1) && Array.isArray(value2)) {
        if (!util.equalsDeep(value1, value2)) {
          diff[parm] = value2;
        }
      } else if (value1 !== value2) {
        diff[parm] = value2;
      }
    }
    return diff;
  };
  util.extendDeep = function(mergeInto) {
    var t = this;
    var vargs = Array.prototype.slice.call(arguments, 1);
    var depth = vargs.pop();
    if (typeof(depth) != 'number') {
      vargs.push(depth);
      depth = DEFAULT_CLONE_DEPTH;
    }
    if (depth < 0) {
      return mergeInto;
    }
    vargs.forEach(function(mergeFrom) {
      for (var prop in mergeFrom) {
        var isDeferredFunc = mergeInto[prop] instanceof DeferredConfig;
        if (mergeFrom[prop] instanceof Date) {
          mergeInto[prop] = mergeFrom[prop];
        } else if (util.isObject(mergeInto[prop]) && util.isObject(mergeFrom[prop]) && !isDeferredFunc) {
          util.extendDeep(mergeInto[prop], mergeFrom[prop], depth - 1);
        } else if (mergeFrom[prop] && typeof mergeFrom[prop] === 'object') {
          mergeInto[prop] = util.cloneDeep(mergeFrom[prop], depth - 1);
        } else if (mergeFrom.__lookupGetter__(prop)) {
          mergeInto.__defineGetter__(prop, mergeFrom.__lookupGetter__(prop));
        } else {
          mergeInto[prop] = mergeFrom[prop];
        }
      }
    });
    return mergeInto;
  };
  util.stripYamlComments = function(fileStr) {
    return fileStr.replace(/^\s*#.*/mg, '').replace(/^\s*[\n|\r]+/mg, '');
  };
  util.stripComments = function(fileStr) {
    var uid = '_' + +new Date(),
        primitives = [],
        primIndex = 0;
    return (fileStr.replace(/(['"])(\\\1|.)+?\1/g, function(match) {
      primitives[primIndex] = match;
      return (uid + '') + primIndex++;
    }).replace(/([^\/])(\/(?!\*|\/)(\\\/|.)+?\/[gim]{0,3})/g, function(match, $1, $2) {
      primitives[primIndex] = $2;
      return $1 + (uid + '') + primIndex++;
    }).replace(/\/\/.*?\/?\*.+?(?=\n|\r|$)|\/\*[\s\S]*?\/\/[\s\S]*?\*\//g, '').replace(/\/\/.+?(?=\n|\r|$)|\/\*[\s\S]+?\*\//g, '').replace(RegExp('\\/\\*[\\s\\S]+' + uid + '\\d+', 'g'), '').replace(RegExp(uid + '(\\d+)', 'g'), function(match, n) {
      return primitives[n];
    }));
  };
  util.isObject = function(obj) {
    return (obj !== null) && (typeof obj === 'object') && !(Array.isArray(obj));
  };
  util.initParam = function(paramName, defaultValue) {
    var t = this;
    var value = util.getCmdLineArg(paramName) || process.env[paramName] || defaultValue;
    env[paramName] = value;
    return value;
  };
  util.getCmdLineArg = function(searchFor) {
    var cmdLineArgs = process.argv.slice(2, process.argv.length),
        argName = '--' + searchFor + '=';
    for (var argvIt = 0; argvIt < cmdLineArgs.length; argvIt++) {
      if (cmdLineArgs[argvIt].indexOf(argName) === 0) {
        return cmdLineArgs[argvIt].substr(argName.length);
      }
    }
    return false;
  };
  util.getEnv = function(varName) {
    return env[varName];
  };
  util.getRegExpFlags = function(re) {
    var flags = '';
    re.global && (flags += 'g');
    re.ignoreCase && (flags += 'i');
    re.multiline && (flags += 'm');
    return flags;
  };
  util.runStrictnessChecks = function(config) {
    var sources = config.util.getConfigSources();
    var sourceFilenames = sources.map(function(src) {
      return Path.basename(src.name);
    });
    var anyFilesMatchEnv = sourceFilenames.some(function(filename) {
      return filename.match(NODE_ENV);
    });
    if (NODE_ENV && (NODE_ENV !== 'development') && !anyFilesMatchEnv) {
      _warnOrThrow("NODE_ENV value of '" + NODE_ENV + "' did not match any deployment config file names.");
    }
    var anyFilesMatchInstance = sourceFilenames.some(function(filename) {
      return filename.match(APP_INSTANCE);
    });
    if (APP_INSTANCE && !anyFilesMatchInstance) {
      _warnOrThrow("NODE_APP_INSTANCE value of '" + APP_INSTANCE + "' did not match any instance config file names.");
    }
    if ((NODE_ENV === 'default') || (NODE_ENV === 'local')) {
      _warnOrThrow("NODE_ENV value of '" + NODE_ENV + "' is ambiguous.");
    }
    function _warnOrThrow(msg) {
      var beStrict = process.env.NODE_CONFIG_STRICT_MODE;
      var prefix = beStrict ? 'FATAL: ' : 'WARNING: ';
      var seeURL = 'See https://github.com/lorenwest/node-config/wiki/Strict-Mode';
      console.error(prefix + msg);
      console.error(prefix + seeURL);
      if (beStrict) {
        throw new Error(prefix + msg + ' ' + seeURL);
      }
    }
  };
  var utilWarnings = {};
  ['watch', 'setModuleDefaults', 'makeHidden', 'makeImmutable', 'getConfigSources', '_loadFileConfigs', '_parseFile', '_attachProtoDeep', '_cloneDeep', '_equalsDeep', '_diffDeep', '_extendDeep', '_stripYamlComments', '_stripComments', '_isObject', '_initParam', '_getCmdLineArg'].forEach(function(oldName) {
    var newName = oldName;
    if (oldName.indexOf('_') === 0) {
      newName = oldName.substr(1);
    }
    Config.prototype[oldName] = function() {
      if (!utilWarnings[oldName]) {
        console.error('WARNING: config.' + oldName + '() is deprecated.  Use config.util.' + newName + '() instead.');
        console.error('WARNING: See https://github.com/lorenwest/node-config/wiki/Future-Compatibility#upcoming-incompatibilities');
        utilWarnings[oldName] = true;
      }
      return util[newName].apply(this, arguments);
    };
  });
  var config = module.exports = new Config();
  var showWarnings = !(util.initParam('SUPPRESS_NO_CONFIG_WARNING'));
  if (showWarnings && Object.keys(config).length === 0) {
    console.error('WARNING: No configurations found in configuration directory:');
    console.error('WARNING: ' + CONFIG_DIR);
    console.error('WARNING: See https://www.npmjs.org/package/config for more information.');
  }
})(require("buffer").Buffer, require("process"));
