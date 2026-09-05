import { decodeCells } from './static/lenia/specimen.js';

const LEVEL = 0.045; // Same density boundary as the jelly's horizontal midplane.
const RESOLUTION = 4;
const number = n => +n.toFixed(3);
const key = point => point.map(n => n.toFixed(6)).join(',');

// Keep contour error well below a tenth of a display pixel at archive sizes.
function simplifyLine(points) {
  if (points.length <= 2) return points;
  const a=points[0], b=points.at(-1), dx=b[0]-a[0], dy=b[1]-a[1], length=dx*dx+dy*dy;
  let furthest=0, error=0.03**2;
  for (let i=1;i<points.length-1;i++) {
    const p=points[i], t=length ? Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) : 0;
    const distance=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;
    if (distance>error) { error=distance; furthest=i; }
  }
  return furthest ? [...simplifyLine(points.slice(0,furthest+1)).slice(0,-1), ...simplifyLine(points.slice(furthest))] : [a,b];
}

function simplifyLoop(loop) {
  const middle=Math.floor(loop.length/2);
  const simple=[...simplifyLine(loop.slice(0,middle+1)).slice(0,-1), ...simplifyLine([...loop.slice(middle),loop[0]]).slice(0,-1)];
  const area=points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2);
  return simple.length>=3 && Math.abs(area(simple)-area(loop))<=area(loop)*0.01 ? simple : loop;
}

function densitySampler(rows) {
  const at = (x, y) => rows[y]?.[x] || 0;
  const weights = f => [(1-f)**3, 3*f**3-6*f*f+4, -3*f**3+3*f*f+3*f+1, f**3].map(n=>n/6);
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), wx = weights(x-ix), wy = weights(y-iy);
    let value = 0;
    for (let j=0;j<4;j++) for (let i=0;i<4;i++) value += at(ix+i-1,iy+j-1)*wx[i]*wy[j];
    return value;
  };
}

/** Trace closed contours through a supersampled copy of the renderer's density. */
export function footprintGeometry(species) {
  const rows = decodeCells(species.cells), sample = densitySampler(rows);
  const width = Math.max(...rows.map(row=>row.length));
  const nx = (width+4)*RESOLUTION, ny = (rows.length+4)*RESOLUTION;
  const values = Array.from({length:ny+1},(_,y)=>Float64Array.from({length:nx+1},(_,x)=>sample(x/RESOLUTION-2,y/RESOLUTION-2)));
  const segments = [];
  function triangle(points, levels) {
    const cuts = [];
    for (let i=0;i<3;i++) {
      const j=(i+1)%3;
      if ((levels[i]>LEVEL)===(levels[j]>LEVEL)) continue;
      const t=(LEVEL-levels[i])/(levels[j]-levels[i]);
      cuts.push(points[i].map((n,k)=>n+(points[j][k]-n)*t));
    }
    if (cuts.length===2) segments.push(cuts);
  }
  for (let y=0;y<ny;y++) for (let x=0;x<nx;x++) {
    const a=[x/RESOLUTION-2,y/RESOLUTION-2], b=[a[0]+1/RESOLUTION,a[1]];
    const c=[b[0],a[1]+1/RESOLUTION], d=[a[0],c[1]];
    triangle([a,b,c],[values[y][x],values[y][x+1],values[y+1][x+1]]);
    triangle([a,c,d],[values[y][x],values[y+1][x+1],values[y+1][x]]);
  }
  const adjacent = new Map();
  segments.forEach((segment,i)=>segment.forEach(point=>{
    const id=key(point);
    if (!adjacent.has(id)) adjacent.set(id,[]);
    adjacent.get(id).push(i);
  }));
  const used=new Set(), loops=[];
  segments.forEach((segment,index)=>{
    if (used.has(index)) return;
    used.add(index);
    const loop=[segment[0]], first=key(segment[0]);
    let point=segment[1];
    while (key(point)!==first) {
      loop.push(point);
      const next=adjacent.get(key(point))?.find(i=>!used.has(i));
      if (next===undefined) throw new Error(`Open footprint contour: ${species.code}`);
      used.add(next);
      const edge=segments[next];
      point=key(edge[0])===key(point) ? edge[1] : edge[0];
    }
    if (loop.length>=3) loops.push(loop);
  });
  if (!loops.length) throw new Error(`Empty footprint: ${species.code}`);
  const points=loops.flat(), xs=points.map(p=>p[0]), ys=points.map(p=>p[1]);
  const left=Math.min(...xs), right=Math.max(...xs), top=Math.min(...ys), bottom=Math.max(...ys);
  const side=Math.max(right-left,bottom-top)*1.16;
  const viewBox=[(left+right-side)/2,(top+bottom-side)/2,side,side].map(number).join(' ');
  const path=loops.map(loop=>`M${simplifyLoop(loop).map(p=>p.map(number).join(',')).join('L')}Z`).join('');
  return { path, viewBox, loops };
}

export function footprintSVG(species) {
  const { path, viewBox } = footprintGeometry(species);
  const title = species.name.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="56" height="56"><title>${title} — footprint</title><path fill="#8f93d9" fill-rule="evenodd" d="${path}"/></svg>\n`;
}
