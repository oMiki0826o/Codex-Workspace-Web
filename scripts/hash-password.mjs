import { hashPassword } from '../src/lib/auth.mjs';
import { createInterface } from 'node:readline';
const rl=createInterface({input:process.stdin,output:process.stdout});
rl.question('請輸入網站密碼（注意終端輸入可見）：',answer=>{if(answer.length<12){console.error('密碼至少 12 字元');process.exitCode=1;}else console.log('WEBUI_PASSWORD_HASH='+hashPassword(answer));rl.close();});
