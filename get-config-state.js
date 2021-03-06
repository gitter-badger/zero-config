var flatten = require('flatten-prototypes');
var configChain = require('config-chain');
var parseArgs = require('minimist');
var join = require('path').join;
var putPath = require('dotty').put;

module.exports = getConfigState;

function getConfigState(dirname, opts) {
    var cliArgs = parseArgs(opts.argv || process.argv.slice(2));
    var env = opts.env || process.env;
    var NODE_ENV = env.NODE_ENV;
    var dc = opts.datacenterValue;
    var blackList = opts.blackList || ['_'];

    // hardcoded to read from `./config` by convention
    var configFolder = join(dirname, 'config');

    // blackList allows you to ensure certain keys from argv
    // do not get set on the config object
    blackList.forEach(function (key) {
        if (cliArgs[key]) {
            delete cliArgs[key];
        }
    });

    /* use config-chain module as it contains a set of 
        "transports" for loading configuration from disk
    */
    var configTree = configChain(
        // the seed option overwrites everything
        opts.seed || null,
        // include all CLI arguments
        makeDeep(cliArgs),
        // load file from --config someFilePath
        cliArgs.config || null,
        // get datacenter from opts.dc file
        dc ? dc : null,
        // load ./config/NODE_ENV.DATACENTER.json
        dc && NODE_ENV ?
            join(configFolder, NODE_ENV + '.' + dc.datacenter + '.json') :
            null,
        // load ./config/NODE_ENV.json
        NODE_ENV ? join(configFolder, NODE_ENV + '.json') : null,
        // load ./config/common.json
        join(configFolder, 'common.json')
    );

    // there is a "bug" in config-chain where it doesn't 
    // support deep extension. So we flatten deeply
    // https://github.com/dominictarr/config-chain/issues/14
    var configState = flatten(configTree.store);

    return configState;
}

// given a shallow object where keys are key paths like:
// { 'foo.bar': 'baz', 'foo.baz': 'foo' }
// it returns a deep object with the key paths expanded like:
// { 'foo': { 'bar': 'baz', 'baz': 'foo' } }
function makeDeep(obj) {
    var deepObj = {};

    Object.keys(obj).forEach(function (key) {
        putPath(deepObj, key, obj[key]);
    });

    return deepObj;
}
