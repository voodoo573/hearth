# Generates the reskin's tileable WebP textures (original, procedural). Jenny.
import numpy as np
from PIL import Image
rng=np.random.default_rng(573)
def tnoise(n,freq,oct=4):
    out=np.zeros((n,n));amp=1;tot=0
    for o in range(oct):
        f=freq*2**o
        g=rng.standard_normal((f,f))
        # tileable bilinear upsample via wrap
        x=np.arange(n)*f/n; i=np.floor(x).astype(int); t=x-i; t=t*t*(3-2*t)
        a=g[i%f][:,i%f]; b=g[(i+1)%f][:,i%f]; c=g[i%f][:,(i+1)%f]; d=g[(i+1)%f][:,(i+1)%f]
        ty=t[:,None]; tx=t[None,:]
        out+=amp*((a*(1-tx)+c*tx)*(1-ty)+(b*(1-tx)+d*tx)*ty); tot+=amp; amp*=.5
    out/=tot; return (out-out.min())/(out.max()-out.min())
def cells(n,k):
    # tileable worley -> leather pebble grain
    pts=rng.random((k,2))*n
    yy,xx=np.mgrid[0:n,0:n]; d1=np.full((n,n),1e9); d2=np.full((n,n),1e9)
    for px,py in pts:
        dx=np.abs(xx-px); dx=np.minimum(dx,n-dx); dy=np.abs(yy-py); dy=np.minimum(dy,n-dy)
        d=np.sqrt(dx*dx+dy*dy); m=d<d1; d2=np.where(m,d1,np.minimum(d2,d)); d1=np.where(m,d,d1)
    e=d2-d1; return np.clip(e/np.percentile(e,95),0,1)
def save(a,name,q):
    Image.fromarray(np.clip(a,0,255).astype(np.uint8)).save(f'tex/{name}.webp','WEBP',quality=q,method=6)
N=256
# leather: dark tan-brown, fine pebble grain, low contrast
c=cells(N,1400); m=tnoise(N,3,5); f=tnoise(N,64,1)
v=np.clip(.45+.35*(m-.5)+.10*(c**.7)-.05*f,0,1)
base=np.array([52,30,18.]); hi=np.array([104,62,34.])
L=base+(hi-base)*v[...,None]
L*= (0.86+0.14*(c[...,None]**.6))
L+= (rng.standard_normal((N,N))*2.5)[...,None]
save(L,'leather',70)
m=tnoise(N,2,5); g=rng.standard_normal((N,N))*2.6
v=m*9+g
C=np.stack([16+v,13+v*.9,11+v*.8],-1); save(C,'charcoal',70)
m=tnoise(N,3,5); f=tnoise(N,64,2); s=tnoise(N,5,3)
v=m*.55+f*.25+s*.2
P=np.stack([222+22*v,203+24*v,163+26*v],-1)
P-= (np.clip(s-.6,0,1)*40)[...,None]*np.array([.6,.8,1.1])
P+= (rng.standard_normal((N,N))*2.2)[...,None]
save(P,'parchment',66)
