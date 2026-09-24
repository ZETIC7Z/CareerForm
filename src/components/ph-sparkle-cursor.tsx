'use client';
import {useEffect,useRef} from 'react';

/**
 * Philippine-flag sparkle cursor.
 *
 * A lightweight canvas trail of four-point sparkles that draws from the national
 * palette — royal blue, scarlet, gold (the three stars and sun) with white highlights —
 * plus occasional eight-ray suns drawn in gold. Pointer-fine and pointer-coarse devices
 * are both handled: touch input only sparkles while a finger is down, and the whole
 * effect steps aside for `prefers-reduced-motion`.
 */
const PALETTE=['#0038A8','#CE1126','#FCD116','#FFFFFF','#FCD116'];

type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;size:number;color:string;spin:number;rays:number};

export default function PhSparkleCursor(){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);

  useEffect(()=>{
    if(typeof window==='undefined')return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

    const canvas=canvasRef.current;
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    if(!ctx)return;

    const particles:Particle[]=[];
    let width=0,height=0,dpr=1,frame=0,last=0,paletteIndex=0;

    const resize=()=>{
      dpr=Math.min(window.devicePixelRatio||1,2);
      width=window.innerWidth;height=window.innerHeight;
      canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);
      canvas.style.width=width+'px';canvas.style.height=height+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize();
    window.addEventListener('resize',resize,{passive:true});

    const spawn=(x:number,y:number,burst=1)=>{
      const time=performance.now();
      if(time-last<10&&burst===1)return;
      last=time;
      for(let i=0;i<burst;i++){
        const angle=Math.random()*Math.PI*2;
        const speed=burst>1?0.7+Math.random()*2.4:0.2+Math.random()*1.1;
        const life=burst>1?620+Math.random()*520:420+Math.random()*380;
        particles.push({
          x:x+(Math.random()-0.5)*10,
          y:y+(Math.random()-0.5)*10,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed-0.35,
          life,max:life,
          size:burst>1?3.4+Math.random()*3.2:2.4+Math.random()*3.0,
          color:PALETTE[paletteIndex++%PALETTE.length],
          spin:(Math.random()-0.5)*0.05,
          rays:Math.random()<0.18?8:4,
        });
      }
      if(particles.length>220)particles.splice(0,particles.length-220);
      if(!frame)frame=requestAnimationFrame(step);
    };

    const drawStar=(p:Particle,scale:number)=>{
      const spikes=p.rays;
      const outer=p.size*scale;
      const inner=outer*(p.rays===8?0.34:0.22);
      ctx.beginPath();
      for(let i=0;i<spikes*2;i++){
        const radius=i%2===0?outer:inner;
        const angle=(Math.PI/spikes)*i+Math.PI/2;
        const px=Math.cos(angle)*radius;
        const py=Math.sin(angle)*radius;
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.fillStyle=p.color;
      ctx.fill();
    };

    let previous=0;
    const step=(now:number)=>{
      frame=requestAnimationFrame(step);
      const delta=previous?Math.min(32,now-previous):16;
      previous=now;
      ctx.clearRect(0,0,width,height);
      let alive=false;
      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];
        p.life-=delta;
        if(p.life<=0){particles.splice(i,1);continue}
        alive=true;
        p.x+=p.vx*delta*0.06;p.y+=p.vy*delta*0.06;
        p.vx*=0.985;p.vy=p.vy*0.985+0.012;
        const t=p.life/p.max;
        ctx.save();
        ctx.globalAlpha=Math.min(1,t*1.5);
        ctx.translate(p.x,p.y);
        ctx.rotate(now*0.001*p.spin+p.spin*10);
        ctx.shadowColor=p.color;
        ctx.shadowBlur=p.rays===8?14:8;
        drawStar(p,0.45+t*0.75);
        ctx.restore();
      }
      if(!alive){cancelAnimationFrame(frame);frame=0;previous=0;ctx.clearRect(0,0,width,height)}
    };

    const onMove=(event:PointerEvent)=>{
      if(event.pointerType==='touch')return;
      spawn(event.clientX,event.clientY);
    };
    const onDown=(event:PointerEvent)=>{
      spawn(event.clientX,event.clientY,event.pointerType==='touch'?10:16);
    };

    window.addEventListener('pointermove',onMove,{passive:true});
    window.addEventListener('pointerdown',onDown,{passive:true});
    return ()=>{
      window.removeEventListener('resize',resize);
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerdown',onDown);
      if(frame)cancelAnimationFrame(frame);
    };
  },[]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="ph-sparkle-canvas"
    />
  );
}
