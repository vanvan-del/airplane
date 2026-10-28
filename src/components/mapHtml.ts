import { Footprint } from '../types';

export interface MapPin {
  name: string;
  lat: number;
  lon: number;
  photos: number;
}

export const toPins = (list: Footprint[]): MapPin[] =>
  list.map((f) => ({ name: f.name, lat: f.lat, lon: f.lon, photos: f.photos.length }));

// Leaflet 从国内能访问的 CDN 依次尝试加载
const LEAFLET_JS = [
  'https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];
const LEAFLET_CSS = [
  'https://cdn.bootcdn.net/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

/**
 * 地图页面：高德地图瓦片（国内可用、中文地名、显示全世界的国家和城市）+ Leaflet。
 * 点击小旗子会把城市名发回 App：WebView 里用 ReactNativeWebView，网页版用 parent.postMessage。
 */
export function buildMapHtml(pins: MapPin[]): string {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  html,body,#map{margin:0;height:100%;background:#DFF1FF;font-family:-apple-system,"PingFang SC",sans-serif}
  .pin{display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);white-space:nowrap}
  .pin .flag{font-size:24px;line-height:24px}
  .pin .label{background:#FFD25A;color:#1D3557;font-weight:800;font-size:12px;padding:1px 6px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.2)}
  .pin .count{background:#FF7A59;color:#fff;border-radius:8px;padding:0 4px;margin-left:3px;font-size:11px}
  #loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5B6B82;font-weight:700}
</style>
</head><body>
<div id="map"></div><div id="loading">🗺️ 地图加载中…</div>
<script>
  var PINS = ${JSON.stringify(pins)};
  var CSS = ${JSON.stringify(LEAFLET_CSS)}, JS = ${JSON.stringify(LEAFLET_JS)};
  function send(name){
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(name);
    else if (window.parent !== window) window.parent.postMessage({ footprint: name }, '*');
  }
  function loadCss(i){ if(i>=CSS.length)return; var l=document.createElement('link'); l.rel='stylesheet'; l.href=CSS[i]; l.onerror=function(){loadCss(i+1)}; document.head.appendChild(l); }
  function loadJs(i){
    if(i>=JS.length){ document.getElementById('loading').textContent='地图加载失败，请检查网络'; return; }
    var s=document.createElement('script'); s.src=JS[i]; s.onload=init; s.onerror=function(){loadJs(i+1)}; document.head.appendChild(s);
  }
  var map, layer;
  function esc(t){ return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); }
  window.setPins = function(pins){
    PINS = pins;
    if(!map) return;
    layer.clearLayers();
    pins.forEach(function(p){
      var html='<div class="pin"><div class="flag">🚩</div><div class="label">'+esc(p.name)+(p.photos?'<span class="count">'+p.photos+'</span>':'')+'</div></div>';
      L.marker([p.lat,p.lon],{icon:L.divIcon({html:html,className:'',iconSize:[0,0]})}).on('click',function(){send(p.name)}).addTo(layer);
    });
    if(pins.length===1) map.setView([pins[0].lat,pins[0].lon],6);
    else if(pins.length>1) map.fitBounds(pins.map(function(p){return [p.lat,p.lon]}),{padding:[40,40],maxZoom:6});
    else map.setView([35,105],3);
  };
  function init(){
    document.getElementById('loading').style.display='none';
    map=L.map('map',{zoomControl:false,attributionControl:false,worldCopyJump:true}).setView([35,105],3);
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',{subdomains:'1234',maxZoom:18,minZoom:2}).addTo(map);
    layer=L.layerGroup().addTo(map);
    window.setPins(PINS);
  }
  loadCss(0); loadJs(0);
</script>
</body></html>`;
}
