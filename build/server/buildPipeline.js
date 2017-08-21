const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const uglify = require('uglifyjs-webpack-plugin');
const pug = require("pug");
const zipFolder = require("zip-folder");
const mkdirp = require("mkdirp");
const FormData = require('form-data');
const Promise = require("bluebird");
const child_process = require("child_process");

class BundleProcessState {
    constructor(project, app) {
        this.project = project;
        this.app = app;
        this.rootDir = path.join(__dirname, "../..");
        this.bundleDir = "";
        this.bundleZip = "";
        this.publicDir = "";
        this.publishToken = "";
        this.sourceWatcher = null;
        this.publishUrl = "";
    }
}

let beginBundle = exports.beginBundle = function(project, app) {
    return Promise.resolve(new BundleProcessState(project, app)).then(mkdirForBundle);
}

let publish = exports.publish = function(bundlePromise, publishToken) {
    let state;
    return bundlePromise
           .then((s) => {
               state = s;
               state.publishToken = publishToken;
               return state;
           })
           .then(publishBundle)
           .finally(() => cleanZip(state))
           ;
};

let publishBundle = exports.publishBundle = function(state) {
    let token = state.publishToken;
    let {project, app} = state;
    let bundle = state.bundleZip;
    return new Promise((resolve, reject) => {
        let form = new FormData();
        form.append("token", token);
        form.append("project", project);
        form.append("app", app);
        form.append("bundle", fs.createReadStream(bundle));
        let options = {
            protocol: "https:",
            host: "my.introcs.com",
            method: "post",
            port: 443,
            path: "/upload"
        };
        form.submit(options, (err, res) => {
            if (err) {
                reject(err);
            } else {
                let body = "";
                res.on("data", (chunk) => body += chunk);
                res.on("end", () => {
                    if (res.statusCode === 200) {
                        state.publishUrl = JSON.parse(body).url;
                        resolve(state);
                    } else {
                        reject("Error uploading bundle.");
                    }
                });
                res.on("error", (e) => reject(e));
            }
        });
    });
}

function getDateString() {
    let date = new Date();
    let y = date.getFullYear();
    let m = pad(date.getMonth(), 2);
    let d = pad(date.getDate(), 2);
    return `${y}-${m}-${d}`;
}

function getTimestamp() {
    return Math.floor(Date.now() / 1000);
}

let mkdirForBundle = exports.mkdirForBundle = function(state) {
    return new Promise((resolve, reject) => {
        try {
            let date = getDateString();
            let timestamp = getTimestamp();
            let folder = date + "-" + state.project + "-" + state.app + "-" + timestamp;
            state.bundleDir = mkdir(path.join("../publish", folder));
            state.publicDir = path.join(state.bundleDir, "public");
            resolve(state);
        } catch (e) {
            reject(e);
        }
    });
};

function mkdir(...folders) {
    let dir = __dirname;
    for (let piece of folders) {
        dir = path.join(dir, piece);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    return dir;
}

let compilePublic = exports.compilePublic = function(state) {
    let sourceWatcher = state.sourceWatcher = new SourceWatcher();
    let {project, app} = state;
    let dir = state.publicDir;
    return new Promise((resolve, reject) => {
        let webpacker = webpack(webpackConfig(sourceWatcher, project, app, dir));
        webpacker.run((err, stats) => {
            if (err) {
                reject(err);
            } else if (stats.hasErrors()) {
                reject(stats.toString());
            } else {
                resolve(state);
            }
        });
    });
}

/**
 * Pad function source: https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript
 */
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

let generateHtml = exports.generateHtml = function(state) {
    let {project, app, publicDir} = state;
    let t = getTimestamp();
    return new Promise((resolve, reject) => {
        try {
            let template = pug.compileFile(path.resolve(__dirname, "views", "publishApp.pug"));
            let props = {
                pageTitle: app + " (" + project + ")",
                script: "./app.js?t="+t,
                style: "./app.css?t="+t
            };
            let html = template(props);

            let outputFile = path.join(publicDir, "index.html");
            fs.writeFile(outputFile, html, () => {
                resolve(state);
            });
        } catch(e) {
            reject(e);
        }
    });
}

let buildPublic = exports.buildPublic = function(state) {
    return Promise.resolve(state).then(compilePublic).then(generateHtml);
}

let bundleSources = exports.bundleSources = function(sourceWatcher, srcDir) {
    let projectSrc = path.join(__dirname, "../../src");
    return function() {
        return new Promise((resolve, reject) => {
            let promises = [];
            for (let source of sourceWatcher.sources.values()) {
                let target = path.join(srcDir, source.replace(projectSrc, ""));
                mkdirp.sync(path.dirname(target));
                promises.push(new Promise( (resolve, reject) => {
                    let inputPath = path.join(source);
                    let inputStream = fs.createReadStream(inputPath);
                    let outputPath = target;
                    let outputStream = fs.createWriteStream(outputPath);
                    inputStream.pipe(outputStream).on("finish", resolve);
                }));
            }
            Promise.all(promises).then(() => resolve());
        });
    }
}

let copySrc = exports.copySrc = function(state) {
    let projectSrc = rootPath(state, "src");
    let {sourceWatcher} = state;
    let srcDir = path.join(state.bundleDir, "src");
    return new Promise((resolve, reject) => {
        let srcFiles = [];
        for (let source of sourceWatcher.sources.values()) {
            let target = path.join(srcDir, source.replace(projectSrc, ""));
            mkdirp.sync(path.dirname(target));
            srcFiles.push(cp(source, target));
        }
        Promise.all(srcFiles)
               .then(cp(rootPath(state, "tsconfig.json"), bundlePath(state, "tsconfig.json")))
               .then(cp(rootPath(state, "package.json"), bundlePath(state, "package.json")))
               .then(cp(rootPath(state, "tslint.json"), bundlePath(state, "tslint.json")))
               .then(() => resolve(state));
    });
};

let rootPath = function(state, relativePath) {
    return path.join(state.rootDir, relativePath);
};

let bundlePath = function(state, relativePath) {
    return path.join(state.bundleDir, relativePath);
};

let cp = exports.cp = function(from, to) {
    return new Promise((resolve, reject) => {
        let inputStream = fs.createReadStream(from);
        let outputStream = fs.createWriteStream(to);
        inputStream.pipe(outputStream)
                    .on("finish", resolve)
                    .on("error", reject);
    });
};

let buildLib = exports.buildLib = function(state) {
    return new Promise((resolve, reject) => {
        child_process.spawn("tsc", [], { cwd: state.bundleDir, shell: true })
                     .on("exit", () => resolve(state))
                     .on("error", (err) => reject(err));
    });
};

let zip = exports.zip = function(state) {
    return new Promise((resolve, reject) => {
        let directory = state.bundleDir;
        let bundle = state.bundleZip = `${directory}.zip`;
        zipFolder(directory, bundle, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(state);
            }
        });
    });
};

let cleanFolder = exports.cleanFolder = function(state) {
    return rm(state, state.bundleDir);
};

let cleanZip = exports.cleanZip = function(state) {
    return rm(state, state.bundleZip);
};

let clean = exports.clean = function(state) {
    return new Promise((resolve, reject) => {
        Promise
            .all([cleanFolder(state), cleanZip(state)])
            .finally(() => resolve(state))
            ;
    });
}

let rm = function(state, target) {
    return new Promise((resolve, reject) => {
        child_process.exec(`rm -r ${target}`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(state);
            }
        });
    });
}

let bundle = exports.bundle = function(project, app) {
    return beginBundle(project, app)
            .then(buildPublic)
            .then(copySrc)
            .then(buildLib)
            .then(zip)
            .then(cleanFolder);
};

class SourceWatcher {
    constructor() {
        this.sources = new Set();
    }

    apply(compiler) {
        compiler.plugin("compilation", (compilation) => {
            compilation.plugin("after-optimize-module-ids", (modules) => {
                let srcDir = path.join(__dirname, "../../src");
                modules
                    .filter((module) => module.resource && module.resource.replace("\\\\","\\").indexOf(srcDir) > -1 )
                    .map( (module) => path.format(path.parse(module.resource)) )
                    .forEach( (module) => this.sources.add(module) );
            });
        });
    }
}
exports.SourceWatcher = SourceWatcher;

function webpackConfig(sourceWatcher, project, app, dir) {
    const ExtractTextPlugin = require("extract-text-webpack-plugin");
    const extract = new ExtractTextPlugin("app.css");
    return {
        context: path.join(__dirname, "../../src/"),
        entry: path.join(__dirname, "../../src", project, app + "-app.ts"),
        resolve: {
            extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: ExtractTextPlugin.extract({
                        fallback: "style-loader",
                        use: "css-loader"
                    })
                },
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader",
                    exclude: /node_modules/,
                    options: {
                        logLevel: "warning",
                        configFileName: "tsconfig.json"
                    }
                }
            ]
        },
        output: {
            filename: "app.js",
            path: dir
        },
        plugins: [
           extract,
           new uglify(),
           sourceWatcher
        ],
        stats: "errors-only"
    };
}

// Add npm's binary files to PATH
process.env.PATH = process.env.PATH + path.delimiter + path.join(__dirname, "../../node_modules/.bin");