(function(root){
 const values=['Authenticity','Adventure','Financial Security','Kindness','Creativity','Freedom','Community','Family','Curiosity','Balance','Resilience','Loyalty','Wisdom','Compassion','Achievement','Peace','Humor','Autonomy','Personal Growth','Integrity','Health & Vitality','Contribution'];
 function normalize(input){return Array.isArray(input)?[...new Set(input.filter(v=>values.includes(v)))].slice(0,values.length):[];}
 // A polygon circumscribed around a safe text circle. Every edge stays outside
 // that circle, even as the rock rotates independently of its horizontal label.
 function polygon(textWidth,textHeight=18,random=Math.random){const safe=Math.hypot(textWidth/2+12,textHeight/2+10),count=7+Math.floor(random()*4),points=[];for(let i=0;i<count;i++){const angle=i*Math.PI*2/count,radius=safe/Math.cos(Math.PI/count)*(1.03+random()*.22);points.push({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});}return {safe,points,radius:Math.max(...points.map(p=>Math.hypot(p.x,p.y)))};}
 root.ValuesBlaster={values,normalize,polygon};if(typeof module!=='undefined')module.exports=root.ValuesBlaster;
})(globalThis);
