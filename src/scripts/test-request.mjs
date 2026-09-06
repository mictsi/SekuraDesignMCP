import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {requestJSON,RequestError} from '../../sample/assets/request.js';
let writes=0;
const server=createServer((req,res)=>{
  if(req.url==='/invalid'){res.end('not JSON');return;}
  if(req.url==='/slow'){setTimeout(()=>res.end('{}'),150);return;}
  if(req.method==='POST'){writes++;res.writeHead(503,{'content-type':'application/json'});res.end('{"message":"Try again"}');return;}
  res.setHeader('content-type','application/json');res.end('{"value":42}');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
try{
  assert.deepEqual(await requestJSON(base),{value:42});
  await assert.rejects(requestJSON(base,{method:'POST',body:'{}'}),e=>e instanceof RequestError&&e.status===503&&e.body.message==='Try again'); assert.equal(writes,1);
  await assert.rejects(requestJSON(base+'/invalid'),/unreadable/);
  await assert.rejects(requestJSON(base+'/slow',{timeout:10}),e=>e.name==='TimeoutError');
  const controller=new AbortController();controller.abort();await assert.rejects(requestJSON(base,{signal:controller.signal}),e=>e.name==='AbortError');
  console.log('HTTP adapter: success, status errors, malformed JSON, timeout, abort and no automatic write retries passed');
}finally{server.close();}
