!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).revexp=e()}(this,(function(){"use strict";const t=new Map([["\t","\\t"],["\r","\\r"],["\n","\\n"],["\v","\\v"],["\f","\\f"],["\\","\\\\"],["-","\\-"],[".","\\."],["(","\\("],[")","\\)"],["[","\\["],["]","\\]"],["{","\\{"],["}","\\}"],["|","\\|"],["^","\\^"],["$","\\$"],["?","\\?"],["+","\\+"],["*","\\*"]]),e=e=>t.get(e)??`\\u${e.charCodeAt(0).toString(16).padStart(4,"0")}`,n=(t,n)=>n.replace(t,e),s=n.bind(null,/[^-a-zA-Z0-9 ,:;'"!@%&_=<>`~]/g),r=n.bind(null,/[^a-zA-Z0-9 ,:;'"!@%&_=<>`~(){}.?+*$]/g),i=t=>{let e=0,n=-2;const s=[];for(let i=0;i<=t.length;++i){const o=i===t.length?-2:t[i].charCodeAt(0);if(o!==n+1){const n=i-e;e=i,n>1&&(3===n?s.push(r(t[i-2])):n>3&&s.push("-"),s.push(r(t[i-1]))),i<t.length&&s.push(r(t[i]))}n=o}return s.join("")};class o{constructor(t,e=!1){this.chars=t,this.inverted=e}includes(t){return-1!==this.chars.indexOf(t)!==this.inverted}isEmpty(){return!this.chars.length&&!this.inverted}isSingular(){return 1===this.chars.length&&!this.inverted}singularChar(){if(!this.isSingular())throw new Error("Not singular");return this.chars[0]}equals(t){if(this===t)return!0;if(this.inverted!==t.inverted||this.chars.length!==t.chars.length)return!1;this.chars.sort(),t.chars.sort();for(let e=0;e<this.chars.length;++e)if(this.chars[e]!==t.chars[e])return!1;return!0}intersects(t){return!!(this===t||this.inverted&&t.inverted)||(this.inverted?this.chars.length?t.chars.some((t=>this.includes(t))):t.chars.length>0:t.chars.length?this.chars.some((e=>t.includes(e))):this.chars.length>0&&t.inverted)}intersect(t){if(this===t)return this;if(!this.inverted)return t.chars.length?new o(this.chars.filter((e=>t.includes(e))),!1):t.inverted?this:t;if(!t.inverted)return this.chars.length?new o(t.chars.filter((t=>this.includes(t))),!1):this.inverted?t:this;if(!this.chars.length||!t.chars.length)return this.chars.length?this:t;const e=new Set(this.chars);for(const n of t.chars)e.add(n);return new o([...e],!0)}union(t){if(this===t)return this;if(this.inverted)return t.chars.length?new o(this.chars.filter((e=>!t.includes(e))),!0):t.inverted?t:this;if(t.inverted)return this.chars.length?new o(t.chars.filter((t=>!this.includes(t))),!0):this.inverted?this:t;if(!this.chars.length||!t.chars.length)return this.chars.length?this:t;const e=new Set(this.chars);for(const n of t.chars)e.add(n);return new o([...e],!1)}rangeTo(t){if(!this.isSingular()||!t.isSingular())throw new Error("Cannot create range using existing ranges");return o.range(this.singularChar(),t.singularChar())}inverse(){return new o(this.chars,!this.inverted)}toGraph(t){return[{chars:this,advance:1,nexts:t}]}toString(){return this.chars.length?(this.chars.sort(),this.inverted?`[^${i(this.chars)}]`:1===this.chars.length?s(this.chars[0]):`[${i(this.chars)}]`):this.inverted?".":"[]"}}function h(){return this.map((t=>t.toString())).join("")}function a(){return this.every((t=>t.isSingular()))}o.ANY=new o([],!0),o.NONE=new o([],!1),o.of=t=>new o([...t]),o.ofCode=t=>new o([String.fromCharCode(t)]),o.range=(t,e)=>{const n=t.charCodeAt(0),s=e.charCodeAt(0),r=[];for(let t=Math.min(n,s);t<=Math.max(n,s);++t)r.push(String.fromCharCode(t));return new o(r)},o.union=(...t)=>t.reduce(((t,e)=>t.union(e)),o.NONE),o.NUMERIC=o.range("0","9"),o.WORD=o.union(o.range("a","z"),o.range("A","Z"),o.NUMERIC,o.of("_")),o.NEWLINE=o.of(["\n","\r","\u2028","\u2029"]),o.SPACE=o.of([" ","\f","\n","\r","\t","\v","\xa0","\u1680","\u2028","\u2029","\u202f","\u205f","\u3000","\ufeff"]).union(o.range("\u2000","\u200a"));var c=(t,e=null)=>{let n=[...t];return n.length>0&&!(n[0]instanceof o)&&(n=n.map((t=>t===e?o.ANY:new o([t])))),Object.defineProperty(n,"toString",{value:h}),Object.defineProperty(n,"isSingular",{value:a}),n};const u="0".charCodeAt(0);class l{constructor(t){this.data=t,this.pos=0,this.length=t.length}get(t=1){if(this.pos+t>this.length)throw new Error(`Incomplete token at ${this.pos} '${this.data}'`);return this.pos+=t,this.data.substr(this.pos-t,t)}check(t){const e=t.length;return!(this.pos+e>this.length)&&(this.data.substr(this.pos,e)===t&&(this.pos+=e,!0))}readUntil(t,e=!1){const n=this.pos,s=t.length;for(;this.pos+s<=this.length&&this.data.substr(this.pos,s)!==t;++this.pos);const r=this.pos;if(e&&!this.check(t))throw new Error(`Expected '${t}' after ${n} '${this.data}'`);return this.data.substring(n,r)}readInt(){let t=null;for(;this.pos<this.length;++this.pos){const e=this.data.charCodeAt(this.pos)-u;if(e<0||e>9)break;t=10*(t??0)+e}return t}end(){return this.pos>=this.length}}class f{constructor(t,e,n=null){this.mode=t,this.inverted=e,this.condition=n}toGraph(){throw new Error("Assertions are not currently supported")}}class p{constructor(t,e){this.chars=t,this.invChars=t.inverse(),this.inverted=e}toGraph(t){const e=[{advance:-1,nexts:t}];return this.inverted?[{advance:-1,nexts:[...this.chars.toGraph(this.chars.toGraph(e)),...this.invChars.toGraph(this.invChars.toGraph(e))]}]:[{advance:-1,nexts:[...this.chars.toGraph(this.invChars.toGraph(e)),...this.invChars.toGraph(this.chars.toGraph(e))]}]}}class d{constructor(t){this.pos=t}toGraph(t){return[{pos:this.pos,nexts:t}]}}d.BEGIN=new d(0),d.END=new d(-1);class g{constructor(t){this.ref=t}toGraph(t){return[...this.ref.toGraph(t),...t]}}class w{constructor(t,e,n,s=null){if(this.min=t,this.max=e,this.mode=n,this.target=s,null!==this.max&&this.max<this.min)throw new Error(`Invalid quantifier range: ${t} - ${e}`)}withTarget(t){return new w(this.min,this.max,this.mode,t)}toGraph(t){const e="lazy"===this.mode?e=>[...t,...e]:e=>[...e,...t];let n;if(null===this.max){const t={nexts:[]};t.nexts=this.target.toGraph(e([t])),n=[t];for(let t=this.min-1;t>0;--t)n=this.target.toGraph(n)}else{n=[];for(let t=this.max;t>0;--t)n=this.target.toGraph(t>=this.min?e(n):n)}return 0===this.min?e(n):n}}class v{constructor(t){this.elements=t}toGraph(t){let e=t;for(let t=this.elements.length;t-- >0;)e=this.elements[t].toGraph(e);return e}}class m{constructor(t){this.options=t}toGraph(t){const e=[];for(const n of this.options)e.push(...n.toGraph(t));return e}}class E{constructor(t,e){this.name=t,this.target=e}toGraph(t){return this.target.toGraph(t)}}const N=new class{constructor(t){this.advance=t}toGraph(t){return[{advance:this.advance,nexts:t}]}}(-1),C=Symbol(),y="A".charCodeAt(0),x=/^[0-9a-fA-F]+$/,b=t=>{if(!x.test(t))throw new Error(`Invalid hex value '${t}'`);return Number.parseInt(t,16)},S=new Map([["d",o.NUMERIC],["D",o.NUMERIC.inverse()],["w",o.WORD],["W",o.WORD.inverse()],["s",o.SPACE],["S",o.SPACE.inverse()],["t",o.of("\t")],["r",o.of("\r")],["n",o.of("\n")],["v",o.of("\v")],["f",o.of("\f")],["b",new p(o.WORD,!1)],["B",new p(o.WORD,!0)],["0",o.of("\0")],["c",t=>o.ofCode(1+t.get(1).charCodeAt(0)-y)],["x",t=>o.ofCode(b(t.get(2)))],["u",t=>{const e=t.check("{")?t.readUntil("}",!0):t.get(4);return o.ofCode(b(e))}],["\\",o.of("\\")],["k",(t,e)=>{if(!t.check("<"))throw new Error("Incomplete named backreference");const n=t.readUntil(">",!0),s=e.groupNames.get(n);if(!s)throw new Error(`Backreference to unknown group '${n}'`);return new g(s)}]]),k=new Map(S);k.set("b",o.of("\b")),k.delete("B"),k.delete("k");for(let t=1;t<10;++t)S.set(String(t),((e,n)=>{const s=n.groupNumbers[t-1];if(!s)throw new Error(`Backreference to unknown group ${t}`);return new g(s)}));function G(t,e,n,s){const r=t.get(n)??o.of(n);return"function"==typeof r?r(e,s):r}const I=t=>t.check("?")?"lazy":"greedy";function A(t){if(1===t.length)return t[0];const e=[];for(const n of t)n instanceof v?e.push(...n.elements):e.push(n);return new v(e)}function $(t){const e=[];let n=[];for(const s of t)if(s===C)e.push(A(n)),n=[];else if(s instanceof w){const t=n.pop();if(!t||t instanceof w)throw new Error("Invalid quantifier target");n.push(s.withTarget(t))}else n.push(s);return e.length?(e.push(A(n)),new m(e)):A(n)}const O=new Map([["\\",(t,e)=>G(S,t,t.get(),e)],["^",(t,e)=>e.begin],["$",(t,e)=>e.end],["|",C],[".",(t,e)=>e.any],["?",t=>new w(0,1,I(t))],["+",t=>new w(1,null,I(t))],["*",t=>new w(0,null,I(t))],["(",(t,e)=>{const n=(t=>{if(!t.check("?"))return{type:"capturing",name:null};if(t.check(":"))return{type:"inline"};if(t.check("="))return{type:"lookahead",inverted:!1};if(t.check("!"))return{type:"lookahead",inverted:!0};if(t.check("<="))return{type:"lookbehind",inverted:!1};if(t.check("<!"))return{type:"lookbehind",inverted:!0};if(t.check("<"))return{type:"capturing",name:t.readUntil(">",!0)};throw new Error(`Invalid group flags at ${t.pos}`)})(t),s=[];for(let n;")"!==(n=t.get());)s.push(G(O,t,n,e));const r=$(s);switch(n.type){case"capturing":const t=new E(n.name,r);return e.groupNumbers.push(t),n.name&&e.groupNames.set(n.name,t),t;case"inline":return r;default:return new f(n.type,n.inverted,r)}}],["{",t=>{const e=t.readInt();if(null===e)throw new Error(`Invalid character in quantifier at ${t.pos}`);const n=t.check(",")?t.readInt():e;if(!t.check("}"))throw new Error(`Invalid character in quantifier at ${t.pos}`);return new w(e,n,I(t))}],["[",(t,e)=>{const n=t.check("^"),s=[];let r,i=!1;for(;"]"!==(r=t.get());)if("-"===r&&s.length>0)i=!0;else{let n="\\"===r?G(k,t,t.get(),e):o.of(r);i&&(i=!1,n=s.pop().rangeTo(n)),s.push(n)}if(i)throw new Error(`Incomplete character range at ${t.pos}`);const h=o.union(...s);return n?h.inverse():h}]]);function M(t,e,n){return(void 0===n.pos||e===(s=n.pos,r=t.length,(s%r+r)%r))&&!(n.chars&&!t[e].inputChars.intersects(n.chars));var s,r}class R{constructor(t,e=null){t instanceof RegExp||t instanceof R?(this.source=t.source,this.flags=e??t.flags):(this.source=String(t),this.flags=e??"");const n=function(t){return{hasIndices:t.includes("d"),global:t.includes("g"),ignoreCase:t.includes("i"),multiline:t.includes("m"),dotAll:t.includes("s"),unicode:t.includes("u"),sticky:t.includes("y")}}(this.flags);Object.assign(this,n);const s=function(t,e){const n={flags:e,any:e.dotAll?o.ANY:o.NEWLINE.inverse(),begin:e.multiline?new m([new v([N,o.NEWLINE]),d.BEGIN]):d.BEGIN,end:e.multiline?new m([new v([o.NEWLINE,N]),d.END]):d.END,groupNumbers:[],groupNames:new Map},s=[];for(const e=new l(t);!e.end();)s.push(G(O,e,e.get(),n));return $(s)}(this.source,n);this.endNode={nexts:[]},this.beginNodes=s.toGraph([this.endNode]),this.graphContainsLoops=!0,this.graphContainsOverwrites=function(t,e,n=null){const s=new Set,r=[t];let i=n;for(;r.length;){const t=r.pop();i=e(t,i);for(const e of t.nexts)s.has(e)||(r.push(e),s.add(e))}return i}({nexts:this.beginNodes},((t,e)=>e||t.advance<0),!1)}reverse(t,e=null){const n=c(t,e),s=this.graphContainsLoops&&this.graphContainsOverwrites,{beginState:r,endState:i}=function(t,e,n,s){const r=t.length,i=[...t,o.NONE].map((t=>({inputChars:t,states:new Map}))),h={pos:-1,prevs:[],nexts:e,nextPos:0,node:null,remaining:0,history:s?new Set:null,solution:null};let a=[h];for(;a.length;){const t=[];for(const e of a){const n=e.nextPos;if(n<0||n>r)continue;const{states:o}=i[n];for(const r of e.nexts){const h=o.get(r);if(h)if(s){if(!e.history.has(h)){h.prevs.push(e);for(const t of e.history)h.history.add(t)}}else h.prevs.push(e);else if(M(i,n,r)){const i={pos:n,prevs:[e],nexts:r.nexts,nextPos:n+(r.advance??0),node:r,remaining:0,history:s?new Set(e.history):null,solution:null};i.history?.add(i),o.set(r,i),t.push(i)}}}a=t}return{beginState:h,endState:i[r].states.get(n)}}(n,this.beginNodes,this.endNode,s);if(!i)return null;const h=this.graphContainsOverwrites?function(t,e,n){const s=t.length,r=[n];for(;r.length;){const t=r.pop();for(const e of t.prevs)1==++e.remaining&&r.push(e)}for(n.solution=t,r.push(n);r.length;){const t=r.pop();if(t.solution&&t.node?.chars){const e=t.solution[t.pos].intersect(t.node.chars);e.isEmpty()?t.solution=null:t.solution[t.pos]=e}for(const e of t.prevs){if(t.solution)if(e.solution)for(let n=0;n<s;++n)e.solution[n]=e.solution[n].union(t.solution[n]);else e.solution=[...t.solution];0==--e.remaining&&r.push(e)}}return e.solution}(n,r,i):function(t,e,n){const s=t.map((()=>o.NONE)),r=[n];for(;r.length;){const t=r.pop();t.node?.chars&&(s[t.pos]=s[t.pos].union(t.node.chars));for(const e of t.prevs)1==++e.remaining&&r.push(e)}return s.map(((e,n)=>t[n].intersect(e)))}(n,0,i);return h?c(h):null}test(t,e=null){return null!==this.reverse(t,e)}toString(){return this.pattern}}return R.compile=(t,e)=>new R(t,e),R.CharacterClass=o,R.string=c,R}));
