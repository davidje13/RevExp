!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).revexp=e()}(this,(function(){"use strict";const t=new Map([["\t","\\t"],["\r","\\r"],["\n","\\n"],["\v","\\v"],["\f","\\f"],["\\","\\\\"],["-","\\-"],[".","\\."],["(","\\("],[")","\\)"],["[","\\["],["]","\\]"],["{","\\{"],["}","\\}"],["|","\\|"],["^","\\^"],["$","\\$"],["?","\\?"],["+","\\+"],["*","\\*"]]),e=e=>t.get(e)??`\\u${e.charCodeAt(0).toString(16).padStart(4,"0")}`,n=(t,n)=>n.replace(t,e),r=n.bind(null,/[^-a-zA-Z0-9 ,:;'"!@%&_=<>`~]/g),s=n.bind(null,/[^a-zA-Z0-9 ,:;'"!@%&_=<>`~(){}.?+*$]/g),i=t=>{let e=0,n=-2;const r=[];for(let i=0;i<=t.length;++i){const h=i===t.length?-2:t[i].charCodeAt(0);if(h!==n+1){const n=i-e;e=i,n>1&&(3===n?r.push(s(t[i-2])):n>3&&r.push("-"),r.push(s(t[i-1]))),i<t.length&&r.push(s(t[i]))}n=h}return r.join("")};class h{constructor(t,e=!1){this.chars=t,this.inverted=e}includes(t){return-1!==this.chars.indexOf(t)!==this.inverted}isEmpty(){return!this.chars.length&&!this.inverted}isSingular(){return 1===this.chars.length&&!this.inverted}singularChar(){if(!this.isSingular())throw new Error("Not singular");return this.chars[0]}equals(t){if(this===t)return!0;if(this.inverted!==t.inverted||this.chars.length!==t.chars.length)return!1;this.chars.sort(),t.chars.sort();for(let e=0;e<this.chars.length;++e)if(this.chars[e]!==t.chars[e])return!1;return!0}intersects(t){return!(!this.inverted||!t.inverted)||(this.inverted?this.chars.length?t.chars.some((t=>this.includes(t))):t.chars.length>0:t.chars.length?this.chars.some((e=>t.includes(e))):this.chars.length>0&&t.inverted)}intersect(t){if(!this.inverted)return t.chars.length?new h(this.chars.filter((e=>t.includes(e))),!1):t.inverted?this:t;if(!t.inverted)return this.chars.length?new h(t.chars.filter((t=>this.includes(t))),!1):this.inverted?t:this;if(!this.chars.length||!t.chars.length)return this.chars.length?this:t;const e=new Set(this.chars);for(const n of t.chars)e.add(n);return new h([...e],!0)}union(t){if(this.inverted)return t.chars.length?new h(this.chars.filter((e=>!t.includes(e))),!0):t.inverted?t:this;if(t.inverted)return this.chars.length?new h(t.chars.filter((t=>!this.includes(t))),!0):this.inverted?this:t;if(!this.chars.length||!t.chars.length)return this.chars.length?this:t;const e=new Set(this.chars);for(const n of t.chars)e.add(n);return new h([...e],!1)}rangeTo(t){if(!this.isSingular()||!t.isSingular())throw new Error("Cannot create range using existing ranges");return h.range(this.singularChar(),t.singularChar())}inverse(){return new h(this.chars,!this.inverted)}toGraph(t){return[{chars:this,advance:1,nexts:t}]}toString(){return this.chars.length?(this.chars.sort(),this.inverted?`[^${i(this.chars)}]`:1===this.chars.length?r(this.chars[0]):`[${i(this.chars)}]`):this.inverted?".":"[]"}}function o(){return this.map((t=>t.toString())).join("")}h.ANY=new h([],!0),h.NONE=new h([],!1),h.of=t=>new h([...t]),h.ofCode=t=>new h([String.fromCharCode(t)]),h.range=(t,e)=>{const n=t.charCodeAt(0),r=e.charCodeAt(0),s=[];for(let t=Math.min(n,r);t<=Math.max(n,r);++t)s.push(String.fromCharCode(t));return new h(s)},h.union=(...t)=>t.reduce(((t,e)=>t.union(e)),h.NONE),h.NUMERIC=h.range("0","9"),h.WORD=h.union(h.range("a","z"),h.range("A","Z"),h.NUMERIC,h.of("_")),h.NEWLINE=h.of(["\n","\r","\u2028","\u2029"]),h.SPACE=h.of([" ","\f","\n","\r","\t","\v","\xa0","\u1680","\u2028","\u2029","\u202f","\u205f","\u3000","\ufeff"]).union(h.range("\u2000","\u200a"));var a=(t,e=null)=>{let n=[...t];return n.length>0&&!(n[0]instanceof h)&&(n=n.map((t=>t===e?h.ANY:new h([t])))),Object.defineProperty(n,"toString",{value:o}),n};const c="0".charCodeAt(0);class l{constructor(t){this.data=t,this.pos=0,this.length=t.length}get(t=1){if(this.pos+t>this.length)throw new Error(`Incomplete token at ${this.pos} '${this.data}'`);return this.pos+=t,this.data.substr(this.pos-t,t)}check(t){const e=t.length;return!(this.pos+e>this.length)&&(this.data.substr(this.pos,e)===t&&(this.pos+=e,!0))}readUntil(t,e=!1){const n=this.pos,r=t.length;for(;this.pos+r<=this.length&&this.data.substr(this.pos,r)!==t;++this.pos);if(e&&!this.check(t))throw new Error(`Expected '${t}' after ${n} '${this.data}'`);return this.data.substring(n,this.pos)}readInt(){let t=null;for(;this.pos<this.length;++this.pos){const e=this.data.charCodeAt(this.pos)-c;if(e<0||e>9)break;t=10*(t??0)+e}return t}end(){return this.pos>=this.length}}class u{constructor(t,e,n=null){this.mode=t,this.inverted=e,this.condition=n}toGraph(){throw new Error("Assertions are not currently supported")}}class f{constructor(t,e){this.chars=t,this.invChars=t.inverse(),this.inverted=e}toGraph(t){const e=[{advance:-1,nexts:t}];return this.inverted?[{advance:-1,nexts:[...this.chars.toGraph(this.chars.toGraph(e)),...this.invChars.toGraph(this.invChars.toGraph(e))]}]:[{advance:-1,nexts:[...this.chars.toGraph(this.invChars.toGraph(e)),...this.invChars.toGraph(this.chars.toGraph(e))]}]}}class d{constructor(t){this.pos=t}toGraph(t){return[{pos:this.pos,nexts:t}]}}class p{constructor(t){this.ref=t}toGraph(){throw new Error("Backreferences are not currently supported")}}class g{constructor(t,e,n,r=null){if(this.min=t,this.max=e,this.mode=n,this.target=r,null!==this.max&&this.max<this.min)throw new Error(`Invalid quantifier range: ${t} - ${e}`)}withTarget(t){return new g(this.min,this.max,this.mode,t)}toGraph(t){const e="lazy"===this.mode?e=>[...t,...e]:e=>[...e,...t];let n;if(null===this.max){const t={nexts:[]};t.nexts=this.target.toGraph(e([t])),n=[t];for(let t=this.min-1;t>0;--t)n=this.target.toGraph(n)}else{n=[];for(let t=this.max;t>0;--t)n=this.target.toGraph(t>=this.min?e(n):n)}return 0===this.min?e(n):n}}class v{constructor(t){this.elements=t}toGraph(t){let e=t;for(let t=this.elements.length;t-- >0;)e=this.elements[t].toGraph(e);return e}}class w{constructor(t){this.options=t}toGraph(t){const e=[];for(const n of this.options)e.push(...n.toGraph(t));return e}}class m{constructor(t,e){this.name=t,this.target=e}toGraph(t){return this.target.toGraph(t)}}const C=Symbol(),E="A".charCodeAt(0),x=/^[0-9a-fA-F]+$/,k=t=>{if(!x.test(t))throw new Error(`Invalid hex value '${t}'`);return Number.parseInt(t,16)},y=new Map([["d",h.NUMERIC],["D",h.NUMERIC.inverse()],["w",h.WORD],["W",h.WORD.inverse()],["s",h.SPACE],["S",h.SPACE.inverse()],["t",h.of("\t")],["r",h.of("\r")],["n",h.of("\n")],["v",h.of("\v")],["f",h.of("\f")],["b",new f(h.WORD,!1)],["B",new f(h.WORD,!0)],["0",h.of("\0")],["c",t=>h.ofCode(1+t.get(1).charCodeAt(0)-E)],["x",t=>h.ofCode(k(t.get(2)))],["u",t=>{const e=t.check("{")?t.readUntil("}",!0):t.get(4);return h.ofCode(k(e))}],["\\",h.of("\\")],["k",t=>{if(!t.check("<"))throw new Error("Incomplete named backreference");return new p(t.readUntil(">",!0))}]]),N=new Map(y);N.set("b",h.of("\b")),N.delete("B"),N.delete("k");for(let t=1;t<10;++t)y.set(String(t),new p(t));function G(t,e,n,r){const s=t.get(n)??h.of(n);return"function"==typeof s?s(e,r):s}const b=t=>t.check("?")?"lazy":"greedy";function A(t){if(1===t.length)return t[0];const e=[];for(const n of t)n instanceof v?e.push(...n.elements):e.push(n);return new v(e)}function S(t){const e=[];let n=[];for(const r of t)if(r===C)e.push(A(n)),n=[];else if(r instanceof g){const t=n.pop();if(!t||t instanceof g)throw new Error("Invalid quantifier target");n.push(r.withTarget(t))}else n.push(r);return e.length?(e.push(A(n)),new w(e)):A(n)}const I=new Map([["\\",(t,e)=>G(y,t,t.get(),e)],["^",new d(0)],["$",new d(-1)],["|",C],[".",(t,e)=>e.any],["?",t=>new g(0,1,b(t))],["+",t=>new g(1,null,b(t))],["*",t=>new g(0,null,b(t))],["(",(t,e)=>{const n=(t=>{if(!t.check("?"))return{type:"capturing",name:null};if(t.check(":"))return{type:"inline"};if(t.check("="))return{type:"lookahead",inverted:!1};if(t.check("!"))return{type:"lookahead",inverted:!0};if(t.check("<="))return{type:"lookbehind",inverted:!1};if(t.check("<!"))return{type:"lookbehind",inverted:!0};if(t.check("<"))return{type:"capturing",name:t.readUntil(">",!0)};throw new Error(`Invalid group flags at ${t.pos}`)})(t),r=[];for(let n;")"!==(n=t.get());)r.push(G(I,t,n,e));const s=S(r);switch(n.type){case"capturing":return new m(n.name,s);case"inline":return s;default:return new u(n.type,n.inverted,s)}}],["{",t=>{const e=t.readInt();if(null===e)throw new Error(`Invalid character in quantifier at ${t.pos}`);const n=t.check(",")?t.readInt():e;if(!t.check("}"))throw new Error(`Invalid character in quantifier at ${t.pos}`);return new g(e,n,b(t))}],["[",(t,e)=>{const n=t.check("^"),r=[];let s,i=!1;for(;"]"!==(s=t.get());)if("-"===s&&r.length>0)i=!0;else{let n="\\"===s?G(N,t,t.get(),e):h.of(s);i&&(i=!1,n=r.pop().rangeTo(n)),r.push(n)}if(i)throw new Error(`Incomplete character range at ${t.pos}`);const o=h.union(...r);return n?o.inverse():o}]]);function $(t,e,n){return(void 0===n.pos||e===(r=n.pos,s=t.length,(r%s+s)%s))&&!(n.chars&&!t[e].inputChars.intersects(n.chars));var r,s}class O{constructor(t,e=null){t instanceof RegExp||t instanceof O?(this.source=t.source,this.flags=e??t.flags):(this.source=String(t),this.flags=e??"");const n=function(t){return{dotAll:t.includes("s"),global:t.includes("g"),hasIndices:t.includes("d"),ignoreCase:t.includes("i"),sticky:t.includes("y"),unicode:t.includes("u")}}(this.flags);Object.assign(this,n);const r=function(t,e){const n={flags:e,any:e.dotAll?h.ANY:h.NEWLINE.inverse()},r=[];for(const e=new l(t);!e.end();)r.push(G(I,e,e.get(),n));return S(r)}(this.source,n);this.endNode={nexts:[]},this.beginNodes=r.toGraph([this.endNode])}reverse(t,e=null){const n=a(t,e),r=n.length;n.push(h.NONE);const s=n.map((t=>({inputChars:t,states:new Map,resolved:h.NONE})));let i=[{pos:-1,prevs:[],nexts:this.beginNodes,nextPos:0,node:null}];for(;i.length;){const t=[];for(const e of i){const n=e.nextPos;if(n<0||n>r)continue;const{states:i}=s[n];for(const r of e.nexts){const h=i.get(r);if(h)h.prevs.push(e);else if($(s,n,r)){const s={pos:n,prevs:[e],nexts:r.nexts,nextPos:n+(r.advance??0),node:r};i.set(r,s),t.push(s)}}}i=t}const o=s[r].states.get(this.endNode);if(!o)return null;for(i=[o];i.length;){const t=[];for(const e of i){if(!e.node)continue;const n=s[e.pos];e.node.chars&&(n.resolved=n.resolved.union(e.node.chars)),t.push(...e.prevs),e.node=null}i=t}return s.pop(),a(s.map((t=>t.inputChars.intersect(t.resolved))))}test(t,e=null){return null!==this.reverse(t,e)}toString(){return this.pattern}}return O.compile=(t,e)=>new O(t,e),O.CharacterClass=h,O.string=a,O}));
