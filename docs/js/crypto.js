var _0x,_s0,_s1;!function(){var _p=[],_q=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);function _r(v,n){return(v>>>n)|(v<<(32-n))}function _h(m){var e=new TextEncoder,b=e.encode(m),bl=b.length*8,pl=(((b.length+9)>>>6)+1)<<6,pd=new Uint8Array(pl);pd.set(b);pd[b.length]=0x80;var dv=new DataView(pd.buffer);dv.setUint32(pl-4,bl,false);var h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19,w=new Uint32Array(64);for(var o=0;o<pl;o+=64){for(var i=0;i<16;i++)w[i]=dv.getUint32(o+i*4,false);for(i=16;i<64;i++){var s0=_r(w[i-15],7)^_r(w[i-15],18)^(w[i-15]>>>3),s1=_r(w[i-2],17)^_r(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0}var a=h0,_b=h1,c=h2,d=h3,_e=h4,f=h5,g=h6,_hh=h7;for(i=0;i<64;i++){var S1=_r(_e,6)^_r(_e,11)^_r(_e,25),ch=(_e&f)^(~_e&g),t1=(_hh+S1+ch+_q[i]+w[i])|0,S0=_r(a,2)^_r(a,13)^_r(a,22),mj=(a&_b)^(a&c)^(_b&c),t2=(S0+mj)|0;_hh=g;g=f;f=_e;_e=(d+t1)|0;d=c;c=_b;_b=a;a=(t1+t2)|0}h0=(h0+a)|0;h1=(h1+_b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+_e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+_hh)|0}return[h0,h1,h2,h3,h4,h5,h6,h7].map(function(v){return(v>>>0).toString(16).padStart(8,'0')}).join('')}

// Key derivation — multi-layer obfuscation
var _k1=function(){var a=[0x9a,0xd6,0xc3,0xb8,0xad,0xc3,0x9f,0xd3,0xd3,0xc1,0xd5,0xcc,0xd4];return a.map(function(c,i){return String.fromCharCode(c^(0xd8+i*3))}).join('')}();
var _k2=function(){var s='';for(var i=0;i<8;i++)s+=String.fromCharCode(((i*7+13)^0x5A)+i);return s}();
var _k3=(function(n){return n.toString(36)})(Date.UTC(2024,5,15)/1e5);
var _kf=_h(_k1+_k2+_k3);

function _hm(m){return _h(_kf.substring(0,32)+'\x00'+m+'\x00'+_kf.substring(32))}

// XOR-based data encryption (not just signing — actual obfuscation of stored values)
function _xc(str,key){
    var out=[];
    for(var i=0;i<str.length;i++){
        out.push(str.charCodeAt(i)^key.charCodeAt(i%key.length));
    }
    return out;
}
function _xe(data,key){
    var json=JSON.stringify(data);
    var bytes=_xc(json,key);
    // Convert to base64-safe string
    var b64='';
    for(var i=0;i<bytes.length;i++)b64+=String.fromCharCode(bytes[i]);
    return btoa(b64);
}
function _xd(encoded,key){
    try{
        var b64=atob(encoded);
        var bytes=[];
        for(var i=0;i<b64.length;i++)bytes.push(b64.charCodeAt(i));
        var json='';
        for(var i=0;i<bytes.length;i++)json+=String.fromCharCode(bytes[i]^key.charCodeAt(i%key.length));
        return JSON.parse(json);
    }catch(e){return null}
}

// Encryption key derived differently from signing key
var _ek=_h(_kf+'encrypt').substring(0,32);

// Anti-tampering: freeze & trap
var _frozen=false;

_s0=function(sk,data){
    var enc=_xe(data,_ek);
    var sig=_hm(sk+':'+enc);
    // Store with non-obvious field names, add decoy fields
    var ts=Date.now();
    var obj={};
    obj['\x76']=2;              // version marker
    obj['\x74']=ts;             // timestamp
    obj['\x70']=enc;            // payload (encrypted)
    obj['\x63']=sig.substring(0,16); // checksum part 1
    obj['\x6e']=_h(ts.toString(36)+enc.substring(0,20)).substring(0,12); // noise (derived, verifiable)
    obj['\x78']=sig.substring(16);   // checksum part 2
    localStorage.setItem(sk,JSON.stringify(obj));
};

_s1=function(sk){
    var raw=localStorage.getItem(sk);
    if(!raw)return null;
    var obj;
    try{obj=JSON.parse(raw)}catch(e){return null}

    // Detect legacy v1 signed format {d:..., s:...}
    if(obj&&obj.d!==undefined&&obj.s&&!obj['\x76']){
        return obj.d; // legacy — caller will re-save
    }

    // Detect ancient plain format (no wrapper at all)
    if(obj&&!obj['\x76']&&!obj.d&&(obj.coins!==undefined||obj.score!==undefined)){
        return obj; // ancient legacy
    }

    // v2 format
    if(!obj||obj['\x76']!==2||!obj['\x70']||!obj['\x63']||!obj['\x78'])return null;

    // Verify noise field (anti-edit trap)
    var expectedNoise=_h(obj['\x74'].toString(36)+obj['\x70'].substring(0,20)).substring(0,12);
    if(obj['\x6e']!==expectedNoise){
        localStorage.removeItem(sk);
        return null;
    }

    // Reconstruct and verify signature
    var sig=obj['\x63']+obj['\x78'];
    var expected=_hm(sk+':'+obj['\x70']);
    if(sig!==expected){
        localStorage.removeItem(sk);
        return null;
    }

    // Decrypt payload
    var data=_xd(obj['\x70'],_ek);
    if(!data){localStorage.removeItem(sk);return null}
    return data;
};

// Global aliases — use non-obvious names
_0x={s:_s0,l:_s1};

// Runtime anti-debug: detect console open via timing
// (lightweight — doesn't block, just adds friction)
_p.push(setInterval(function(){
    var t0=performance.now();
    debugger;  // pauses only when DevTools is open
    if(performance.now()-t0>100){
        // DevTools detected — corrupt cached key (recovers on reload without DevTools)
        _kf=_h(Math.random().toString());
    }
},5000));
}();

function _signedSave(k,d){_0x.s(k,d)}
function _signedLoad(k){return _0x.l(k)}
