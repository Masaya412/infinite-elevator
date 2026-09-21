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
import { firebaseReady } from '../lib/firebase';
import { ensureAnonymousUser, submitRanking, subscribeTopRankings, type RankingEntry } from '../lib/leaderboard';

const tierMeta = [
  {name:'Tier 1 Common', bg:'radial-gradient(circle at center, rgba(14,165,233,.15), rgba(15,23,42,.95))', color:'cyan.300'},
  {name:'Tier 2 Uncommon', bg:'radial-gradient(circle at center, rgba(16,185,129,.20), rgba(15,23,42,.95))', color:'green.300'},
  {name:'Tier 3 Rare', bg:'radial-gradient(circle at center, rgba(168,85,247,.25), rgba(15,23,42,.95))', color:'purple.300'},
  {name:'Tier 4 Epic', bg:'radial-gradient(circle at center, rgba(239,68,68,.30), rgba(15,23,42,.95))', color:'red.300'},
  {name:'Tier 5 Legend', bg:'radial-gradient(circle at center, rgba(245,158,11,.35), rgba(15,23,42,.95))', color:'yellow.300'},
];


type SfxName = 'click'|'start'|'door'|'move1'|'move2'|'move3'|'move4'|'arrive'|'success'|'fail'|'coin'|'item'|'buy'|'sell'|'mine'|'gem'|'card'|'casino'|'slotStop'|'jackpot'|'warpUp'|'warpDown'|'roulette'|'hell'|'gameover'|'discard'|'upgrade';
type DoorChoice = 'creaky'|'silver'|'gold'|'luck'|'health'|'money';
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

type BgmMood = 'tier1'|'tier2'|'tier3'|'tier4'|'tier5'|'god'|'casino'|'blackjack'|'hell'|'mystic';
let bgmTimer:number|null=null;
let bgmMood:BgmMood|null=null;
let bgmStep=0;
function stopBgm(){
  if(typeof window!=='undefined' && bgmTimer!==null) window.clearInterval(bgmTimer);
  bgmTimer=null; bgmMood=null; bgmStep=0;
}
function startBgm(mood:BgmMood, enabled=true){
  if(!enabled || typeof window==='undefined'){stopBgm();return;}
  try{
    const AC=window.AudioContext || (window as any).webkitAudioContext;
    if(!AC)return;
    if(!audioContext)audioContext=new AC();
    const ctx=audioContext; if(ctx.state==='suspended') void ctx.resume();
    if(bgmMood===mood && bgmTimer!==null)return;
    stopBgm(); bgmMood=mood;

    type MoodCfg={
      chords:number[][]; bass:number[]; melody:number[]; ms:number;
      padType:OscillatorType; leadType:OscillatorType;
      padVol:number; bassVol:number; leadVol:number;
      cutoff:number; detune:number; shimmer?:boolean; tension?:boolean;
    };
    const cfgs:Record<BgmMood,MoodCfg>={
      // 静かなロビー。柔らかいコードと控えめなベル。
      tier1:{
        chords:[[261.63,329.63,392],[220,277.18,329.63],[174.61,220,261.63],[196,246.94,293.66]],
        bass:[65.41,55,43.65,49], melody:[523.25,493.88,440,392,440,493.88,392,329.63], ms:1180,
        padType:'sine',leadType:'triangle',padVol:.018,bassVol:.018,leadVol:.012,cutoff:1350,detune:7
      },
      // 少し推進感。冒険っぽい広がり。
      tier2:{
        chords:[[293.66,349.23,440],[261.63,329.63,392],[220,293.66,349.23],[246.94,293.66,369.99]],
        bass:[73.42,65.41,55,61.74], melody:[587.33,698.46,659.25,523.25,587.33,783.99,698.46,587.33], ms:980,
        padType:'triangle',leadType:'sine',padVol:.020,bassVol:.020,leadVol:.014,cutoff:1700,detune:9
      },
      // 神秘感。浮遊する短三和音と余韻の長い旋律。
      tier3:{
        chords:[[329.63,392,493.88],[293.66,369.99,440],[261.63,329.63,415.3],[293.66,349.23,440]],
        bass:[82.41,73.42,65.41,73.42], melody:[659.25,783.99,987.77,880,783.99,659.25,739.99,587.33], ms:1120,
        padType:'sine',leadType:'sine',padVol:.023,bassVol:.020,leadVol:.014,cutoff:1550,detune:12,shimmer:true
      },
      // 重厚・緊張感。低いドローンと広いコード。
      tier4:{
        chords:[[174.61,207.65,261.63],[196,246.94,293.66],[164.81,207.65,246.94],[146.83,196,233.08]],
        bass:[43.65,49,41.2,36.71], melody:[349.23,392,466.16,523.25,466.16,392,349.23,293.66], ms:920,
        padType:'sawtooth',leadType:'triangle',padVol:.017,bassVol:.026,leadVol:.011,cutoff:780,detune:5,tension:true
      },
      // 荘厳。オルガンのような持続音と鐘。
      tier5:{
        chords:[[261.63,392,523.25],[293.66,440,587.33],[329.63,493.88,659.25],[392,523.25,783.99]],
        bass:[65.41,73.42,82.41,98], melody:[783.99,987.77,1174.66,1046.5,1318.51,1174.66,987.77,1567.98], ms:1320,
        padType:'sine',leadType:'sine',padVol:.027,bassVol:.022,leadVol:.016,cutoff:2100,detune:13,shimmer:true
      },
      // 神の故郷。聖歌・鐘・高音の倍音をイメージ。
      god:{
        chords:[[261.63,329.63,392,523.25],[349.23,440,523.25,698.46],[392,493.88,587.33,783.99],[329.63,415.3,493.88,659.25]],
        bass:[65.41,87.31,98,82.41], melody:[1046.5,1318.51,1567.98,2093,1567.98,1318.51,1174.66,1567.98], ms:1480,
        padType:'sine',leadType:'sine',padVol:.030,bassVol:.018,leadVol:.017,cutoff:2600,detune:15,shimmer:true
      },
      // カジノ。ウォーキングベース風＋柔らかいコード。
      casino:{
        chords:[[329.63,415.3,493.88],[349.23,440,523.25],[293.66,369.99,440],[311.13,392,466.16]],
        bass:[82.41,98,110,123.47,98,82.41,73.42,77.78], melody:[659.25,783.99,739.99,659.25,587.33,698.46,783.99,880], ms:760,
        padType:'triangle',leadType:'sine',padVol:.017,bassVol:.023,leadVol:.012,cutoff:1800,detune:6
      },
      // 地下カードサロン。暗めのラウンジ風。
      blackjack:{
        chords:[[196,233.08,293.66],[174.61,220,261.63],[220,261.63,329.63],[196,246.94,293.66]],
        bass:[49,43.65,55,49], melody:[392,466.16,440,349.23,392,523.25,466.16,392], ms:1280,
        padType:'triangle',leadType:'sine',padVol:.018,bassVol:.020,leadVol:.010,cutoff:1100,detune:8
      },
      // 地獄。旋律ではなく低いドローン中心。
      hell:{
        chords:[[55,82.41,110],[49,73.42,98],[46.25,69.3,92.5],[41.2,61.74,82.41]],
        bass:[27.5,24.5,23.12,20.6], melody:[110,103.83,92.5,98,87.31,82.41,92.5,73.42], ms:1550,
        padType:'sawtooth',leadType:'sine',padVol:.018,bassVol:.030,leadVol:.006,cutoff:420,detune:3,tension:true
      },
      // 占い・祭壇。透明感のあるアンビエント。
      mystic:{
        chords:[[261.63,311.13,392],[293.66,349.23,440],[246.94,293.66,369.99],[277.18,329.63,415.3]],
        bass:[65.41,73.42,61.74,69.3], melody:[783.99,932.33,1046.5,1244.51,1046.5,932.33,830.61,698.46], ms:1380,
        padType:'sine',leadType:'sine',padVol:.022,bassVol:.014,leadVol:.013,cutoff:1900,detune:16,shimmer:true
      }
    };
    const c=cfgs[mood];

    const connectToDestination=(node:AudioNode, cutoff:number, volume:number)=>{
      const filter=ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=cutoff; filter.Q.value=.45;
      const gain=ctx.createGain(); gain.gain.value=volume;
      node.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      return gain;
    };
    const sustainedTone=(freq:number,when:number,dur:number,type:OscillatorType,vol:number,detune=0,cutoff=c.cutoff)=>{
      const o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
      o.type=type; o.frequency.value=freq; o.detune.value=detune;
      f.type='lowpass'; f.frequency.value=cutoff; f.Q.value=.35;
      g.gain.setValueAtTime(.0001,when);
      g.gain.linearRampToValueAtTime(vol,when+.22);
      g.gain.setValueAtTime(vol,Math.max(when+.24,when+dur-.38));
      g.gain.exponentialRampToValueAtTime(.0001,when+dur);
      o.connect(f);f.connect(g);g.connect(ctx.destination);o.start(when);o.stop(when+dur+.05);
    };
    const padChord=(notes:number[],when:number,dur:number)=>{
      notes.forEach((n,i)=>{
        sustainedTone(n,when,dur,c.padType,c.padVol,c.detune*(i-1));
        // デチューンした2本目で厚みを出す
        sustainedTone(n,when+.01,dur,c.padType,c.padVol*.44,-c.detune*(i+1),c.cutoff*.92);
      });
    };
    const bass=(freq:number,when:number,dur:number)=>{
      sustainedTone(freq,when,dur,'sine',c.bassVol,0,Math.min(520,c.cutoff));
      if(mood==='tier4'||mood==='hell') sustainedTone(freq/2,when,dur,'triangle',c.bassVol*.35,0,260);
    };
    const lead=(freq:number,when:number,dur:number)=>{
      const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      o.type=c.leadType;o.frequency.value=freq;f.type='lowpass';f.frequency.value=Math.max(900,c.cutoff*1.15);f.Q.value=.25;
      g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(c.leadVol,when+.06);g.gain.exponentialRampToValueAtTime(.0001,when+dur);
      o.connect(f);f.connect(g);g.connect(ctx.destination);o.start(when);o.stop(when+dur+.05);
    };
    const bell=(freq:number,when:number)=>{
      [1,2.01,3.98].forEach((mul,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq*mul;
        g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime((i===0?.012:.0045),when+.01);g.gain.exponentialRampToValueAtTime(.0001,when+1.6+i*.25);
        o.connect(g);g.connect(ctx.destination);o.start(when);o.stop(when+2);
      });
    };
    const breath=(when:number,dur:number,vol=.0025)=>{
      const len=Math.max(1,Math.floor(ctx.sampleRate*dur));const b=ctx.createBuffer(1,len,ctx.sampleRate);const d=b.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=(Math.random()*2-1);
      const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=b;f.type='lowpass';f.frequency.value=mood==='hell'?180:480;
      g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(vol,when+.25);g.gain.exponentialRampToValueAtTime(.0001,when+dur);
      src.connect(f);f.connect(g);g.connect(ctx.destination);src.start(when);src.stop(when+dur+.05);
    };

    const tick=()=>{
      if(!audioContext||bgmMood!==mood)return;
      const now=audioContext.currentTime+.02;
      const chord=c.chords[bgmStep%c.chords.length];
      const dur=Math.max(.9,(c.ms/1000)*1.55);
      padChord(chord,now,dur);
      bass(c.bass[bgmStep%c.bass.length],now,dur*.9);

      // 旋律は毎回ではなく間を空けて鳴らし、ピコピコ感を抑える
      if(bgmStep%2===0) lead(c.melody[bgmStep%c.melody.length],now+.28,Math.min(.9,dur*.72));
      if(c.shimmer && bgmStep%4===0) bell(c.melody[(bgmStep+2)%c.melody.length],now+.42);
      if(c.tension && bgmStep%3===0) breath(now,dur*.95,mood==='hell'?.0045:.0026);
      if(mood==='casino' && bgmStep%2===1) lead(c.melody[(bgmStep+3)%c.melody.length],now+.46,.34);
      if(mood==='god' && bgmStep%2===0) bell(c.melody[bgmStep%c.melody.length]/2,now+.12);
      bgmStep++;
    };
    tick(); bgmTimer=window.setInterval(tick,c.ms);
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

function itemPalette(item:Item){
  switch(item.id){
    case 'mirror': return {bg:'rgba(8,145,178,.18)',border:'cyan.500',icon:'cyan.200',text:'cyan.100'};
    case 'ring': return {bg:'rgba(5,150,105,.18)',border:'green.500',icon:'green.200',text:'green.100'};
    case 'sage_gem': return {bg:'rgba(126,34,206,.20)',border:'purple.500',icon:'purple.200',text:'purple.100'};
    case 'party_set': return {bg:'rgba(219,39,119,.18)',border:'pink.500',icon:'pink.200',text:'pink.100'};
    case 'money_tree': return {bg:'rgba(101,163,13,.18)',border:'lime.500',icon:'lime.200',text:'lime.100'};
    case 'blessing_charm': return {bg:'rgba(16,185,129,.18)',border:'teal.500',icon:'teal.200',text:'teal.100'};
    case 'shop_ticket': return {bg:'rgba(217,119,6,.18)',border:'orange.500',icon:'orange.200',text:'orange.100'};
    case 'ruby': return {bg:'rgba(220,38,38,.18)',border:'red.500',icon:'red.300',text:'red.100'};
    case 'emerald': return {bg:'rgba(5,150,105,.18)',border:'green.500',icon:'green.300',text:'green.100'};
    case 'diamond': return {bg:'rgba(14,165,233,.18)',border:'blue.400',icon:'blue.200',text:'blue.100'};
    default: return {bg:'rgba(55,65,81,.9)',border:'gray.500',icon:'gray.200',text:'white'};
  }
}


export default function InfiniteElevator(){
  const [s,setS]=useState<State>(baseState);
  const [menu,setMenu]=useState(true); const [moving,setMoving]=useState(false); const [doors,setDoors]=useState(false);
  const [room,setRoom]=useState<Room>({tier:1,title:'エレベーターホール',desc:'ボタンを押して上の階を目指しましょう！'});
  const [overlay,setOverlay]=useState<{show:boolean,tier:number,steps:number,detail:string,locked:boolean}>({show:false,tier:1,steps:0,detail:'',locked:false});
  const [selected,setSelected]=useState<number|null>(null); const [pendingOverflow,setPendingOverflow]=useState<Item|null>(null); const [gameover,setGameover]=useState(false); const [nickname,setNickname]=useState('');
  const [rankings,setRankings]=useState<RankingEntry[]>([]); const [rankingStatus,setRankingStatus]=useState<'connecting'|'online'|'offline'|'error'>(firebaseReady?'connecting':'offline'); const [scoreSubmitted,setScoreSubmitted]=useState(false); const [forcedShop,setForcedShop]=useState(false); const [soundOn,setSoundOn]=useState(true);
  const [rocks,setRocks]=useState<{gem:ItemId|null,count:number,open:boolean}[]>([]); const [picks,setPicks]=useState(0);
  const [shop,setShop]=useState<{item:Item,sold:boolean}[]>([]); const [bj,setBj]=useState<{playing:boolean,bet:number,p:number[],d:number[]}>({playing:false,bet:100,p:[],d:[]});
  const [forgeUsed,setForgeUsed]=useState(false);
  const [fortuneReading,setFortuneReading]=useState(false);
  const [itemBoxOpening,setItemBoxOpening]=useState(false);
  const [ultimateSpinning,setUltimateSpinning]=useState(false);
  const [ultimateMessage,setUltimateMessage]=useState('???');
  const [bjPhase,setBjPhase]=useState('');
  const [hellRolling,setHellRolling]=useState(false);
  const [hellDie,setHellDie]=useState<number|null>(null);
  const [hellMessage,setHellMessage]=useState('「5」が出れば生還。1回振るごとに残り回数を1消費する。');
  const [boxRewards,setBoxRewards]=useState<{type:'money'|'luck'|'turn',value:number}[]>([]);
  const [boxSelected,setBoxSelected]=useState<number|null>(null);
  const [boxRevealAll,setBoxRevealAll]=useState(false);
  const [slotBet,setSlotBet]=useState(20); const [slot,setSlot]=useState(['❔','❔','❔']); const [slotSpinning,setSlotSpinning]=useState(false);
  const [slotWin,setSlotWin]=useState(false); const [slotMessage,setSlotMessage]=useState('');
  const [casinoSpinsLeft,setCasinoSpinsLeft]=useState(10);
  const [rareArrival,setRareArrival]=useState(0);
  const [doorChoices,setDoorChoices]=useState<DoorChoice[]>([]);
  const [gameSpeed,setGameSpeed]=useState<1|2>(1);
  const fastTimeout=(fn:()=>void,ms:number)=>window.setTimeout(fn,ms/gameSpeed);
  const fastInterval=(fn:()=>void,ms:number)=>window.setInterval(fn,ms/gameSpeed);
  const rules=useDisclosure(), guide=useDisclosure(), itemGuide=useDisclosure(), rank=useDisclosure();

  useEffect(()=>{
    const h=Number(localStorage.getItem('infinite_elevator_highscore')||'1');
    const n=localStorage.getItem('infinite_elevator_nickname')||'';
    setS(x=>({...x,highScore:Math.max(1,h)}));
    setNickname(n);
    if(!firebaseReady){
      const r=JSON.parse(localStorage.getItem('infinite_elevator_local_rankings')||'[]');
      setRankings(r);
      setRankingStatus('offline');
      return;
    }
    let unsub=()=>{};
    ensureAnonymousUser()
      .then(()=>{
        setRankingStatus('online');
        unsub=subscribeTopRankings(rows=>{setRankings(rows);setRankingStatus('online');},()=>setRankingStatus('error'));
      })
      .catch(()=>setRankingStatus('error'));
    return ()=>unsub();
  },[]);
  useEffect(()=>{
    if(menu||gameover){stopBgm();return;}
    let mood:BgmMood=`tier${Math.min(5,Math.max(1,room.tier))}` as BgmMood;
    if(s.inHell||room.kind==='hell')mood='hell';
    else if(room.kind==='casino')mood='casino';
    else if(room.kind==='blackjack')mood='blackjack';
    else if(room.kind==='god')mood='god';
    else if(['fortune','altar','ultimate','warp'].includes(room.kind||''))mood='mystic';
    startBgm(mood,soundOn);
    return ()=>{};
  },[room.tier,room.kind,room.title,s.inHell,soundOn,menu,gameover]);
  const log=(m:string)=>setS(x=>({...x,logs:[m,...x.logs]}));
  const patch=(p:Partial<State>)=>setS(x=>({...x,...p}));
  const addItem=(item:Item)=>{
    setS(x=>{
      const items=[...x.items];
      if(item.type==='gem'){
        const i=items.findIndex(v=>v.id===item.id);
        if(i>=0){items[i]={...items[i],count:(items[i].count||1)+(item.count||1)};return {...x,items,logs:[`「${item.name}」を入手！`,...x.logs]};}
      }
      if(items.length<3){items.push(item);return {...x,items,logs:[`アイテム「${item.name}」を入手！`,...x.logs]};}
      setPendingOverflow(item);
      return {...x,logs:[`持ち物がいっぱい！「${item.name}」を入手候補に追加`,...x.logs]};
    });
  };
  const resolveOverflow=(discardIndex:number)=>{
    const incoming=pendingOverflow;if(!incoming)return;
    if(discardIndex===3){playSfx('discard',soundOn);log(`「${incoming.name}」を諦めた`);setPendingOverflow(null);return;}
    setS(x=>{const items=[...x.items];const removed=items[discardIndex];items[discardIndex]=incoming;return {...x,items,logs:[`「${removed.name}」を捨てて「${incoming.name}」を入手`,...x.logs]};});
    playSfx('item',soundOn);setPendingOverflow(null);
  };
  const show=(r:Room)=>{
    setRoom(r);
    setRareArrival(0);
    if(r.tier>=4){
      // 階数確定 → 到着後にレア部屋演出。文字ではなく光と波紋で見せる。
      fastTimeout(()=>{
        setRareArrival(r.tier);
        fastTimeout(()=>setRareArrival(0),r.tier===5?1700:1050);
      },280);
    }
  };

  const start=()=>{playSfx('start',soundOn);setScoreSubmitted(false);setForgeUsed(false);setS({...baseState,highScore:s.highScore});setMenu(false);setGameover(false);setDoors(true);setRoom({tier:1,title:'エレベーターホール',desc:'エレベーターに乗りました。ボタンを押して上の階を目指しましょう！'});};
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
      else if(t==='DOORS'){const all:DoorChoice[]=['creaky','silver','gold','luck','health','money'];setDoorChoices([...all].sort(()=>Math.random()-.5).slice(0,2));show({tier,title:'2つの扉',desc:'6種類の扉の中から、今回は2つだけが現れた。どちらか1つを選ぼう。',result:'2つの扉が出現',kind:'doors'});}
      else if(t==='SHOP_SMALL')setupShop(tier,1);
      else if(t==='TREASURE'){const g=ri(300,900);patch({money:s.money+g});show({tier,title:'小さな宝箱',desc:'古びた宝箱を見つけた。',result:`+${g}円`,resultType:'gold'});}
      else if(t==='FORTUNE'){setFortuneReading(false);show({tier,title:'占い師の小部屋',desc:'ミステリアスな占い師が水晶越しにあなたの運勢を見つめている。',result:'占ってもらおう',kind:'fortune'});}
      else if(t==='BOXES'){
        const rewards=[
          {type:'money' as const,value:ri(300,699)},
          {type:'luck' as const,value:ri(2,4)},
          {type:'turn' as const,value:1}
        ].sort(()=>Math.random()-.5);
        setBoxRewards(rewards);setBoxSelected(null);setBoxRevealAll(false);
        show({tier,title:'3つの怪しい小箱',desc:'直感でどれか1つを選ぼう。選んだ後、残りの箱の中身も公開される。',result:'箱を選択',kind:'boxes'});
      }
      else if(t==='BARTER')show({tier,title:'怪しい物々交換所',desc:'行商人がいる。手持ちのリソースを何度でも交換できる。',result:'交換選択',kind:'barter'});
      else show({tier,title:'運命の分岐路',desc:'道が2つに分かれている。',result:'道を選択',kind:'crossroads'});
    } else if(tier===2){const t=type||pick(['VENDING','SUPER_LUCKY','HEALTH_2','RUBY_MINING','STAIRS_MED','SHOP_MED','BLACKJACK','FORGE','ALTAR','MYSTERY_AUCTION']);
      if(t==='VENDING')show({tier,title:'自動販売機',desc:'購入すると1/2の確率で+1される。',result:'自販機発見',kind:'vending'});
      else if(t==='SUPER_LUCKY'){const g=ri(3,5);patch({luck:s.luck+g});show({tier,title:'超ラッキー部屋',desc:'強い運気のオーラ！',result:`運気 +${g}`,resultType:'success'});}
      else if(t==='HEALTH_2'){const g=ri(2,3);patch({turnsLeft:s.turnsLeft+g});show({tier,title:'無病の湯',desc:'元気が出た！',result:`残り回数 +${g}`,resultType:'success'});}
      else if(t==='RUBY_MINING')setupMining(tier,'ruby');
      else if(t==='STAIRS_MED'){const g=ri(15,30);patch({floor:s.floor+g});show({tier,title:'長い階段',desc:'螺旋階段を登った！',result:`+${g}階上へ`,resultType:'success'});}
      else if(t==='SHOP_MED')setupShop(tier,3); else if(t==='BLACKJACK'){setBj({playing:false,bet:100,p:[],d:[]});setBjPhase('');show({tier,title:'地下カードサロン',desc:'BJでディーラーと勝負(21以内で高い方が勝ち)。',result:'勝負可能',kind:'blackjack'});}
      else if(t==='FORGE'){setForgeUsed(false);show({tier,title:'魔法鍛冶屋',desc:'鏡や指輪の性能を無料で1つだけ強化(+1~3)します！',result:'この部屋では1回だけ強化できます',kind:'forge'});}
      else if(t==='ALTAR')show({tier,title:'運試しの祭壇',desc:'何を捧げるかで加護が変わる。',result:'祭壇に祈る',kind:'altar'});
      else show({tier,title:'ミステリーオークション',desc:'謎の袋が出品中。(1000円)',result:'競り参加',kind:'mystery'});
    } else if(tier===3){const t=type||pick(['CASINO','SUPER_LUCKY_3','HEALTH_3','EMERALD_MINING','STAIRS_LONG','SHOP_LARGE','ITEM_BOX']);
      if(t==='CASINO'){setCasinoSpinsLeft(10);setSlotMessage('');setSlot(['❔','❔','❔']);setSlotWin(false);show({tier,title:'スロットカジノ',desc:'1回の訪問につき最大10スピン。ルビー5倍・エメラルド10倍・ダイヤ30倍。',result:'CASINO OPEN / 残り10回',kind:'casino'});} 
      else if(t==='SUPER_LUCKY_3'){const g=ri(6,8);patch({luck:s.luck+g});show({tier,title:'極ラッキー部屋',desc:'祝福の光！',result:`運気 +${g}`,resultType:'gold'});}
      else if(t==='HEALTH_3'){const g=ri(4,5);patch({turnsLeft:s.turnsLeft+g});show({tier,title:'不老不死の湯',desc:'圧倒的な活力！',result:`残り回数 +${g}`,resultType:'gold'});}
      else if(t==='EMERALD_MINING')setupMining(tier,'emerald');
      else if(t==='STAIRS_LONG'){const g=ri(50,200);patch({floor:s.floor+g});show({tier,title:'果てしなく続く階段',desc:'次元を超える階段！',result:`+${g}階上へ`,resultType:'gold'});}
      else if(t==='SHOP_LARGE')setupShop(tier,5); else {setItemBoxOpening(false);show({tier,title:'不思議なアイテム箱',desc:'豪華な箱が置いてある。中には特別なアイテムが入っていそうだ。',result:'箱を開けてみよう',kind:'itembox'});}
    } else if(tier===4){const t=type||pick(['WARP','AUCTION','DIAMOND_MINING']);
      if(t==='WARP')show({tier,title:'ワープホール',desc:'使うとランダムに移動できる。',result:'ワープホール現る',kind:'warp'});
      else if(t==='AUCTION')show({tier,title:'神々の競売場',desc:'最高峰の品がオークションに出品。',result:'競売開催中',kind:'auction'});
      else if(t==='DIAMOND_MINING')setupMining(tier,'diamond');
    } else {if((type||pick(['ULTIMATE_ROULETTE','GOD']))==='ULTIMATE_ROULETTE'){setUltimateMessage('???');setUltimateSpinning(false);show({tier,title:'究極のルーレット',desc:'神々の気まぐれ。究極ルーレットに挑むか？',result:'運命のルーレット',kind:'ultimate'});} else show({tier,title:'神の故郷',desc:'好きなアイテムを一つ選べます。',result:'神の加護',kind:'god'});}
  };

  const setupMining=(tier:number,gem:ItemId)=>{setRocks(Array.from({length:5},()=>{const ok=Math.random()<.55;return {gem:ok?gem:null,count:ok?(Math.random()<.8?1:2):0,open:false}}));setPicks(2);show({tier,title:gem==='ruby'?'ルビーの採掘場':gem==='emerald'?'エメラルドの採掘場':'ダイヤモンドの採掘場',desc:'5つの岩から2つ壊そう！宝石が出るかも！',result:'岩を選んで壊そう',kind:'mining'});};
  const setupShop=(tier:number,count:number)=>{const pool=[makeItem('mirror',ri(3,5)),makeItem('ring',ri(6,9)),makeItem('shop_ticket'),makeItem('sage_gem'),makeItem('party_set'),makeItem('money_tree',ri(1,2)),makeItem('blessing_charm',ri(1,2))].sort(()=>Math.random()-.5).slice(0,count).map(item=>({item,sold:false}));setShop(pool);show({tier,title:count===1?'小さなお店':count===3?'大きなお店':'ホームセンター',desc:'アイテムの購入が可能。※宝石のみ売却できます。',result:'ショップ営業中',kind:'shop'});};

  const press=()=>{if(moving||gameover||s.turnsLeft<=0||s.inHell)return; playSfx('door',soundOn); setMoving(true);setDoors(false); let x={...s}; x.turnsLeft--; x.items.forEach(i=>{if(i.id==='money_tree')x.money+=200*(i.paramN||1); if(i.id==='blessing_charm')x.luck+=(i.paramN||1);}); if(x.ringBuff.active){x.ringBuff={...x.ringBuff,turns:x.ringBuff.turns-1}; if(x.ringBuff.turns<=0){x.luck-=x.ringBuff.amount;x.ringBuff={active:false,turns:0,amount:0};}}
    let targetTier=1;
    if(x.partySet){const r=Math.random();targetTier=r<.72?2:r<.92?3:4;}
    else {const r=Math.random();targetTier=r<.65?1:r<.90?2:r<.98?3:4;}
    x.partySet=false;
    const base=targetTier===1?ri(1,12):targetTier===2?ri(10,30):targetTier===3?ri(25,50):ri(40,80);
    const luckMult=targetTier===1?ri(2,3):targetTier===2?ri(3,4):targetTier===3?ri(4,5):ri(5,7);
    const rawSteps=base+Math.max(0,x.luck)*luckMult;
    const mirrorMul=x.mirrorMultiplier;
    const finalSteps=rawSteps*mirrorMul;
    x.mirrorMultiplier=1;
    setS(x);
    fastTimeout(()=>{
      setOverlay({show:true,tier:1,steps:ri(1,12),detail:'NORMALから昇格抽選スタート…',locked:false});
      let currentTier=1; let ticks=0;
      const timer=fastInterval(()=>{ticks++;playSfx(currentTier>=3?'slotStop':'click',soundOn);setOverlay(o=>({...o,steps:ri(1,Math.max(12,Math.min(99,rawSteps))),detail:currentTier===1?'昇格するか…？':currentTier===2?'🚀 さらに上へ昇格抽選…！':currentTier===3?'⚡ OVERDRIVE昇格を抽選中…！':'🔥 神速モード確定へ…！'}));},85);
      const promote=(tier:number,msg:string)=>{currentTier=tier;playSfx((`move${Math.min(4,tier)}` as SfxName),soundOn);setOverlay(o=>({...o,tier,detail:msg}));};
      if(targetTier>=2)fastTimeout(()=>promote(2,'昇格！ 🚀 BOOSTER'),420);
      if(targetTier>=3)fastTimeout(()=>promote(3,'さらに昇格！ ⚡ LIMIT BREAK'),760);
      if(targetTier>=4)fastTimeout(()=>{promote(4,'最上位昇格！ ✨ OVERDRIVE / 激熱 ✨');playSfx('jackpot',soundOn);},1080);
      fastTimeout(()=>{
        window.clearInterval(timer);
        setOverlay({show:true,tier:targetTier,steps:rawSteps,detail:`素の上昇値：基礎${base} + 運気(${x.luck})×${luckMult}`,locked:true});
        const finish=()=>{setOverlay({show:true,tier:targetTier,steps:finalSteps,detail:mirrorMul>1?`✨ 倍率適用完了！ ${rawSteps} × ${mirrorMul} = ${finalSteps}階 ✨`:`上昇階数 +${finalSteps} 確定！`,locked:true});playSfx(targetTier>=3?'jackpot':'arrive',soundOn);fastTimeout(()=>{setOverlay(o=>({...o,show:false}));setS(y=>({...y,floor:y.floor+finalSteps,logs:[`【ボタン】演出${targetTier}! +${finalSteps}階登った！`,...y.logs]}));fastTimeout(()=>{playSfx('arrive',soundOn);triggerRoom();setDoors(true);setMoving(false);},180);},900);};
        if(mirrorMul>1){fastTimeout(()=>{playSfx('item',soundOn);setOverlay({show:true,tier:targetTier,steps:rawSteps,detail:`🪞 乱反射の鏡★${mirrorMul} 発動！ ${rawSteps}階を ×${mirrorMul} へ！`,locked:true});fastTimeout(finish,900);},650);}else{fastTimeout(finish,650);}
      },1380);
    },420);
  };

  const useItem=(i:number)=>{playSfx('item',soundOn);const item=s.items[i]; if(!item||item.type!=='consumable')return; const ns={...s,items:[...s.items]}; if(item.id==='mirror')ns.mirrorMultiplier=item.paramN||1; else if(item.id==='ring'){if(ns.ringBuff.active)return;ns.ringBuff={active:true,turns:3,amount:item.paramN||1};ns.luck+=item.paramN||1;} else if(item.id==='sage_gem')ns.luck+=ns.floor%10; else if(item.id==='party_set')ns.partySet=true; else if(item.id==='shop_ticket')setForcedShop(true); ns.items.splice(i,1);setS(ns);setSelected(null);};
  const sellGem=(i:number)=>{const item=s.items[i];if(item?.type!=='gem'||room.kind!=='shop'){playSfx('fail',soundOn);return;}playSfx('sell',soundOn);const total=item.price*(item.count||1);setS(x=>({...x,money:x.money+total,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};
  const discard=(i:number)=>{playSfx('discard',soundOn);setS(x=>({...x,items:x.items.filter((_,j)=>j!==i)}));setSelected(null);};

  const submitScore=async()=>{
    if(scoreSubmitted)return;
    const name=nickname.trim()||'名無しの登山者';
    localStorage.setItem('infinite_elevator_nickname',name);
    if(firebaseReady){
      try{
        await submitRanking({name,score:s.floor,floor:s.floor,money:s.money,luck:s.luck});
        setScoreSubmitted(true);
        playSfx('success',soundOn);
        return;
      }catch{
        setRankingStatus('error');
        playSfx('fail',soundOn);
        return;
      }
    }
    const local=JSON.parse(localStorage.getItem('infinite_elevator_local_rankings')||'[]');
    const all=[...local,{name,score:s.floor,floor:s.floor,money:s.money,luck:s.luck}].sort((a:any,b:any)=>b.score-a.score).slice(0,50);
    setRankings(all);
    localStorage.setItem('infinite_elevator_local_rankings',JSON.stringify(all));
    setScoreSubmitted(true);
    playSfx('success',soundOn);
  };
  const card=()=>Math.min(10,ri(1,10)); const hand=(a:number[])=>a.reduce((p,c)=>p+c,0);
  const warp=(d:number)=>{playSfx(d>=0?'warpUp':'warpDown',soundOn);patch({floor:Math.max(1,s.floor+d)});show({...room,kind:undefined,result:`${d>=0?'+':''}${d}階 ワープ！`,resultType:d>=0?'gold':'danger'});};
  const buyAuction=(item:Item)=>{if(s.money<500){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-500});addItem(item);show({...room,kind:undefined,result:`${item.name} 落札！`,resultType:'gold'});};

  const interactive=useMemo(()=>{
    const kind=room.kind;
    if(kind==='doors'){
      const defs:Record<DoorChoice,{title:string;sub:string;go:()=>void}>={
        creaky:{title:'軋んだ扉',sub:'Tier 1 確定',go:()=>executeRoom(1)},
        silver:{title:'銀の扉',sub:'Tier 3 以上確定',go:()=>{const r=Math.random();executeRoom(r<.667?3:r<.967?4:5);}},
        gold:{title:'金の扉',sub:'Tier 4 以上確定',go:()=>executeRoom(Math.random()<.9?4:5)},
        luck:{title:'運気の扉',sub:'ラッキー系の部屋へ',go:()=>{const r=ri(1,3);executeRoom(r,r===1?'LUCKY':r===2?'SUPER_LUCKY':'SUPER_LUCKY_3');}},
        health:{title:'健康の扉',sub:'健康系の湯へ',go:()=>{const r=ri(1,3);executeRoom(r,r===1?'HEALTH':r===2?'HEALTH_2':'HEALTH_3');}},
        money:{title:'お金の扉',sub:'宝石採掘場へ',go:()=>{const r=ri(2,4);executeRoom(r,r===2?'RUBY_MINING':r===3?'EMERALD_MINING':'DIAMOND_MINING');}}
      };
      return <SimpleGrid columns={2} spacing={2}>{doorChoices.map(id=><Action key={id} title={defs[id].title} sub={defs[id].sub} onClick={defs[id].go}/>)}</SimpleGrid>;
    }
    if(kind==='boxes'){
      const names=['赤','青','緑'];
      const rewardText=(r:{type:'money'|'luck'|'turn',value:number})=>r.type==='money'?`${r.value}円`:r.type==='luck'?`運気 +${r.value}`:`回数 +${r.value}`;
      const rewardIcon=(r:{type:'money'|'luck'|'turn',value:number})=>r.type==='money'?'💰':r.type==='luck'?'🍀':'⚡';
      return <Stack spacing={2}>
        <SimpleGrid columns={3} spacing={1.5}>{names.map((v,i)=>{
          const reward=boxRewards[i]; const selectedNow=boxSelected===i; const visible=boxSelected===null||selectedNow||boxRevealAll;
          return <Button key={v} minH="76px" h="auto" py={2} px={1.5} bg={selectedNow?(i===0?'red.700':i===1?'blue.700':'green.700'):boxSelected===null?(i===0?'red.800':i===1?'blue.800':'green.800'):visible?'gray.700':'gray.800'} color="white" border="2px solid" borderColor={selectedNow?(i===0?'red.300':i===1?'blue.300':'green.300'):boxRevealAll?'whiteAlpha.400':(i===0?'red.400':i===1?'blue.400':'green.400')} isDisabled={boxSelected!==null} opacity={boxSelected!==null&&!visible ? .55 : 1} onClick={()=>{
            if(boxSelected!==null||!reward)return;
            playSfx(reward.type==='money'?'coin':'success',soundOn);
            setBoxSelected(i);
            if(reward.type==='money')patch({money:s.money+reward.value}); else if(reward.type==='luck')patch({luck:s.luck+reward.value}); else patch({turnsLeft:s.turnsLeft+reward.value});
            const msg=`${v}の箱：${rewardText(reward)}！`;
            show({...room,result:msg,resultType:reward.type==='money'?'gold':'success'});
            fastTimeout(()=>{setBoxRevealAll(true);playSfx('item',soundOn);},900);
          }}>
            <VStack spacing={1}><Text fontWeight="900" fontSize="xs">{v}の箱</Text>{boxSelected===null?<><Text fontSize="xl">📦</Text><Text fontSize="9px" color="gray.300">選ぶ</Text></>:visible&&reward?<><Text fontSize="xl">{rewardIcon(reward)}</Text><Text fontSize="10px" fontWeight="900" color={selectedNow?'cyan.100':'white'}>{rewardText(reward)}</Text>{selectedNow&&<Badge colorScheme="cyan" fontSize="8px">選択</Badge>}</>:<><Text fontSize="xl">📦</Text><Text fontSize="9px" color="gray.400">？？？</Text></>}</VStack>
          </Button>})}</SimpleGrid>
        {boxSelected!==null&&!boxRevealAll&&<Text textAlign="center" fontSize="10px" color="gray.300">残りの箱を開封しています…</Text>}
        {boxRevealAll&&<Text textAlign="center" fontSize="10px" color="cyan.200" fontWeight="bold">すべての箱の中身を公開しました</Text>}
      </Stack>;
    }
    if(kind==='crossroads')return <SimpleGrid columns={2} spacing={2}><Action title="平坦路" sub="確実に+300円" onClick={()=>{playSfx('coin',soundOn);patch({money:s.money+300});show({...room,kind:undefined,result:'+300円',resultType:'success'})}}/><Action title="茨の道" sub="1500円 or -500円" onClick={()=>{const win=Math.random()<.5;playSfx(win?'success':'fail',soundOn);patch({money:Math.max(0,s.money+(win?1500:-500))});show({...room,kind:undefined,result:win?'+1500円':'-500円',resultType:win?'gold':'danger'})}}/></SimpleGrid>;
    if(kind==='barter')return <Stack spacing={1.5}><Action title="運気2 ⇆ 300円" onClick={()=>{if(s.luck>=2){playSfx('coin',soundOn);patch({luck:s.luck-2,money:s.money+300});}else playSfx('fail',soundOn);}}/><Action title="600円 ⇆ 回数+1" onClick={()=>{if(s.money>=600){playSfx('success',soundOn);patch({money:s.money-600,turnsLeft:s.turnsLeft+1});}else playSfx('fail',soundOn);}}/></Stack>;
    if(kind==='vending')return <SimpleGrid columns={2} spacing={2}><Action title="運気ドリンク" sub="200円 (50%で+1)" onClick={()=>{if(s.money<200){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-200,luck:s.luck+(Math.random()<.5?1:0)})}}/><Action title="回数ドリンク" sub="400円 (50%で+1)" onClick={()=>{if(s.money<400){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-400,turnsLeft:s.turnsLeft+(Math.random()<.5?1:0)})}}/></SimpleGrid>;
    if(kind==='fortune')return <Stack spacing={2}><Center><Icon as={FaWandMagicSparkles} boxSize={10} color={fortuneReading?'purple.100':'purple.300'} animation={fortuneReading?'slotJackpot .35s ease-in-out infinite alternate':undefined}/></Center><Button w="100%" colorScheme="purple" isDisabled={fortuneReading} isLoading={fortuneReading} loadingText="運勢を占っています…" onClick={()=>{if(fortuneReading)return;setFortuneReading(true);playSfx('roulette',soundOn);show({...room,result:'水晶に星の光が集まっている…',resultType:'neutral'});fastTimeout(()=>{const table=[{name:'大吉',delta:5,text:'最高の運勢！大きな追い風が吹いている。'},{name:'吉',delta:3,text:'良い流れ。積極的な一歩が幸運を呼ぶ。'},{name:'小吉',delta:1,text:'小さな幸運が積み重なりそう。'},{name:'末吉',delta:0,text:'今は静かな運勢。焦らず進もう。'},{name:'凶',delta:-2,text:'少し注意が必要。慎重に進もう。'},{name:'大凶',delta:-4,text:'波乱の気配。無理は禁物。'}];const result=pick(table);setS(x=>({...x,luck:Math.max(0,x.luck+result.delta)}));setFortuneReading(false);playSfx(result.delta>0?'success':result.delta<0?'fail':'click',soundOn);show({...room,kind:undefined,desc:'占い師が水晶から目を離し、静かに運勢を告げた。',result:`運勢：${result.name} ／ ${result.text} ／ 運気 ${result.delta>0?'+':''}${result.delta}`,resultType:result.delta>0?'success':result.delta<0?'danger':'neutral'});},1400);}}>占ってもらう</Button>{fortuneReading&&<Text fontSize="10px" color="purple.200" textAlign="center">星の巡りを読み取っています…</Text>}</Stack>;
    if(kind==='altar')return <Stack spacing={1.5}><Text fontSize="10px" color="yellow.100" textAlign="center">祈れるのは1回だけ。成功率30%。選んだ加護が少し上昇します。</Text><SimpleGrid columns={2} spacing={2}><Action title="🍀 運気" sub="成功：運気 +1〜3" onClick={()=>{const ok=Math.random()<.30;const g=ri(1,3);playSfx(ok?'success':'fail',soundOn);if(ok)setS(x=>({...x,luck:x.luck+g}));show({...room,kind:undefined,result:ok?`祈りが届いた！ 運気 +${g}`:'祈りは届かなかった…',resultType:ok?'success':'neutral'});}}/><Action title="🏢 階数" sub="成功：+5〜15階" onClick={()=>{const ok=Math.random()<.30;const g=ri(5,15);playSfx(ok?'success':'fail',soundOn);if(ok)setS(x=>({...x,floor:x.floor+g}));show({...room,kind:undefined,result:ok?`祈りが届いた！ +${g}階`:'祈りは届かなかった…',resultType:ok?'gold':'neutral'});}}/><Action title="💰 金運" sub="成功：+200〜600円" onClick={()=>{const ok=Math.random()<.30;const g=ri(200,600);playSfx(ok?'coin':'fail',soundOn);if(ok)setS(x=>({...x,money:x.money+g}));show({...room,kind:undefined,result:ok?`金運の加護！ +${g}円`:'祈りは届かなかった…',resultType:ok?'gold':'neutral'});}}/><Action title="❤️ 健康運" sub="成功：回数 +1" onClick={()=>{const ok=Math.random()<.30;playSfx(ok?'success':'fail',soundOn);if(ok)setS(x=>({...x,turnsLeft:x.turnsLeft+1}));show({...room,kind:undefined,result:ok?'健康運の加護！ 回数 +1':'祈りは届かなかった…',resultType:ok?'success':'neutral'});}}/></SimpleGrid></Stack>;
    if(kind==='mining')return <><SimpleGrid columns={5} spacing={1}>{rocks.map((r,i)=>{const reveal=r.open||picks<=0;return <Button key={i} h="62px" p={1} bg={r.open?'gray.800':picks<=0?'blackAlpha.500':'gray.700'} border="1px solid" borderColor={r.open?'cyan.600':picks<=0?'whiteAlpha.300':'gray.600'} isDisabled={r.open||picks<=0} opacity={!r.open && picks<=0 ? .65 : 1} onClick={()=>{playSfx('mine',soundOn);const n=[...rocks];n[i]={...n[i],open:true};setRocks(n);setPicks(p=>p-1);}}>{reveal?(r.gem?<VStack spacing={0}><Icon as={FaGem} color={r.gem==='ruby'?'red.300':r.gem==='emerald'?'green.300':'cyan.200'}/><Text fontSize="10px">x{r.count}</Text><Text fontSize="8px" color={r.open?'cyan.200':'gray.400'}>{r.open?'採掘':'未選択'}</Text></VStack>:<VStack spacing={0}><Text fontSize="10px" color="gray.400">空</Text><Text fontSize="8px" color={r.open?'cyan.200':'gray.500'}>{r.open?'採掘':'未選択'}</Text></VStack>):<Icon as={FaHammer}/>}</Button>})}</SimpleGrid>{picks<=0&&<><Text mt={2} fontSize="9px" color="gray.300" textAlign="center">未選択の岩も公開しました。薄く表示されているものが選ばなかった岩です。</Text><Button mt={2} w="100%" colorScheme="green" size="sm" onClick={()=>{const got=rocks.filter(r=>r.open&&r.gem);if(got.length===0){playSfx('fail',soundOn);show({...room,kind:undefined,result:'何も貰えなかった...',resultType:'neutral'});return;}playSfx('gem',soundOn);got.forEach(r=>addItem(makeItem(r.gem!,r.count)));const total=got.reduce((a,r)=>a+r.count,0);show({...room,kind:undefined,result:`宝石を${total}個拾った！`,resultType:'gold'});}}>宝石を拾って進む</Button></>}</>;
    if(kind==='shop')return <Stack spacing={1.5} maxH="145px" overflowY="auto">{shop.map((g,i)=><Flex key={i} p={2} bg="gray.800" rounded="lg" align="center" opacity={g.sold ? .5 : 1}><Icon as={g.item.icon||FaGift} mr={2}/><Box flex="1"><Text fontSize="11px" fontWeight="bold">{g.item.name}</Text><Text fontSize="9px" color="gray.400">{g.item.price}円</Text></Box><Button size="xs" colorScheme="yellow" isDisabled={g.sold} onClick={()=>{if(s.money<g.item.price){playSfx('fail',soundOn);return;}playSfx('buy',soundOn);patch({money:s.money-g.item.price});addItem(g.item);setShop(x=>x.map((v,j)=>j===i?{...v,sold:true}:v));}}>{g.sold?'SOLD OUT':'購入'}</Button></Flex>)}</Stack>;
    if(kind==='blackjack')return <Stack spacing={2} bg="blackAlpha.500" p={2.5} rounded="xl" border="1px solid" borderColor="teal.700"><HStack justify="space-between"><Text fontSize="xs">賭け金</Text><HStack><Button size="xs" isDisabled={bj.playing} onClick={()=>setBj(x=>({...x,bet:Math.max(100,x.bet-100)}))}>-</Button><Text color="yellow.300">{bj.bet}円</Text><Button size="xs" isDisabled={bj.playing} onClick={()=>setBj(x=>({...x,bet:x.bet+100}))}>+</Button></HStack></HStack>{bjPhase&&<Box bg="teal.950" border="1px solid" borderColor="teal.700" rounded="md" px={2} py={1.5}><Text fontSize="10px" color="teal.100" textAlign="center" fontWeight="700">{bjPhase}</Text></Box>}{!bj.playing?<Button size="sm" colorScheme="teal" onClick={()=>{if(s.money<bj.bet){playSfx('fail',soundOn);return;}setS(x=>({...x,money:x.money-bj.bet}));setBj(x=>({...x,playing:true,p:[],d:[]}));setBjPhase('カードをシャッフルしています…');playSfx('card',soundOn);fastTimeout(()=>{const p1=card(),d1=card();setBj(x=>({...x,playing:true,p:[p1],d:[d1]}));setBjPhase(`最初のカード：あなた ${p1} / Dealer ${d1}`);playSfx('card',soundOn);fastTimeout(()=>{const p2=card(),d2=card();setBj(x=>({...x,p:[p1,p2],d:[d1,d2]}));setBjPhase('初期配布完了。HITかSTANDを選んでください');playSfx('card',soundOn);},650);},600);}}>勝負開始！(勝利時2倍)</Button>:<><Flex gap={2}><Box flex="1" bg="green.950" rounded="lg" p={2}><Text fontSize="9px" color="green.300">YOU</Text><Text fontSize="sm" fontWeight="900">{bj.p.join(' / ')||'…'}</Text><Text fontSize="xs" color="green.200">合計 {hand(bj.p)}</Text></Box><Box flex="1" bg="red.950" rounded="lg" p={2}><Text fontSize="9px" color="red.300">DEALER</Text><Text fontSize="sm" fontWeight="900">{bj.d.join(' / ')||'…'}</Text><Text fontSize="xs" color="red.200">合計 {hand(bj.d)}</Text></Box></Flex><HStack><Button size="sm" flex="1" onClick={()=>{setBjPhase('カードを1枚引きます…');fastTimeout(()=>{playSfx('card',soundOn);const drawn=card();const p=[...bj.p,drawn];const total=hand(p);setBj(x=>({...x,p}));setBjPhase(`${drawn}を引いた → 合計${total}`);if(total>21){fastTimeout(()=>{playSfx('fail',soundOn);setBj(x=>({...x,playing:false}));show({...room,kind:undefined,result:`${drawn}を引いて合計${total} → BUST（21超過）`,resultType:'danger'});},650);}},500);}}>HIT</Button><Button size="sm" flex="1" colorScheme="green" onClick={()=>{setBjPhase('Dealerのターン…');let d=[...bj.d];const reveal=()=>{if(hand(d)<17){fastTimeout(()=>{const c=card();d=[...d,c];setBj(x=>({...x,d}));setBjPhase(`Dealerが ${c} を引いた → 合計${hand(d)}`);playSfx('card',soundOn);reveal();},650);}else{fastTimeout(()=>{const pv=hand(bj.p),dv=hand(d);const win=dv>21||pv>dv;const draw=pv===dv;playSfx(win?'success':draw?'click':'fail',soundOn);if(win)setS(x=>({...x,money:x.money+bj.bet*2}));else if(draw)setS(x=>({...x,money:x.money+bj.bet}));setBj(x=>({...x,d,playing:false}));setBjPhase(dv>21?`Dealer BUST：合計${dv}`:`最終結果 YOU ${pv} / DEALER ${dv}`);show({...room,kind:undefined,result:win?'勝利！':draw?'引き分け':'敗北...',resultType:win?'gold':draw?'neutral':'danger'});},750);}};reveal();}}>STAND</Button></HStack></>}</Stack>;
    if(kind==='casino')return <Stack spacing={2}>
      <Flex align="center" justify="space-between" bg="whiteAlpha.100" border="1px solid" borderColor="purple.500" rounded="lg" px={3} py={2}>
        <Text fontSize="11px" color="gray.200" fontWeight="700">この訪問で回せる回数</Text>
        <Text fontSize="sm" color={casinoSpinsLeft>0?'yellow.300':'red.300'} fontWeight="900">残り {casinoSpinsLeft} / 10 回</Text>
      </Flex>
      <HStack justify="center"><Button size="xs" isDisabled={slotSpinning||casinoSpinsLeft<=0} onClick={()=>setSlotBet(Math.max(20,slotBet-20))}>-</Button><Text color="yellow.300" fontWeight="900">{slotBet}円</Text><Button size="xs" isDisabled={slotSpinning||casinoSpinsLeft<=0} onClick={()=>setSlotBet(slotBet+20)}>+</Button></HStack>
      <HStack justify="center" spacing={2}>{slot.map((v,i)=><Center key={i} bg={slotWin?'yellow.900':'black'} border="2px solid" borderColor={slotWin?'yellow.300':slotSpinning?'purple.400':'whiteAlpha.200'} boxShadow={slotWin?'0 0 18px rgba(250,204,21,.85)':'inset 0 0 12px rgba(0,0,0,.7)'} animation={slotWin?'slotJackpot .42s ease-in-out infinite alternate':slotMessage.includes('リーチ')?'reachPulse .3s ease-in-out infinite alternate':undefined} rounded="lg" w="62px" h="62px" fontSize="2xl">{v}</Center>)}</HStack>
      {slotMessage&&<Box px={3} py={2} rounded="lg" bg={slotWin?'yellow.900':slotMessage.includes('リーチ')?'red.900':'whiteAlpha.100'} border="1px solid" borderColor={slotWin?'yellow.300':slotMessage.includes('リーチ')?'orange.300':'whiteAlpha.200'} animation={slotWin?'winText .5s ease-in-out infinite alternate':undefined}><Text textAlign="center" fontSize={slotWin?'sm':'xs'} fontWeight="900" color={slotWin?'yellow.200':slotMessage.includes('リーチ')?'orange.100':'gray.100'}>{slotMessage}</Text></Box>}
      <Button colorScheme="purple" size="sm" isLoading={slotSpinning} loadingText="リール回転中…" onClick={()=>{
        if(casinoSpinsLeft<=0){playSfx('fail',soundOn);setSlotMessage('このカジノでは10回遊び終えました');show({...room,result:'この訪問での上限10回に到達',resultType:'neutral'});return;}
        if(s.money<slotBet||slotSpinning){playSfx('fail',soundOn);return;}
        setCasinoSpinsLeft(v=>Math.max(0,v-1));
        const sy=['🔴','🟢','💎','🎡']; const final=[pick(sy),pick(sy),pick(sy)];
        playSfx('casino',soundOn); setS(x=>({...x,money:x.money-slotBet})); setSlotSpinning(true); setSlotWin(false); setSlotMessage('3つのリールが回転中…'); setSlot(['🎰','🎰','🎰']);
        const timers=final.map((_,i)=>fastInterval(()=>setSlot(cur=>cur.map((v,j)=>j===i?pick(sy):v)),95));
        const isReach=final[0]===final[1];
        const stops=[760,1480,isReach?2780:2280];
        stops.forEach((ms,i)=>fastTimeout(()=>{window.clearInterval(timers[i]);setSlot(cur=>cur.map((v,j)=>j===i?final[i]:v));playSfx('slotStop',soundOn);if(i===0)setSlotMessage('1リール停止… 次は中央！');else if(i===1&&isReach){playSfx('jackpot',soundOn);setSlotMessage(`🔥 リーチ！ ${final[0]} ${final[1]} … 最終リールに注目！ 🔥`);}else if(i===1)setSlotMessage('2リール停止… 最終リールへ！');else setSlotMessage('3リール停止！ 判定中…');},ms));
        fastTimeout(()=>{
          let mult=0; let label='';
          if(final.every(v=>v==='🔴')){mult=5;label='ルビー';}
          if(final.every(v=>v==='🟢')){mult=10;label='エメラルド';}
          if(final.every(v=>v==='💎')){mult=30;label='ダイヤモンド';}
          if(final.every(v=>v==='🎡')){mult=ri(10,50);label='ルーレット';}
          if(mult){playSfx('jackpot',soundOn);setSlotWin(true);setSlotMessage(`✨ ${label}が3つ揃った！ ${mult}倍！ ✨`);setS(x=>({...x,money:x.money+slotBet*mult}));show({...room,result:`${label}揃い！ ${mult}倍 / +${slotBet*mult}円`,resultType:'gold'});fastTimeout(()=>setSlotWin(false),2200);}
          else{playSfx('fail',soundOn);setSlotMessage('残念…今回は3つ揃わなかった');show({...room,result:'ハズレ… 次の勝負へ！',resultType:'neutral'});}
          setSlotSpinning(false);
        },isReach?3040:2540);
      }} isDisabled={casinoSpinsLeft<=0}>スロットを回す</Button>
      <Box bg="blackAlpha.500" border="1px solid" borderColor="purple.500" rounded="xl" p={2.5}>
        <Text fontSize="11px" fontWeight="900" color="purple.200" mb={1.5} textAlign="center">🎰 配当表</Text>
        <Stack spacing={1}>
          {[['🔴 🔴 🔴','ルビー揃い','5倍','red.300'],['🟢 🟢 🟢','エメラルド揃い','10倍','green.300'],['💎 💎 💎','ダイヤモンド揃い','30倍','cyan.200'],['🎡 🎡 🎡','ルーレット揃い','10〜50倍','yellow.200']].map(([icons,name,payout,color])=><Flex key={name as string} px={2} py={1} bg="whiteAlpha.100" rounded="md" align="center"><Text fontSize="11px" minW="82px">{icons}</Text><Text fontSize="9px" color="gray.200" flex="1">{name}</Text><Text fontSize="10px" fontWeight="900" color={color}>{payout}</Text></Flex>)}
        </Stack>
      </Box>
    </Stack>;
    if(kind==='itembox')return <Stack spacing={2}><Center><Icon as={FaBoxOpen} boxSize={10} color={itemBoxOpening?'yellow.200':'purple.300'} animation={itemBoxOpening?'slotJackpot .35s ease-in-out infinite alternate':undefined}/></Center><Button w="100%" colorScheme="purple" isLoading={itemBoxOpening} loadingText="箱を開封中…" isDisabled={itemBoxOpening} onClick={()=>{if(itemBoxOpening)return;setItemBoxOpening(true);playSfx('roulette',soundOn);show({...room,result:'箱の鍵が外れた… 中身を確認中…',resultType:'neutral'});fastTimeout(()=>{const item=pick([makeItem('mirror',3),makeItem('ring',6),makeItem('sage_gem'),makeItem('party_set'),makeItem('shop_ticket')]);addItem(item);playSfx('item',soundOn);setItemBoxOpening(false);show({...room,kind:undefined,desc:'箱の中から光るアイテムが現れた！',result:`${item.name} を獲得！`,resultType:'gold'});},1200);}}>箱を開ける</Button></Stack>;
    if(kind==='forge'){
      const cap=(it:Item)=>it.id==='mirror'?8:it.id==='ring'?15:(it.id==='money_tree'||it.id==='blessing_charm')?3:null;
      const upgradable=s.items.filter(i=>{const c=cap(i);return c!==null && (i.paramN||1)<c;});
      if(forgeUsed)return <Box p={3} bg="whiteAlpha.100" rounded="lg" border="1px solid" borderColor="green.500"><Text fontSize="sm" fontWeight="900" color="green.200" textAlign="center">この鍛冶屋での強化は完了しました</Text></Box>;
      if(upgradable.length===0)return <Text fontSize="sm" color="gray.200" textAlign="center">強化できるアイテムがありません（上限到達）</Text>;
      return <Stack spacing={1}>{upgradable.map((it,i)=>{const c=cap(it)!;return <Action key={i} title={`${it.name} を無料で強化`} sub={`上限 ★${c} / この部屋では1回だけ`} onClick={()=>{const before=it.paramN||1;const boost=ri(1,3);const after=Math.min(c,before+boost);playSfx('upgrade',soundOn);setS(x=>({...x,items:x.items.map(v=>v===it?makeItem(v.id,after):v)}));setForgeUsed(true);show({...room,result:`${it.name} → ★${after} に強化！${after===c?'（上限）':''}`,resultType:'success'});}}/>})}</Stack>;
    }
    if(kind==='mystery')return <Center w="100%" textAlign="center"><VStack w="100%" maxW="280px" spacing={2}><Text fontSize="xs" color="yellow.200">中身は5種類のうちどれか1つ</Text><Button mx="auto" display="block" w="220px" colorScheme="yellow" color="black" fontWeight="900" onClick={()=>{if(s.money<1000){playSfx('fail',soundOn);show({...room,result:'所持金が足りない…',resultType:'danger'});return;}playSfx('buy',soundOn);setS(x=>({...x,money:x.money-1000}));const reward=pick<Item>([makeItem('ruby',3),makeItem('emerald',3),makeItem('diamond',3),makeItem('mirror',ri(5,8)),makeItem('ring',ri(5,15))]);addItem(reward);playSfx(reward.type==='gem'?'gem':'item',soundOn);show({...room,kind:undefined,result:`落札商品：${reward.name}${reward.type==='gem'?' ×3':''} を獲得！`,resultType:'gold'});}}>商品を買う（1000円）</Button></VStack></Center>;
    if(kind==='warp')return <Stack spacing={1}><Action title="小さなワープホール" sub="0 ～ +50階" onClick={()=>warp(ri(0,50))}/><Action title="大きなワープホール" sub="-30 ～ +150階" onClick={()=>warp(ri(-30,150))}/><Action title="巨大なワープホール" sub="-100 ～ +300階" onClick={()=>warp(ri(-100,300))}/></Stack>;
    if(kind==='auction')return <Stack spacing={1}><Action title="乱反射の鏡★8 / 500円" onClick={()=>buyAuction(makeItem('mirror',8))}/><Action title="幸運の指輪★15 / 500円" onClick={()=>buyAuction(makeItem('ring',15))}/></Stack>;
    if(kind==='ultimate')return <Stack spacing={2}><Center><Box w="100%" py={4} px={3} bg="blackAlpha.600" border="2px solid" borderColor="yellow.400" rounded="2xl" textAlign="center" boxShadow={ultimateSpinning?'0 0 26px rgba(250,204,21,.7)':undefined} animation={ultimateSpinning?'slotJackpot .28s ease-in-out infinite alternate':undefined}><Text fontSize="lg" fontWeight="black" color="yellow.200">{ultimateMessage}</Text></Box></Center><Button w="100%" colorScheme="yellow" color="black" isDisabled={ultimateSpinning} isLoading={ultimateSpinning} loadingText="運命が回っている…" onClick={()=>{if(ultimateSpinning)return;setUltimateSpinning(true);playSfx('roulette',soundOn);const labels=['✨ 階数 1.5倍！','💰 お金 +10,000円！','⚡ 回数+5 ＆ 運気+10！','💀 地獄の門'];let idx=0;const timer=fastInterval(()=>{setUltimateMessage(labels[idx%labels.length]);playSfx('slotStop',soundOn);idx++;},140);fastTimeout(()=>{window.clearInterval(timer);const r=ri(0,3);const chosen=labels[r];setUltimateMessage(chosen);setUltimateSpinning(false);if(r===0)patch({floor:Math.floor(s.floor*1.5)});if(r===1)patch({money:s.money+10000});if(r===2)patch({turnsLeft:s.turnsLeft+5,luck:s.luck+10});if(r===3){playSfx('hell',soundOn);patch({inHell:true});setHellDie(null);setHellRolling(false);setHellMessage('「5」が出れば生還。1回振るごとに残り回数を1消費する。');show({tier:5,title:'地獄の門',desc:'ここは脱出判定専用フロア。サイコロで「5」を出した瞬間だけ地上へ戻れる。失敗しても挑戦は続くが、振るたびに残り回数を1消費する。',result:'脱出条件：5を出せ / 成功率 1/6',resultType:'danger',kind:'hell'});return;}playSfx('jackpot',soundOn);show({...room,kind:undefined,result:`究極ルーレット結果：${chosen}`,resultType:'gold'});},2400);}}>運命のルーレットを回す！</Button></Stack>;
    if(kind==='god')return <Stack spacing={1}>{[makeItem('mirror',8),makeItem('ring',15),makeItem('money_tree',3),makeItem('blessing_charm',3),makeItem('party_set')].map((it,i)=><Action key={i} title={it.name} onClick={()=>{playSfx('item',soundOn);addItem(it);show({...room,kind:undefined,result:`${it.name} 獲得！`,resultType:'gold'})}}/>)}</Stack>;
    if(kind==='hell')return <Stack spacing={2}><Box p={3} bg="red.950" border="1px solid" borderColor="red.700" rounded="xl"><Text fontSize="11px" color="red.100" fontWeight="800">💀 脱出ルール</Text><Text mt={1} fontSize="10px" color="red.200">サイコロで「5」が出れば即生還。5以外は失敗。振るたびに残り回数 -1。</Text><HStack mt={2} justify="center"><Badge colorScheme="red">成功率 1 / 6</Badge><Badge colorScheme="orange">残り {s.turnsLeft} 回</Badge></HStack></Box><Center h="82px" bg="blackAlpha.600" border="2px solid" borderColor={hellRolling?'red.300':'red.800'} rounded="2xl" boxShadow={hellRolling?'0 0 28px rgba(248,113,113,.7)':'inset 0 0 20px rgba(0,0,0,.6)'}><Text fontSize="5xl" fontWeight="black" color="red.200" animation={hellRolling?'hellPulse .18s ease-in-out infinite alternate':undefined}>{hellDie??'🎲'}</Text></Center><Text minH="34px" fontSize="xs" color="red.100" textAlign="center" fontWeight="700">{hellMessage}</Text><Button w="100%" colorScheme="red" isDisabled={hellRolling||s.turnsLeft<=0} isLoading={hellRolling} loadingText="運命を振っています…" onClick={()=>{if(hellRolling||s.turnsLeft<=0)return;setHellRolling(true);setHellMessage('地獄の門が判定中… 5よ、来い…！');playSfx('hell',soundOn);let n=0;const timer=fastInterval(()=>{const d=ri(1,6);setHellDie(d);playSfx('slotStop',soundOn);n++;},90);fastTimeout(()=>{window.clearInterval(timer);const roll=ri(1,6);setHellDie(roll);setHellRolling(false);setS(x=>({...x,turnsLeft:Math.max(0,x.turnsLeft-1)}));if(roll===5){playSfx('jackpot',soundOn);setHellMessage('🔥 5！ 門が開いた！ 生還成功！');setS(x=>({...x,inHell:false}));show({tier:1,title:'地獄から生還',desc:'5を引き当て、閉ざされていた門が開いた。元の世界へ帰還した。',result:'5が出た！ 生還成功！',resultType:'success'});}else{playSfx('fail',soundOn);setHellMessage(`${roll}…！ 門は開かない。5を出すまで脱出できない。`);show({...room,result:`出目 ${roll}：脱出失敗（5のみ成功）`,resultType:'danger'});}},1050);}}>サイコロを振る（回数 -1）</Button>{s.turnsLeft<=0&&<Text fontSize="10px" color="orange.200" textAlign="center">残り回数が0です。下の「ゲームを終了する」からリザルトへ進めます。</Text>}</Stack>;
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[room,s,rocks,picks,shop,bj,slotBet,slot,slotSpinning,slotWin,slotMessage,casinoSpinsLeft,soundOn,doorChoices,gameSpeed,forgeUsed,fortuneReading,boxRewards,boxSelected,boxRevealAll,itemBoxOpening,ultimateSpinning,ultimateMessage,bjPhase]);

  const roomIdentity=useMemo(()=>{
    const k=room.kind||''; const t=room.title;
    if(k==='hell')return {icon:FaSkull,color:'red.300',glow:'rgba(239,68,68,.45)'};
    if(k==='casino')return {icon:FaStar,color:'purple.200',glow:'rgba(168,85,247,.45)'};
    if(k==='blackjack')return {icon:FaGift,color:'teal.200',glow:'rgba(20,184,166,.40)'};
    if(k==='forge')return {icon:FaHammer,color:'orange.200',glow:'rgba(251,146,60,.40)'};
    if(k==='barter')return {icon:FaCoins,color:'teal.200',glow:'rgba(45,212,191,.35)'};
    if(k==='crossroads')return {icon:FaDoorClosed,color:'blue.200',glow:'rgba(96,165,250,.35)'};
    if(k==='vending')return {icon:FaSackDollar,color:'green.200',glow:'rgba(74,222,128,.35)'};
    if(k==='fortune')return {icon:FaWandMagicSparkles,color:'purple.200',glow:'rgba(168,85,247,.45)'};
    if(k==='mining')return {icon:FaHammer,color:room.tier===4?'cyan.200':room.tier===3?'green.200':'red.300',glow:'rgba(34,211,238,.32)'};
    if(k==='shop')return {icon:FaStore,color:'yellow.200',glow:'rgba(250,204,21,.35)'};
    if(k==='auction'||k==='mystery')return {icon:FaGavel,color:'yellow.200',glow:'rgba(250,204,21,.4)'};
    if(k==='itembox'||k==='boxes'||t.includes('宝箱'))return {icon:FaBoxOpen,color:'purple.200',glow:'rgba(192,132,252,.4)'};
    if(k==='ultimate')return {icon:FaStar,color:'yellow.200',glow:'rgba(250,204,21,.55)'};
    if(k==='god'||k==='altar')return {icon:FaSun,color:'yellow.100',glow:'rgba(253,224,71,.45)'};
    if(k==='warp')return {icon:FaWandMagicSparkles,color:'cyan.200',glow:'rgba(34,211,238,.45)'};
    if(k==='doors')return {icon:FaDoorClosed,color:'orange.200',glow:'rgba(251,146,60,.35)'};
    if(t.includes('階段'))return {icon:FaArrowUp,color:'blue.200',glow:'rgba(96,165,250,.35)'};
    if(t.includes('何も無い'))return {icon:FaDoorClosed,color:'gray.300',glow:'rgba(148,163,184,.22)'};
    if(t.includes('湯'))return {icon:FaHotTubPerson,color:'cyan.200',glow:'rgba(34,211,238,.35)'};
    if(t.includes('財布')||t.includes('販売'))return {icon:FaSackDollar,color:'yellow.200',glow:'rgba(250,204,21,.35)'};
    if(t.includes('ラッキー')||t.includes('運命'))return {icon:FaStar,color:'green.200',glow:'rgba(74,222,128,.35)'};
    return {icon:FaElevator,color:'cyan.200',glow:'rgba(0,240,255,.20)'};
  },[room]);

  const selectedItem=selected===null?null:s.items[selected];

  const roomAtmosphere=useMemo(()=>{
    const k=room.kind||''; const t=room.title;
    if(k==='hell'||s.inHell)return {bg:'radial-gradient(circle at 50% 25%, rgba(127,29,29,.75), transparent 38%), linear-gradient(180deg,#300505 0%,#090000 70%,#000 100%)',accent:'rgba(248,113,113,.22)',label:'HELL GATE'};
    if(k==='god')return {bg:'radial-gradient(circle at 50% 15%, rgba(255,255,255,.72), rgba(250,204,21,.30) 25%, transparent 55%), linear-gradient(180deg,#6b4d13 0%,#2b2208 38%,#090b10 100%)',accent:'rgba(253,224,71,.28)',label:'DIVINE SANCTUARY'};
    if(k==='ultimate')return {bg:'conic-gradient(from 0deg at 50% 50%,rgba(250,204,21,.22),rgba(168,85,247,.18),rgba(239,68,68,.18),rgba(250,204,21,.22)), radial-gradient(circle,#422006,#090b10 68%)',accent:'rgba(250,204,21,.22)',label:'ULTIMATE CHAMBER'};
    if(k==='casino')return {bg:'radial-gradient(circle at 20% 15%,rgba(236,72,153,.25),transparent 32%),radial-gradient(circle at 80% 25%,rgba(139,92,246,.30),transparent 34%),linear-gradient(160deg,#180a2c,#080510 70%)',accent:'rgba(192,132,252,.20)',label:'NEON CASINO'};
    if(k==='blackjack')return {bg:'radial-gradient(circle at center,rgba(13,148,136,.20),transparent 45%),linear-gradient(180deg,#062b25,#06100f 70%,#020505)',accent:'rgba(45,212,191,.16)',label:'UNDERGROUND CARD SALON'};
    if(k==='mining')return {bg:room.tier===4?'radial-gradient(circle at 50% 35%,rgba(34,211,238,.22),transparent 35%),linear-gradient(145deg,#10242c,#090d11 70%)':room.tier===3?'radial-gradient(circle at 50% 35%,rgba(52,211,153,.18),transparent 35%),linear-gradient(145deg,#10251e,#080d0a 70%)':'radial-gradient(circle at 50% 35%,rgba(248,113,113,.18),transparent 35%),linear-gradient(145deg,#271414,#0d0909 70%)',accent:'rgba(148,163,184,.12)',label:'MINING CAVERN'};
    if(k==='fortune')return {bg:'radial-gradient(circle at 50% 30%,rgba(192,132,252,.26),transparent 35%),radial-gradient(circle at 15% 15%,rgba(255,255,255,.10),transparent 2%),linear-gradient(180deg,#24103c,#080710 75%)',accent:'rgba(192,132,252,.18)',label:'FORTUNE ROOM'};
    if(k==='altar')return {bg:'radial-gradient(circle at 50% 30%,rgba(253,224,71,.20),transparent 38%),linear-gradient(180deg,#2d2510,#0b0a06 72%)',accent:'rgba(253,224,71,.14)',label:'ALTAR'};
    if(k==='warp')return {bg:'radial-gradient(circle at center,rgba(34,211,238,.30),rgba(168,85,247,.15) 32%,transparent 55%),linear-gradient(180deg,#071b2a,#0a0714 75%)',accent:'rgba(34,211,238,.18)',label:'WARP FIELD'};
    if(k==='shop')return {bg:'radial-gradient(circle at 50% 10%,rgba(250,204,21,.16),transparent 32%),linear-gradient(180deg,#252010,#0d0c08 75%)',accent:'rgba(250,204,21,.10)',label:'SHOP FLOOR'};
    if(k==='forge')return {bg:'radial-gradient(circle at 50% 60%,rgba(251,146,60,.28),transparent 38%),linear-gradient(180deg,#26130a,#0d0805 75%)',accent:'rgba(251,146,60,.16)',label:'ARCANE FORGE'};
    if(t.includes('湯'))return {bg:'radial-gradient(circle at 50% 70%,rgba(103,232,249,.22),transparent 42%),linear-gradient(180deg,#10252d,#081014 75%)',accent:'rgba(103,232,249,.12)',label:'HEALING SPA'};
    if(t.includes('ラッキー'))return {bg:'radial-gradient(circle at center,rgba(74,222,128,.22),transparent 42%),linear-gradient(180deg,#0d2819,#080d0a 75%)',accent:'rgba(74,222,128,.12)',label:'LUCKY FLOOR'};
    if(room.tier===4)return {bg:'radial-gradient(circle at center,rgba(248,113,113,.18),transparent 45%),linear-gradient(180deg,#2a1010,#0d0909 75%)',accent:'rgba(248,113,113,.12)',label:''};
    if(room.tier===5)return {bg:'radial-gradient(circle at center,rgba(250,204,21,.24),transparent 44%),linear-gradient(180deg,#33260b,#0d0b06 75%)',accent:'rgba(250,204,21,.14)',label:''};
    return {bg:tierMeta[Math.min(4,Math.max(0,room.tier-1))].bg,accent:'rgba(255,255,255,.05)',label:''};
  },[room,s.inHell]);

  const resultColor=room.resultType==='success'?'green':room.resultType==='danger'?'red':room.resultType==='gold'?'yellow':'gray';
  const tier=tierMeta[Math.min(4,Math.max(0,room.tier-1))];
  const finalMode=s.turnsLeft<=0 && !moving && !gameover;
  const disabled=finalMode ? (moving||gameover||slotSpinning||bj.playing) : (moving||gameover||slotSpinning||bj.playing||s.inHell);

  const handleButtonSound=(e:React.MouseEvent)=>{const el=e.target as HTMLElement;if(el.closest('button'))playSfx('click',soundOn);};

  return <><style>{`@keyframes elevatorAura{from{transform:scale(.9);opacity:.45}to{transform:scale(1.08);opacity:1}}@keyframes hypeBlink{0%,45%{opacity:1}46%,100%{opacity:.35}}@keyframes hellPulse{from{transform:scale(.9) rotate(-3deg)}to{transform:scale(1.08) rotate(3deg)}}@keyframes slotJackpot{from{transform:scale(.96);filter:brightness(.9)}to{transform:scale(1.04);filter:brightness(1.35)}}@keyframes reachPulse{from{transform:scale(.98);filter:brightness(1)}to{transform:scale(1.035);filter:brightness(1.45)}}@keyframes rareArrival{0%{opacity:0;transform:scale(.72)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.24)}}@keyframes rareRing{0%{opacity:0;transform:scale(.35)}35%{opacity:.95}100%{opacity:0;transform:scale(1.65)}}@keyframes rareSpark{0%{opacity:0;transform:translateY(18px) scale(.6)}35%{opacity:1}100%{opacity:0;transform:translateY(-44px) scale(1.15)}}`}</style><Center h="100dvh" minH={0} p={{base:0,md:4}} overflow="hidden">
    <Box onClickCapture={handleButtonSound} w="100%" maxW="432px" h={{base:'100dvh',md:'min(860px, calc(100dvh - 32px))'}} maxH={{base:'100dvh',md:'calc(100dvh - 32px)'}} bg="#0f141d" borderRadius={{base:0,md:'3xl'}} overflow="hidden" position="relative" borderWidth={{base:0,md:'4px'}} borderColor="whiteAlpha.200" boxShadow="2xl">
      {menu&&<Flex position="absolute" inset={0} zIndex={40} p={6} bg="linear-gradient(#0f172a,#0f141d,#000)" direction="column" justify="space-between" align="center" textAlign="center">
        <Box mt={8}><Center mx="auto" w="82px" h="82px" borderRadius="2xl" bg="cyan.400" color="cyan.200" bgColor="rgba(0,240,255,.1)" border="1px solid rgba(0,240,255,.3)"><Icon as={FaElevator} boxSize={12} animation="pulseGlow 2s infinite"/></Center><Text fontSize="3xl" fontWeight="black" mt={3}>無限エレベーター</Text><Text fontSize="xs" color="cyan.300" fontWeight="bold" letterSpacing="widest">INFINITE ELEVATOR</Text></Box>
        <Flex w="100%" bg="gray.900" border="1px solid" borderColor="gray.700" rounded="2xl" p={4} justify="space-between" align="center"><HStack><Icon as={FaTrophy} color="yellow.400"/><Text fontSize="sm" color="gray.400" fontWeight="bold">自己最高記録</Text></HStack><Text fontFamily="mono" fontSize="2xl" color="yellow.400" fontWeight="bold">{s.highScore} 階</Text></Flex>
        <Stack w="100%" spacing={2.5} mb={4}><Button h="58px" colorScheme="cyan" bgGradient="linear(to-r, cyan.500, blue.600)" color="white" leftIcon={<FaPlay/>} onClick={start}>ゲームを始める</Button><SimpleGrid columns={2} spacing={2}><Button size="sm" bg="gray.800" color="yellow.300" leftIcon={<FaRankingStar/>} onClick={rank.onOpen}>ランキング</Button><Button size="sm" bg="gray.800" color="green.300" leftIcon={<FaCircleQuestion/>} onClick={rules.onOpen}>ルール説明</Button><Button size="sm" bg="gray.800" color="cyan.300" leftIcon={<FaBookOpen/>} onClick={guide.onOpen}>ステージ図鑑</Button><Button size="sm" bg="gray.800" color="purple.300" leftIcon={<FaGem/>} onClick={itemGuide.onOpen}>アイテム図鑑</Button></SimpleGrid></Stack>
      </Flex>}

      <Flex h="100%" direction="column">
        <Box flexShrink={0} p={2} bgGradient="linear(to-b, gray.900, #1a2232, gray.900)" borderBottom="1px solid" borderColor="whiteAlpha.200" zIndex={20}>
          <Flex bg="blackAlpha.600" rounded="xl" px={2.5} py={1} align="center"><Box><Text fontSize="9px" color="gray.400" fontWeight="bold">現在地</Text><HStack spacing={1}><Text fontFamily="mono" fontSize="2xl" color="cyan.300" fontWeight="bold" textShadow="0 0 10px rgba(0,240,255,.7)">{s.floor}</Text><Text fontSize="xs" color="cyan.300">階</Text></HStack></Box><Spacer/><Icon as={FaArrowUp} color="gray.500"/><Spacer/><Button size="xs" minW="42px" h="28px" px={2} mr={1} bg={gameSpeed===2?'purple.600':'gray.700'} color="white" border="1px solid" borderColor={gameSpeed===2?'purple.300':'gray.600'} _hover={{bg:gameSpeed===2?'purple.500':'gray.600'}} onClick={()=>setGameSpeed(v=>v===1?2:1)}>×{gameSpeed}</Button><IconButton aria-label="bgm" variant="ghost" size="sm" color={soundOn?'yellow.400':'gray.400'} icon={soundOn?<FaVolumeHigh/>:<FaVolumeXmark/>} onClick={()=>setSoundOn(v=>!v)}/><Box textAlign="right"><Text fontSize="9px" color="gray.400"><Icon as={FaTrophy} color="yellow.400"/> 最高記録</Text><Text fontFamily="mono" fontWeight="bold" color="yellow.400">{s.highScore}階</Text></Box></Flex>
          <SimpleGrid columns={3} spacing={1} mt={1}>{[[FaBolt,'ボタン',s.turnsLeft,'yellow.400'],[FaStar,'運気',s.luck,'green.400'],[FaCoins,'所持金',`${s.money}円`,'yellow.300']].map(([ic,l,v,c]:any)=><VStack key={l} bg="whiteAlpha.100" p={1} rounded="lg" border="1px solid" borderColor="whiteAlpha.200" spacing={0}><Text fontSize="9px" color="gray.400"><Icon as={ic} color={c}/> {l}</Text><Text fontFamily="mono" fontWeight="bold" color={c}>{v}</Text></VStack>)}</SimpleGrid>
          <HStack minH="14px" mt={1} spacing={1}>{s.ringBuff.active&&<Badge colorScheme="green">指輪+{s.ringBuff.amount} 残{s.ringBuff.turns}T</Badge>}{s.mirrorMultiplier>1&&<Badge colorScheme="cyan">鏡x{s.mirrorMultiplier}</Badge>}{s.partySet&&<Badge colorScheme="pink">演出2以上確定</Badge>}</HStack>
        </Box>

        <Flex flex="1" minH={0} position="relative" p={2} align="center" justify="center" bg={roomAtmosphere.bg} overflow="hidden">
          <Box position="absolute" inset={0} pointerEvents="none" opacity={.7} bgImage={`repeating-linear-gradient(135deg, transparent 0 28px, ${roomAtmosphere.accent} 29px 30px)`}/>{roomAtmosphere.label&&<Text position="absolute" top="10px" right="12px" fontSize="8px" letterSpacing=".22em" fontWeight="900" color="whiteAlpha.300">{roomAtmosphere.label}</Text>}{rareArrival>0&&<Box position="absolute" inset={0} zIndex={16} pointerEvents="none" overflow="hidden">
            <Box position="absolute" inset="-18%" bg={rareArrival===5?'radial-gradient(circle,rgba(253,224,71,.48) 0%,rgba(250,204,21,.18) 28%,transparent 62%)':'radial-gradient(circle,rgba(244,63,94,.34) 0%,rgba(168,85,247,.14) 35%,transparent 65%)'} animation="rareArrival .9s ease-out both"/>
            <Center position="absolute" inset={0}>
              <Box w="118px" h="118px" rounded="full" border="3px solid" borderColor={rareArrival===5?'yellow.200':'red.300'} boxShadow={rareArrival===5?'0 0 34px rgba(253,224,71,.85), inset 0 0 28px rgba(253,224,71,.38)':'0 0 30px rgba(248,113,113,.78), inset 0 0 24px rgba(168,85,247,.32)'} animation="rareRing 1.05s ease-out both"/>
            </Center>
            {Array.from({length:rareArrival===5?12:8}).map((_,i)=><Box key={i} position="absolute" left={`${8+((i*83)%84)}%`} top={`${58+((i*17)%28)}%`} w={rareArrival===5?'5px':'4px'} h={rareArrival===5?'5px':'4px'} rounded="full" bg={rareArrival===5?'yellow.200':'red.200'} boxShadow="0 0 10px currentColor" animation={`rareSpark ${.65+(i%4)*.12}s ease-out ${i*.045}s both`}/>) }
          </Box>}<VStack zIndex={10} w="100%" maxW="320px" spacing={2} maxH="100%" overflowY="auto"><Badge colorScheme={room.tier===5?'yellow':'gray'}>{s.inHell?'Tier 6 HELL':tier.name}</Badge><Center w="62px" h="62px" rounded="2xl" bg="gray.800" border="2px solid" borderColor={roomIdentity.color} boxShadow={`0 0 22px ${roomIdentity.glow}`}><Icon as={roomIdentity.icon} boxSize={6} color={roomIdentity.color}/></Center><Text fontWeight="bold">{room.title}</Text><Text fontSize="xs" color="gray.300" textAlign="center" px={2}>{room.desc}</Text>{room.result&&<Badge px={3} py={1} maxW="100%" whiteSpace="normal" textAlign="center" lineHeight="1.4" colorScheme={resultColor}>{room.result}</Badge>}{interactive&&<Box w="100%" mt={2}>{interactive}</Box>}</VStack>
          <Box position="absolute" top={0} left={0} w="50%" h="100%" bg="gray.900" borderRight="2px solid" borderColor="gray.700" zIndex={20} transform={doors?'translateX(-100%)':'translateX(0)'} transition={`transform ${0.6/gameSpeed}s cubic-bezier(.77,0,.175,1)`}/><Box position="absolute" top={0} right={0} w="50%" h="100%" bg="gray.900" borderLeft="2px solid" borderColor="gray.700" zIndex={20} transform={doors?'translateX(100%)':'translateX(0)'} transition={`transform ${0.6/gameSpeed}s cubic-bezier(.77,0,.175,1)`}/>
          {overlay.show&&<Center position="absolute" inset={0} bg={overlay.tier===4?'linear-gradient(180deg,rgba(69,26,3,.96),rgba(0,0,0,.97))':'rgba(0,0,0,.94)'} zIndex={30} flexDir="column" overflow="hidden"><Box position="absolute" inset="-20%" bg={overlay.tier===4?'radial-gradient(circle,rgba(250,204,21,.25),transparent 50%)':overlay.tier===3?'radial-gradient(circle,rgba(168,85,247,.22),transparent 50%)':overlay.tier===2?'radial-gradient(circle,rgba(16,185,129,.16),transparent 50%)':'radial-gradient(circle,rgba(34,211,238,.12),transparent 50%)'} animation="elevatorAura .55s ease-in-out infinite alternate"/><Text zIndex={1} fontSize="10px" letterSpacing=".24em" color="whiteAlpha.700" fontWeight="900">ELEVATOR SYSTEM</Text><Badge zIndex={1} mt={2} px={3} py={1} fontSize="xs" colorScheme={overlay.tier===4?'yellow':overlay.tier===3?'purple':overlay.tier===2?'green':'cyan'}>{['','NORMAL RISE','🚀 BOOSTER','⚡ LIMIT BREAK','✨ OVERDRIVE / 激熱 ✨'][overlay.tier]}</Badge>{overlay.tier>=3&&<Text zIndex={1} mt={2} fontSize={overlay.tier===4?'xl':'md'} fontWeight="black" color={overlay.tier===4?'yellow.200':'purple.200'} textShadow="0 0 18px currentColor" animation="hypeBlink .28s steps(2) infinite">{overlay.tier===4?'超 激 熱':'CHANCE UP!'}</Text>}<Text zIndex={1} fontFamily="mono" fontSize={overlay.locked?'7xl':'6xl'} fontWeight="black" color={tierMeta[Math.min(4,overlay.tier-1)].color} textShadow="0 0 24px currentColor" transform={overlay.locked?'scale(1.08)':'scale(.92)'} transition="all .18s ease">+{overlay.steps}</Text><Text zIndex={1} fontSize="11px" color={overlay.locked?'white':'gray.300'} fontWeight={overlay.locked?'900':'600'} mt={2}>{overlay.detail}</Text><HStack zIndex={1} mt={3} spacing={1}>{Array.from({length:8}).map((_,i)=><Box key={i} w="18px" h="4px" rounded="full" bg={i<overlay.tier*2?(overlay.tier===4?'yellow.300':overlay.tier===3?'purple.300':overlay.tier===2?'green.300':'cyan.300'):'whiteAlpha.200'} boxShadow={i<overlay.tier*2?'0 0 8px currentColor':undefined}/>)}</HStack></Center>}
        </Flex>

        <Box flexShrink={0} bg="gray.900" borderTop="1px solid" borderColor="gray.800" p={1.5}><Tabs size="sm" variant="unstyled"><TabList minH="28px"><Tab color="gray.200" _selected={{bg:'cyan.900',color:'cyan.200'}} rounded="md" fontSize="xs" fontWeight="bold">アイテム ({s.items.length}/3)</Tab><Tab color="gray.200" _selected={{bg:'cyan.900',color:'cyan.200'}} rounded="md" fontSize="xs" fontWeight="bold">ログ</Tab><Spacer/><Text fontSize="9px" color="gray.500" alignSelf="center">タップで選択・使用</Text></TabList><TabPanels><TabPanel px={0} py={0.5} h="62px" overflowX="auto"><HStack h="100%" align="center">{s.items.length===0?<Text w="100%" textAlign="center" fontSize="xs" color="gray.500">アイテムを持っていません</Text>:s.items.map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} flexShrink={0} w="132px" h="48px" px={2} bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} boxShadow="0 2px 8px rgba(0,0,0,.35)" _hover={{filter:'brightness(1.18)',color:pal.text}} _active={{filter:'brightness(.9)',color:pal.text}} onClick={()=>{playSfx('item',soundOn);setSelected(i)}}><HStack w="100%" spacing={2}><Center flexShrink={0} w="28px" h="28px" rounded="md" bg="blackAlpha.400"><Icon as={it.icon||FaGift} boxSize={4} color={pal.icon}/></Center><Box flex="1" minW={0} textAlign="left" overflow="hidden"><Text fontSize="9px" fontWeight="900" color={pal.text} noOfLines={2} lineHeight="1.1">{it.name}</Text><Text mt={0.5} fontSize="8px" color="whiteAlpha.800" fontWeight="700">{it.type==='gem'?`宝石 x${it.count||1}`:it.type==='passive'?'常時':'消費'}</Text></Box></HStack></Button>})}</HStack></TabPanel><TabPanel px={1} py={0.5} h="62px" overflowY="auto" bg="blackAlpha.400">{s.logs.length===0?<Text fontSize="11px" color="cyan.300">システム: ゲーム開始</Text>:s.logs.map((l,i)=><Text key={i} fontSize="11px" color="gray.400" borderBottom="1px solid" borderColor="whiteAlpha.100">{l}</Text>)}</TabPanel></TabPanels></Tabs></Box>
        <Box flexShrink={0} bg="gray.950" p={2} borderTop="1px solid" borderColor="gray.800"><Button w="100%" h="50px" bgGradient={finalMode?"linear(to-r, red.500, orange.500)":"linear(to-r, cyan.400, blue.500)"} color="white" fontSize="md" fontWeight="900" textShadow="0 1px 3px rgba(0,0,0,.95)" border="1px solid" borderColor={finalMode?"red.200":"cyan.200"} boxShadow={finalMode?"0 4px 14px rgba(255,80,80,.28)":"0 4px 14px rgba(0,180,255,.28)"} _hover={{bgGradient:finalMode?'linear(to-r, red.400, orange.400)':'linear(to-r, cyan.300, blue.400)',color:'white'}} _active={{bgGradient:finalMode?'linear(to-r, red.600, orange.600)':'linear(to-r, cyan.600, blue.700)',color:'white',transform:'translateY(1px)'}} _disabled={{opacity:.55,color:'whiteAlpha.800'}} leftIcon={finalMode?undefined:<FaArrowUp/>} isDisabled={disabled} onClick={()=>{if(finalMode)end();else press();}}>{finalMode?'ゲームを終了する':'ボタンを押す'}</Button></Box>
      </Flex>

      <InfoModal ctl={rules} title="ルール説明" color="green"><Text>【基本ルール】ボタンを押すとランダムな階数分上へ進みます。全10回でどこまで登れるかを競います。</Text><Text>【運気】高いほど移動階数の補正ボーナスが大きくなります。</Text><Text>【ショップ＆宝石】採掘した宝石はショップで売却できます。</Text><Text>【カジノ】スロットで同じ絵柄が3つ揃うと高倍率配当です。</Text></InfoModal>
      <InfoModal ctl={guide} title="ステージガイド" color="cyan">{['Tier 1 (40%): 基本イベント・ショップ・宝箱など','Tier 2 (30%): ブラックジャック・自販機・ルビー採掘など','Tier 3 (20%): スロット・エメラルド採掘・アイテム箱など','Tier 4 (9%): ダイヤ採掘・ワープ・神々の競売場','Tier 5 (1%): 究極のルーレット・神の故郷'].map(x=><Text key={x}>{x}</Text>)}</InfoModal>
      <InfoModal ctl={itemGuide} title="アイテム図鑑" color="purple">{['乱反射の鏡★n: 次の移動階数がn倍','幸運の指輪★n: 3ターン運気+n','賢者の宝石: 現在階の1の位だけ運気UP','お店チケット: 次の部屋がお店','パーティーセット: 次回好演出','お金のなる木 / 幸せのお守り: 毎ターン効果','宝石: ショップで売却'].map(x=><Text key={x}>{x}</Text>)}</InfoModal>
      <Modal isOpen={rank.isOpen} onClose={rank.onClose} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="340px"><ModalHeader color="yellow.300">全国ランキング (Top 50)</ModalHeader><ModalBody maxH="55vh" overflowY="auto"><Text mb={2} fontSize="10px" color={rankingStatus==='online'?'green.300':rankingStatus==='connecting'?'yellow.300':'orange.300'}>{rankingStatus==='online'?'● Firebaseランキング接続中':rankingStatus==='connecting'?'Firebaseへ接続中…':rankingStatus==='offline'?'ローカルランキングモード':'Firebase接続エラー'}</Text>{rankings.length?rankings.map((r,i)=><Flex key={r.id||i} py={1.5} borderBottom="1px solid" borderColor="whiteAlpha.100"><Text w="30px">#{i+1}</Text><Text flex="1" noOfLines={1}>{r.name}</Text><Text color="cyan.300">{r.score}階</Text></Flex>):<Text color="gray.500">まだ登録がありません</Text>}</ModalBody><ModalFooter><Button onClick={rank.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={pendingOverflow!==null} onClose={()=>{}} closeOnOverlayClick={false} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="350px"><ModalHeader color="yellow.300">持ち物がいっぱいです</ModalHeader><ModalBody><Text fontSize="xs" color="gray.300" mb={3}>新しく「{pendingOverflow?.name}」を入手しました。4つのうち捨てる1つを選んでください。</Text><Stack spacing={2}>{[...s.items,...(pendingOverflow?[pendingOverflow]:[])].map((it,i)=>{const pal=itemPalette(it);return <Button key={`${it.id}-${i}`} h="54px" justifyContent="flex-start" bg={pal.bg} color={pal.text} border="1px solid" borderColor={pal.border} _hover={{filter:'brightness(1.15)'}} onClick={()=>resolveOverflow(i)}><HStack w="100%"><Icon as={it.icon||FaGift} color={pal.icon}/><Box flex="1" textAlign="left"><Text fontSize="11px" fontWeight="900">{it.name}{it.type==='gem'?` ×${it.count||1}`:''}</Text><Text fontSize="9px" color="whiteAlpha.700">{i===3?'新しく入手したアイテム':'現在の持ち物'}</Text></Box><Text fontSize="10px" color="red.200" fontWeight="900">これを捨てる</Text></HStack></Button>})}</Stack></ModalBody></ModalContent></Modal>
      <Modal isOpen={selected!==null} onClose={()=>setSelected(null)} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="330px"><ModalHeader color="white"><HStack><Center w="36px" h="36px" rounded="lg" bg="gray.700"><Icon as={selectedItem?.icon||FaGift} color={selectedItem?itemPalette(selectedItem).icon:'gray.200'}/></Center><Text>{selectedItem?.name}</Text></HStack></ModalHeader><ModalBody><Text fontSize="sm" color="gray.100">{selectedItem?.desc}</Text></ModalBody><ModalFooter gap={2}>{selectedItem?.type==='consumable'&&<Button colorScheme="green" onClick={()=>useItem(selected!)}>使用する</Button>}{selectedItem?.type==='gem'&&room.kind==='shop'&&<Button colorScheme="yellow" onClick={()=>sellGem(selected!)}>売却 +{(selectedItem.price*(selectedItem.count||1))}円</Button>}{selectedItem?.type==='gem'&&room.kind!=='shop'&&<Text fontSize="xs" color="gray.400" alignSelf="center">宝石はショップ系の部屋でのみ売却できます</Text>}<Button colorScheme="red" variant="outline" onClick={()=>discard(selected!)}>捨てる</Button><Button onClick={()=>setSelected(null)}>閉じる</Button></ModalFooter></ModalContent></Modal>
      <Modal isOpen={gameover} onClose={()=>{}} closeOnOverlayClick={false} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="340px" textAlign="center"><ModalHeader>ゲーム終了</ModalHeader><ModalBody><Text fontSize="xs" color="gray.400">最終到達階数</Text><Text fontSize="4xl" color="cyan.300" fontFamily="mono" fontWeight="black">{s.floor} 階</Text><HStack mt={3}><Input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="プレイヤー名" textAlign="center"/><Button colorScheme="yellow" onClick={submitScore} isDisabled={scoreSubmitted}>{scoreSubmitted?'登録済み':'登録'}</Button></HStack><HStack justify="space-between" mt={3} color="gray.400"><Text fontSize="xs">最終所持金: <b>{s.money}円</b></Text><Text fontSize="xs">最終運気: <b>{s.luck}</b></Text></HStack></ModalBody><ModalFooter><Button w="100%" colorScheme="cyan" onClick={()=>{setGameover(false);setMenu(true)}}>メインメニューへ</Button></ModalFooter></ModalContent></Modal>
    </Box>
  </Center></>;
}

function Action({title,sub,onClick}:{title:string;sub?:string;onClick:()=>void}){return <Button h="auto" minH="52px" py={2.5} px={3} bg="gray.700" color="white" border="1px solid" borderColor="whiteAlpha.400" boxShadow="0 2px 8px rgba(0,0,0,.35)" _hover={{bg:'gray.600',color:'white',borderColor:'cyan.300'}} _active={{bg:'cyan.800',color:'white',transform:'translateY(1px)'}} _focusVisible={{boxShadow:'0 0 0 3px rgba(34,211,238,.45)'}} onClick={onClick}><VStack spacing={0.5} w="100%"><Text fontSize="sm" lineHeight="1.2" fontWeight="900" color="white" textShadow="0 1px 2px rgba(0,0,0,.9)">{title}</Text>{sub&&<Text fontSize="10px" lineHeight="1.25" color="gray.100" fontWeight="700">{sub}</Text>}</VStack></Button>}
function InfoModal({ctl,title,color,children}:{ctl:ReturnType<typeof useDisclosure>;title:string;color:string;children:React.ReactNode}){return <Modal isOpen={ctl.isOpen} onClose={ctl.onClose} isCentered><ModalOverlay/><ModalContent bg="gray.900" maxW="340px" border="2px solid" borderColor={`${color}.500`}><ModalHeader color={`${color}.300`}>{title}</ModalHeader><ModalBody><Stack fontSize="xs" color="gray.300" spacing={3}>{children}</Stack></ModalBody><ModalFooter><Button w="100%" onClick={ctl.onClose}>閉じる</Button></ModalFooter></ModalContent></Modal>}
