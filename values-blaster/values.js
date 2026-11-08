(function(root){
 const values=['Authenticity','Adventure','Financial Security','Kindness','Creativity','Freedom','Community','Family','Curiosity','Balance','Resilience','Loyalty','Wisdom','Compassion','Achievement','Peace','Humor','Autonomy','Personal Growth','Integrity','Health & Vitality','Contribution'];
 const examples={
  Authenticity:['Being yourself, even when others like different things.','Tell your family which game you really want to play.','Choose a book you like, even if your friends pick something else.'],
  Adventure:['Trying something new and seeing what happens.','Explore a new walking path with a grown-up.','Try a playground game you have never played.'],
  'Financial Security':['Taking care of your money so you have some when you need it.','Save some birthday money instead of spending it all.','Keep part of your school fair money for later.'],
  Kindness:['Doing small things that help others feel cared for.','Bring a family member a glass of water when they are tired.','Invite someone sitting alone to join your game.'],
  Creativity:['Using your imagination to make or try something different.','Turn an empty box into a pretend spaceship.','Draw a comic to share what you learned.'],
  Freedom:['Having room to make choices about your own life.','Choose what to do during your free time.','Pick your own topic when your teacher gives you a choice.'],
  Community:['Being part of a group and helping it thrive.','Help a neighbor bring in their bins.','Help your class take care of its shared supplies.'],
  Family:['Making time to care for and connect with the people you call family.','Ask someone in your family about their day.','Make a drawing for someone you care about.'],
  Curiosity:['Wanting to ask questions and find out more.','Ask why the moon looks different tonight.','Ask how a caterpillar turns into a butterfly.'],
  Balance:['Making time for different things you need, like work, play, and rest.','Take a break to play after doing a chore.','Take a quiet break after a busy group activity.'],
  Resilience:['Finding a way to keep going after something hard.','Try rebuilding a block tower after it falls.','Ask for a hint and try the problem again.'],
  Loyalty:['Being someone the people you care about can count on.','Keep your promise to play with your sibling after dinner.','Support a friend who feels left out at recess.'],
  Wisdom:['Using what you know and asking for help when you need it.','Ask a grown-up how to solve a problem safely.','Use what you learned last time to plan your project.'],
  Compassion:['Noticing when someone is hurting and showing you care.','Sit with a family member who feels sad.','Ask a classmate who got hurt if they want help.'],
  Achievement:['Working toward a goal and feeling proud of your progress.','Practice tying your shoes until you can do it.','Finish a project you worked on a little each day.'],
  Peace:['Helping things feel calm and working through disagreements gently.','Take a breath and use a calm voice during an argument.','Suggest taking turns when two people want the same ball.'],
  Humor:['Finding and sharing fun in ways that feel good to others.','Tell a silly joke at dinner.','Make a friend smile with a funny drawing.'],
  Autonomy:['Making your own choices and doing things for yourself when you can.','Pack your bag using a checklist.','Choose where to start on an assignment.'],
  'Personal Growth':['Learning and getting better at things over time.','Practice a song and notice which part is easier now.','Use feedback to make your next story clearer.'],
  Integrity:['Being honest and doing what you think is right.','Tell a grown-up if you accidentally broke something.','Give back a pencil you found on someone’s desk.'],
  'Health & Vitality':['Taking care of your body so you have energy to do things you enjoy.','Get some sleep and make time to move or play.','Drink water after playing outside.'],
  Contribution:['Doing your part to help make things better.','Help put away the groceries.','Help clean up after a class project.']
 };
 function normalize(input){return Array.isArray(input)?[...new Set(input.filter(v=>values.includes(v)))].slice(0,values.length):[];}
 // A polygon circumscribed around a safe text circle. Every edge stays outside
 // that circle, even as the rock rotates independently of its horizontal label.
 function polygon(textWidth,textHeight=18,random=Math.random){const safe=Math.hypot(textWidth/2+12,textHeight/2+10),count=7+Math.floor(random()*4),points=[];for(let i=0;i<count;i++){const angle=i*Math.PI*2/count,radius=safe/Math.cos(Math.PI/count)*(1.03+random()*.22);points.push({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});}return {safe,points,radius:Math.max(...points.map(p=>Math.hypot(p.x,p.y)))};}
 root.ValuesBlaster={values,examples,normalize,polygon};if(typeof module!=='undefined')module.exports=root.ValuesBlaster;
})(globalThis);
