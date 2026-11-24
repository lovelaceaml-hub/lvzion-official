// Small, dependency-free XLSX writer. All cells are inline strings, never formulas.
import {deliveryLabel,openLabel,trackerStamp,type InvitationRow} from './invitation-tracker';
const enc=new TextEncoder();
function xml(value:unknown){
  return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function crc32(bytes:Uint8Array){
  let c=0xffffffff;
  for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
}
function zip(entries:Record<string,string>):ArrayBuffer{
  const local:Uint8Array[]=[],central:Uint8Array[]=[];
  let offset=0,size=0,count=0;
  for(const [name,value] of Object.entries(entries)){
    const n=enc.encode(name),d=enc.encode(value),crc=crc32(d);
    const a=new Uint8Array(30+n.length),av=new DataView(a.buffer);
    av.setUint32(0,0x04034b50,true);av.setUint16(4,20,true);
    av.setUint32(14,crc,true);av.setUint32(18,d.length,true);av.setUint32(22,d.length,true);av.setUint16(26,n.length,true);a.set(n,30);
    const b=new Uint8Array(46+n.length),bv=new DataView(b.buffer);
    bv.setUint32(0,0x02014b50,true);bv.setUint16(4,20,true);bv.setUint16(6,20,true);
    bv.setUint32(16,crc,true);bv.setUint32(20,d.length,true);bv.setUint32(24,d.length,true);
    bv.setUint16(28,n.length,true);bv.setUint32(42,offset,true);b.set(n,46);
    local.push(a,d);central.push(b);offset+=a.length+d.length;size+=b.length;count++;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);
  v.setUint32(12,size,true);v.setUint32(16,offset,true);
  const buffer=new ArrayBuffer(offset+size+22),out=new Uint8Array(buffer);let pos=0;
  for(const chunk of [...local,...central,end]){out.set(chunk,pos);pos+=chunk.length;}
  return buffer;
}
export function invitationWorkbook(rows:InvitationRow[]):ArrayBuffer{
  // Addresses and link tokens are intentionally excluded from exports per AGENTS.md.
  const cells=[['Invited by','Group leader','Guest','Invitation date (Pacific)','Email delivery','Open status','RSVP','Registration','Attempts','Test record'],
    ...rows.map(r=>[r.sender,r.leader??'',r.name,trackerStamp(r.createdAt),deliveryLabel(r),openLabel(r),r.rsvp,r.registration,String(r.attempts),r.test?'Yes':'No'])];
  const sheet=cells.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>'<c r="'+String.fromCharCode(65+j)+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>').join('')+'</row>').join('');
  return zip({
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Invitations" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="3" width="25" customWidth="1"/><col min="4" max="8" width="32" customWidth="1"/><col min="9" max="10" width="14" customWidth="1"/></cols><sheetData>'+sheet+'</sheetData><autoFilter ref="A1:J'+cells.length+'"/></worksheet>'
  });
}
