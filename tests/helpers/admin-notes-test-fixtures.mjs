import {deflateSync} from 'node:zlib';
function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;}
function chunk(type,body){const data=Buffer.concat([Buffer.from(type),body]);const size=Buffer.alloc(4);size.writeUInt32BE(body.length);const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc(data));return Buffer.concat([size,data,checksum]);}
export function photoPng(rgb=[50,85,105],width=120,height=160){
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  const pixels=Buffer.alloc((width*3+1)*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<3;c++)pixels[y*(width*3+1)+1+x*3+c]=rgb[c];
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}

export const publicationText='  Synthetic publication test.\r\n\r\nSecond paragraph\u2014punctuation preserved.  \n\n\tFinal test line.\n';
