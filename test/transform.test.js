const test = require('node:test');
const assert = require('node:assert/strict');
const { run, parseComics } = require('../src/transform');

const rss = '<?xml version="1.0"?><rss><channel>' +
  '<item><title>Latest &amp; greatest</title><link>https://islieb.de/post/2</link>' +
  '<content:encoded><![CDATA[<img src="https://islieb.de/wp-content/uploads/latest.jpg" />]]></content:encoded></item>' +
  '<item><title>Older comic</title><link>https://islieb.de/post/1</link>' +
  '<description>&lt;img src=&quot;https://islieb.de/wp-content/uploads/older.png&quot; /&gt;</description></item>' +
  '</channel></rss>';
const input = (feed='islieb',mode='latest') =>
  ({trmnl:{plugin_settings:{custom_fields_values:{feed,mode}}}});
const ok = (body) => ({ok:true,status:200,text:async()=>body});

test('parses CDATA and escaped HTML', () => {
  const comics = parseComics(rss,'https://islieb.de/feed/');
  assert.equal(comics.length,2);
  assert.equal(comics[0].title,'Latest & greatest');
  assert.match(comics[0].img,/latest.jpg$/);
  assert.match(comics[1].img,/older.png$/);
});
test('latest mode selects the first image',async () => {
  global.fetch=async()=>ok(rss);
  const {data}=await run(input());
  assert.equal(data.status,'ok');
  assert.match(data.img,/latest.jpg$/);
  assert.equal(data.feed,'islieb');
});
test('random mode selects another image', async () => {
  global.fetch=async()=>ok(rss);
  const original=Math.random;Math.random=()=>0.9;
  try {assert.match((await run(input('islieb','random'))).data.img,/older.png$/);}
  finally {Math.random=original;}
});
for (const code of [404,503]) {
  test('HTTP '+code+' is displayable',async () => {
    global.fetch=async()=>({ok:false,status:code});
    const {data}=await run(input('heyokyay'));
    assert.equal(data.status,'offline');
    assert.equal(data.http_status,code);
    assert.equal(data.img,null);
  });
}
test('network error is displayable',async () => {
  global.fetch=async()=>{throw Error('network error');};
  const {data}=await run(input('isfies'));
  assert.equal(data.status,'offline');
  assert.equal(data.http_status,null);
});
test('empty feed displays an alternative status',async () => {
  global.fetch=async()=>ok('<html>Access denied</html>');
  assert.equal((await run(input())).data.status,'empty');
});
test('media enclosure image works',() => {
  const xml='<rss><channel><item><title>comic</title>' +
    '<media:content url="https://example.com/comic.png" type="image/png"/>' +
    '</item></channel></rss>';
  assert.equal(parseComics(xml,'https://example.com/feed/')[0].img,
    'https://example.com/comic.png');
});
test('does not use non-HTTP image URLs',() => {
  const xml='<rss><channel><item><title>x</title>' +
    '<description><![CDATA[<img src="javascript:alert(1)">]]></description>' +
    '</item></channel></rss>';
  assert.equal(parseComics(xml,'https://example.com/feed/').length,0);
});
test('all three configured sources are unchanged',async () => {
  const urls=[];global.fetch=async(url)=>{urls.push(url);return ok(rss);};
  await run(input('heyokyay'));
  await run(input('islieb'));
  await run(input('isfies'));
  assert.deepEqual(urls,[
    'https://heyokyay.com/feed/',
    'https://islieb.de/feed/',
    'https://islieb.de/finde/isfies/feed/'
  ]);
});
