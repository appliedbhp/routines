/* Soft bell-like notes with short envelopes; no downloaded audio or tracking. */
const TokenSounds=(()=>{
 const earned=[{note:783.99,at:0,length:.24},{note:1046.5,at:.1,length:.36}];
 const complete=[{note:523.25,at:0,length:.28},{note:659.25,at:.12,length:.28},{note:783.99,at:.24,length:.32},{note:1046.5,at:.4,length:.65},{note:659.25,at:.4,length:.65},{note:783.99,at:.4,length:.65}];
 function play(audio,finished){
  const sequence=finished?complete:earned,start=audio.currentTime+.015;
  for(const {note,at,length} of sequence){
   for(const [multiple,volume] of [[1,.045],[2,.008]]){
    const osc=audio.createOscillator(),gain=audio.createGain(),time=start+at;
    osc.type='sine';osc.frequency.value=note*multiple;
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    osc.connect(gain);gain.connect(audio.destination);osc.start(time);osc.stop(time+length+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
   }
  }
 }
 return {earned,complete,play};
})();
