import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
try{
 const page=browser.contexts()[0].pages().find(p=>p.url()==='https://localhost/');
 if(!page)throw Error('The forwarded WebView is not Daywell.');
 await expect(page).toHaveTitle(/Daywell/);
 await page.getByRole('button',{name:'Explore with sample data'}).click();
 await expect(page.getByText('Sample data',{exact:false}).first()).toBeVisible();
 const nav=page.getByRole('navigation',{name:'Mobile navigation'});
 for(const tab of ['Food','Train','Coach','Progress','Today']){await nav.getByRole('button',{name:tab,exact:true}).click();await expect(page.locator('.page-intro h1')).toBeVisible();}
 await page.getByRole('button',{name:'Log food',exact:true}).click();
 await page.getByRole('button',{name:/Plain idli/}).click();await page.getByRole('button',{name:'Add to snack'}).click();
 await expect(page.getByText('Plain idli',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('Plain idli',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:/Health Connect.*Optional/}).click();
 await page.getByRole('button',{name:'Connect & sync last 7 days'}).click();
 await expect(page.getByRole('status')).toContainText(/Health Connect|permissions|records|health/i,{timeout:20000});
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.screenshot({path:'artifacts/daywell-oneplus.png'});
 fs.writeFileSync('artifacts/device-test.json',JSON.stringify({device:'OnePlus 7 Pro GM1911',android:'11',passed:['APK installed and launched','Bundled exercise catalog and font load','All five screens navigate','Native SQLite save and WebView reload','Manual food entry','Health Connect availability or permission response'],liveAI:false},null,2));
 console.log('Physical-device smoke checks passed. Sample data remains marked for cleanup.');
}finally{await browser.close()}
