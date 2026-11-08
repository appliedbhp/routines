/* These are practice opportunities, not claims of treatment outcomes. */
(function(root){
 const skills={planning:'Planning',memory:'Working memory',start:'Getting started',time:'Time management',flexibility:'Flexible thinking',regulation:'Self-regulation',monitor:'Self-monitoring',organization:'Organization'};
 const tools={
 'side-quest':['Side Quest',['flexibility','monitor'],'Explore distractions and returning to a task through a platform game.','Play a short round, then reflect on what helped you return to your goal.'],
 routine:['Routine timer',['time','start','memory'],'See each step and how much time is left.','Choose a short routine and practice moving to the next step.'],
 'chore-chart':['Chore chart',['organization','start','monitor'],'Keep shared responsibilities visible.','Choose one manageable job and check it off together.'],
 'task-strip':['Task strip',['memory','start','planning'],'Break a task into small steps you can follow.','Point to one step, do it, then move to the next.'],
 'now-next-later':['Now–Next–Later',['planning','flexibility','memory'],'See what is happening now and what comes afterward.','Preview the next activity before the current one ends.'],
 'first-then':['First–Then',['flexibility','start'],'Make a two-step plan easy to understand.','Choose a manageable first step and an inviting next activity together.'],
 'choice-board':['Choice board',['flexibility','planning'],'Compare a few clear choices.','Offer options that are all available and respect the choice.'],
 'calm-down':['Calm-down board',['regulation','flexibility'],'Find a supportive option when things feel too much.','Explore helpful choices while calm; offer them without pressure.'],
 'self-monitor':['Self-monitor',['monitor','regulation','time'],'Pause to notice how your work is going.','Choose what “on track” means, then reflect at each check-in.'],
 'homework-planner':['Homework planner',['planning','organization','memory'],'Give assignments a visible place.','Write down what is due and choose a small first step.'],
 'token-board':['Token board',['start','monitor'],'Notice progress toward a shared goal.','Agree on a clear, achievable action and celebrate progress.'],
 'yearly-planner':['Yearly',['planning','organization'],'See the bigger picture of what matters this year.','Choose priorities before filling your calendar.'],
 'quarterly-planner':['Quarterly',['planning','monitor'],'Connect the next three months to your values.','Choose three values and one small action for each.'],
 'monthly-planner':['Monthly',['planning','time','organization'],'See dates and commitments across a month.','Add fixed dates first, then leave room for rest and changes.'],
 'weekly-planner':['Weekly',['planning','time','organization'],'Make room for priorities across seven days.','Choose a few commitments and a realistic place for each.'],
 'daily-planner':['Daily',['start','time','planning'],'Turn today’s priorities into manageable steps.','Pick the most useful next action and a time to begin.'],
 'meal-planner':['Meal planning',['planning','organization','memory'],'Plan meals around your needs and values.','Start with familiar meals and one simple when–then plan.'],
 'implementation-intentions':['Intentions',['start','planning'],'Connect an action to a cue you will notice.','Complete “When this happens, I will do this small action.”'],
 'committed-action-tracker':['Commitments',['monitor','start'],'Notice actions that move you toward your values.','Choose an achievable action and reflect on patterns without judging yourself.'],
 maintenance:['Maintenance',['organization','memory'],'Keep recurring tasks and due dates in one place.','List a task and its next due date, without account numbers.'],
 touchpoints:['Touchpoints',['memory','planning'],'Keep meaningful people and occasions visible.','Choose a reminder and a small way to connect.'],
 'values-blaster':['Values Blaster',['flexibility','monitor'],'Explore words for what matters to you.','Choose values that feel meaningful to you, rather than what others expect.'],
 'my-character':['My Character',['planning','flexibility'],'Explore choices while creating your own character.','Try a few options, compare them, and keep what feels like you.']
 };
 function explain(id,age){const t=tools[id];if(!t)return null;const lead={young:'Try it together: an adult can model a step, then invite the child to try.',child:'Try it yourself, with help when you want it. Small steps count.',teen:'Make this your own. Choose supports that fit your goals and how you work.',adult:'Use this to reduce what you have to hold in mind and make your next action clear.',all:'Adapt the steps and support to the person using the tool.'}[age]||'';return {title:t[0],skills:t[1],what:t[2],try:t[3],why:({planning:'A visible plan helps connect a goal with the steps needed to reach it.',memory:'Visible reminders reduce the number of steps you need to hold in mind.',start:'A small, clear next step can make beginning feel more manageable.',time:'Making time visible helps you notice how activities fit into the day.',flexibility:'Previewing options creates opportunities to practice adapting a plan.',regulation:'Noticing your needs can help you choose a useful support.',monitor:'Checking in gives you a chance to notice progress and adjust your next step.',organization:'Giving information a consistent home makes it easier to find again.'}[t[1][0]]+' '+lead)};}
 root.RoutineLearning={skills,tools,explain};if(typeof module!=='undefined')module.exports=root.RoutineLearning;
})(globalThis);
