!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).revexp={})}(this,(function(t){"use strict";class e{constructor(t){this.type=t}toGraph(){throw new Error(`Unable to convert ${this} to graph (unimplemented)`)}}const n=(t,e)=>e.replace(t,(t=>`\\u${t.charCodeAt(0).toString(16).padStart(4,"0")}`)),s=n.bind(null,/[^-a-zA-Z0-9 ,:;'"!@%&_=<>`~]/g),r=n.bind(null,/[^a-zA-Z0-9 ,:;'"!@%&_=<>`~(){}.?+*$]/g),i=t=>{let e=0,n=-2;const s=[];for(let i=0;i<=t.length;++i){const o=i===t.length?-2:t[i].charCodeAt(0);if(o!==n+1){const n=i-e;e=i,n>1&&(3===n?s.push(r(t[i-2])):n>3&&s.push("-"),s.push(r(t[i-1]))),i<t.length&&s.push(r(t[i]))}n=o}return s.join("")};class o extends e{constructor(t,e=!1){super("range"),this.chars=t,this.inverted=e}includes(t){return-1!==this.chars.indexOf(t)!==this.inverted}isEmpty(){return!this.chars.length&&!this.inverted}isSingular(){return 1===this.chars.length&&!this.inverted}singularChar(){if(!this.isSingular())throw new Error("Not singular");return this.chars[0]}intersects(t){return!(!this.inverted||!t.inverted)||(this.inverted?!this.chars.length||t.chars.some((t=>this.includes(t))):t.chars.length?this.chars.some((e=>t.includes(e))):t.inverted)}intersect(t){if(!this.inverted)return t.chars.length?new o(this.chars.filter((e=>t.includes(e))),!1):t.inverted?this:t;if(!t.inverted)return this.chars.length?new o(t.chars.filter((t=>this.includes(t))),!1):this.inverted?t:this;if(!this.chars.length||!t.chars.length)return this.chars.length?this:t;const e=new Set(this.chars);for(const n of t.chars)e.add(n);return new o([...e],!0)}union(t){if(this.inverted)return t.chars.length?new o(this.chars.filter((e=>!t.includes(e))),!0):t.inverted?t:this;if(t.inverted)return this.chars.length?new o(t.chars.filter((t=>!this.includes(t))),!0):this.inverted?this:t;if(!this.chars.length||!t.chars.length)return this.chars.length?this:t;const e=new Set(this.chars);for(const n of t.chars)e.add(n);return new o([...e],!1)}rangeTo(t){if(!this.isSingular()||!t.isSingular())throw new Error("Cannot create range using existing ranges");return o.range(this.singularChar(),t.singularChar())}inverse(){return new o(this.chars,!this.inverted)}toGraph(t){return[{range:this,advance:1,nexts:t}]}toString(){return this.chars.length?(this.chars.sort(),this.inverted?`[^${i(this.chars)}]`:1===this.chars.length?s(this.chars[0]):`[${i(this.chars)}]`):this.inverted?".":"\\u0000"}}o.ANY=new o([],!0),o.NONE=new o([],!1),o.of=t=>new o([...t]),o.ofCode=t=>new o([String.fromCharCode(t)]),o.range=(t,e)=>{const n=t.charCodeAt(0),s=e.charCodeAt(0),r=[];for(let t=Math.min(n,s);t<=Math.max(n,s);++t)r.push(String.fromCharCode(t));return new o(r)},o.union=(...t)=>t.reduce(((t,e)=>t.union(e))),o.string=(t,e=null)=>Array.isArray(t)&&t.length>0&&t[0]instanceof o?t:[...t].map((t=>t===e?o.ANY:new o([t]))),o.print=t=>t.map((t=>t.toString())).join(""),o.NUMERIC=o.range("0","9"),o.ALPHA_NUMERIC=o.union(o.range("a","z"),o.range("A","Z"),o.NUMERIC,o.of("_")),o.SPACE=o.of([" ","\f","\n","\r","\t","\v"," "," ","\u2028","\u2029"," "," ","　","\ufeff"]).union(o.range(" "," "));const h="0".charCodeAt(0);class a{constructor(t){this.data=t,this.pos=0,this.length=t.length}get(t=1){if(this.pos+t>this.length)throw new Error(`Incomplete token at ${this.pos} '${this.data}'`);return this.pos+=t,this.data.substr(this.pos-t,t)}check(t){const e=t.length;return!(this.pos+e>this.length)&&(this.data.substr(this.pos,e)===t&&(this.pos+=e,!0))}readUntil(t,e=!1){const n=this.pos,s=t.length;for(;this.pos+s<=this.length&&this.data.substr(this.pos,s)!==t;++this.pos);if(e&&!this.check(t))throw new Error(`Expected '${t}' after ${n} '${this.data}'`);return this.data.substring(n,this.pos)}readInt(){let t=null;for(;this.pos<this.length;++this.pos){const e=this.data.charCodeAt(this.pos)-h;if(e<0||e>9)break;t=10*(t??0)+e}return t}end(){return this.pos>=this.length}}const c="A".charCodeAt(0),u=/^[0-9a-fA-F]+$/,l=t=>{if(!u.test(t))throw new Error(`Invalid hex value '${t}'`);return Number.parseInt(t,16)};class d extends e{constructor(t,e,n=null){super("assertion"),this.mode=t,this.inverted=e,this.condition=n}toGraph(){throw new Error("Assertions are not currently supported")}}class p extends e{constructor(t,e){super("boundary-assertion"),this.range=t,this.invRange=t.inverse(),this.inverted=e}toGraph(t){const e=[{advance:-1,nexts:t}];return this.inverted?[{advance:-1,nexts:[...this.range.toGraph(this.range.toGraph(e)),...this.invRange.toGraph(this.invRange.toGraph(e))]}]:[{advance:-1,nexts:[...this.range.toGraph(this.invRange.toGraph(e)),...this.invRange.toGraph(this.range.toGraph(e))]}]}}class f extends e{constructor(t){super("position-assertion"),this.pos=t}toGraph(t){return[{pos:this.pos,nexts:t}]}}class g extends e{constructor(t){super("backreference"),this.ref=t}toGraph(){throw new Error("Backreferences are not currently supported")}}class v extends e{constructor(t,e,n,s=null){if(super("quantifier"),this.min=t,this.max=e,this.mode=n,this.target=s,null!==this.max&&this.max<this.min)throw new Error(`Invalid quantifier range: ${t} - ${e}`)}withTarget(t){return new v(this.min,this.max,this.mode,t)}toGraph(t){const e="lazy"===this.mode?e=>[...t,...e]:e=>[...e,...t];let n;if(null===this.max){const t={nexts:[]};t.nexts=this.target.toGraph(e([t])),n=[t];for(let t=this.min-1;t>0;--t)n=this.target.toGraph(n)}else{n=[];for(let t=this.max;t>0;--t)n=this.target.toGraph(t>=this.min?e(n):n)}return 0===this.min?e(n):n}}class w extends e{constructor(t){super("chain"),this.elements=t}toGraph(t){let e=t;for(let t=this.elements.length;t-- >0;)e=this.elements[t].toGraph(e);return e}}class m extends e{constructor(t){super("choice"),this.options=t}toGraph(t){const e=[];for(const n of this.options)e.push(...n.toGraph(t));return e}}class x extends e{constructor(t,e){super("group"),this.name=t,this.target=e}toGraph(t){return this.target.toGraph(t)}}const C=new e("or"),A=new Map([["d",o.NUMERIC],["D",o.NUMERIC.inverse()],["w",o.ALPHA_NUMERIC],["W",o.ALPHA_NUMERIC.inverse()],["s",o.SPACE],["S",o.SPACE.inverse()],["t",o.of("\t")],["r",o.of("\r")],["n",o.of("\n")],["v",o.of("\v")],["f",o.of("\f")],["b",new p(o.ALPHA_NUMERIC,!1)],["B",new p(o.ALPHA_NUMERIC,!0)],["0",o.of("\0")],["c",t=>o.ofCode(1+t.get(1).charCodeAt(0)-c)],["x",t=>o.ofCode(l(t.get(2)))],["u",t=>{const e=t.check("{")?t.readUntil("}",!0):t.get(4);return o.ofCode(l(e))}],["\\",o.of("\\")],["k",t=>{if(!t.check("<"))throw new Error("Incomplete named backreference");return new g(t.readUntil(">",!0))}]]),E=new Map(A);E.set("b",o.of("\b")),E.delete("B"),E.delete("k");for(let t=1;t<10;++t)A.set(String(t),new g(t));function k(t,e,n){const s=t.get(n)??o.of(n);return"function"==typeof s?s(e):s}const y=t=>t.check("?")?"lazy":"greedy";function G(t){if(1===t.length)return t[0];const e=[];for(const n of t)n instanceof w?e.push(...n.elements):e.push(n);return new w(e)}function N(t){const e=[];let n=[];for(const s of t)if(s===C)e.push(G(n)),n=[];else if(s instanceof v){const t=n.pop();if(!t||t instanceof v)throw new Error("Invalid quantifier target");n.push(s.withTarget(t))}else n.push(s);return e.length?(e.push(G(n)),new m(e)):G(n)}const b=new Map([["\\",t=>k(A,t,t.get())],["^",new f(0)],["$",new f(-1)],["|",C],[".",o.ANY],["?",t=>new v(0,1,y(t))],["+",t=>new v(1,null,y(t))],["*",t=>new v(0,null,y(t))],["(",t=>{const e=(t=>t.check("?")?t.check(":")?{type:"inline"}:t.check("=")?{type:"lookahead",inverted:!1}:t.check("!")?{type:"lookahead",inverted:!0}:t.check("<=")?{type:"lookbehind",inverted:!1}:t.check("<!")?{type:"lookbehind",inverted:!0}:t.check("<")?{type:"capturing",name:t.readUntil(">",!0)}:void 0:{type:"capturing",name:null})(t),n=[];for(let e;")"!==(e=t.get());)n.push(k(b,t,e));const s=N(n);switch(e.type){case"capturing":return new x(e.name,s);case"inline":return s;default:return new d(e.type,e.inverted,s)}}],["{",t=>{const e=t.readInt();if(null===e)throw new Error(`Invalid character in quantifier at ${t.pos}`);const n=t.check(",")?t.readInt():e;if(!t.check("}"))throw new Error(`Invalid character in quantifier at ${t.pos}`);return new v(e,n,y(t))}],["[",t=>{const e=t.check("^"),n=[];let s,r=!1;for(;"]"!==(s=t.get());)if("-"===s&&n.length>0)r=!0;else{let e="\\"===s?k(E,t,t.get()):o.of(s);r&&(r=!1,e=n.pop().rangeTo(e)),n.push(e)}if(r)throw new Error(`Incomplete character range at ${t.pos}`);const i=o.union(...n);return e?i.inverse():i}]]);function I(t,e,n){return(void 0===n.pos||e===(s=n.pos,r=t.length,(s%r+r)%r))&&!(n.range&&!t[e].inputRange.intersects(n.range));var s,r}class R{constructor(t,e=null){t instanceof RegExp||t instanceof R?(this.source=t.source,this.flags=e??t.flags):(this.source=String(t),this.flags=e??""),this.dotAll=this.flags.includes("s"),this.global=this.flags.includes("g"),this.hasIndices=this.flags.includes("d"),this.ignoreCase=this.flags.includes("i"),this.sticky=this.flags.includes("y"),this.unicode=this.flags.includes("u");const n=function(t){const e=[];for(const n=new a(t);!n.end();)e.push(k(b,n,n.get()));return N(e)}(this.source);this.endNode={nexts:[]},this.beginNodes=n.toGraph([this.endNode])}reverse(t){const e=o.string(t),n=e.length;e.push(o.NONE);const s=e.map((t=>({inputRange:t,states:new Map,resolved:o.NONE})));let r=[{pos:-1,prevs:[],nexts:this.beginNodes,nextPos:0,node:null}];for(;r.length;){const t=[];for(const e of r){const r=e.nextPos;if(r<0||r>n)continue;const{states:i}=s[r];for(const n of e.nexts){const o=i.get(n);if(o)o.prevs.push(e);else if(I(s,r,n)){const s={pos:r,prevs:[e],nexts:n.nexts,nextPos:r+(n.advance??0),node:n};i.set(n,s),t.push(s)}}}r=t}const i=s[n].states.get(this.endNode);if(!i)return null;for(r=[i];r.length;){const t=[];for(const e of r){if(!e.node)continue;const n=s[e.pos];e.node.range&&(n.resolved=n.resolved.union(e.node.range)),t.push(...e.prevs),e.node=null}r=t}return s.pop(),s.map((t=>t.inputRange.intersect(t.resolved)))}test(t){return null!==this.reverse(t)}toString(){return this.pattern}}R.compile=t=>new R(t),t.CharacterRange=o,t.RevExp=R,Object.defineProperty(t,"__esModule",{value:!0})}));
