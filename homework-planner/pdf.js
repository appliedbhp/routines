/* Render standalone homework PDFs using the browser's fonts and a small PDF image writer. */
const HomeworkPDF=(()=>{
 const encoder=new TextEncoder();
 function encode(pages,width,height){
  const parts=[],offsets=[0];let length=0;
  function append(value){const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;}
  function object(id,body){offsets[id]=length;append(id+' 0 obj\n');body();append('\nendobj\n');}
  function stream(header,bytes){append('<< '+header+' /Length '+bytes.length+' >>\nstream\n');append(bytes);append('\nendstream');}
  append('%PDF-1.4\n%âãÏÓ\n');
  object(1,()=>append('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2,()=>append('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>'));
  pages.forEach(({jpeg,pixelWidth,pixelHeight},i)=>{
   const id=3+i*3;
   object(id,()=>append('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /XObject << /Artwork '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>'));
   object(id+1,()=>stream('/Type /XObject /Subtype /Image /Width '+pixelWidth+' /Height '+pixelHeight+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',jpeg));
   object(id+2,()=>stream('',encoder.encode('q '+width+' 0 0 '+height+' 0 0 cm /Artwork Do Q')));
  });
  const xref=length;
  append('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
  for(const offset of offsets.slice(1))append(String(offset).padStart(10,'0')+' 00000 n \n');
  append('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
  return new Blob(parts,{type:'application/pdf'});
 }
 function wrap(ctx,text,width){
  const lines=[];
  for(const paragraph of String(text??'').split(/\r?\n/)){
   let line='';
   for(const word of paragraph.trim().split(/\s+/)){
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width<=width){line=next;continue;}
    if(line)lines.push(line);
    line='';
    for(const char of word){
     if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}
     line+=char;
    }
   }
   lines.push(line);
  }
  return lines;
 }
 function render({title,details=[],headers,rows,landscape=true,footer='',qr=null}){
  const [width,height]=landscape?[792,612]:[612,792];
  const margin=32,tableWidth=width-margin*2,labelWidth=headers.length===2?120:90;
  const columns=[labelWidth,...headers.slice(1).map(()=> (tableWidth-labelWidth)/(headers.length-1))];
  const lineHeight=13,padding=6,bottom=height-margin;
  const pages=[];
  let canvas,ctx,y;
  function font(size,bold=false){ctx.font=(bold?'600 ':'')+size+'px system-ui, sans-serif';}
  function finish(){
   const jpeg=canvas.toDataURL('image/jpeg',.94).split(',')[1];
   if(!jpeg)throw Error('Could not render the PDF page.');
   pages.push({jpeg:Uint8Array.from(atob(jpeg),char=>char.charCodeAt(0)),pixelWidth:canvas.width,pixelHeight:canvas.height});
  }
  function start(){
   canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
   ctx=canvas.getContext('2d',{alpha:false});ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
   ctx.fillStyle='#17283f';ctx.textBaseline='top';y=margin;
   font(21,true);
   for(const line of wrap(ctx,title,tableWidth)){ctx.fillText(line,margin,y);y+=26;}
   font(10);
   for(const detail of details)for(const line of wrap(ctx,detail,tableWidth)){ctx.fillText(line,margin,y);y+=lineHeight;}
   y+=8;font(10,true);
   const header=headers.map((text,i)=>wrap(ctx,text,columns[i]-2*padding));
   row(header,Math.max(...header.map(cell=>cell.length))*lineHeight+2*padding,true);
  }
  function row(cells,rowHeight,heading=false,writing=false){
   let x=margin;
   cells.forEach((lines,i)=>{
    if(heading||i===0){ctx.fillStyle='#f0f4f9';ctx.fillRect(x,y,columns[i],rowHeight);}
    ctx.strokeStyle='#718096';ctx.lineWidth=.65;ctx.strokeRect(x,y,columns[i],rowHeight);
    font(10,heading||i===0);ctx.fillStyle='#17283f';
    lines.forEach((line,index)=>ctx.fillText(line,x+padding,y+padding+index*lineHeight));
    if(writing&&i>0){ctx.strokeStyle='#d9e0e9';for(let dy=21;dy<rowHeight-4;dy+=16){ctx.beginPath();ctx.moveTo(x+padding,y+dy);ctx.lineTo(x+columns[i]-padding,y+dy);ctx.stroke();}}
    x+=columns[i];
   });
   y+=rowHeight;
  }
  start();
  for(const item of rows){
   const lines=item.cells.map((text,i)=>{font(10,i===0);return wrap(ctx,text,columns[i]-2*padding);});
   const lineCount=Math.max(...lines.map(cell=>cell.length));
   const needed=Math.max(item.writing?62:32,lineCount*lineHeight+2*padding);
   if(y+needed>bottom){finish();start();}
   let index=0;
   while(index<lineCount){
    const count=Math.min(lineCount-index,Math.floor((bottom-y-2*padding)/lineHeight));
    if(count<1){finish();start();continue;}
    row(lines.map(cell=>cell.slice(index,index+count)),Math.max(item.writing?62:32,count*lineHeight+2*padding),false,item.writing);
    index+=count;
    if(index<lineCount){finish();start();}
   }
  }
  if(footer||qr){
   if(y+(qr?90:28)>bottom){finish();start();}
   y+=10;
   if(qr){
    const modules=qr.getModuleCount(),size=Math.max(1,Math.floor(76/(modules+8))),offset=4*size;
    ctx.fillStyle='#111';
    for(let r=0;r<modules;r++)for(let c=0;c<modules;c++)if(qr.isDark(r,c))ctx.fillRect(margin+offset+c*size,y+offset+r*size,size,size);
   }
   font(9);ctx.fillStyle='#17283f';
   const indent=qr?84:0;
   wrap(ctx,footer,tableWidth-indent).forEach((line,i)=>ctx.fillText(line,margin+indent,y+i*lineHeight));
  }
  finish();
  return encode(pages,width,height);
 }
 function download(model,filename){
  const url=URL.createObjectURL(render(model));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 return {download};
})();
