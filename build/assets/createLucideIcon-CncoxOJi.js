import{c as h,r as d}from"./index-DmKrmL1L.js";const C=n=>typeof n=="boolean"?`${n}`:n===0?"0":n,w=h,j=(n,t)=>e=>{var o;if((t==null?void 0:t.variants)==null)return w(n,e==null?void 0:e.class,e==null?void 0:e.className);const{variants:s,defaultVariants:a}=t,v=Object.keys(s).map(r=>{const l=e==null?void 0:e[r],u=a==null?void 0:a[r];if(l===null)return null;const i=C(l)||C(u);return s[r][i]}),c=e&&Object.entries(e).reduce((r,l)=>{let[u,i]=l;return i===void 0||(r[u]=i),r},{}),m=t==null||(o=t.compoundVariants)===null||o===void 0?void 0:o.reduce((r,l)=>{let{class:u,className:i,...k}=l;return Object.entries(k).every(N=>{let[y,f]=N;return Array.isArray(f)?f.includes({...a,...c}[y]):{...a,...c}[y]===f})?[...r,u,i]:r},[]);return w(n,v,m,e==null?void 0:e.class,e==null?void 0:e.className)};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n=>n.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),b=(...n)=>n.filter((t,e,o)=>!!t&&t.trim()!==""&&o.indexOf(t)===e).join(" ").trim();/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var V={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=d.forwardRef(({color:n="currentColor",size:t=24,strokeWidth:e=2,absoluteStrokeWidth:o,className:s="",children:a,iconNode:v,...c},m)=>d.createElement("svg",{ref:m,...V,width:t,height:t,stroke:n,strokeWidth:o?Number(e)*24/Number(t):e,className:b("lucide",s),...c},[...v.map(([r,l])=>d.createElement(r,l)),...Array.isArray(a)?a:[a]]));/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=(n,t)=>{const e=d.forwardRef(({className:o,...s},a)=>d.createElement(A,{ref:a,iconNode:t,className:b(`lucide-${x(n)}`,o),...s}));return e.displayName=`${n}`,e};export{j as a,O as c};
