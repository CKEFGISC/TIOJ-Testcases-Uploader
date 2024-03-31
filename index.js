"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs = require("node:fs");
var axios_1 = require("axios");
var axios_cookiejar_support_1 = require("axios-cookiejar-support");
var tough_cookie_1 = require("tough-cookie");
var cheerio = require("cheerio");
var streamToBlob = require("stream-to-blob");
var YAML = require("yaml");
var config = YAML.parse((fs.readFileSync("./config.yml")).toString());
var axiosClient;
function generateFormDataFromObject(object) {
    return Object.keys(object).reduce(function (formData, key) {
        formData.append(key, object[key]);
        return formData;
    }, new FormData());
}
;
function signIn() {
    return __awaiter(this, void 0, void 0, function () {
        var getPage, $, authToken, postPage, $;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Logging in, getting log-in page auth-token");
                    return [4 /*yield*/, axiosClient.get(config.tioj.domain + "/users/sign_in/")];
                case 1:
                    getPage = _a.sent();
                    $ = cheerio.load(getPage.data);
                    authToken = $("input[name='authenticity_token']").attr("value");
                    console.log("Got auth-token, posting log-in data");
                    return [4 /*yield*/, axiosClient.post(config.tioj.domain + "/users/sign_in/", generateFormDataFromObject({
                            "authenticity_token": authToken,
                            "user[username]": config.tioj.username,
                            "user[password]": config.tioj.password,
                            "user[remember_me]": "1",
                            "commit": "Sign in"
                        }), {
                            headers: {
                                "Content-Type": "multipart/form-data"
                            }
                        })];
                case 2:
                    postPage = _a.sent();
                    $ = cheerio.load(postPage.data);
                    if (!($("div[role='alert'] > strong").last().text().trim() !== "Oh Geez!")) return [3 /*break*/, 4];
                    return [4 /*yield*/, fs.promises.writeFile("./error.log", postPage.data)];
                case 3:
                    _a.sent();
                    throw new Error("Failed to log in as " + process.env.TIOJ_USERNAME);
                case 4:
                    console.log("Logged in as " + process.env.TIOJ_USERNAME);
                    return [2 /*return*/];
            }
        });
    });
}
function postTestcases(id) {
    return __awaiter(this, void 0, void 0, function () {
        var getPage, $, authToken, folderPath, i, fileIn, fileOut, formDataToAddTestcase, _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, axiosClient.get(config.tioj.domain + "/problems/" + id + "/testdata/new")];
                case 1:
                    getPage = _g.sent();
                    $ = cheerio.load(getPage.data);
                    authToken = $("input[name='authenticity_token']").attr("value");
                    console.log("Got auth-token, generating testcases");
                    folderPath = eval(config.folder);
                    i = 0;
                    _g.label = 2;
                case 2:
                    if (!fs.existsSync(folderPath + i + ".in")) return [3 /*break*/, 7];
                    fileIn = fs.createReadStream(folderPath + i + ".in");
                    fileOut = fs.createReadStream(folderPath + i + ".out");
                    formDataToAddTestcase = generateFormDataFromObject({
                        "authenticity_token": authToken,
                        "testdatum[time_limit]": 1000,
                        "testdatum[vss_limit]": 65536,
                        "testdatum[rss_limit]": 65536,
                        "testdatum[output_limit]": "65536",
                        "testdatum[problem_id]": id,
                        "commit": "Create Testdatum"
                    });
                    _b = (_a = formDataToAddTestcase).append;
                    _c = ["testdatum[test_input]"];
                    return [4 /*yield*/, streamToBlob(fileIn, "text/plain")];
                case 3:
                    _b.apply(_a, _c.concat([_g.sent(),
                        i + ".in"]));
                    _e = (_d = formDataToAddTestcase).append;
                    _f = ["testdatum[test_output]"];
                    return [4 /*yield*/, streamToBlob(fileOut, "text/plain")];
                case 4:
                    _e.apply(_d, _f.concat([_g.sent(),
                        i + ".out"]));
                    axiosClient.post(config.tioj.domain + "/problems/" + id + "/testdata", formDataToAddTestcase);
                    console.log("Posted testcase #" + i + " for problem #" + id);
                    if (!(i % 5 == 0)) return [3 /*break*/, 6];
                    console.log("500ms cool-down...");
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 500); })];
                case 5:
                    _g.sent();
                    _g.label = 6;
                case 6:
                    ++i;
                    return [3 /*break*/, 2];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, i;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    axiosClient = axios_cookiejar_support_1.wrapper(axios_1["default"].create({ jar: new tough_cookie_1.CookieJar() }));
                    console.log("Created axios client");
                    return [4 /*yield*/, signIn()];
                case 1:
                    _b.sent();
                    _i = 0, _a = config.problems;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    i = _a[_i];
                    return [4 /*yield*/, postTestcases(i)];
                case 3:
                    _b.sent();
                    console.log("1000ms cool-down...");
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000); })];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    console.log("Done");
                    return [2 /*return*/];
            }
        });
    });
}
main();
