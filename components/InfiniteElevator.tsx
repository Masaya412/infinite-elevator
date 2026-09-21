'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Badge, Box, Button, Center, Divider, Flex, Grid, GridItem, HStack, Icon, IconButton,
  Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Progress,
  SimpleGrid, Spacer, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useDisclosure, VStack
} from '@chakra-ui/react';
import {
  FaArrowUp, FaBolt, FaBookOpen, FaBoxOpen, FaCircleQuestion, FaCoins, FaDoorClosed,
  FaElevator, FaGem, FaGavel, FaGift, FaHammer, FaHeart, FaHotTubPerson, FaWandMagicSparkles,
  FaPlay, FaRankingStar, FaRing, FaSackDollar, FaSkull, FaStar, FaStore, FaSun,
  FaTicket, FaTree, FaTrophy, FaVolumeHigh, FaVolumeXmark
} from 'react-icons/fa6';
import type { Item, ItemId, Room, State } from '../lib/types';

const tierMeta = [
  {name:'Tier 1 Common', bg:'radial-gradient(circle at center, rgba(14,165,233,.15), rgba(15,23,42,.95))', color:'cyan.300'},
  {name:'Tier 2 Uncommon', bg:'radial-gradient(circle at center, rgba(16,185,129,.20), rgba(15,23,42,.95))', color:'green.300'},
  {name:'Tier 3 Rare', bg:'radial-gradient(circle at center, rgba(168,85,247,.25), rgba(15,23,42,.95))', color:'purple.300'},
  {name:'Tier 4 Epic', bg:'radial-gradient(circle at center, rgba(239,68,68,.30), rgba(15,23,42,.95))', color:'red.300'},
  {name:'Tier 5 Legend', bg:'radial-gradient(circle at center, rgba(245,158,11,.35), rgba(15,23,42,.95))', color:'yellow.300'},
];


type SfxName = 'click'|'start'|'door'|'move1'|'move2'|'move3'|'move4'|'arrive'|'success'|'fail'|'coin'|'item'|'buy'|'sell'|'mine'|'gem'|'card'|'casino'|'slotStop'|'jackpot'|'warpUp'|'warpDown'|'roulette'|'hell'|'gameover'|'discard'|'upgrade';
let audioContext: AudioContext | null = null;
function playSfx(name:SfxName, enabled=true){
  if(!enabled || typeof window==='undefined') return;
  try{
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if(!AC) return;
    if(!audioContext) audioContext = new AC();
    const ctx=audioContext;
    if(ctx.state==='suspended') void ctx.resume();
    const now=ctx.currentTime;
    const tone=(freq:number,start=0,dur=.08,type:OscillatorType='square',vol=.055,endFreq?:number)=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type=type; o.frequency.setValueAtTime(freq,now+start);
      if(endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),now+start+dur);
      g.gain.setValueAtTime(.0001,now+start); g.gain.exponentialRampToValueAtTime(vol,now+start+.008); g.gain.exponentialRampToValueAtTime(.0001,now+start+dur);
      o.connect(g); g.connect(ctx.destination); o.start(now+start); o.stop(now+start+dur+.02);
    };
    const noise=(start=0,dur=.09,vol=.035)=>{
      const len=Math.max(1,Math.floor(ctx.sampleRate*dur)); const b=ctx.createBuffer(1,len,ctx.sampleRate); const d=b.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const src=ctx.createBufferSource(),g=ctx.createGain(); src.buffer=b; g.gain.setValueAtTime(vol,now+start); g.gain.exponentialRampToValueAtTime(.0001,now+start+dur); src.connect(g);g.connect(ctx.destination);src.start(now+start);
    };
    switch(name){
      case 'click': tone(520,0,.045,'square',.025,430); break;
      case 'start': tone(392,0,.09,'triangle',.05);tone(523,.08,.1,'triangle',.055);tone(659,.17,.14,'triangle',.06);break;
      case 'door': tone(150,0,.18,'sawtooth',.025,80);noise(0,.15,.018);break;
      case 'move1': tone(440,0,.08,'square',.04);tone(554,.08,.08,'square',.04);break;
      case 'move2': tone(392,0,.07,'square',.045);tone(587,.07,.07,'square',.05);tone(784,.14,.09,'square',.05);break;
      case 'move3': tone(523,0,.06,'sawtooth',.04);tone(784,.06,.07,'sawtooth',.045);tone(1047,.13,.12,'sawtooth',.05);break;
      case 'move4': tone(660,0,.05,'square',.045);tone(880,.05,.05,'square',.05);tone(1320,.10,.06,'square',.055);tone(1760,.16,.12,'triangle',.055);break;
      case 'arrive': tone(880,0,.08,'sine',.06);tone(1320,.09,.16,'sine',.045);break;
      case 'success': tone(523,0,.07,'triangle',.05);tone(659,.07,.07,'triangle',.055);tone(784,.14,.13,'triangle',.06);break;
      case 'fail': tone(330,0,.1,'sawtooth',.04);tone(247,.1,.12,'sawtooth',.04);break;
      case 'coin': tone(1175,0,.05,'sine',.055);tone(1568,.06,.09,'sine',.05);break;
      case 'item': tone(880,0,.05,'sine',.045);tone(1319,.05,.06,'sine',.05);tone(1760,.11,.12,'sine',.045);break;
      case 'buy': tone(740,0,.05,'square',.04);tone(988,.06,.08,'square',.045);break;
      case 'sell': tone(1047,0,.05,'sine',.05);tone(1319,.05,.05,'sine',.05);tone(1568,.1,.09,'sine',.05);break;
      case 'mine': noise(0,.1,.07);tone(110,0,.11,'square',.06,70);break;
      case 'gem': tone(988,0,.05,'sine',.045);tone(1480,.04,.08,'sine',.05);tone(1976,.11,.1,'sine',.04);break;
      case 'card': noise(0,.055,.025);tone(330,0,.045,'triangle',.025);break;
      case 'casino': tone(220,0,.05,'square',.035);tone(330,.05,.05,'square',.035);tone(440,.1,.05,'square',.04);break;
      case 'slotStop': tone(900,0,.045,'square',.045,700);break;
      case 'jackpot': [523,659,784,1047].forEach((f,i)=>tone(f,i*.07,.13,'triangle',.06));break;
      case 'warpUp': tone(220,0,.32,'sine',.05,1320);break;
      case 'warpDown': tone(880,0,.32,'sine',.05,110);break;
      case 'roulette': [330,440,554,660].forEach((f,i)=>tone(f,i*.055,.07,'square',.035));break;
      case 'hell': tone(92,0,.35,'sawtooth',.055,55);noise(.02,.28,.02);break;
      case 'gameover': tone(392,0,.13,'triangle',.05);tone(294,.13,.14,'triangle',.05);tone(196,.27,.28,'triangle',.055);break;
      case 'discard': tone(250,0,.08,'square',.035,120);break;
      case 'upgrade': tone(440,0,.06,'triangle',.045);tone(660,.06,.06,'triangle',.05);tone(990,.12,.13,'triangle',.055);break;
    }
  }catch{}
}

const ri=(a:number,b:number)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=<T,>(a:T[])=>a[Math.floor(Math.random()*a.length)];

function makeItem(id:ItemId,n=1):Item{
  switch(id){
    case 'mirror': return {id,name:`乱反射の鏡★${n}`,type:'consumable',paramN:n,desc:`使うと次に進む階数が${n}倍になる。`,price:n*150+200,icon:FaWandMagicSparkles};
    case 'ring': return {id,name:`幸運の指輪★${n}`,type:'consumable',paramN:n,desc:`3ターンの間運気が+${n}。`,price:n*100+200,icon:FaRing};
    case 'sage_gem': return {id,name:'賢者の宝石',type:'consumable',desc:'現在階の1の位だけ運気上昇。',price:600,icon:FaGem};
    case 'party_set': return {id,name:'パーティーセット',type:'consumable',desc:'次回のボタン押下で好演出確定。',price:500,icon:FaGift};
    case 'money_tree': return {id,name:`お金のなる木★${n}`,type:'passive',paramN:n,desc:`毎ターンお金+${200*n}円。`,price:n*400+400,icon:FaTree};
    case 'blessing_charm': return {id,name:`幸せのお守り★${n}`,type:'passive',paramN:n,desc:`毎ターン運気+${n}。`,price:n*400+400,icon:FaStar};
    case 'shop_ticket': return {id,name:'お店チケット',type:'consumable',desc:'次の部屋が確実にお店になる。',price:500,icon:FaTicket};
    case 'ruby': return {id,name:'ルビー',type:'gem',count:n,desc:'ショップで300円で売れる宝石。',price:300,icon:FaGem};
    case 'emerald': return {id,name:'エメラルド',type:'gem',count:n,desc:'ショップで500円で売れる宝石。',price:500,icon:FaGem};
    case 'diamond': return {id,name:'ダイヤモンド',type:'gem',count:n,desc:'ショップで1000円で売れる宝石。',price:1000,icon:FaGem};
  }
}
const baseState:State={floor:1,turnsLeft:10,luck:0,money:1000,highScore:1,items:[],logs:[],ringBuff:{active:false,turns:0,amount:0},mirrorMultiplier:1,partySet:false,inHell:false};

export default function InfiniteElevator(){
  const [s,setS]=useState<State>(baseState);
  const [menu,setMenu]=useState(true); const [moving,setMoving]=useState(false); const [doors,setDoors]=useState(false);
  const [room,setRoom]=useState<Room>({tier:1,title:'エレベーターホール',desc:'ボタンを押して上の階を目指しましょう！'});
  const [overlay,setOverlay]=useState<{show:boolean,tier:number,steps:number,detail:string}>({show:false,tier:1,steps:0,detail:''});
  const [selected,setSelected]=useState<number|null>(null); const [gameover,setGameover]=useState(false); const [nickname,setNickname]=useState('');
  const [rankings,setRankings]=useState<any[]>([]); const [forcedShop,setForcedShop]=useState(false); const [soundOn,setSoundOn]=useState(true);
  const [rocks,setRocks]=useState<{gem:ItemId|null,count:number,open:boolean}[]>([]); const [picks,setPicks]=useState(0);
  const [shop,setShop]=useState<{item:Item,sold:boolean}[]>([]); const [bj,setBj]=useState<{playing:boolean,bet:number,p:number[],d:number[]}>({playing:false,bet:100,p:[],d:[]});
  const [forgeUsed,setForgeUsed]=useState(false);
  const [fortuneReading,setFortuneReading]=useState(false);
  const [slotBet,setSlotBet]=useState(20); const [slot,setSlot]=useState(['❔','❔','❔']); const [slotSpinning,setSlotSpinning]=useState(false);
  const [slotWin,setSlotWin]=useState(false); const [slotMessage,setSlotMessage]=useState('');
  const rules=useDisclosure(), guide=useDisclosure(), itemGuide=useDisclosure(), rank=useDisclosure();

  useEffect(()=>{ const h=Number(localStorage.getItem('infinite_elevator_highscore')||'1'); const n=localStorage.getItem('infinite_elevator_nickname')||''; const r=JSON.parse(localStorage.getItem('infinite_elevator_local_rankings')||'[]'); setS(x=>({...x,highScore:Math.max(1,h)})); setNickname(n); setRankings(r); },[]);
  const log=(m:string)=>setS(x=>({...x,logs:[m,...x.logs]}));
  const patch=(p:Partial<State>)=>setS(x=>({...x,...p}));
  const addItem=(item:Item)=>setS(x=>{ const items=[...x.items]; if(item.type==='gem'){const i=items.findIndex(v=>v.id===item.id); if(i>=0){items[i]={...items[i],count:(items[i].count||1)+(item.count||1)}; return {...x,items,logs:[`「${item.name}」を入手！`,...x.logs]};}} if(items.length<3) items.push(item); else items[2]=item; return {...x,items,logs:[`アイテム「${item.name}」を入手！`,...x.logs]};});
  const show=(r:Room)=>setRoom(r);

  const start=()=>{playSfx('start',soundOn);setForgeUsed(false);setS({...baseState,highScore:s.highScore});setMenu(false);setGameover(false);setDoors(true);setRoom({tier:1,title:'エレベーターホール',desc:'エレベーターに乗りました。ボタンを押して上の階を目指しましょう！'});};
  const end=()=>{playSfx('gameover',soundOn);setGameover(true); setS(x=>{const h=Math.max(x.highScore,x.floor); localStorage.setItem('infinite_elevator_highscore',String(h)); return {...x,highScore:h};});};

  const triggerRoom=(forcedTier?:number,forcedType?:string)=>{
    let tier=forcedTier||1; if(!forcedTier){const r=Math.random()*100;tier=r<40?1:r<70?2:r<90?3:r<99?4:5;} if(forcedShop){tier=1;forcedType='SHOP_SMALL';setForcedShop(false);} executeRoom(tier,forcedType);
  };
  const executeRoom=(tier:number,type?:string)=>{
    if(tier===1){const t=type||pick(['NOTHING','LUCKY','HEALTH','MONEY_FOUND','STAIRS_SHORT','DOORS','SHOP_SMALL','TREASURE','FORTUNE','BOXES','BARTER','CROSSROADS']);
      if(t==='NOTHING')show({tier,title:'何も無い部屋',desc:'静けさが漂っている。',result:'変化なし'});
      else if(t==='LUCKY'){const g=ri(1,3);patch({luck:s.luck+g});show({tier,title:'ラッキー部屋',desc:'温かい光。運気UP！',result:`運気 +${g}`,resultType:'success'});}
      else if(t==='HEALTH'){patch({turnsLeft:s.turnsLeft+1});show({tier,title:'健康の湯',desc:'温泉で一休み。',result:'残り回数 +1',resultType:'success'});}
      else if(t==='MONEY_FOUND'){const g=ri(100,500);patch({money:s.money+g});show({tier,title:'落ちている財布',desc:'足元に財布が落ちていた！',result:`+${g}円 拾った！`,resultType:'gold'});}
      else if(t==='STAIRS_SHORT'){const g=ri(5,15);patch({floor:s.floor+g});show({tier,title:'短い階段',desc:'一気に駆け上がった！',result:`+${g}階上へ`,resultType:'success'});}
      else if(t==='DOORS')show({tier,title:'2つの扉',desc:'どちらか選ぶとランダムな部屋に案内される。',result:'扉を選択',kind:'doors'});
      else if(t==='SHOP_SMALL')setupShop(tier,1);
      else if(t==='TREASURE'){const g=ri(300,900);patch({money:s.money+g});show({tier,title:'小さな宝箱',desc:'古びた宝箱を見つけた。',result:`+${g}円`,resultType:'gold'});}
      else if(t==='FORTUNE'){setFortuneReading(false);show({tier,title:'占い師の小部屋',desc:'ミステリアスな占い師が水晶越しにあなたの運勢を見つめている。',result:'占ってもらおう',kind:'fortune'});}
      else if(t==='BOXES')show({tier,title:'3つの怪しい小箱',desc:'直感でどれか1つを選ぼう。',result:'箱を選択',kind:'boxes'});
      else if(t==='BARTER')show({tier,title:'怪しい物々交換所',desc:'行商人がいる。手持ちのリソースを何度でも交換できる。',result:'交換選択',kind:'barter'});
      else show({tier,title:'運命の分岐路',desc:'道が2つに分かれている。',result:'道を選択',kind:'crossroads'});
    } else if(tier===2){const t=type||pick(['VENDING','SUPER_LUCKY','HEALTH_2','RUBY_MINING','STAIRS_MED','SHOP_MED','BLACKJACK','FORGE','ALTAR','MYSTERY_AUCTION']);
      if(t==='VENDING')show({tier,title:'自動販売機',desc:'購入すると1/2の確率で+1される。',result:'自販機発見',kind:'vending'});
      else if(t==='SUPER_LUCKY'){const g=ri(3,5);patch({luck:s.luck+g});show({tier,title:'超ラッキー部屋',desc:'強い運気のオーラ！',result:`運気 +${g}`,resultType:'success'});}
      else if(t==='HEALTH_2'){const g=ri(2,3);patch({turnsLeft:s.turnsLeft+g});show({tier,title:'無病の湯',desc:'元気が出た！',result:`残り回数 +${g}`,resultType:'success'});}
      else if(t==='RUBY_MINING')setupMining(tier,'ruby');
      else if(t==='STAIRS_MED'){const g=ri(15,30);patch({floor:s.floor+g});show({tier,title:'長い階段',desc:'螺旋階段を登った！',result:`+${g}階上へ`,resultType:'success'});}
      else if(t==='SHOP_MED')setupShop(tier,3); else if(t==='BLACKJACK')show({tier,title:'地下カードサロン',desc:'BJでディーラーと勝負(21以内で高い方が勝ち)。',result:'勝負可能',kind:'blackjack'});
      else if(t==='FORGE'){setForgeUsed(false);show({tier,title:'魔法鍛冶屋',desc:'鏡や指輪の性能を無料で1つだけ強化(+1~3)します！',result:'この部屋では1回だけ強化できます',kind:'forge'});}
      else if(t==='ALTAR')show({tier,title:'運試しの祭壇',desc:'何を捧げるかで加護が変わる。',result:'祭壇に祈る',kind:'altar'});
      else show({tier,title:'ミステリーオークション',desc:'謎の袋が出品中。(1000円)',result:'競り参加',kind:'mystery'});
    } else if(tier===3){const t=type||pick(['CASINO','SUPER_LUCKY_3','HEALTH_3','EMERALD_MINING','STAIRS_LONG','SHOP_LARGE','ITEM_BOX']);
      if(t==='CASINO')show({tier,title:'スロットカジノ',desc:'ルビー5倍・エメラルド10倍・ダイヤ30倍。',result:'CASINO OPEN',kind:'casino'});
      else if(t==='SUPER_LUCKY_3'){const g=ri(6,8);patch({luck:s.luck+g});show({tier,title:'極ラッキー部屋',desc:'祝福の光！',result:`運気 +${g}`,resultType:'gold'});}
      else if(t==='HEALTH_3'){const g=ri(4,5);patch({turnsLeft:s.turnsLeft+g});show({tier,title:'不老不死の湯',desc:'圧倒的な活力！',result:`残り回数 +${g}`,resultType:'gold'});}
      else if(t==='EMERALD_MINING')setupMining(tier,'emerald');
      else if(t==='STAIRS_LONG'){const g=ri(50,200);patch({floor:s.floor+g});show({tier,title:'果てしなく続く階段',desc:'次元を超える階段！',result:`+${g}階上へ`,resultType:'gold'});}
      else if(t==='SHOP_LARGE')setupShop(tier,5); else {addItem(pick([makeItem('mirror',3),makeItem('ring',6),makeItem('sage_gem'),makeItem('party_set'),makeItem('shop_ticket')]));show({tier,title:'不思議なアイテム箱',desc:'豪華な箱が置いてある。',result:'アイテム獲得！',resultType:'gold'});}
    } else if(tier===4){const t=type||pick(['WARP','AUCTION','DIAMOND_MINING','TIMECAPSULE']);
      if(t==='WARP')show({tier,title:'ワープホール',desc:'使うとランダムに移動できる。',result:'ワープホール現る',kind:'warp'});
      else if(t==='AUCTION')show({tier,title:'神々の競売場',desc:'最高峰の品がオークションに出品。',result:'競売開催中',kind:'auction'});
      else if(t==='DIAMOND_MINING')setupMining(tier,'diamond'); else {const b=s.floor*4;patch({money:s.money+b});show({tier,title:'タイムカプセル',desc:'過去の記憶が還元される。',result:`階数ボーナス +${b}円`,resultType:'gold'});}
    } else {if((type||pick(['ULTIMATE_ROULETTE','GOD']))==='ULTIMATE_ROULETTE')show({tier,title:'究極のルーレット',desc:'神々の気まぐれ。究極ルーレットに挑むか？',result:'運命のルーレット',kind:'ultimate'}); else show({tier,title:'神の故郷',desc:'好きなアイテムを一つ選べます。',result:'神の加護',kind:'god'});}
  };

  const setupMining=(tier:number,gem:ItemId)=>{setRocks(Array.from({length:5},()=>{const ok=Math.random()<.8;return {gem:ok?gem:null,count:ok?ri(1,3):0,open:false}}));setPicks(2);show({tier,title:gem==='ruby'?'ルビーの採掘場':gem==='emerald'?'エメラルドの採掘場':'ダイヤモンドの採掘場',desc:'5つの岩から2つ壊そう！宝石が出るかも！',result:'岩を選んで壊そう',kind:'mining'});};
  const setupShop=(tier:number,count:number)=>{const pool=[makeItem('mirror',ri(3,5)),makeItem('ring',ri(6,9)),makeItem('shop_ticket'),makeItem('sage_gem'),makeItem('party_set'),makeItem('money_tree',ri(1,2)),makeItem('blessing_charm',ri(1,2))].sort(()=>Math.random()-.5).slice(0,count).map(item=>({item,sold:false}));setShop(pool);show({tier,title:count===1?'小さなお店':count===3?'大きなお店':'ホームセンター',desc:'アイテムの購入が可能。※宝石のみ売却できます。',result:'ショップ営業中',kind:'shop'});};

  const press=()=>{if(moving||gameover||s.turnsLeft<=0||s.inHell)return; playSfx('door',soundOn); setMoving(true);setDoors(false); let x={...s}; x.turnsLeft--; x.items.forEach(i=>{if(i.id==='money_tree')x.money+=200*(i.paramN||1); if(i.id==='blessing_charm')x.luck+=(i.paramN||1);}); if(x.ringBuff.active){x.ringBuff={...x.ringBuff,turns:x.ringBuff.turns-1}; if(x.ringBuff.turns<=0){x.luck-=x.ringBuff.amount;x.ringBuff={active:false,turns:0,amount:0};}} const r=Math.random()*100; let t=x.partySet?(Math.random()<.72?2:Math.random()<.9?3:4):(r<65?1:r<90?2:r<98?3:4); x.partySet=false; const base=t===1?ri(1,12):t===2?ri(10,30):t===3?ri(25,50):ri(40,80); const mult=t===1?ri(2,3):t===2?ri(3,4):t===3?ri(4,5):ri(5,7); let steps=(base+Math.max(0,x.luck)*mult)*x.mirrorMultiplier; const detail=`基礎:${base} + 運気(${x.luck})x${mult}${x.mirrorMultiplier>1?` (鏡 x${x.mirrorMultiplier})`:''}`; x.mirrorMultiplier=1; setS(x); setTimeout(()=>{playSfx((`move${t}` as SfxName),soundOn);setOverlay({show:true,tier:t,steps,detail});setTimeout(()=>{setOverlay(o=>({...o,show:false}));setS(y=>({...y,floor:y.floor+steps,logs:[`【ボタン】演出${t}! +${steps}階登った！`,...y.logs]})); setTimeout(()=>{playSfx('arrive',soundOn);triggerRoom();setDoors(true);setMoving(false); if(x.turnsLeft<=0)setTimeout(end,700);},120);},900);},500);};

  const useItem=(i:number)=>{playSfx('item',soundOn);const item=s.items[i]; if(!item||item.type!=='consumable')return; const ns={...s,items:[...s.items]}; if(item.id==='mirror')ns.mirrorMultiplier=item.paramN||1; else if(item.id==='ring'){if(ns.ringBuff.active)return;ns.ringBuff={active:true,turns:3,amount:item.paramN||1};ns.luck+=item.paramN||1;} else if(item.id==='sage_gem')ns.luck+=ns.floor%10; else if(item.id==='party_set')ns.partySet=true; else if(item.id==='shop_ticket')setForcedShop(true); ns.items.splice(i,1);setS(ns);setSelected(null);};
  const sellGem=(i:number)=>{playSfx('sell',soundOn);const item=s.items[i];if(item?.type!=='gem')return;const total=item.price*(item.count||1);setS(x=>({...x,money:x.money+total,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};
  const discard=(i:number)=>{playSfx('discard',soundOn);setS(x=>({...x,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};

  const submitScore=()=>{playSfx('success',soundOn);const name=nickname.trim()||'名無しの登山者';const all=[...rankings,{name,score:s.floor,floor:s.floor,money:s.money,luck:s.luck,date:new Date().toLocaleDateString()}].sort((a,b)=>b.score-a.score).slice(0,50);setRankings(all);localStorage.setItem('infinite_elevator_local_rankings',JSON.stringify(all));localStorage.setItem('infinite_elevator_nickname',name);};
  const card=()=>Math.min(10,ri(1,10)); const hand=(a:number[])=>a.reduce((p,c)=>p+c,0);
  const warp=(d:number)=>{playSfx(d>=0?'warpUp':'warpDown',soundOn);patch({floor:Math.max(1,s.floor+d)});show({...room,kind:undefined,result:`${d>=0?'+':''}${d}階 ワープ！`,resultType:d>=0?'gold':'danger'});};
  const buyAuction=(item:Item)=>{if(s.money<500){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-500});addItem(item);show({...room,kind:undefined,result:`${item.name} 落札！`,resultType:'gold'});};

  const interactive=useMemo(()=>{
    const kind=room.kind;
    if(kind==='doors')return <SimpleGrid columns={2} spacing={2}><Action title="軋んだ扉" sub="ティア1確定" onClick={()=>executeRoom(1)}/><Action title="金の扉" sub="ティア4以上確定" onClick={()=>executeRoom(Math.random()<.8?4:5)}/></SimpleGrid>;
    if(kind==='boxes')return <SimpleGrid columns={3} spacing={1.5}>{['赤','青','緑'].map((v,i)=><Action key={v} title={v} onClick={()=>{playSfx('item',soundOn);const r=ri(0,2); if(r===0)patch({money:s.money+ri(300,699)});else if(r===1)patch({luck:s.luck+ri(2,4)});else patch({turnsLeft:s.turnsLeft+1});show({...room,kind:undefined,result:r===0?'お金ゲット！':r===1?'運気アップ！':'回数+1',resultType:'success'});}}/>)}</SimpleGrid>;
    if(kind==='crossroads')return <SimpleGrid columns={2} spacing={2}><Action title="平坦路" sub="確実に+300円" onClick={()=>{playSfx('coin',soundOn);patch({money:s.money+300});show({...room,kind:undefined,result:'+300円',resultType:'success'})}}/><Action title="茨の道" sub="1500円 or -500円" onClick={()=>{const win=Math.random()<.5;playSfx(win?'success':'fail',soundOn);patch({money:Math.max(0,s.money+(win?1500:-500))});show({...room,kind:undefined,result:win?'+1500円':'-500円',resultType:win?'gold':'danger'})}}/></SimpleGrid>;
    if(kind==='barter')return <Stack spacing={1.5}><Action title="運気2 ⇆ 300円" onClick={()=>{if(s.luck>=2){playSfx('coin',soundOn);patch({luck:s.luck-2,money:s.money+300});}else playSfx('fail',soundOn);}}/><Action title="300円 ⇆ 回数+1" onClick={()=>{if(s.money>=300){playSfx('success',soundOn);patch({money:s.money-300,turnsLeft:s.turnsLeft+1});}else playSfx('fail',soundOn);}}/></Stack>;
    if(kind==='vending')return <SimpleGrid columns={2} spacing={2}><Action title="運気ドリンク" sub="200円 (50%で+1)" onClick={()=>{if(s.money<200){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-200,luck:s.luck+(Math.random()<.5?1:0)})}}/><Action title="回数ドリンク" sub="400円 (50%で+1)" onClick={()=>{if(s.money<400){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-400,turnsLeft:s.turnsLeft+(Math.random()<.5?1:0)})}}/></SimpleGrid>;
    if(kind==='mining')return <><SimpleGrid columns={5} spacing={1}>{rocks.map((r,i)=><Button key={i} h="56px" p={1} bg={r.open?'gray.800':'gray.700'} isDisabled={r.open||picks<=0} onClick={()=>{playSfx('mine',soundOn);const n=[...rocks];n[i]={...n[i],open:true};setRocks(n);setPicks(p=>p-1);}}>{r.open?(r.gem?<VStack spacing={0}><Icon as={FaGem}/><Text fontSize="10px">x{r.count}</Text></VStack>:'空'):<Icon as={FaHammer}/>}</Button>)}</SimpleGrid>{picks<=0&&<Button mt={2} w="100%" colorScheme="green" size="sm" onClick={()=>{playSfx('gem',soundOn);rocks.filter(r=>r.open&&r.gem).forEach(r=>addItem(makeItem(r.gem!,r.count)));show({...room,kind:undefined,result:'宝石を拾った！',resultType:'gold'});}}>宝石を拾って進む</Button>}</>;
    if(kind==='shop')return <Stack spacing={1.5} maxH="145px" overflowY="auto">{shop.map((g,i)=><Flex key={i} p={2} bg="gray.800" rounded="lg" align="center" opacity={g.sold ? .5 : 1}><Icon as={g.item.icon||FaGift} mr={2}/><Box flex="1"><Text fontSize="11px" fontWeight="bold">{g.item.name}</Text><Text fontSize="9px" color="gray.400">{g.item.price}円</Text></Box><Button size="xs" colorScheme="yellow" isDisabled={g.sold} onClick={()=>{if(s.money<g.item.price){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-g.item.price});addItem(g.item);setShop(x=>x.map((v,j)=>j===i?{...v,sold:true}:v));}}>{g.sold?'SOLD OUT':'購入'}</Button></Flex>)}</Stack>;
    if(kind==='blackjack')return <Stack spacing={2} bg="blackAlpha.400" p={2} rounded="xl"><HStack justify="space-between"><Text fontSize="xs">賭け金</Text><HStack><Button size="xs" onClick={()=>setBj(x=>({...x,bet:Math.max(100,x.bet-100)}))}>-</Button><Text color="yellow.300">{bj.bet}円</Text><Button size="xs" onClick={()=>setBj(x=>({...x,bet:x.bet+100}))}>+</Button></HStack></HStack>{!bj.playing?<Button size="sm" colorScheme="teal" onClick={()=>{if(s.money<bj.bet){playSfx('fail',soundOn);return;}playSfx('card',soundOn);patch({money:s.money-bj.bet});setBj(x=>({...x,playing:true,p:[card(),card()],d:[card(),card()]}));}}>勝負開始！(勝利時2倍)</Button>:<><Text fontSize="xs">あなた: {bj.p.join(' / ')} = {hand(bj.p)}</Text><Text fontSize="xs">Dealer: {bj.d.join(' / ')} = {hand(bj.d)}</Text><HStack><Button size="sm" onClick={()=>{playSfx('card',soundOn);const drawn=card();const p=[...bj.p,drawn];const total=hand(p); if(total>21){playSfx('fail',soundOn);setBj(x=>({...x,p,playing:false}));show({...room,result:`${drawn}を引いて合計${total} → BUST（21超過）`,resultType:'danger'});} else {setBj(x=>({...x,p}));show({...room,result:`${drawn}を引いた → 合計${total}`,resultType:'neutral'});}}}>HIT</Button><Button size="sm" colorScheme="green" onClick={()=>{playSfx('card',soundOn);let d=[...bj.d];while(hand(d)<17)d.push(card());const pv=hand(bj.p),dv=hand(d);const win=dv>21||pv>dv;const draw=pv===dv;playSfx(win?'success':draw?'click':'fail',soundOn);if(win)patch({money:s.money+bj.bet*2});else if(draw)patch({money:s.money+bj.bet});setBj(x=>({...x,d,playing:false}));show({...room,result:win?'勝利！':draw?'引き分け':'敗北...',resultType:win?'gold':draw?'neutral':'danger'});}}>STAND</Button></HStack></>}</Stack>;
    if(kind==='casino')return <Stack spacing={2}>
      <HStack justify="center"><Button size="xs" isDisabled={slotSpinning} onClick={()=>setSlotBet(Math.max(20,slotBet-20))}>-</Button><Text color="yellow.300" fontWeight="900">{slotBet}円</Text><Button size="xs" isDisabled={slotSpinning} onClick={()=>setSlotBet(slotBet+20)}>+</Button></HStack>
      <HStack justify="center" spacing={2}>{slot.map((v,i)=><Center key={i} bg={slotWin?'yellow.900':'black'} border="2px solid" borderColor={slotWin?'yellow.300':slotSpinning?'purple.400':'whiteAlpha.200'} boxShadow={slotWin?'0 0 18px rgba(250,204,21,.85)':'inset 0 0 12px rgba(0,0,0,.7)'} animation={slotWin?'slotJackpot .42s ease-in-out infinite alternate':undefined} rounded="lg" w="62px" h="62px" fontSize="2xl">{v}</Center>)}</HStack>
      {slotMessage&&<Box px={3} py={2} rounded="lg" bg={slotWin?'yellow.900':'whiteAlpha.100'} border="1px solid" borderColor={slotWin?'yellow.300':'whiteAlpha.200'} animation={slotWin?'winText .5s ease-in-out infinite alternate':undefined}><Text textAlign="center" fontSize={slotWin?'sm':'xs'} fontWeight="900" color={slotWin?'yellow.200':'gray.100'}>{slotMessage}</Text></Box>}
      <Button colorScheme="purple" size="sm" isLoading={slotSpinning} loadingText="リール回転中…" onClick={()=>{
        if(s.money<slotBet||slotSpinning){playSfx('fail',soundOn);return;}
        const sy=['🔴','🟢','💎','🎡']; const final=[pick(sy),pick(sy),pick(sy)];
        playSfx('casino',soundOn); setS(x=>({...x,money:x.money-slotBet})); setSlotSpinning(true); setSlotWin(false); setSlotMessage('3つのリールが回転中…'); setSlot(['🎰','🎰','🎰']);
        const timers=final.map((_,i)=>window.setInterval(()=>setSlot(cur=>cur.map((v,j)=>j===i?pick(sy):v)),70));
        const stops=[520,900,1280];
        stops.forEach((ms,i)=>window.setTimeout(()=>{window.clearInterval(timers[i]);setSlot(cur=>cur.map((v,j)=>j===i?final[i]:v));playSfx('slotStop',soundOn);setSlotMessage(i<2?`${i+1}リール停止！ 次のリールへ…`:'3リール停止！ 判定中…');},ms));
        window.setTimeout(()=>{
          let mult=0; let label='';
          if(final.every(v=>v==='🔴')){mult=5;label='ルビー';}
          if(final.every(v=>v==='🟢')){mult=10;label='エメラルド';}
          if(final.every(v=>v==='💎')){mult=30;label='ダイヤモンド';}
          if(final.every(v=>v==='🎡')){mult=ri(10,50);label='ルーレット';}
          if(mult){playSfx('jackpot',soundOn);setSlotWin(true);setSlotMessage(`✨ ${label}が3つ揃った！ ${mult}倍！ ✨`);setS(x=>({...x,money:x.money+slotBet*mult}));show({...room,result:`${label}揃い！ ${mult}倍 / +${slotBet*mult}円`,resultType:'gold'});window.setTimeout(()=>setSlotWin(false),2200);}
          else{playSfx('fail',soundOn);setSlotMessage('残念…今回は3つ揃わなかった');show({...room,result:'ハズレ… 次の勝負へ！',resultType:'neutral'});}
          setSlotSpinning(false);
        },1540);
      }}>スロットを回す</Button>
      <Box bg="blackAlpha.500" border="1px solid" borderColor="purple.500" rounded="xl" p={2.5}>
        <Text fontSize="11px" fontWeight="900" color="purple.200" mb={1.5} textAlign="center">🎰 配当表</Text>
        <Stack spacing={1}>
          {[['🔴 🔴 🔴','ルビー揃い','5倍','red.300'],['🟢 🟢 🟢','エメラルド揃い','10倍','green.300'],['💎 💎 💎','ダイヤモンド揃い','30倍','cyan.200'],['🎡 🎡 🎡','ルーレット揃い','10〜50倍','yellow.200']].map(([icons,name,payout,color])=><Flex key={name as string} px={2} py={1} bg="whiteAlpha.100" rounded="md" align="center"><Text fontSize="11px" minW="82px">{icons}</Text><Text fontSize="9px" color="gray.200" flex="1">{name}</Text><Text fontSize="10px" fontWeight="900" color={color}>{payout}</Text></Flex>)}
        </Stack>
      </Box>
    </Stack>;
    if(kind==='forge'){const upgradable=s.items.filter(i=>i.paramN);if(forgeUsed)return <Box p={3} bg="whiteAlpha.100" rounded="lg" border="1px solid" borderColor="green.500"><Text fontSize="sm" fontWeight="900" color="green.200" textAlign="center">この鍛冶屋での強化は完了しました</Text></Box>;if(upgradable.length===0)return <Text fontSize="sm" color="gray.200" textAlign="center">強化できるアイテムがありません</Text>;return <Stack spacing={1}>{upgradable.map((it,i)=><Action key={i} title={`${it.name} を無料で強化`} sub="この部屋では1回だけ" onClick={()=>{const boost=ri(1,3);playSfx('upgrade',soundOn);setS(x=>({...x,items:x.items.map(v=>v===it?makeItem(v.id,(v.paramN||1)+boost):v)}));setForgeUsed(true);show({...room,result:`${it.name} を +${boost} 強化！`,resultType:'success'});}}/>)}</Stack>;}
    if(kind==='fortune')return <Stack spacing={2}><Center><Icon as={FaWandMagicSparkles} boxSize={9} color={fortuneReading?'purple.200':'purple.300'} opacity={fortuneReading?.75:1}/></Center><Button w="100%" colorScheme="purple" isDisabled={fortuneReading} isLoading={fortuneReading} loadingText="運勢を占っています…" onClick={()=>{if(fortuneReading)return;setFortuneReading(true);playSfx('roulette',soundOn);show({...room,result:'水晶が光り始めた…',resultType:'neutral'});setTimeout(()=>{const g=ri(-2,5);playSfx(g>=0?'success':'fail',soundOn);setS(x=>({...x,luck:x.luck+g}));setFortuneReading(false);show({...room,kind:undefined,desc:'水晶の光が収まり、占い師が静かに結果を告げた。',result:`占い結果：運気 ${g>=0?'+':''}${g}`,resultType:g>=0?'success':'danger'});},1400);}}>運勢を占う</Button>{fortuneReading&&<Text fontSize="xs" color="purple.200" textAlign="center">星の巡りを読み取っています…</Text>}</Stack>;
    if(kind==='altar')return <Stack spacing={1}><Action title="運気10 ⇆ 回数+3" onClick={()=>{if(s.luck>=10){playSfx('success',soundOn);patch({luck:s.luck-10,turnsLeft:s.turnsLeft+3});show({...room,kind:undefined,result:'加護を得た！ 回数 +3（運気 -10）',resultType:'success'});}else{playSfx('fail',soundOn);show({...room,result:'運気が足りない…',resultType:'danger'});}}}/><Action title="回数3 ⇆ 運気+10" onClick={()=>{if(s.turnsLeft>3){playSfx('success',soundOn);patch({turnsLeft:s.turnsLeft-3,luck:s.luck+10});show({...room,kind:undefined,result:'加護を得た！ 運気 +10（回数 -3）',resultType:'gold'});}else{playSfx('fail',soundOn);show({...room,result:'残り回数が足りない…',resultType:'danger'});}}}/></Stack>;
    if(kind==='mystery')return <Action title="1000円で落札！" onClick={()=>{if(s.money<1000){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-1000});const r=Math.random();if(r<.4)addItem(Math.random()<.5?makeItem('mirror',4):makeItem('ring',8));else if(r<.8)patch({money:s.money+500});playSfx(r<.8?'success':'fail',soundOn);show({...room,kind:undefined,result:r<.8?'当たり！':'ハズレ...',resultType:r<.8?'gold':'neutral'});}}/>;
    if(kind==='warp')return <Stack spacing={1}><Action title="小さなワープホール" sub="0 ～ +50階" onClick={()=>warp(ri(0,50))}/><Action title="大きなワープホール" sub="-30 ～ +150階" onClick={()=>warp(ri(-30,150))}/><Action title="巨大なワープホール" sub="-100 ～ +300階" onClick={()=>warp(ri(-100,300))}/></Stack>;
    if(kind==='auction')return <Stack spacing={1}><Action title="乱反射の鏡★8 / 500円" onClick={()=>buyAuction(makeItem('mirror',8))}/><Action title="幸運の指輪★15 / 500円" onClick={()=>buyAuction(makeItem('ring',15))}/></Stack>;
    if(kind==='ultimate')return <Button w="100%" colorScheme="yellow" onClick={()=>{playSfx('roulette',soundOn);const r=ri(0,3); if(r===0)patch({floor:Math.floor(s.floor*1.5)});if(r===1)patch({money:s.money+10000});if(r===2)patch({turnsLeft:s.turnsLeft+5,luck:s.luck+10});if(r===3){playSfx('hell',soundOn);patch({inHell:true});show({tier:5,title:'地獄の門',desc:'サイコロで「5」を出すまで帰れない。振るたびに残り回数を消費する。',result:'地獄に堕ちた...',resultType:'danger',kind:'hell'});return;}show({...room,kind:undefined,result:['階数 1.5倍！','お金 +10,000円！','回数+5 ＆ 運気+10！'][r],resultType:'gold'});}}>運命のルーレットを回す！</Button>;
    if(kind==='god')return <Stack spacing={1}>{[makeItem('mirror',8),makeItem('ring',15),makeItem('money_tree',3),makeItem('blessing_charm',3),makeItem('party_set')].map((it,i)=><Action key={i} title={it.name} onClick={()=>{playSfx('item',soundOn);addItem(it);show({...room,kind:undefined,result:`${it.name} 獲得！`,resultType:'gold'})}}/>)}</Stack>;
    if(kind==='hell')return <Button w="100%" colorScheme="red" onClick={()=>{if(s.turnsLeft<=0)return;playSfx('hell',soundOn);const roll=ri(1,6);patch({turnsLeft:s.turnsLeft-1});if(roll===5){playSfx('success',soundOn);patch({inHell:false});show({tier:1,title:'地獄から生還',desc:'5が出た！元の世界へ戻った。',result:'生還！',resultType:'success'});}else if(s.turnsLeft-1<=0)end();else {playSfx('fail',soundOn);show({...room,result:`${roll}が出た... 脱出失敗`,resultType:'danger'});}}}>サイコロを振る (回数-1)</Button>;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[room,s,rocks,picks,shop,bj,slotBet,slot,slotSpinning,slotWin,slotMessage,soundOn,forgeUsed,fortuneReading]);

  const selectedItem=selected===null?null:s.items[selected];
  const resultColor=room.resultType==='success'?'green':room.resultType==='danger'?'red':room.resultType==='gold'?'yellow':'gray';
  const tier=tierMeta[Math.min(4,Math.max(0,room.tier-1))];
  const disabled=moving||gameover||s.turnsLeft<=0||slotSpinning||bj.playing||s.inHell;

  const handleButtonSound=(e:React.MouseEvent)=>{const el=e.target as HTMLElement;if(el.closest('button'))playSfx('click',soundOn);};

  return <Center h="100dvh" minH={0} p={{base:0,md:4}} overflow="hidden">
    <Box onClickCapture={handleButtonSound} w="100%" maxW="432px" h={{base:'100dvh',md:'min(860px, calc(100dvh - 32px))'}} maxH={{base:'100dvh',md:'calc(100dvh - 32px)'}} bg="#0f141d" borderRadius={{base:0,md:'3xl'}} overflow="hidden" position="relative" borderWidth={{base:0,md:'4px'}} borderColor="whiteAlpha.200" boxShadow="2xl">
      {menu&&<Flex position="absolute" inset={0} zIndex={40} p={6} bg="linear-gradient(#0f172a,#0f141d,#000)" direction="column" justify="space-between" align="center" textAlign="center">
        <Box mt={8}><Center mx="auto" w="82px" h="82px" borderRadius="2xl" bg="cyan.400" color="cyan.200" bgColor="rgba(0,240,255,.1)" border="1px solid rgba(0,240,255,.3)"><Icon as={FaElevator} boxSize={12} animation="pulseGlow 2s infinite"/></Center><Text fontSize="3xl" fontWeight="black" mt={3}>無限エレベーター</Text><Text fontSize="xs" color="cyan.300" fontWeight="bold" letterSpacing="widest">INFINITE ELEVATOR</Text></Box>
        <Flex w="100%" bg="gray.900" border="1px solid" borderColor="gray.700" rounded="2xl" p={4} justify="space-between" align="center"><HStack><Icon as={FaTrophy} color="yellow.400"/><Text fontSize="sm" color="gray.400" fontWeight="bold">自己最高記録</Text></HStack><Text fontFamily="mono" fontSize="2xl" color="yellow.400" fontWeight="bold">{s.highScore} 階</Text></Flex>
        <Stack w="100%" spacing={2.5} mb={4}><Button h="58px" colorScheme="cyan" bgGradient="linear(to-r, cyan.500, blue.600)" color="white" leftIcon={<FaPlay/>} onClick={start}>ゲームを始める</Button><SimpleGrid columns={2} spacing={2}><Button size="sm" bg="gray.800" color="yellow.300" leftIcon={<FaRankingStar/>} onClick={rank.onOpen}>ランキング</Button><Button size="sm" bg="gray.800" color="green.300" leftIcon={<FaCircleQuestion/>} onClick={rules.onOpen}>ルール説明</Button><Button size="sm" bg="gray.800" color="cyan.300" leftIcon={<FaBookOpen/>} onClick={guide.onOpen}>ステージ図鑑</Button><Button size="sm" bg="gray.800" color="purple.300" leftIcon={<FaGem/>} onClick={itemGuide.onOpen}>アイテム図鑑</Button></SimpleGrid></Stack>
      </Flex>}

      <Flex h="100%" direction="column">
        <Box flexShrink={0} p={3} bgGradient="linear(to-b, gray.900, #1a2232, gray.900)" borderBottom="1px solid" borderColor="whiteAlpha.200" zIndex={20}>
          <Flex bg="blackAlpha.600" rounded="xl" px={3} py={1.5} align="center"><Box><Text fontSize="9px" color="gray.400" fontWeight="bold">現在地</Text><HStack spacing={1}><Text fontFamily="mono" fontSize="3xl" color="cyan.300" fontWeight="bold" textShadow="0 0 10px rgba(0,240,255,.7)">{s.floor}</Text><Text fontSize="xs" color="cyan.300">階</Text></HStack></Box><Spacer/><Icon as={FaArrowUp} color="gray.500"/><Spacer/><IconButton aria-label="bgm" variant="ghost" size="sm" color={soundOn?'yellow.400':'gray.400'} icon={soundOn?<FaVolumeHigh/>:<FaVolumeXmark/>} onClick={()=>setSoundOn(v=>!v)}/><Box textAlign="right"><Text fontSize="9px" color="gray.400"><Icon as={FaTrophy} color="yellow.400"/> 最高記録</Text><Text fontFamily="mono" fontWeight="bold" color="yellow.400">{s.highScore}階</Text></Box></Flex>
          <SimpleGrid columns={3} spacing={1.5} mt={2}>{[[FaBolt,'ボタン',s.turnsLeft,'yellow.400'],[FaStar,'運気',s.luck,'green.400'],[FaCoins,'所持金',`${s.money}円`,'yellow.300']].map(([ic,l,v,c]:any)=><VStack key={l} bg="whiteAlpha.100" p={1.5} rounded="lg" border="1px solid" borderColor="whiteAlpha.200" spacing={0}><Text fontSize="9px" color="gray.400"><Icon as={ic} color={c}/> {l}</Text><Text fontFamily="mono" fontWeight="bold" color={c}>{v}</Text></VStack>)}</SimpleGrid>
          <HStack minH="18px" mt={1.5} spacing={1}>{s.ringBuff.active&&<Badge colorScheme="green">指輪+{s.ringBuff.amount} 残{s.ringBuff.turns}T</Badge>}{s.mirrorMultiplier>1&&<Badge colorScheme="cyan">鏡x{s.mirrorMultiplier}</Badge>}{s.partySet&&<Badge colorScheme="pink">演出2以上確定</Badge>}</HStack>
        </Box>

        <Flex flex="1" minH={0} position="relative" p={3} align="center" justify="center" bg={s.inHell?'linear-gradient(#450a0a,#000)':tier.bg} overflow="hidden">
          <VStack zIndex={10} w="100%" maxW="320px" spacing={2} maxH="100%" overflowY="auto"><Badge colorScheme={room.tier===5?'yellow':'gray'}>{s.inHell?'Tier 6 HELL':tier.name}</Badge><Center w="68px" h="68px" rounded="2xl" bg="gray.800" border="2px solid" borderColor={tier.color} boxShadow="lg"><Icon as={room.kind==='hell'?FaSkull:room.kind==='shop'?FaStore:room.kind==='mining'?FaHammer:room.kind==='auction'?FaGavel:room.kind==='god'?FaSun:FaElevator} boxSize={7} color={tier.color}/></Center><Text fontWeight="bold">{room.title}</Text><Text fontSize="xs" color="gray.300" textAlign="center" px={2}>{room.desc}</Text>{room.result&&<Badge px={3} py={1} colorScheme={resultColor}>{room.result}</Badge>}{interactive&&<Box w="100%" mt={2}>{interactive}</Box>}</VStack>
          <Box position="absolute" top={0} left={0} w="50%" h="100%" bg="gray.900" borderRight="2px solid" borderColor="gray.700" zIndex={20} transform={doors?'translateX(-100%)':'translateX(0)'} transition="transform .6s cubic-bezier(.77,0,.175,1)"/><Box position="absolute" top={0} right={0} w="50%" h="100%" bg="gray.900" borderLeft="2px solid" borderColor="gray.700" zIndex={20} transform={doors?'translateX(100%)':'translateX(0)'} transition="transform .6s cubic-bezier(.77,0,.175,1)"/>
          {overlay.show&&<Center position="absolute" inset={0} bg="blackAlpha.900" zIndex={30} flexDir="column"><Badge colorScheme={overlay.tier===4?'yellow':overlay.tier===3?'purple':overlay.tier===2?'green':'cyan'} mb={2}>{['','ELEVATOR: 通常上昇','🚀 ブースター作動！','⚡ リミッター解除！','✨ OVERDRIVE ✨'][overlay.tier]}</Badge><Text fontFamily="mono" fontSize="6xl" fontWeight="black" color={tierMeta[Math.min(4,overlay.tier-1)].color}>+{overlay.steps}</Text><Text fontSize="11px" color="gray.300" mt={2}>{overlay.detail}</Text></Center>}
        </Flex>

        <Box flexShrink={0} bg="gray.900" borderTop="1px solid" borderColor="gray.800" p={2.5}><Tabs size="sm" variant="unstyled"><TabList><Tab color="gray.200" _selected={{bg:'cyan.900',color:'cyan.200'}} rounded="md" fontSize="xs" fontWeight="bold">アイテム ({s.items.length}/3)</Tab><Tab color="gray.200" _selected={{bg:'cyan.900',color:'cyan.200'}} rounded="md" fontSize="xs" fontWeight="bold">ログ</Tab><Spacer/><Text fontSize="10px" color="gray.500" alignSelf="center">タップで選択・使用</Text></TabList><TabPanels><TabPanel px={0} py={1} h="80px" overflowX="auto"><HStack h="100%" align="center">{s.items.length===0?<Text w="100%" textAlign="center" fontSize="xs" color="gray.500">アイテムを持っていません</Text>:s.items.map((it,i)=><Button key={`${it.id}-${i}`} flexShrink={0} w="136px" h="60px" px={2.5} bg="gray.700" color="white" border="1px solid" borderColor="cyan.700" boxShadow="0 2px 8px rgba(0,0,0,.35)" _hover={{bg:'gray.600',color:'white',borderColor:'cyan.300'}} _active={{bg:'cyan.900',color:'white'}} onClick={()=>{playSfx('item',soundOn);setSelected(i)}}><HStack w="100%" spacing={2}><Center flexShrink={0} w="30px" h="30px" rounded="md" bg="blackAlpha.400"><Icon as={it.icon||FaGift} boxSize={4} color="cyan.200"/></Center><Box flex="1" minW={0} textAlign="left" overflow="hidden"><Text fontSize="10px" fontWeight="900" color="white" noOfLines={2} lineHeight="1.15">{it.name}</Text><Text mt={0.5} fontSize="8px" color="gray.100" fontWeight="700">{it.type==='gem'?`宝石 x${it.count||1}`:it.type==='passive'?'常時':'消費'}</Text></Box></HStack></Button>)}</HStack></TabPanel><TabPanel px={1} py={1} h="80px" overflowY="auto" bg="blackAlpha.400">{s.logs.length===0?<Text fontSize="11px" color="cyan.300">システム: ゲーム開始</Text>:s.logs.map((l,i)=><Text key={i} fontSize="11px" color="gray.400" borderBottom="1px solid" borderColor="whiteAlpha.100">{l}</Text>)}</TabPanel></TabPanels></Tabs></Box>
        <Box flexShrink={0} bg="gray.950" p={3} borderTop="1px solid" borderColor="gray.800"><Button w="100%" h="56px" bgGradient="linear(to-r, cyan.400, blue.500)" color="white" fontSize="md" fontWeight="900" textShadow="0 1px 3px rgba(0,0,0,.95)" border="1px solid" borderColor="cyan.200" boxShadow="0 4px 14px rgba(0,180,255,.28)" _hover={{bgGradient:'linear(to-r, cyan.300, blue.400)',color:'white'}} _active={{bgGradient:'linear(to-r, cyan.600, blue.700)',color:'white',transform:'translateY(1px)'}} _disabled={{opacity:.55,color:'whiteAlpha.800'}} leftIcon={<FaArrowUp/>} isDisabled={disabled} onClick={press}>ボタンを押す</Button></Box>
      </Flex>

      <InfoModal ctl={rules} title="ルール説明" color="green"><Text>【基本ルール】ボタンを押すとランダムな階数分上へ進みます。全10回でどこまで登れるかを競います。</Text><Text>【運気】高いほど移動階数の補正ボーナスが大きくなります。</Text><Text>【ショップ＆宝石】採掘した宝石はショップで売却できます。</Text><Text>【カジノ】スロットで同じ絵柄が3つ揃うと高倍率配当です。</Text></InfoModal>
      <InfoModal ctl={guide} title="ステージガイド" color="cyan">{['Tier 1 (40%): 基本イベント・ショップ・宝箱など','Tier 2 (30%): ブラックジャック・自販機・ルビー採掘など','Tier 3 (20%): スロット・エメラルド採掘・アイテム箱など','Tier 4 (9%): ダイヤ採掘・ワープ・競売・タイムカプセル','Tier 5 (1%): 究極のルーレット・神の故郷'].map(x=><Text key={x}>{x}</Text>)}</InfoModal>
      <InfoModal ctl={itemGuide} title="アイテム図鑑" color="purple">{['乱反射の鏡★n: 次の移動階数がn倍','幸運の指輪★n: 3ターン運気+n','賢者の宝石: 現在階の1の位だけ運気UP','お店チケット: 次の部屋がお店','パーティーセット: 次回好演出','お金のなる木 / 幸せのお守り: 毎ターン効果','宝石: ショップで売却'].map(x=><Text key={x}>{x}</Text>)}</InfoModal>
      <Modal isOpen={rank.isOpen} onClose={rank.onClose} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="340px"><ModalHeader color="yellow.300">全国ランキング (Top 50)</ModalHeader><ModalBody maxH="55vh" overflowY="auto">{rankings.length?rankings.map((r,i)=><Flex key={i} py={1.5} borderBottom="1px solid" borderColor="whiteAlpha.100"><Text w="30px">#{i+1}</Text><Text flex="1">{r.name}</Text><Text color="cyan.300">{r.score}階</Text></Flex>):<Text color="gray.500">まだ登録がありません</Text>}</ModalBody><ModalFooter><Button onClick={rank.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={selected!==null} onClose={()=>setSelected(null)} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="330px"><ModalHeader color="white"><HStack><Center w="36px" h="36px" rounded="lg" bg="gray.700"><Icon as={selectedItem?.icon||FaGift} color="cyan.200"/></Center><Text>{selectedItem?.name}</Text></HStack></ModalHeader><ModalBody><Text fontSize="sm" color="gray.100">{selectedItem?.desc}</Text></ModalBody><ModalFooter gap={2}>{selectedItem?.type==='consumable'&&<Button colorScheme="green" onClick={()=>useItem(selected!)}>使用する</Button>}{selectedItem?.type==='gem'&&<Button colorScheme="yellow" onClick={()=>sellGem(selected!)}>売却 +{(selectedItem.price*(selectedItem.count||1))}円</Button>}<Button colorScheme="red" variant="outline" onClick={()=>discard(selected!)}>捨てる</Button><Button onClick={()=>setSelected(null)}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={gameover} onClose={()=>{}} closeOnOverlayClick={false} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="340px" textAlign="center"><ModalHeader>ゲーム終了</ModalHeader><ModalBody><Text fontSize="xs" color="gray.400">最終到達階数</Text><Text fontSize="4xl" color="cyan.300" fontFamily="mono" fontWeight="black">{s.floor} 階</Text><HStack mt={3}><Input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="プレイヤー名" textAlign="center"/><Button colorScheme="yellow" onClick={submitScore}>登録</Button></HStack><HStack justify="space-between" mt={3} color="gray.400"><Text fontSize="xs">最終所持金: <b>{s.money}円</b></Text><Text fontSize="xs">最終運気: <b>{s.luck}</b></Text></HStack></ModalBody><ModalFooter><Button w="100%" colorScheme="cyan" onClick={()=>{setGameover(false);setMenu(true)}}>メインメニューへ</Button></ModalFooter></ModalContent></Modal>
    </Box>
  </Center>;
}

function Action({title,sub,onClick}:{title:string;sub?:string;onClick:()=>void}){return <Button h="auto" minH="52px" py={2.5} px={3} bg="gray.700" color="white" border="1px solid" borderColor="whiteAlpha.400" boxShadow="0 2px 8px rgba(0,0,0,.35)" _hover={{bg:'gray.600',color:'white',borderColor:'cyan.300'}} _active={{bg:'cyan.800',color:'white',transform:'translateY(1px)'}} _focusVisible={{boxShadow:'0 0 0 3px rgba(34,211,238,.45)'}} onClick={onClick}><VStack spacing={0.5} w="100%"><Text fontSize="sm" lineHeight="1.2" fontWeight="900" color="white" textShadow="0 1px 2px rgba(0,0,0,.9)">{title}</Text>{sub&&<Text fontSize="10px" lineHeight="1.25" color="gray.100" fontWeight="700">{sub}</Text>}</VStack></Button>}
function InfoModal({ctl,title,color,children}:{ctl:ReturnType<typeof useDisclosure>;title:string;color:string;children:React.ReactNode}){return <Modal isOpen={ctl.isOpen} onClose={ctl.onClose} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="340px" border="2px solid" borderColor={`${color}.500`}><ModalHeader color={`${color}.300`}>{title}</ModalHeader><ModalBody><Stack fontSize="xs" color="gray.300" spacing={3}>{children}</Stack></ModalBody><ModalFooter><Button w="100%" onClick={ctl.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>}
